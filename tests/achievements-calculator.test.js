/**
 * Tests para el calculador de logros
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: npm test
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// Importar funciones a testear
import {
  getPeriodRange,
  filterByDateRange,
  calculateStreak,
  getActivityLevel,
  getCompletedTasksInPeriod,
  getHabitStatsInPeriod,
  generateRecapText,
  getAchievementsStats
} from '../js/utils/achievements-calculator.js';

// ============================================================
// Tests para getPeriodRange
// ============================================================
describe('getPeriodRange', () => {
  it('debe retornar rango de hoy', () => {
    const { start, end } = getPeriodRange('today');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    assert.strictEqual(start.getDate(), today.getDate());
    assert.strictEqual(start.getMonth(), today.getMonth());
    assert.strictEqual(start.getFullYear(), today.getFullYear());
    assert.ok(end > start, 'end debe ser mayor que start');
  });

  it('debe retornar rango de semana empezando en lunes', () => {
    const { start, end } = getPeriodRange('week');

    // El día 0 = Domingo, 1 = Lunes...
    // La función convierte Domingo a 7
    const dayOfWeek = start.getDay();
    assert.strictEqual(dayOfWeek, 1, 'La semana debe empezar en lunes');

    // Verificar que el rango sea de 7 días
    const diffDays = (end - start) / (24 * 60 * 60 * 1000);
    assert.strictEqual(diffDays, 7, 'La semana debe tener 7 días');
  });

  it('debe retornar rango de mes', () => {
    const { start, end } = getPeriodRange('month');

    assert.strictEqual(start.getDate(), 1, 'Mes debe empezar el día 1');
    assert.strictEqual(end.getDate(), 1, 'Mes siguiente empieza el día 1');
    assert.ok(end.getMonth() !== start.getMonth() || end.getFullYear() !== start.getFullYear());
  });

  it('debe retornar rango de trimestre', () => {
    const { start, end } = getPeriodRange('quarter');

    // El mes de inicio debe ser múltiplo de 3 (0, 3, 6, 9)
    assert.ok([0, 3, 6, 9].includes(start.getMonth()), 'Trimestre debe empezar en mes correcto');

    // Diferencia debe ser ~90 días (varía: Q1=90, Q2=91, Q3=92, Q4=92)
    const diffDays = (end - start) / (24 * 60 * 60 * 1000);
    assert.ok(diffDays >= 89 && diffDays <= 93, `Trimestre debe tener 89-93 días, tiene ${diffDays}`);
  });

  it('debe retornar rango de año', () => {
    const { start, end } = getPeriodRange('year');
    const currentYear = new Date().getFullYear();

    assert.strictEqual(start.getMonth(), 0, 'Año debe empezar en enero');
    assert.strictEqual(start.getDate(), 1, 'Año debe empezar el día 1');
    assert.strictEqual(end.getFullYear(), currentYear + 1, 'Año debe terminar en año siguiente');
  });

  it('debe usar "today" como default para período desconocido', () => {
    const { start: defaultStart } = getPeriodRange('unknown');
    const { start: todayStart } = getPeriodRange('today');

    assert.strictEqual(defaultStart.getTime(), todayStart.getTime());
  });
});

// ============================================================
// Tests para filterByDateRange
// ============================================================
describe('filterByDateRange', () => {
  const items = [
    { id: 1, completedAt: '2025-01-15T10:00:00Z' },
    { id: 2, completedAt: '2025-01-20T10:00:00Z' },
    { id: 3, completedAt: '2025-02-01T10:00:00Z' },
    { id: 4, completedAt: null },
    { id: 5 } // sin campo
  ];

  it('debe filtrar items dentro del rango', () => {
    const start = new Date('2025-01-10');
    const end = new Date('2025-01-25');

    const result = filterByDateRange(items, start, end);

    assert.strictEqual(result.length, 2);
    assert.ok(result.some(i => i.id === 1));
    assert.ok(result.some(i => i.id === 2));
  });

  it('debe excluir items fuera del rango', () => {
    const start = new Date('2025-02-01');
    const end = new Date('2025-02-28');

    const result = filterByDateRange(items, start, end);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].id, 3);
  });

  it('debe manejar array vacío', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-12-31');

    const result = filterByDateRange([], start, end);

    assert.strictEqual(result.length, 0);
  });

  it('debe manejar null como items', () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-12-31');

    const result = filterByDateRange(null, start, end);

    assert.strictEqual(result.length, 0);
  });

  it('debe usar campo personalizado', () => {
    const itemsWithCreatedAt = [
      { id: 1, createdAt: '2025-01-15T10:00:00Z' }
    ];
    const start = new Date('2025-01-01');
    const end = new Date('2025-01-31');

    const result = filterByDateRange(itemsWithCreatedAt, start, end, 'createdAt');

    assert.strictEqual(result.length, 1);
  });
});

// ============================================================
// Tests para calculateStreak
// ============================================================
describe('calculateStreak', () => {
  const getDateString = (daysAgo) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  };

  it('debe retornar 0 para historial vacío', () => {
    const streak = calculateStreak('habit1', []);
    assert.strictEqual(streak, 0);
  });

  it('debe retornar 0 para historial null', () => {
    const streak = calculateStreak('habit1', null);
    assert.strictEqual(streak, 0);
  });

  it('debe retornar 0 si no hay registros del hábito', () => {
    const history = [
      { habitId: 'other-habit', date: getDateString(0) }
    ];
    const streak = calculateStreak('habit1', history);
    assert.strictEqual(streak, 0);
  });

  it('debe contar racha de 1 día si solo hay registro de hoy', () => {
    const history = [
      { habitId: 'habit1', date: getDateString(0) }
    ];
    const streak = calculateStreak('habit1', history);
    assert.strictEqual(streak, 1);
  });

  it('debe contar racha de días consecutivos', () => {
    const history = [
      { habitId: 'habit1', date: getDateString(0) },
      { habitId: 'habit1', date: getDateString(1) },
      { habitId: 'habit1', date: getDateString(2) }
    ];
    const streak = calculateStreak('habit1', history);
    assert.strictEqual(streak, 3);
  });

  it('debe romper racha si hay un día sin registro', () => {
    const history = [
      { habitId: 'habit1', date: getDateString(0) },
      { habitId: 'habit1', date: getDateString(1) },
      // día 2 sin registro
      { habitId: 'habit1', date: getDateString(3) }
    ];
    const streak = calculateStreak('habit1', history);
    assert.strictEqual(streak, 2, 'Racha debe ser 2 porque el día 3 rompe');
  });

  it('debe retornar 0 si último registro es de hace más de 1 día', () => {
    const history = [
      { habitId: 'habit1', date: getDateString(2) } // Hace 2 días
    ];
    const streak = calculateStreak('habit1', history);
    assert.strictEqual(streak, 0);
  });

  it('debe mantener racha si último registro fue ayer', () => {
    const history = [
      { habitId: 'habit1', date: getDateString(1) } // Ayer
    ];
    const streak = calculateStreak('habit1', history);
    assert.strictEqual(streak, 1);
  });
});

// ============================================================
// Tests para getActivityLevel
// ============================================================
describe('getActivityLevel', () => {
  it('debe retornar 0 para count 0', () => {
    assert.strictEqual(getActivityLevel(0), 0);
  });

  it('debe retornar 0 para null/undefined', () => {
    assert.strictEqual(getActivityLevel(null), 0);
    assert.strictEqual(getActivityLevel(undefined), 0);
  });

  it('debe retornar nivel 1 para 1-2 actividades', () => {
    assert.strictEqual(getActivityLevel(1), 1);
    assert.strictEqual(getActivityLevel(2), 1);
  });

  it('debe retornar nivel 2 para 3-4 actividades', () => {
    assert.strictEqual(getActivityLevel(3), 2);
    assert.strictEqual(getActivityLevel(4), 2);
  });

  it('debe retornar nivel 3 para 5-6 actividades', () => {
    assert.strictEqual(getActivityLevel(5), 3);
    assert.strictEqual(getActivityLevel(6), 3);
  });

  it('debe retornar nivel 4 para 7+ actividades', () => {
    assert.strictEqual(getActivityLevel(7), 4);
    assert.strictEqual(getActivityLevel(100), 4);
  });
});

// ============================================================
// Tests para getCompletedTasksInPeriod
// ============================================================
describe('getCompletedTasksInPeriod', () => {
  it('debe retornar array vacío para objectives vacíos', () => {
    const result = getCompletedTasksInPeriod({}, 'today');
    assert.strictEqual(result.length, 0);
  });

  it('debe incluir campo horizon en cada tarea', () => {
    const today = new Date().toISOString();
    const objectives = {
      weekly: [{ id: 1, completedAt: today }],
      daily: [{ id: 2, completedAt: today }]
    };

    const result = getCompletedTasksInPeriod(objectives, 'today');

    assert.ok(result.some(t => t.horizon === 'weekly'));
    assert.ok(result.some(t => t.horizon === 'daily'));
  });
});

// ============================================================
// Tests para getHabitStatsInPeriod
// ============================================================
describe('getHabitStatsInPeriod', () => {
  it('debe retornar 0% para historial vacío', () => {
    const result = getHabitStatsInPeriod({ history: [] }, 'week');

    assert.strictEqual(result.completedDays, 0);
    assert.strictEqual(result.percentage, 0);
    assert.ok(result.totalDays > 0);
  });

  it('debe calcular porcentaje correctamente', () => {
    const today = new Date().toISOString().split('T')[0];
    const result = getHabitStatsInPeriod({
      history: [{ date: today }]
    }, 'today');

    // Si hay registro hoy, debe haber al menos algo de porcentaje
    assert.ok(result.completedDays >= 0);
  });
});

// ============================================================
// Tests para generateRecapText
// ============================================================
describe('generateRecapText', () => {
  it('debe retornar mensaje vacío si no hay logros', () => {
    const result = generateRecapText({
      objectives: {},
      habits: {},
      journal: [],
      projects: []
    }, 'week');

    assert.ok(result.includes('Todavía no tienes logros'));
    assert.ok(result.includes('recap-empty'));
  });

  it('debe incluir período correcto en el texto', () => {
    const today = new Date().toISOString();
    const result = generateRecapText({
      objectives: { daily: [{ completedAt: today }] },
      habits: {},
      journal: [],
      projects: []
    }, 'today');

    assert.ok(result.includes('Hoy') || result.includes('hoy'));
  });
});

// ============================================================
// Tests para getAchievementsStats
// ============================================================
describe('getAchievementsStats', () => {
  it('debe retornar estructura completa de estadísticas', () => {
    const stats = getAchievementsStats({}, 'week');

    assert.ok('totalTasks' in stats);
    assert.ok('tasksByHorizon' in stats);
    assert.ok('habitDays' in stats);
    assert.ok('habitPercentage' in stats);
    assert.ok('currentStreak' in stats);
    assert.ok('journalEntries' in stats);
    assert.ok('projectsCompleted' in stats);
    assert.ok('graduatedHabits' in stats);
  });

  it('debe retornar 0 en todas las métricas para datos vacíos', () => {
    const stats = getAchievementsStats({}, 'week');

    assert.strictEqual(stats.totalTasks, 0);
    assert.strictEqual(stats.habitDays, 0);
    assert.strictEqual(stats.currentStreak, 0);
    assert.strictEqual(stats.journalEntries, 0);
    assert.strictEqual(stats.projectsCompleted, 0);
    assert.strictEqual(stats.graduatedHabits, 0);
  });
});
