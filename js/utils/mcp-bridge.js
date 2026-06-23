/**
 * Oráculo MCP Bridge — File System Access API
 *
 * Puente bidireccional entre la app Oráculo y los agentes LLM.
 * Usa File System Access API (Chrome/Edge) para escribir el bridge file
 * en disco sin necesidad de un servidor intermedio.
 *
 * IMPORTANTE - Compatibilidad con Drive Sync (PRIORIDAD ABSOLUTA):
 *   El bridge NO interfiere con el sistema de Google Drive.
 *   - Solo escribe en el bridge FILE externo (no en localStorage directamente).
 *   - Escucha 'data-saved' (emitido por storage.js / storage-hybrid.js)
 *     pero el flag _mcpSyncing evita bucles.
 *   - Los cambios del agente se aplican via saveData() normal, de modo que
 *     Drive sync los recoja como un cambio legítimo aprobado por la usuaria.
 *   - NUNCA escribe directamente en localStorage. NUNCA emite 'data-saved'.
 *
 * Secciones excluidas del bridge file (datos efímeros/privados):
 *   - muevete.timerState (cambia cada segundo)
 *   - _deletions (tombstones internos de Drive)
 *   - _sectionMeta (metadatos internos de merge)
 *   - oraculo_gcal_settings (key separada de localStorage)
 */

const BRIDGE_SETTINGS_KEY = 'oraculo_mcp_bridge';
const BRIDGE_VERSION = '1.0';

// Campos a excluir del export al bridge (datos efímeros o internos)
const EXCLUDED_FIELDS = ['_deletions', '_sectionMeta'];

// Reducir muevete a solo lo necesario para el agente
function sanitizeForBridge(data) {
  const clean = { ...data };

  // Eliminar campos internos
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
    this._fileHandle = null;  // FileSystemFileHandle
    this._enabled = false;
    this._syncing = false;
    this._pendingQueue = [];
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
        // El FileHandle no se puede serializar — se pide de nuevo al cargar
        this._fileName = s.fileName || null;
      }
    } catch { /* noop */ }
  }

  _saveSettings() {
    try {
      localStorage.setItem(BRIDGE_SETTINGS_KEY, JSON.stringify({
        enabled: this._enabled,
        fileName: this._fileHandle?.name || this._fileName || null,
      }));
    } catch { /* noop */ }
  }

  // ─────────────────────────────────────────────
  // VERIFICACIÓN DE SOPORTE
  // ─────────────────────────────────────────────

  static isSupported() {
    return 'showSaveFilePicker' in window || 'showOpenFilePicker' in window;
  }

  get isEnabled() { return this._enabled; }
  get isConnected() { return this._enabled && this._fileHandle !== null; }
  get fileName() { return this._fileHandle?.name || this._fileName || null; }

  // ─────────────────────────────────────────────
  // SELECCIÓN DE ARCHIVO (primera vez)
  // ─────────────────────────────────────────────

  /**
   * Abre el picker de archivo para que la usuaria elija dónde guardar el bridge file.
   * Crea el archivo si no existe.
   */
  async selectBridgeFile() {
    if (!McpBridge.isSupported()) {
      throw new Error('Tu navegador no soporta File System Access API. Usa Chrome o Edge.');
    }

    try {
      // Intentar abrir archivo existente primero
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Oráculo Bridge', accept: { 'application/json': ['.json'] } }],
        multiple: false,
        excludeAcceptAllOption: false,
      });

      this._fileHandle = handle;
      this._enabled = true;
      this._saveSettings();
      this._emit('connected', { fileName: handle.name });

      return handle.name;
    } catch (err) {
      if (err.name === 'AbortError') return null; // Usuario canceló
      throw err;
    }
  }

  /**
   * Crea un nuevo bridge file en la ubicación elegida por la usuaria.
   */
  async createBridgeFile() {
    if (!McpBridge.isSupported()) {
      throw new Error('Tu navegador no soporta File System Access API. Usa Chrome o Edge.');
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'oraculo-bridge.json',
        types: [{ description: 'Oráculo Bridge', accept: { 'application/json': ['.json'] } }],
      });

      this._fileHandle = handle;
      this._enabled = true;
      this._saveSettings();
      this._emit('connected', { fileName: handle.name });

      return handle.name;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      throw err;
    }
  }

  // ─────────────────────────────────────────────
  // SINCRONIZACIÓN: APP → BRIDGE FILE
  // ─────────────────────────────────────────────

  /**
   * Exporta los datos actuales al bridge file.
   * Se llama automáticamente al detectar 'data-saved'.
   * Falla silenciosamente si no hay handle o si ya está syncing.
   *
   * @param {object} oraculoData - Datos de Oráculo desde storage
   */
  async syncToBridge(oraculoData) {
    if (!this._enabled || !this._fileHandle || this._syncing) return;

    this._syncing = true;
    try {
      // Leer la queue existente (no queremos machacarla)
      let existingQueue = [];
      try {
        const file = await this._fileHandle.getFile();
        const text = await file.text();
        const existing = JSON.parse(text);
        existingQueue = existing.agentQueue || [];
      } catch { /* bridge file nuevo o corrupto, ok */ }

      const bridge = {
        _bridge: {
          version: BRIDGE_VERSION,
          appVersion: oraculoData.version || '1.5',
          exportedAt: new Date().toISOString(),
          agentQueueCount: existingQueue.filter(a => a.status === 'pending').length,
        },
        data: sanitizeForBridge(oraculoData),
        agentQueue: existingQueue,
      };

      const writable = await this._fileHandle.createWritable();
      await writable.write(JSON.stringify(bridge, null, 2));
      await writable.close();

      this._emit('synced', { exportedAt: bridge._bridge.exportedAt });
    } catch (err) {
      // Perder permisos es normal (ventana cerrada, etc.) — fallar silenciosamente
      console.warn('[McpBridge] Error al sincronizar:', err.message);
      if (err.name === 'NotAllowedError') {
        // El handle ha perdido permisos — pedir de nuevo al usuario
        this._emit('permission-lost');
      }
    } finally {
      this._syncing = false;
    }
  }

  // ─────────────────────────────────────────────
  // LECTURA: BRIDGE FILE → APP (cambios del agente)
  // ─────────────────────────────────────────────

  /**
   * Lee la agentQueue del bridge file y devuelve las acciones pendientes.
   * NO modifica localStorage — solo lee.
   *
   * @returns {{ pending: Action[], total: number }}
   */
  async readAgentQueue() {
    if (!this._enabled || !this._fileHandle) return { pending: [], total: 0 };

    try {
      const file = await this._fileHandle.getFile();
      const text = await file.text();
      const bridge = JSON.parse(text);

      const queue = bridge.agentQueue || [];
      const pending = queue.filter(a => a.status === 'pending');

      return { pending, total: queue.length };
    } catch (err) {
      console.warn('[McpBridge] Error leyendo queue:', err.message);
      return { pending: [], total: 0 };
    }
  }

  /**
   * Verifica si hay acciones pendientes del agente y emite un evento.
   * Se llama al iniciar la app.
   */
  async checkPendingActions() {
    const { pending } = await this.readAgentQueue();
    if (pending.length > 0) {
      this._emit('queue-pending', { count: pending.length, actions: pending });
    }
    return pending;
  }

  /**
   * Marca acciones de la queue como 'applied' o 'rejected'.
   * Se llama desde la UI después de que el usuario apruebe/rechace.
   *
   * @param {string[]} actionIds - IDs a marcar
   * @param {'applied'|'rejected'} status
   */
  async updateQueueStatus(actionIds, status) {
    if (!this._fileHandle) return;

    try {
      const file = await this._fileHandle.getFile();
      const text = await file.text();
      const bridge = JSON.parse(text);

      bridge.agentQueue = (bridge.agentQueue || []).map(action =>
        actionIds.includes(action.id)
          ? { ...action, status, processedAt: new Date().toISOString() }
          : action
      );

      // Limpiar acciones procesadas con más de 7 días (housekeeping)
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      bridge.agentQueue = bridge.agentQueue.filter(a => {
        if (a.status === 'pending') return true;
        return new Date(a.processedAt || a.createdAt).getTime() > cutoff;
      });

      bridge._bridge.agentQueueCount = bridge.agentQueue.filter(a => a.status === 'pending').length;

      const writable = await this._fileHandle.createWritable();
      await writable.write(JSON.stringify(bridge, null, 2));
      await writable.close();
    } catch (err) {
      console.warn('[McpBridge] Error actualizando queue:', err.message);
    }
  }

  /**
   * Rechaza acciones pendientes (las marca como rejected sin aplicarlas).
   * @param {string[]} actionIds
   */
  async rejectPendingActions(actionIds) {
    await this.updateQueueStatus(actionIds, 'rejected');
    this._emit('queue-rejected', { rejected: actionIds });
  }

  /**
   * Aplica las acciones pendientes del agente a los datos de Oráculo.
   * Las acciones aplicadas se marcan en el bridge file.
   * IMPORTANTE: usa saveData() normal para que Drive sync las sincronice.
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
    this._fileHandle = null;
    this._saveSettings();
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
 * Lanza error si la acción no es válida.
 * NO guarda en localStorage — eso lo hace applyPendingActions.
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
 * Debe llamarse en el bootstrap de la app, después de cargar el storage.
 *
 * IMPORTANTE: Solo escucha 'data-saved', NUNCA lo emite.
 * Esto garantiza que Drive sync no sea afectado por las escrituras del bridge.
 *
 * @param {Function} loadDataFn - Función loadData() del módulo de storage activo
 */
export function initMcpBridge(loadDataFn) {
  if (!McpBridge.isSupported()) {
    console.log('[McpBridge] File System Access API no disponible (no Chromium). Bridge desactivado.');
    return;
  }

  if (!mcpBridge.isEnabled) return;

  // Sincronizar al bridge file cada vez que se guardan datos en Oráculo.
  // Drive sync también escucha 'data-saved' — no hay conflicto porque
  // nosotros solo escribimos al archivo externo, no a localStorage.
  window.addEventListener('data-saved', () => {
    const data = loadDataFn();
    // No await — fire and forget para no bloquear el save path
    mcpBridge.syncToBridge(data).catch(() => { /* silencioso */ });
  });

  // También sincronizar cuando Drive trae datos remotos
  // (la app emite 'data-synced-from-cloud' tras applyRemoteData)
  window.addEventListener('data-synced-from-cloud', (e) => {
    if (e.detail?.data) {
      mcpBridge.syncToBridge(e.detail.data).catch(() => { /* silencioso */ });
    }
  });

  // Verificar si hay acciones pendientes del agente al iniciar
  mcpBridge.checkPendingActions().catch(() => { /* silencioso */ });

  console.log('[McpBridge] Inicializado. Bridge file:', mcpBridge.fileName);
}
