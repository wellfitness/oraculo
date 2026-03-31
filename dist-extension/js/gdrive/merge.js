/**
 * Google Drive Sync - Motor de Merge
 *
 * Modulo PURO: solo transforma datos, sin side effects.
 * No toca localStorage, no dispara eventos, no hace fetch.
 *
 * Estrategia de 3 capas:
 *  1. Secciones atomicas → LWW por seccion (via _sectionMeta timestamps)
 *  2. Arrays con IDs → merge item-level (union + LWW por item)
 *  3. Conflictos del mismo item → guarda version descartada en conflicts[]
 */

// ───────────────────────────────────────────────
// Registro de secciones y estrategia de merge
// ───────────────────────────────────────────────

/**
 * Cada seccion del data model con su estrategia de merge.
 *
 * Tipos:
 *  - 'array': merge item-level por ID (union + LWW por item)
 *  - 'append-set': merge por clave sintetica (para arrays sin campo 'id')
 *  - 'atomic': LWW a nivel de seccion completa
 *
 * getKey: funcion para generar clave unica en arrays 'append-set'
 */
const SECTION_REGISTRY = {
  // Arrays con IDs → merge item-level
  'values':                          { type: 'array', path: 'values' },
  'objectives.backlog':              { type: 'array', path: 'objectives.backlog' },
  'objectives.quarterly':            { type: 'array', path: 'objectives.quarterly' },
  'objectives.monthly':              { type: 'array', path: 'objectives.monthly' },
  'objectives.weekly':               { type: 'array', path: 'objectives.weekly' },
  'objectives.daily':                { type: 'array', path: 'objectives.daily' },
  'objectives.completed':            { type: 'array', path: 'objectives.completed' },
  'habits.graduated':                { type: 'array', path: 'habits.graduated' },
  'habits.audit.activities':         { type: 'array', path: 'habits.audit.activities' },
  'calendar.events':                 { type: 'array', path: 'calendar.events' },
  'calendar.recurring':              { type: 'array', path: 'calendar.recurring' },
  'journal':                         { type: 'array', path: 'journal' },
  'projects':                        { type: 'array', path: 'projects' },
  'spontaneousAchievements':         { type: 'array', path: 'spontaneousAchievements' },
  'atelicActivities':                { type: 'array', path: 'atelicActivities' },
  'lifeWheel.evaluations':           { type: 'array', path: 'lifeWheel.evaluations' },
  'objectiveEvaluation.evaluations': { type: 'array', path: 'objectiveEvaluation.evaluations' },
  'archivedNotebooks':               { type: 'array', path: 'archivedNotebooks' },

  // Array sin campo 'id' → merge por clave sintetica
  'habits.history': {
    type: 'append-set',
    path: 'habits.history',
    getKey: (item) => {
      const k = `${item.habitId || ''}:${item.date || ''}`;
      return k === ':' ? null : k; // null si ambos campos vacios
    }
  },

  // habits.audit.lastAuditAt se preserva como sub-campo atomico
  // Se procesa ANTES de habits.audit.activities para que el merge de activities lo refine
  'habits.audit.lastAuditAt':        { type: 'atomic', path: 'habits.audit.lastAuditAt' },

  // Objetos atomicos → LWW por seccion
  'settings':                        { type: 'atomic', path: 'settings' },
  'onboarding':                      { type: 'atomic', path: 'onboarding' },
  'notebook':                        { type: 'atomic', path: 'notebook' },
  'dailySetup':                      { type: 'atomic', path: 'dailySetup' },
  'burkemanSettings':                { type: 'atomic', path: 'burkemanSettings' },
  'muevete.timerState':               { type: 'atomic', path: 'muevete.timerState' },
  'muevete.activityLog':              { type: 'atomic', path: 'muevete.activityLog' },
  'lifeWheel.areas':                 { type: 'atomic', path: 'lifeWheel.areas' },
  'lifeWheel.settings':              { type: 'atomic', path: 'lifeWheel.settings' },
  'objectiveEvaluation.criteria':    { type: 'atomic', path: 'objectiveEvaluation.criteria' },
  'objectiveEvaluation.thresholds':  { type: 'atomic', path: 'objectiveEvaluation.thresholds' },
  'habits.active':                   { type: 'atomic', path: 'habits.active' },
};

// Tombstones mas viejos que esto se eliminan automaticamente
const TOMBSTONE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

// ───────────────────────────────────────────────
// Helpers de navegacion por dot-path
// ───────────────────────────────────────────────

/**
 * Lee un valor en un objeto usando ruta con puntos.
 * getSection({ a: { b: [1,2] } }, 'a.b') → [1,2]
 */
function getSection(data, dotPath) {
  const parts = dotPath.split('.');
  let current = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

/**
 * Asigna un valor en un objeto usando ruta con puntos.
 * Crea objetos intermedios si no existen.
 */
function setSection(data, dotPath, value) {
  const parts = dotPath.split('.');
  let current = data;
  for (let i = 0; i < parts.length - 1; i++) {
    if (current[parts[i]] == null || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// ───────────────────────────────────────────────
// Timestamps
// ───────────────────────────────────────────────

/**
 * Obtiene el timestamp de un item individual.
 * Prioridad: updatedAt > completedAt > createdAt > 0
 */
function getItemTimestamp(item) {
  if (!item) return 0;
  const ts = item.updatedAt || item.completedAt || item.createdAt;
  if (!ts) return 0;
  return new Date(ts).getTime() || 0;
}

/**
 * Indica si un item fue MODIFICADO (no solo creado).
 * updatedAt o completedAt indican actividad posterior a la creacion.
 */
function wasModified(item) {
  if (!item) return false;
  return !!(item.updatedAt || item.completedAt);
}

/**
 * Obtiene el timestamp de una seccion desde _sectionMeta.
 * Busca match exacto primero, luego ancestros en la cadena de dot-path.
 *
 * Ejemplo: para 'habits.active', busca en orden:
 *   1. _sectionMeta['habits.active'] (match exacto)
 *   2. _sectionMeta['habits'] (ancestro)
 *
 * Esto resuelve el mismatch entre lo que los modulos estampan
 * (ej: 'habits', 'objectives', 'calendar') y lo que el registry
 * busca (ej: 'habits.active', 'objectives.daily', 'calendar.events').
 *
 * Si no hay metadata en ningun nivel, devuelve 0.
 */
function getSectionTimestamp(data, sectionKey) {
  const meta = data._sectionMeta;
  if (!meta) return 0;

  // 1. Match exacto
  if (meta[sectionKey]?.updatedAt) {
    return new Date(meta[sectionKey].updatedAt).getTime() || 0;
  }

  // 2. Buscar ancestros (habits.active → habits)
  const parts = sectionKey.split('.');
  for (let i = parts.length - 1; i > 0; i--) {
    const ancestor = parts.slice(0, i).join('.');
    if (meta[ancestor]?.updatedAt) {
      return new Date(meta[ancestor].updatedAt).getTime() || 0;
    }
  }

  return 0;
}

// ───────────────────────────────────────────────
// Tombstones (registro de borrados)
// ───────────────────────────────────────────────

/**
 * Extrae los tombstones de una seccion como Map(itemId → tombstone).
 */
function getTombstoneMap(data, sectionKey) {
  const deletions = data._deletions || [];
  const map = new Map();
  for (const d of deletions) {
    if (d.section === sectionKey) {
      map.set(d.itemId, d);
    }
  }
  return map;
}

/**
 * Une las listas de tombstones de ambos lados.
 * Deduplicando: si el mismo item aparece en ambos, mantiene el mas reciente.
 * Prune los que tengan mas de TOMBSTONE_MAX_AGE_MS.
 */
function mergeDeletions(localDeletions, remoteDeletions) {
  const now = Date.now();
  const map = new Map(); // key → tombstone mas reciente

  const all = [...(localDeletions || []), ...(remoteDeletions || [])];

  for (const d of all) {
    const key = `${d.section}:${d.itemId}`;
    const existing = map.get(key);
    if (!existing || new Date(d.deletedAt) > new Date(existing.deletedAt)) {
      map.set(key, d);
    }
  }

  // Prune tombstones viejos
  const merged = [];
  for (const d of map.values()) {
    const age = now - new Date(d.deletedAt).getTime();
    if (age < TOMBSTONE_MAX_AGE_MS) {
      merged.push(d);
    }
  }
  return merged;
}

// ───────────────────────────────────────────────
// Merge de arrays con IDs
// ───────────────────────────────────────────────

/**
 * Merge item-level de dos arrays.
 *
 * Estrategia:
 * - Items solo en local (y no borrados en remote) → mantener
 * - Items solo en remote (y no borrados en local) → mantener
 * - Items borrados en un lado: comparar tombstone vs item timestamp
 *   (si item fue modificado DESPUES del borrado, resucitar)
 * - Items en ambos → LWW por item; conflicto solo si ambos fueron MODIFICADOS
 *
 * @param {Function|null} getKey - Funcion para generar clave (null = usar item.id)
 * @returns {{ result: Array, conflicts: Array }}
 */
function mergeArrays(localArr, remoteArr, sectionKey, localData, remoteData, getKey) {
  const keyFn = getKey || ((item) => item?.id);
  const localMap = new Map();
  const remoteMap = new Map();

  // Hash determinista basado en contenido (evita duplicacion en merges sucesivos)
  const hashItem = (item) => `_orphan_${JSON.stringify(item)}`;

  for (const item of (localArr || [])) {
    const key = keyFn(item);
    if (key) {
      localMap.set(key, item);
    } else {
      console.warn(`[GDrive Merge] Item sin clave en ${sectionKey}, se conservara`);
      localMap.set(hashItem(item), item);
    }
  }
  for (const item of (remoteArr || [])) {
    const key = keyFn(item);
    if (key) {
      remoteMap.set(key, item);
    } else {
      remoteMap.set(hashItem(item), item);
    }
  }

  const localTombstones = getTombstoneMap(localData, sectionKey);
  const remoteTombstones = getTombstoneMap(remoteData, sectionKey);

  const result = [];
  const conflicts = [];

  // Procesar todos los IDs de ambos lados
  const allKeys = new Set([...localMap.keys(), ...remoteMap.keys()]);

  for (const key of allKeys) {
    const inLocal = localMap.has(key);
    const inRemote = remoteMap.has(key);
    const localTombstone = localTombstones.get(key);
    const remoteTombstone = remoteTombstones.get(key);

    // Decidir si un borrado se honra o si el item resucita
    if (localTombstone || remoteTombstone) {
      // Elegir la version mas reciente del item si existe en ambos lados
      const localItem = localMap.get(key);
      const remoteItem = remoteMap.get(key);
      const item = (localItem && remoteItem)
        ? (getItemTimestamp(localItem) >= getItemTimestamp(remoteItem) ? localItem : remoteItem)
        : (localItem || remoteItem);

      if (item) {
        const itemTs = getItemTimestamp(item);
        const tombstoneTs = localTombstone
          ? new Date(localTombstone.deletedAt).getTime()
          : new Date(remoteTombstone.deletedAt).getTime();

        if (itemTs > tombstoneTs) {
          // Item fue modificado DESPUES del borrado → resucitar (clonado)
          result.push(JSON.parse(JSON.stringify(item)));
          continue;
        }
      }
      // Borrado gana
      continue;
    }

    if (inLocal && !inRemote) {
      // Solo en local → nuevo item creado localmente (clonado)
      result.push(JSON.parse(JSON.stringify(localMap.get(key))));
    } else if (!inLocal && inRemote) {
      // Solo en remote → nuevo item creado en otro dispositivo (clonado)
      result.push(JSON.parse(JSON.stringify(remoteMap.get(key))));
    } else {
      // En ambos → comparar timestamps
      const localItem = localMap.get(key);
      const remoteItem = remoteMap.get(key);
      const localTs = getItemTimestamp(localItem);
      const remoteTs = getItemTimestamp(remoteItem);

      if (localTs === remoteTs) {
        // Sin cambios → mantener remote (clonado)
        result.push(JSON.parse(JSON.stringify(remoteItem)));
      } else if (localTs > remoteTs) {
        // Local mas reciente
        result.push(JSON.parse(JSON.stringify(localItem)));
        // Conflicto solo si AMBOS fueron modificados (no solo creados)
        if (wasModified(remoteItem) && wasModified(localItem)) {
          conflicts.push({
            section: sectionKey,
            itemId: key,
            kept: 'local',
            keptVersion: localItem,
            discardedVersion: remoteItem,
            resolvedAt: new Date().toISOString(),
          });
        }
      } else {
        // Remote mas reciente (clonado)
        result.push(JSON.parse(JSON.stringify(remoteItem)));
        if (wasModified(localItem) && wasModified(remoteItem)) {
          conflicts.push({
            section: sectionKey,
            itemId: key,
            kept: 'remote',
            keptVersion: remoteItem,
            discardedVersion: localItem,
            resolvedAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  return { result, conflicts };
}

// ───────────────────────────────────────────────
// Merge principal
// ───────────────────────────────────────────────

/**
 * Merge inteligente entre datos locales y remotos.
 *
 * Para secciones atomicas: LWW basado en _sectionMeta timestamps.
 * Para arrays con IDs: merge item-level con deteccion de conflictos.
 * Para append-sets: merge por clave sintetica (union sin duplicados).
 *
 * @param {object} localData - Datos del localStorage
 * @param {object} remoteData - Datos de Google Drive
 * @returns {{ merged: object, conflicts: Array }}
 */
/**
 * Reconcilia operaciones "move" en objectives despues del merge.
 *
 * Problema: el merge trata cada sub-array (weekly, completed, etc.) de forma
 * independiente. Cuando una tarea se "mueve" (ej: weekly → completed), el merge
 * puede acabar con el item en ambos arrays. Esta funcion limpia esos duplicados:
 *
 * 1. Si un item esta en completed Y en un horizonte → eliminarlo del horizonte
 * 2. Si un item aparece varias veces en completed → deduplicar
 */
function reconcileObjectiveMoves(data) {
  const completed = getSection(data, 'objectives.completed');
  if (!Array.isArray(completed) || completed.length === 0) return;

  const completedIds = new Set(completed.map(item => item.id).filter(Boolean));

  // Eliminar de horizontes los items que ya estan en completed
  const horizons = ['backlog', 'quarterly', 'monthly', 'weekly', 'daily'];
  for (const h of horizons) {
    const arr = getSection(data, `objectives.${h}`);
    if (!Array.isArray(arr)) continue;
    const filtered = arr.filter(item => !completedIds.has(item.id));
    if (filtered.length !== arr.length) {
      console.log(
        `[GDrive Merge] Reconciliacion: ${arr.length - filtered.length} ` +
        `duplicado(s) eliminados de objectives.${h}`
      );
      setSection(data, `objectives.${h}`, filtered);
    }
  }

  // Deduplicar dentro de completed (mismo ID varias veces)
  const seen = new Set();
  const dedupedCompleted = completed.filter(item => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  if (dedupedCompleted.length !== completed.length) {
    console.log(
      `[GDrive Merge] Deduplicacion: ${completed.length - dedupedCompleted.length} ` +
      `copia(s) eliminada(s) de completed`
    );
    setSection(data, 'objectives.completed', dedupedCompleted);
  }
}

export function mergeData(localData, remoteData) {
  // Deep clone de ambos lados para evitar mutacion cruzada
  const clonedLocal = JSON.parse(JSON.stringify(localData));
  const merged = JSON.parse(JSON.stringify(remoteData));
  const allConflicts = [];

  // Asegurar que _sectionMeta y _deletions existen en merged
  if (!merged._sectionMeta) merged._sectionMeta = {};
  if (!merged._deletions) merged._deletions = [];

  for (const [sectionKey, config] of Object.entries(SECTION_REGISTRY)) {
    const localTs = getSectionTimestamp(clonedLocal, sectionKey);
    const remoteTs = getSectionTimestamp(remoteData, sectionKey);

    if (config.type === 'atomic') {
      // LWW por seccion: si local es mas reciente, usar local
      // Si ambos son 0 (sin metadata), remote gana por defecto (es la base)
      if (localTs > remoteTs) {
        const localValue = getSection(clonedLocal, config.path);
        if (localValue !== undefined) {
          setSection(merged, config.path, JSON.parse(JSON.stringify(localValue)));
          merged._sectionMeta[sectionKey] = {
            updatedAt: clonedLocal._sectionMeta?.[sectionKey]?.updatedAt
              || new Date().toISOString()
          };
        }
      }
      // Si remote es mas reciente o igual, ya esta en merged (es la base)
    } else if (config.type === 'array' || config.type === 'append-set') {
      const localArr = getSection(clonedLocal, config.path);
      const remoteArr = getSection(remoteData, config.path);
      const getKeyFn = config.getKey || null;

      const { result, conflicts } = mergeArrays(
        localArr, remoteArr, sectionKey, clonedLocal, remoteData, getKeyFn
      );

      setSection(merged, config.path, result);
      allConflicts.push(...conflicts);

      // _sectionMeta: usar el mas reciente de ambos (o now si ambos son 0)
      const newerTs = Math.max(localTs, remoteTs);
      merged._sectionMeta[sectionKey] = {
        updatedAt: newerTs > 0
          ? new Date(newerTs).toISOString()
          : new Date().toISOString()
      };
    }
  }

  // Merge de tombstones
  merged._deletions = mergeDeletions(
    clonedLocal._deletions,
    remoteData._deletions
  );

  // Preservar secciones no registradas del lado local (forward-compatibility)
  const registeredPaths = new Set(
    Object.values(SECTION_REGISTRY).map(c => c.path.split('.')[0])
  );
  const internalKeys = new Set([
    'version', 'createdAt', 'updatedAt', '_sectionMeta', '_deletions'
  ]);
  for (const key of Object.keys(clonedLocal)) {
    if (!registeredPaths.has(key) && !internalKeys.has(key) && !(key in merged)) {
      merged[key] = clonedLocal[key];
    }
  }

  // Tomar la version mas alta (comparacion numerica para evitar problemas con '1.10' > '1.9')
  const localVer = parseFloat(clonedLocal.version) || 0;
  const remoteVer = parseFloat(remoteData.version) || 0;
  merged.version = (localVer >= remoteVer ? clonedLocal.version : remoteData.version)
    || clonedLocal.version || remoteData.version;

  if (clonedLocal.createdAt && !merged.createdAt) {
    merged.createdAt = clonedLocal.createdAt;
  }

  // Reconciliar objectives: eliminar duplicados cross-array
  // (un item completado no debe seguir en su horizonte original)
  reconcileObjectiveMoves(merged);

  // Nuevo timestamp raiz
  merged.updatedAt = new Date().toISOString();

  console.log(
    `[GDrive Merge] Completado: ${allConflicts.length} conflicto(s) detectado(s)`
  );

  return { merged, conflicts: allConflicts };
}

/**
 * Determina si los datos son "vacios" (sin contenido real del usuario).
 * Util para anti-regresion: no sobrescribir datos ricos con datos vacios.
 */
export function isEmptyData(data) {
  if (!data) return true;
  const hasValues = (data.values?.length || 0) > 0;
  const hasObjectives = Object.values(data.objectives || {})
    .some(arr => arr?.length > 0);
  const hasJournal = (data.journal?.length || 0) > 0;
  const hasProjects = (data.projects?.length || 0) > 0;
  const hasHabit = !!data.habits?.active;
  const hasGraduated = (data.habits?.graduated?.length || 0) > 0;
  return !hasValues && !hasObjectives && !hasJournal
    && !hasProjects && !hasHabit && !hasGraduated;
}

/**
 * Calcula un score de "riqueza" de datos.
 * Adaptado del modulo Supabase: ponderaciones por tipo de contenido.
 * Usado para anti-regresion (evitar que datos pobres sobrescriban datos ricos).
 */
export function calculateDataRichness(data) {
  if (!data) return 0;
  let score = 0;

  // Valores: peso 2
  score += (data.values?.length || 0) * 2;

  // Objetivos: peso variable
  const obj = data.objectives || {};
  score += (obj.quarterly?.length || 0) * 2;
  score += (obj.monthly?.length || 0) * 2;
  score += (obj.weekly?.length || 0) * 2;
  score += (obj.daily?.length || 0) * 1;
  score += (obj.backlog?.length || 0) * 1;

  // Proyectos: peso 3 (alto valor personal)
  score += (data.projects?.length || 0) * 3;

  // Diario: peso 3 (contenido personal irremplazable)
  score += (data.journal?.length || 0) * 3;

  // Habitos
  if (data.habits?.active) score += 5;
  score += (data.habits?.graduated?.length || 0) * 3;
  score += (data.habits?.history?.length || 0) * 1;

  // Calendario: peso 2
  score += (data.calendar?.events?.length || 0) * 2;
  score += (data.calendar?.recurring?.length || 0) * 2;

  // Logros espontaneos: peso 2
  score += (data.spontaneousAchievements?.length || 0) * 2;

  // Actividades atelicas: peso 1
  score += (data.atelicActivities?.length || 0) * 1;

  // Life Wheel evaluaciones: peso 2
  score += (data.lifeWheel?.evaluations?.length || 0) * 2;

  return score;
}
