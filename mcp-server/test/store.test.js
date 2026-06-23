/**
 * Tests del store del servidor MCP (modelo de 2 archivos, dueño único).
 *
 * Diseño bajo prueba:
 *   - oraculo-bridge.json  → escribe SOLO la app; el servidor solo lee.
 *   - oraculo-queue.json   → escribe SOLO el servidor; la app solo lee.
 *
 * La race del modelo de un archivo era imposible de evitar porque ambos
 * reescribían el archivo completo. Con dueño único por archivo, una escritura
 * concurrente de la app al data file NO puede perder una acción del queue file.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  enqueueAgentAction,
  getOraculoData,
  getBridgeInfo,
  loadQueueFile,
  DATA_FILE,
  QUEUE_FILE,
} from '../src/store.js';

async function freshDir() {
  const dir = await mkdtemp(join(tmpdir(), 'oraculo-mcp-'));
  return dir;
}

function seedDataFile(dir, { data = {}, acks = [] } = {}) {
  const content = {
    _bridge: { version: '1.0', appVersion: '2.4.0', exportedAt: new Date().toISOString() },
    data: { version: '2.4.0', journal: [], objectives: { daily: [] }, ...data },
    acks,
  };
  return writeFile(join(dir, DATA_FILE), JSON.stringify(content, null, 2), 'utf-8');
}

test('enqueueAgentAction escribe la cola en el queue file', async () => {
  const dir = await freshDir();
  await seedDataFile(dir);

  const id = await enqueueAgentAction(dir, 'add_task', { text: 'comprar pan', horizon: 'daily' });

  const queue = await loadQueueFile(dir);
  const ids = queue.agentQueue.map(a => a.id);
  assert.ok(ids.includes(id), 'la acción encolada debe estar en el queue file');
  assert.equal(queue.agentQueue.find(a => a.id === id).tool, 'add_task');

  await rm(dir, { recursive: true, force: true });
});

test('enqueueAgentAction NUNCA modifica el data file (dueño único)', async () => {
  const dir = await freshDir();
  await seedDataFile(dir, { data: { tag: 'app-v1' } });

  const before = await readFile(join(dir, DATA_FILE), 'utf-8');
  await enqueueAgentAction(dir, 'add_journal_entry', { type: 'meditacion', content: 'hola' });
  const after = await readFile(join(dir, DATA_FILE), 'utf-8');

  assert.equal(after, before, 'el servidor no debe tocar el data file de la app');

  await rm(dir, { recursive: true, force: true });
});

test('getOraculoData lee el data file (no el queue file)', async () => {
  const dir = await freshDir();
  await seedDataFile(dir, { data: { tag: 'datos-de-la-app' } });

  const data = await getOraculoData(dir);
  assert.equal(data.tag, 'datos-de-la-app');

  await rm(dir, { recursive: true, force: true });
});

test('enqueueAgentAction poda acciones ya acuseadas por la app (acks)', async () => {
  const dir = await freshDir();
  // La app ya aplicó a1 y lo informó vía acks en SU archivo
  await seedDataFile(dir, { acks: [{ id: 'a1', status: 'applied', processedAt: new Date().toISOString() }] });
  // El servidor tenía a1 pendiente en su cola
  await writeFile(join(dir, QUEUE_FILE), JSON.stringify({
    _queue: { version: '1.0' },
    agentQueue: [{ id: 'a1', tool: 'add_task', params: {}, status: 'pending', createdAt: new Date().toISOString() }],
  }), 'utf-8');

  await enqueueAgentAction(dir, 'add_task', { text: 'nueva', horizon: 'daily' });

  const queue = await loadQueueFile(dir);
  const ids = queue.agentQueue.map(a => a.id);
  assert.ok(!ids.includes('a1'), 'a1 ya fue acuseada por la app → debe podarse de la cola');
  assert.equal(queue.agentQueue.length, 1, 'solo debe quedar la nueva acción');

  await rm(dir, { recursive: true, force: true });
});

test('REGRESIÓN race: la app reescribe el data file mientras el servidor encola → la acción sobrevive', async () => {
  const dir = await freshDir();
  await seedDataFile(dir, { data: { tag: 'v1' } });

  // El servidor empieza a encolar (lee su queue file)
  // La app, en paralelo, reescribe SU data file (lo que antes machacaba la cola)
  const appWrite = seedDataFile(dir, { data: { tag: 'v2-editado-por-usuaria' } });
  const enqueue = enqueueAgentAction(dir, 'add_journal_entry', { type: 'meditacion', content: 'del agente' });

  await Promise.all([appWrite, enqueue]);

  // La acción del agente sobrevive (está en otro archivo)
  const queue = await loadQueueFile(dir);
  assert.equal(queue.agentQueue.length, 1, 'la acción del agente NO se pierde');
  assert.equal(queue.agentQueue[0].tool, 'add_journal_entry');

  // Y la edición de la app sobrevive (el servidor no la tocó)
  const data = await getOraculoData(dir);
  assert.equal(data.tag, 'v2-editado-por-usuaria', 'la edición de la app NO se pierde');

  await rm(dir, { recursive: true, force: true });
});

test('getBridgeInfo informa la cuenta de pendientes leyendo ambos archivos', async () => {
  const dir = await freshDir();
  await seedDataFile(dir);
  await enqueueAgentAction(dir, 'add_task', { text: 't1', horizon: 'daily' });
  await enqueueAgentAction(dir, 'add_task', { text: 't2', horizon: 'weekly' });

  const info = await getBridgeInfo(dir);
  assert.equal(info.pendingActions.length, 2);

  await rm(dir, { recursive: true, force: true });
});
