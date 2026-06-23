/**
 * Oráculo MCP Bridge — File System Access API (modelo de 2 archivos, dueño único)
 *
 * Puente entre la app Oráculo y los agentes LLM. La usuaria elige una CARPETA;
 * dentro viven dos archivos, cada uno con un único escritor:
 *
 *   oraculo-bridge.json  → escribe SOLO la app   → { _bridge, data, acks }
 *   oraculo-queue.json   → escribe SOLO el servidor → { _queue, agentQueue }
 *
 * Dueño único por archivo = la race condition del modelo de un archivo es
 * imposible por construcción: una escritura de la app no puede pisar la cola
 * del agente, ni una escritura del servidor puede revertir los datos de la app.
 *
 * Cómo se marca una acción aplicada/rechazada SIN tocar la cola (que es del
 * servidor): la app escribe acuses (`acks`) en SU propio archivo. El servidor
 * lee esos acks y poda su cola. Eventual consistency: la app filtra por acks
 * para no mostrar una acción dos veces aunque el servidor aún no haya podado.
 *
 * IMPORTANTE - Compatibilidad con Drive Sync (PRIORIDAD ABSOLUTA):
 *   - El bridge NUNCA escribe en localStorage ni emite 'data-saved'.
 *   - Solo escribe los archivos externos de la carpeta del Agente IA.
 *   - Los cambios del agente se aplican vía saveData() normal para que Drive
 *     sync los recoja como un cambio legítimo aprobado por la usuaria.
 *
 * Secciones excluidas del data file (datos efímeros/privados):
 *   - muevete.timerState (cambia cada segundo)
 *   - _deletions (tombstones internos de Drive)
 *   - _sectionMeta (metadatos internos de merge)
 *   - oraculo_gcal_settings (key separada de localStorage)
 */

const BRIDGE_SETTINGS_KEY = 'oraculo_mcp_bridge';
const BRIDGE_VERSION = '1.0';

// Nombres de archivo dentro de la carpeta elegida por la usuaria
const DATA_FILE = 'oraculo-bridge.json';
const QUEUE_FILE = 'oraculo-queue.json';

// Acuses más viejos que esto se podan (housekeeping). El servidor ya habrá
// podado su cola para entonces.
const ACK_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

// Campos a excluir del export al data file (datos efímeros o internos)
const EXCLUDED_FIELDS = ['_deletions', '_sectionMeta'];

// Reducir muevete a solo lo necesario para el agente
function sanitizeForBridge(data) {
  const clean = { ...data };

  for (const field of EXCLUDED_FIELDS) {
    delete clean[field];
  }

  // Muévete: solo el log de actividad, no el timer state (efímero)
  if (clean.muevete) {
    clean.muevete = {
      activityLog: clean.muevete.activityLog || { entries: [], currentStreak: 0, bestStreak: 0 }
    };
  }

  return clean;
}

export class McpBridge {
  constructor() {
    this._dirHandle = null;   // FileSystemDirectoryHandle
    this._enabled = false;
    this._syncing = false;
    this._listeners = new Map();

    this._loadSettings();
  }

  // ─────────────────────────────────────────────
  // CONFIGURACIÓN PERSISTENTE
  // ─────────────────────────────────────────────

  _loadSettings() {
    try {
      const raw = localStorage.getItem(BRIDGE_SETTINGS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this._enabled = s.enabled || false;
        // El DirectoryHandle no se puede serializar — se pide de nuevo al cargar
        this._folderName = s.folderName || null;
      }
    } catch { /* noop */ }

    // NOTA: NO marcamos stale state aquí. Los handles NUNCA se restauran entre
    // sesiones (limitación de File System Access API), por lo que cada recarga
    // tiene enabled=true pero _dirHandle=null. Eso NO es un error: la UI muestra
    // "Reconectar" y la usuaria decide.
    //
    // _hasStaleState SOLO se activa cuando el bridge pierde permisos durante la
    // sesión actual (NotAllowedError en syncToBridge o verifyHandle).
    this._hasStaleState = false;
  }

  _saveSettings() {
    try {
      // Solo persistir enabled=true si hay DirectoryHandle vivo.
      const effectiveEnabled = this._enabled && this._dirHandle !== null;
      localStorage.setItem(BRIDGE_SETTINGS_KEY, JSON.stringify({
        enabled: effectiveEnabled,
        folderName: this._dirHandle?.name || this._folderName || null,
      }));
    } catch { /* noop */ }
  }

  /**
   * Emite el evento stale-state para que la UI muestre el banner de "permiso perdido".
   */
  emitStaleStateIfNeeded() {
    if (this._hasStaleState) {
      this._emit('stale-state', { folderName: this._folderName });
      this._hasStaleState = false;
    }
  }

  // ─────────────────────────────────────────────
  // VERIFICACIÓN DE SOPORTE
  // ─────────────────────────────────────────────

  static isSupported() {
    return 'showDirectoryPicker' in window;
  }

  get isEnabled() { return this._enabled; }
  get isConnected() { return this._enabled && this._dirHandle !== null; }
  get folderName() { return this._dirHandle?.name || this._folderName || null; }
  get hasStaleState() { return !!this._hasStaleState; }
  get lastFolderName() { return this._folderName; }

  // ─────────────────────────────────────────────
  // SELECCIÓN DE CARPETA
  // ─────────────────────────────────────────────

  /**
   * Abre el picker de carpeta. La app crea/lee los dos archivos dentro.
   * @returns {Promise<string|null>} nombre de la carpeta, o null si se cancela
   */
  async selectBridgeFolder() {
    if (!McpBridge.isSupported()) {
      throw new Error('Tu navegador no soporta File System Access API. Usa Chrome o Edge.');
    }

    let handle = null;
    try {
      handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch (err) {
      if (err.name === 'AbortError') return null; // Usuaria canceló
      throw err;
    }

    // Pedir permiso de escritura explícito (algunos navegadores lo difieren)
    if (typeof handle.requestPermission === 'function') {
      const perm = await handle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        this._emit('permission-lost');
        return null;
      }
    }

    this._dirHandle = handle;
    this._enabled = true;
    this._saveSettings();

    // Crear el data file de inmediato si no existe (la primera exportación
    // ocurre en el próximo data-saved; aquí garantizamos que la carpeta es válida)
    this._emit('connected', { folderName: handle.name });

    return handle.name;
  }

  /**
   * Re-valida el handle de carpeta. Si el navegador olvidó el permiso, emite
   * permission-lost y resetea el estado para que la UI muestre reconexión.
   * @returns {Promise<boolean>}
   */
  async verifyHandle() {
    if (!this._dirHandle) return false;
    if (typeof this._dirHandle.queryPermission !== 'function') return true;

    try {
      const perm = await this._dirHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') return true;

      const reqPerm = await this._dirHandle.requestPermission({ mode: 'readwrite' });
      if (reqPerm === 'granted') return true;

      this._emit('permission-lost');
      this._dirHandle = null;
      this._enabled = false;
      this._saveSettings();
      return false;
    } catch (err) {
      console.warn('[McpBridge] Error verificando handle:', err.message);
      this._hasStaleState = true;
      this._emit('permission-lost');
      this._dirHandle = null;
      this._enabled = false;
      this._saveSettings();
      return false;
    }
  }

  // ─────────────────────────────────────────────
  // HELPERS DE ARCHIVO
  // ─────────────────────────────────────────────

  async _getDataHandle(create = true) {
    return this._dirHandle.getFileHandle(DATA_FILE, { create });
  }

  async _getQueueHandle(create = false) {
    return this._dirHandle.getFileHandle(QUEUE_FILE, { create });
  }

  /** Lee y parsea el data file actual (o null si no existe/corrupto). */
  async _readDataFile() {
    try {
      const handle = await this._getDataHandle(false);
      const text = await (await handle.getFile()).text();
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────
  // SINCRONIZACIÓN: APP → DATA FILE (único escritor)
  // ─────────────────────────────────────────────

  /**
   * Exporta los datos actuales al data file, preservando los acks existentes.
   * Se llama al detectar 'data-saved'. Falla en silencio si no hay handle.
   * NUNCA toca el queue file.
   *
   * @param {object} oraculoData
   */
  async syncToBridge(oraculoData) {
    if (!this._enabled || !this._dirHandle || this._syncing) return;

    this._syncing = true;
    try {
      const existing = await this._readDataFile();
      const acks = this._pruneAcks(existing?.acks || []);

      const dataFile = {
        _bridge: {
          version: BRIDGE_VERSION,
          appVersion: oraculoData.version || '1.5',
          exportedAt: new Date().toISOString(),
        },
        data: sanitizeForBridge(oraculoData),
        acks,
      };

      await this._writeDataFile(dataFile);
      this._emit('synced', { exportedAt: dataFile._bridge.exportedAt });
    } catch (err) {
      console.warn('[McpBridge] Error al sincronizar:', err.message);
      if (err.name === 'NotAllowedError') {
        this._hasStaleState = true;
        this._dirHandle = null;
        this._enabled = false;
        this._saveSettings();
        this._emit('permission-lost');
      } else {
        this._emit('sync-error', { message: err.message });
      }
    } finally {
      this._syncing = false;
    }
  }

  /** Escribe el data file (createWritable es atómico: swap de temporal). */
  async _writeDataFile(dataFile) {
    const handle = await this._getDataHandle(true);
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(dataFile, null, 2));
    await writable.close();
  }

  /** Poda acks más viejos que ACK_MAX_AGE_MS. */
  _pruneAcks(acks) {
    const cutoff = Date.now() - ACK_MAX_AGE_MS;
    return acks.filter(a => new Date(a.processedAt || 0).getTime() > cutoff);
  }

  // ─────────────────────────────────────────────
  // LECTURA: QUEUE FILE → APP (cambios del agente)
  // ─────────────────────────────────────────────

  /**
   * Lee la cola del servidor y devuelve las acciones pendientes (no acuseadas).
   * NO modifica nada.
   * @returns {{ pending: Action[], total: number }}
   */
  async readAgentQueue() {
    if (!this._enabled || !this._dirHandle) return { pending: [], total: 0 };

    try {
      const queueHandle = await this._getQueueHandle(false).catch(() => null);
      if (!queueHandle) return { pending: [], total: 0 };

      const queueText = await (await queueHandle.getFile()).text();
      const queue = JSON.parse(queueText).agentQueue || [];

      // Acuses ya registrados por la app (para no mostrar acciones procesadas)
      const dataFile = await this._readDataFile();
      const acked = new Set((dataFile?.acks || []).map(a => a.id));

      const pending = queue.filter(a => a.status === 'pending' && !acked.has(a.id));
      return { pending, total: queue.length };
    } catch (err) {
      console.warn('[McpBridge] Error leyendo queue:', err.message);
      return { pending: [], total: 0 };
    }
  }

  /**
   * Verifica si hay acciones pendientes del agente y emite un evento.
   */
  async checkPendingActions() {
    const { pending } = await this.readAgentQueue();
    if (pending.length > 0) {
      this._emit('queue-pending', { count: pending.length, actions: pending });
    }
    return pending;
  }

  /**
   * Registra acuses (applied/rejected) en el data file. NO toca el queue file.
   * El servidor leerá estos acks y podará su cola.
   * @param {string[]} actionIds
   * @param {'applied'|'rejected'} status
   */
  async updateQueueStatus(actionIds, status) {
    if (!this._dirHandle || actionIds.length === 0) return;

    try {
      const existing = await this._readDataFile();
      if (!existing) return; // sin data file aún no hay nada que acusar

      const acks = this._pruneAcks(existing.acks || []);
      const known = new Set(acks.map(a => a.id));
      const processedAt = new Date().toISOString();

      for (const id of actionIds) {
        if (!known.has(id)) {
          acks.push({ id, status, processedAt });
        }
      }

      existing.acks = acks;
      await this._writeDataFile(existing);
    } catch (err) {
      console.warn('[McpBridge] Error registrando acks:', err.message);
    }
  }

  /**
   * Rechaza acciones pendientes (las acusa como rejected sin aplicarlas).
   * @param {string[]} actionIds
   */
  async rejectPendingActions(actionIds) {
    await this.updateQueueStatus(actionIds, 'rejected');
    this._emit('queue-rejected', { rejected: actionIds });
  }

  /**
   * Aplica las acciones pendientes del agente a los datos de Oráculo.
   * Usa saveData() normal para que Drive sync las sincronice.
   * Marca las aplicadas como acks en el data file.
   *
   * @param {object} data - Datos de Oráculo (se muta)
   * @param {Function} saveDataFn - Función saveData del storage
   * @returns {{ applied: string[], failed: Array<{id, error}> }}
   */
  async applyPendingActions(data, saveDataFn) {
    const { pending } = await this.readAgentQueue();
    const applied = [];
    const failed = [];

    for (const action of pending) {
      try {
        applyAgentAction(data, action);
        applied.push(action.id);
      } catch (err) {
        console.warn('[McpBridge] Error aplicando acción', action.id, err.message);
        failed.push({ id: action.id, error: err.message });
      }
    }

    if (applied.length > 0) {
      // Guardar una sola vez para no disparar múltiples push a Drive
      await saveDataFn(data);
      await this.updateQueueStatus(applied, 'applied');
      this._emit('queue-applied', { applied, failed });
    }

    return { applied, failed };
  }

  // ─────────────────────────────────────────────
  // DESCONEXIÓN
  // ─────────────────────────────────────────────

  disable() {
    this._enabled = false;
    this._dirHandle = null;
    this._hasStaleState = false;
    this._folderName = null;
    this._saveSettings();
    this._emit('disconnected');
  }

  /**
   * Olvida completamente la configuración MCP: limpia localStorage, handle y todo.
   */
  forget() {
    this._enabled = false;
    this._dirHandle = null;
    this._hasStaleState = false;
    this._folderName = null;
    try {
      localStorage.removeItem(BRIDGE_SETTINGS_KEY);
    } catch { /* noop */ }
    this._emit('disconnected');
  }

  // ─────────────────────────────────────────────
  // EVENTOS (patrón simple pub/sub)
  // ─────────────────────────────────────────────

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(handler);
  }

  off(event, handler) {
    const handlers = this._listeners.get(event) || [];
    this._listeners.set(event, handlers.filter(h => h !== handler));
  }

  _emit(event, data) {
    const handlers = this._listeners.get(event) || [];
    handlers.forEach(h => { try { h(data); } catch { /* noop */ } });
  }
}

// Singleton
export const mcpBridge = new McpBridge();

// ─────────────────────────────────────────────
// APLICACIÓN DE ACCIONES DEL AGENTE
// ─────────────────────────────────────────────

/**
 * Aplica una acción del agente a los datos de Oráculo.
 * Lanza error si la acción no es válida. NO guarda en localStorage.
 */
function applyAgentAction(data, action) {
  const params = action.params || {};

  switch (action.tool) {
    case 'add_journal_entry':
      addJournalEntry(data, params);
      break;

    case 'add_task':
      addTask(data, params);
      break;

    case 'complete_task':
      completeTask(data, params);
      break;

    case 'add_spontaneous_achievement':
      addSpontaneousAchievement(data, params);
      break;

    case 'set_roca_principal':
      setRocaPrincipal(data, params);
      break;

    default:
      throw new Error(`Tool desconocida: ${action.tool}`);
  }
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function stampSection(data, section) {
  if (!data._sectionMeta) data._sectionMeta = {};
  data._sectionMeta[section] = { updatedAt: new Date().toISOString() };
}

function addJournalEntry(data, params) {
  if (!params.type || !params.content) {
    throw new Error('Faltan type o content');
  }

  data.journal = data.journal || [];
  data.journal.unshift({
    id: generateId(),
    type: params.type,
    content: params.content,
    createdAt: params.createdAt || new Date().toISOString(),
  });

  stampSection(data, 'journal');
}

function addTask(data, params) {
  if (!params.text || !params.horizon) {
    throw new Error('Faltan text o horizon');
  }

  const horizon = params.horizon;
  if (!data.objectives) data.objectives = {};
  if (!data.objectives[horizon]) data.objectives[horizon] = [];

  const newTask = {
    id: generateId(),
    text: params.text,
    notes: null,
    projectId: params.projectId || null,
    taskType: params.important ? 'important' : null,
    completed: false,
    isRocaPrincipal: false,
    valueId: null,
    createdAt: params.createdAt || new Date().toISOString(),
  };

  data.objectives[horizon].unshift(newTask);
  stampSection(data, `objectives.${horizon}`);
}

function completeTask(data, params) {
  const { taskId, horizon } = params;
  if (!taskId || !horizon) {
    throw new Error('Faltan taskId o horizon');
  }

  const tasks = data.objectives?.[horizon];
  if (!tasks) throw new Error(`Horizonte no encontrado: ${horizon}`);

  const task = tasks.find(t => t.id === taskId);
  if (!task) throw new Error(`Tarea no encontrada: ${taskId}`);

  task.completed = true;
  task.completedAt = new Date().toISOString();

  // Mover a completed
  data.objectives.completed = data.objectives.completed || [];
  data.objectives.completed.unshift(task);
  data.objectives[horizon] = tasks.filter(t => t.id !== taskId);

  stampSection(data, `objectives.${horizon}`);
  stampSection(data, 'objectives.completed');
}

function addSpontaneousAchievement(data, params) {
  if (!params.text || !params.mood) {
    throw new Error('Faltan text o mood');
  }

  data.spontaneousAchievements = data.spontaneousAchievements || [];
  data.spontaneousAchievements.unshift({
    id: generateId(),
    text: params.text,
    mood: params.mood,
    createdAt: params.createdAt || new Date().toISOString(),
  });

  stampSection(data, 'spontaneousAchievements');
}

function setRocaPrincipal(data, params) {
  const { taskId } = params;
  if (!taskId) throw new Error('Falta taskId');

  const daily = data.objectives?.daily;
  if (!daily) throw new Error('No hay tareas diarias');

  const task = daily.find(t => t.id === taskId);
  if (!task) throw new Error(`Tarea no encontrada en daily: ${taskId}`);

  // Quitar roca anterior
  daily.forEach(t => { t.isRocaPrincipal = false; });
  task.isRocaPrincipal = true;

  data.dailySetup = data.dailySetup || {};
  data.dailySetup.rocaPrincipal = taskId;

  stampSection(data, 'objectives.daily');
  stampSection(data, 'dailySetup');
}

// ─────────────────────────────────────────────
// INICIALIZACIÓN (llamar desde app.js)
// ─────────────────────────────────────────────

/**
 * Inicializa el bridge y conecta al evento 'data-saved' de storage.
 * Debe llamarse en el bootstrap, después de cargar el storage.
 *
 * IMPORTANTE: Solo escucha 'data-saved', NUNCA lo emite. Esto garantiza que
 * Drive sync no sea afectado por las escrituras del bridge.
 *
 * @param {Function} loadDataFn - Función loadData() del módulo de storage activo
 */
export function initMcpBridge(loadDataFn) {
  if (!McpBridge.isSupported()) {
    console.log('[McpBridge] File System Access API no disponible (no Chromium). Bridge desactivado.');
    return;
  }

  if (!mcpBridge.isEnabled) return;

  // Sincronizar al data file cada vez que se guardan datos en Oráculo.
  // Drive sync también escucha 'data-saved' — no hay conflicto porque
  // nosotros solo escribimos archivos externos, no localStorage.
  window.addEventListener('data-saved', () => {
    const data = loadDataFn();
    mcpBridge.syncToBridge(data).catch(() => { /* silencioso */ });
  });

  // También sincronizar cuando Drive trae datos remotos
  window.addEventListener('data-synced-from-cloud', (e) => {
    if (e.detail?.data) {
      mcpBridge.syncToBridge(e.detail.data).catch(() => { /* silencioso */ });
    }
  });

  // Verificar si hay acciones pendientes del agente al iniciar
  mcpBridge.checkPendingActions().catch(() => { /* silencioso */ });

  console.log('[McpBridge] Inicializado. Carpeta:', mcpBridge.folderName);
}
