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
    getKey: (item) => `${item.habitId || ''}:${item.date || ''}`
  },

  // Objetos atomicos → LWW por seccion
  'settings':                        { type: 'atomic', path: 'settings' },
  'onboarding':                      { type: 'atomic', path: 'onboarding' },
  'notebook':                        { type: 'atomic', path: 'notebook' },
  'dailySetup':                      { type: 'atomic', path: 'dailySetup' },
  'burkemanSettings':                { type: 'atomic', path: 'burkemanSettings' },
  'muevete':                         { type: 'atomic', path: 'muevete' },
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
 * Si no hay metadata, devuelve 0 (desconocido), NO el updatedAt raiz.
 * Esto evita que un lado gane TODAS las secciones atomicas por un solo cambio.
 */
function getSectionTimestamp(data, sectionKey) {
  const meta = data._sectionMeta?.[sectionKey];
  if (meta?.updatedAt) {
    return new Date(meta.updatedAt).getTime() || 0;
  }
  // Sin metadata = no sabemos cuando fue modificada esta seccion
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

  for (const item of (localArr || [])) {
    const key = keyFn(item);
    if (key) {
      localMap.set(key, item);
    } else {
      console.warn(`[GDrive Merge] Item sin clave en ${sectionKey}, se conservara`, item);
      localMap.set(`_orphan_${Math.random()}`, item);
    }
  }
  for (const item of (remoteArr || [])) {
    const key = keyFn(item);
    if (key) {
      remoteMap.set(key, item);
    } else {
      remoteMap.set(`_orphan_${Math.random()}`, item);
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
      const item = localMap.get(key) || remoteMap.get(key);
      if (item) {
        const itemTs = getItemTimestamp(item);
        const tombstoneTs = localTombstone
          ? new Date(localTombstone.deletedAt).getTime()
          : new Date(remoteTombstone.deletedAt).getTime();

        if (itemTs > tombstoneTs) {
          // Item fue modificado DESPUES del borrado → resucitar
          result.push(item);
          continue;
        }
      }
      // Borrado gana
      continue;
    }

    if (inLocal && !inRemote) {
      // Solo en local → nuevo item creado localmente
      result.push(JSON.parse(JSON.stringify(localMap.get(key))));
    } else if (!inLocal && inRemote) {
      // Solo en remote → nuevo item creado en otro dispositivo
      result.push(remoteMap.get(key));
    } else {
      // En ambos → comparar timestamps
      const localItem = localMap.get(key);
      const remoteItem = remoteMap.get(key);
      const localTs = getItemTimestamp(localItem);
      const remoteTs = getItemTimestamp(remoteItem);

      if (localTs === remoteTs) {
        // Sin cambios → mantener remote (es la base clonada)
        result.push(remoteItem);
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
        // Remote mas reciente
        result.push(remoteItem);
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

  // Preservar campos raiz que no estan en SECTION_REGISTRY
  // Tomar la version mas alta entre local y remote
  if (clonedLocal.version && remoteData.version) {
    merged.version = clonedLocal.version > remoteData.version
      ? clonedLocal.version : remoteData.version;
  } else {
    merged.version = clonedLocal.version || remoteData.version;
  }

  if (clonedLocal.createdAt && !merged.createdAt) {
    merged.createdAt = clonedLocal.createdAt;
  }

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
