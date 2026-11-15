/**
 * Oráculo - Reglas de tareas en un solo sitio
 *
 * Límites de cada horizonte, marca de «importante» y desvinculación de
 * proyecto. Este módulo no importa nada: es lógica pura y comprobable.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  LIMITS, IMPORTANT_TASK_TYPE, getDailyLimit, getHorizonLimit, countActive,
  isHorizonFull, isImportantTask, unlinkProjectTasks, fechaDeCompletado
} from '../js/utils/objectives.js';

const tareas = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, completed: false }));

describe('límites', () => {
  it('el límite diario sale del setup de hoy y si no hay setup vale 3', () => {
    assert.strictEqual(getDailyLimit({ dailySetup: { date: '2026-11-13', dailyLimit: 1 } }, '2026-11-13'), 1);
    assert.strictEqual(getDailyLimit({ dailySetup: { date: '2026-11-12', dailyLimit: 1 } }, '2026-11-13'), 3);
    assert.strictEqual(getDailyLimit({}, '2026-11-13'), 3);
    assert.strictEqual(getDailyLimit({ dailySetup: null }, '2026-11-13'), 3);
  });
  it('getHorizonLimit', () => {
    assert.strictEqual(getHorizonLimit({}, 'quarterly'), 3);
    assert.strictEqual(getHorizonLimit({}, 'monthly'), 6);
    assert.strictEqual(getHorizonLimit({}, 'weekly'), 10);
    assert.strictEqual(getHorizonLimit({}, 'backlog'), null);
    assert.strictEqual(LIMITS.daily, 3);
  });
  it('countActive ignora las completadas y admite listas ausentes', () => {
    assert.strictEqual(countActive([{ completed: true }, { completed: false }, {}]), 2);
    assert.strictEqual(countActive(undefined), 0);
  });
  it('isHorizonFull', () => {
    assert.strictEqual(isHorizonFull({ objectives: { quarterly: tareas(3) } }, 'quarterly'), true);
    assert.strictEqual(isHorizonFull({ objectives: { quarterly: tareas(2) } }, 'quarterly'), false);
    assert.strictEqual(isHorizonFull({ objectives: { backlog: tareas(50) } }, 'backlog'), false);
    assert.strictEqual(isHorizonFull({ objectives: {} }, 'weekly'), false);
    const hoy = new Date().toLocaleDateString('en-CA');
    assert.strictEqual(isHorizonFull({ dailySetup: { date: hoy, dailyLimit: 1 }, objectives: { daily: tareas(1) } }, 'daily'), true);
  });
});

describe('importante', () => {
  it('reconoce el valor actual y el heredado de la captura', () => {
    assert.strictEqual(IMPORTANT_TASK_TYPE, 'importante');
    assert.strictEqual(isImportantTask({ taskType: 'importante' }), true);
    assert.strictEqual(isImportantTask({ taskType: 'important' }), true);
    assert.strictEqual(isImportantTask({ taskType: null }), false);
    assert.strictEqual(isImportantTask(undefined), false);
  });
});

describe('unlinkProjectTasks', () => {
  it('desvincula en las seis listas y cuenta', () => {
    const o = {
      backlog: [{ projectId: 'p1' }], quarterly: [{ projectId: 'p2' }], monthly: [],
      weekly: [{ projectId: 'p1' }], daily: [], completed: [{ projectId: 'p1' }]
    };
    assert.strictEqual(unlinkProjectTasks(o, 'p1'), 3);
    assert.strictEqual(o.backlog[0].projectId, null);
    assert.strictEqual(o.weekly[0].projectId, null);
    assert.strictEqual(o.completed[0].projectId, null);
    assert.strictEqual(o.quarterly[0].projectId, 'p2');
  });
  it('admite listas ausentes', () => assert.strictEqual(unlinkProjectTasks({}, 'p1'), 0));
});

describe('fechaDeCompletado', () => {
  it('usa la fecha de completado', () => {
    const fecha = fechaDeCompletado({ completedAt: '2026-11-14T10:00:00.000Z' });
    assert.strictEqual(fecha.toISOString(), '2026-11-14T10:00:00.000Z');
  });
  it('cae en la de actualización si no hay de completado', () => {
    const fecha = fechaDeCompletado({ updatedAt: '2026-11-13T10:00:00.000Z' });
    assert.strictEqual(fecha.toISOString(), '2026-11-13T10:00:00.000Z');
  });
  it('cae en la de creación si no hay ninguna otra', () => {
    const fecha = fechaDeCompletado({ createdAt: '2026-11-12T10:00:00.000Z' });
    assert.strictEqual(fecha.toISOString(), '2026-11-12T10:00:00.000Z');
  });
  it('devuelve null si no hay ninguna fecha válida', () => {
    assert.strictEqual(fechaDeCompletado({}), null);
    assert.strictEqual(fechaDeCompletado({ completedAt: 'no-es-una-fecha' }), null);
    assert.strictEqual(fechaDeCompletado(undefined), null);
  });
});
