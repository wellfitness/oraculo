/**
 * Oráculo MCP Server — Store (modelo de 2 archivos, dueño único)
 *
 * El canal con la app son DOS archivos dentro de una carpeta, cada uno con
 * un único escritor. Esto elimina de raíz la race condition del modelo de un
 * solo archivo (donde app y servidor reescribían el archivo completo y podían
 * pisarse la cola del agente o los datos de la usuaria):
 *
 *   oraculo-bridge.json  → escribe SOLO la app.   El servidor solo LEE.
 *   { _bridge, data, acks }
 *
 *   oraculo-queue.json   → escribe SOLO el servidor. La app solo LEE.
 *   { _queue, agentQueue }
 *
 * La app informa qué acciones aplicó/rechazó vía `acks` en SU archivo; el
 * servidor lee esos acks y poda su cola. Cada quien escribe solo lo suyo →
 * ninguna escritura concurrente puede perder datos del otro.
 *
 * El data file NUNCA incluye datos efímeros/internos (muevete.timerState,
 * _deletions, _sectionMeta, oraculo_gcal_settings); eso lo garantiza la app.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const QUEUE_VERSION = '1.0';

// Nombres de archivo dentro de la carpeta del bridge (--bridge-dir)
export const DATA_FILE = 'oraculo-bridge.json';
export const QUEUE_FILE = 'oraculo-queue.json';

function dataPath(bridgeDir) {
  return resolve(join(bridgeDir, DATA_FILE));
}

function queuePath(bridgeDir) {
  return resolve(join(bridgeDir, QUEUE_FILE));
}

/**
 * Carga el data file (escrito por la app). Solo lectura desde el servidor.
 * @returns {{ _bridge, data, acks } | null}
 */
export async function loadDataFile(bridgeDir) {
  const absPath = dataPath(bridgeDir);
  if (!existsSync(absPath)) return null;

  try {
    const parsed = JSON.parse(await readFile(absPath, 'utf-8'));
    if (!parsed._bridge || !parsed.data) {
      throw new Error('Data file inválido: faltan campos _bridge o data');
    }
    return parsed;
  } catch (err) {
    throw new Error(`Error leyendo ${DATA_FILE}: ${err.message}`);
  }
}

/**
 * Carga el queue file (escrito por el servidor). Devuelve estructura vacía
 * si aún no existe.
 * @returns {{ _queue, agentQueue }}
 */
export async function loadQueueFile(bridgeDir) {
  const absPath = queuePath(bridgeDir);
  if (!existsSync(absPath)) {
    return { _queue: { version: QUEUE_VERSION }, agentQueue: [] };
  }

  try {
    const parsed = JSON.parse(await readFile(absPath, 'utf-8'));
    return {
      _queue: parsed._queue || { version: QUEUE_VERSION },
      agentQueue: parsed.agentQueue || [],
    };
  } catch (err) {
    throw new Error(`Error leyendo ${QUEUE_FILE}: ${err.message}`);
  }
}

/**
 * Guarda el queue file. ÚNICO escritor de este archivo es el servidor.
 */
export async function saveQueueFile(bridgeDir, queue) {
  const toWrite = {
    _queue: {
      version: QUEUE_VERSION,
      lastAgentWriteAt: new Date().toISOString(),
    },
    agentQueue: queue.agentQueue || [],
  };
  await writeFile(queuePath(bridgeDir), JSON.stringify(toWrite, null, 2), 'utf-8');
}

/**
 * Lee los IDs de acciones ya acuseadas por la app (aplicadas o rechazadas).
 * El servidor usa esto para podar su cola sin escribir el data file.
 */
async function ackedIds(bridgeDir) {
  const dataFile = await loadDataFile(bridgeDir).catch(() => null);
  const acks = dataFile?.acks || [];
  return new Set(acks.map(a => a.id));
}

/**
 * Añade una acción a la cola y poda las ya acuseadas por la app.
 * El agente escribe aquí; la app lo lee y aprueba.
 * @returns {string} ID de la acción encolada
 */
export async function enqueueAgentAction(bridgeDir, tool, params) {
  const queue = await loadQueueFile(bridgeDir);
  const acked = await ackedIds(bridgeDir);

  // Poda: quitar de la cola lo que la app ya procesó (acuseó vía acks)
  queue.agentQueue = (queue.agentQueue || []).filter(a => !acked.has(a.id));

  const actionId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  queue.agentQueue.push({
    id: actionId,
    tool,
    params,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });

  await saveQueueFile(bridgeDir, queue);
  return actionId;
}

const NOT_CONNECTED_MSG =
  'Bridge no encontrado.\n\n' +
  'Para conectar tu agente con Oráculo:\n' +
  '1. Abre la app Oráculo en Chrome/Edge\n' +
  '2. Ve a Configuración → Agente IA\n' +
  '3. Activa la sincronización y elige la CARPETA del Agente IA\n' +
  '4. Pasa esa misma carpeta al servidor con --bridge-dir';

/**
 * Obtiene los datos de Oráculo del data file (escrito por la app).
 * @returns {object} oraculoData
 */
export async function getOraculoData(bridgeDir) {
  const dataFile = await loadDataFile(bridgeDir);
  if (!dataFile) throw new Error(NOT_CONNECTED_MSG);
  return dataFile.data;
}

/**
 * Metadata combinada: info del data file + pendientes reales de la cola.
 * Pendientes = acciones de la cola que la app aún no ha acuseado.
 */
export async function getBridgeInfo(bridgeDir) {
  const dataFile = await loadDataFile(bridgeDir);
  if (!dataFile) return null;

  const queue = await loadQueueFile(bridgeDir);
  const acked = await ackedIds(bridgeDir);
  const pendingActions = (queue.agentQueue || []).filter(a => !acked.has(a.id));

  return {
    bridgeVersion: dataFile._bridge.version,
    appVersion: dataFile._bridge.appVersion,
    exportedAt: dataFile._bridge.exportedAt,
    agentQueueCount: pendingActions.length,
    pendingActions,
  };
}
