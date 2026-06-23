/**
 * Oráculo MCP Server — Store
 *
 * Gestiona la lectura y escritura del bridge file (oraculo-bridge.json).
 * Este archivo es el canal bidireccional entre la app Oráculo y los agentes LLM.
 *
 * Estructura del bridge file:
 * {
 *   _bridge: { version, appVersion, exportedAt, agentQueueCount },
 *   data: { ...oraculoData (sin datos efímeros) },
 *   agentQueue: [ { id, tool, params, createdAt, status } ]
 * }
 *
 * IMPORTANTE: El bridge file NUNCA incluye:
 *   - muevete.timerState (datos efímeros, cambian cada segundo)
 *   - _deletions tombstones (interno de Drive sync)
 *   - Backups/conflictos de Drive
 *   - oraculo_gcal_settings (key separada de localStorage)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const BRIDGE_VERSION = '1.0';

/**
 * Carga el bridge file desde disco.
 * @param {string} bridgePath - Ruta absoluta al bridge file
 * @returns {{ _bridge, data, agentQueue } | null}
 */
export async function loadBridge(bridgePath) {
  const absPath = resolve(bridgePath);

  if (!existsSync(absPath)) {
    return null;
  }

  try {
    const raw = await readFile(absPath, 'utf-8');
    const parsed = JSON.parse(raw);

    // Validación mínima
    if (!parsed._bridge || !parsed.data) {
      throw new Error('Bridge file inválido: faltan campos _bridge o data');
    }

    return parsed;
  } catch (err) {
    throw new Error(`Error leyendo bridge file: ${err.message}`);
  }
}

/**
 * Guarda el bridge file en disco (solo la queue y metadata del agente).
 * Nunca sobreescribe data[] — eso lo hace la app.
 * @param {string} bridgePath
 * @param {object} bridge - Objeto bridge completo
 */
export async function saveBridge(bridgePath, bridge) {
  const absPath = resolve(bridgePath);

  const toWrite = {
    ...bridge,
    _bridge: {
      ...bridge._bridge,
      agentQueueCount: (bridge.agentQueue || []).length,
      lastAgentWriteAt: new Date().toISOString(),
    }
  };

  await writeFile(absPath, JSON.stringify(toWrite, null, 2), 'utf-8');
}

/**
 * Añade una acción a la agentQueue del bridge file.
 * El agente escribe aquí; la app lo lee y aprueba.
 * @param {string} bridgePath
 * @param {string} tool - Nombre de la tool MCP
 * @param {object} params - Parámetros de la tool
 * @returns {string} ID de la acción encolada
 */
export async function enqueueAgentAction(bridgePath, tool, params) {
  const bridge = await loadBridge(bridgePath);
  if (!bridge) throw new Error('Bridge file no encontrado. ¿Está la app sincronizada?');

  const actionId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const action = {
    id: actionId,
    tool,
    params,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };

  bridge.agentQueue = bridge.agentQueue || [];
  bridge.agentQueue.push(action);

  await saveBridge(bridgePath, bridge);

  return actionId;
}

/**
 * Obtiene los datos de Oráculo del bridge file.
 * @param {string} bridgePath
 * @returns {object} oraculoData
 */
export async function getOraculoData(bridgePath) {
  const bridge = await loadBridge(bridgePath);
  if (!bridge) {
    throw new Error(
      'Bridge file no encontrado.\n\n' +
      'Para conectar tu agente con Oráculo:\n' +
      '1. Abre la app Oráculo en Chrome/Edge\n' +
      '2. Ve a Configuración → Agente IA\n' +
      '3. Activa "Sincronización MCP" y selecciona la ubicación del bridge file\n' +
      '4. La app sincronizará automáticamente tus datos'
    );
  }

  return bridge.data;
}

/**
 * Obtiene la info del bridge (metadata).
 * @param {string} bridgePath
 */
export async function getBridgeInfo(bridgePath) {
  const bridge = await loadBridge(bridgePath);
  if (!bridge) return null;

  return {
    bridgeVersion: bridge._bridge.version,
    appVersion: bridge._bridge.appVersion,
    exportedAt: bridge._bridge.exportedAt,
    agentQueueCount: (bridge.agentQueue || []).length,
    pendingActions: (bridge.agentQueue || []).filter(a => a.status === 'pending')
  };
}
