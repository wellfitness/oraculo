/**
 * Oráculo - Calculador de Logros
 * Funciones para calcular estadísticas y generar recapitulaciones
 */

/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

/**
 * Obtiene el rango de fechas para un período
 */
export const getPeriodRange = (period) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start, end;

  switch (period) {
    case 'today':
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      break;

    case 'week':
      // Lunes de esta semana
      const dayOfWeek = today.getDay() || 7; // Domingo = 7
      start = new Date(today.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000);
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;

    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      break;

    case 'quarter':
      const quarterMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), quarterMonth, 1);
      end = new Date(today.getFullYear(), quarterMonth + 3, 1);
      break;

    case 'year':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear() + 1, 0, 1);
      break;

    default:
      start = today;
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  }

  return { start, end };
};

/**
 * Filtra items por rango de fechas usando completedAt
 */
export const filterByDateRange = (items, startDate, endDate, dateField = 'completedAt') => {
  return (items || []).filter(item => {
    if (!item[dateField]) return false;
    const itemDate = new Date(item[dateField]);
    return itemDate >= startDate && itemDate < endDate;
  });
};

/**
 * Obtiene tareas completadas en un período
 * Busca tanto en los horizontes originales como en objectives.completed
 * (las tareas se mueven a completed al completarse en el kanban)
 */
export const getCompletedTasksInPeriod = (objectives, period) => {
  const { start, end } = getPeriodRange(period);
  const completed = [];

  // Tareas completadas que aún estén en sus horizontes (compatibilidad)
  ['quarterly', 'monthly', 'weekly', 'daily'].forEach(horizon => {
    const tasks = filterByDateRange(objectives[horizon] || [], start, end);
    tasks.forEach(task => {
      completed.push({ ...task, horizon });
    });
  });

  // Tareas movidas a objectives.completed (flujo actual del kanban)
  const completedTasks = filterByDateRange(objectives.completed || [], start, end);
  completedTasks.forEach(task => {
    completed.push({ ...task, horizon: task.originalColumn || 'daily' });
  });

  return completed;
};

/**
 * Cuenta tareas completadas por horizonte en un período
 * Incluye tareas movidas a objectives.completed (por originalColumn)
 */
export const getCompletedCountByHorizon = (objectives, period) => {
  const { start, end } = getPeriodRange(period);

  const counts = {
    quarterly: filterByDateRange(objectives.quarterly || [], start, end).length,
    monthly: filterByDateRange(objectives.monthly || [], start, end).length,
    weekly: filterByDateRange(objectives.weekly || [], start, end).length,
    daily: filterByDateRange(objectives.daily || [], start, end).length
  };

  // Sumar las que están en objectives.completed por su horizonte original
  filterByDateRange(objectives.completed || [], start, end).forEach(task => {
    const origin = task.originalColumn || 'daily';
    if (counts[origin] !== undefined) {
      counts[origin]++;
    }
  });

  return counts;
};

/**
 * Obtiene estadísticas de hábitos en un período
 */
export const getHabitStatsInPeriod = (habits, period) => {
  const { start, end } = getPeriodRange(period);
  const history = habits.history || [];

  const daysInPeriod = Math.ceil((end - start) / (24 * 60 * 60 * 1000));
  const completedDays = history.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= start && entryDate < end;
  }).length;

  return {
    completedDays,
    totalDays: daysInPeriod,
    percentage: daysInPeriod > 0 ? Math.round((completedDays / daysInPeriod) * 100) : 0
  };
};

/**
 * Calcula la racha actual de un hábito
 */
export const calculateStreak = (habitId, history) => {
  if (!history || history.length === 0) return 0;

  // Filtrar historial del hábito específico y ordenar por fecha descendente
  const habitHistory = history
    .filter(h => h.habitId === habitId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (habitHistory.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Verificar si hay registro de hoy o ayer
  const lastEntry = new Date(habitHistory[0].date);
  lastEntry.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today - lastEntry) / (24 * 60 * 60 * 1000));

  // Si el último registro es de hace más de 1 día, la racha está rota
  if (daysDiff > 1) return 0;

  // Contar días consecutivos
  let expectedDate = lastEntry;
  for (const entry of habitHistory) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const diff = Math.floor((expectedDate - entryDate) / (24 * 60 * 60 * 1000));

    if (diff === 0) {
      streak++;
      expectedDate = new Date(entryDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (diff === 1) {
      // El día anterior ya fue contado, seguir
      continue;
    } else {
      // Hubo una brecha, terminar
      break;
    }
  }

  return streak;
};

/**
 * Verifica si el hábito se completó hoy
 */
export const isHabitCompletedToday = (habitId, history) => {
  const today = getLocalDateString();
  return (history || []).some(h => h.habitId === habitId && h.date === today);
};

/**
 * Obtiene proyectos completados en un período
 */
export const getProjectsCompletedInPeriod = (projects, period) => {
  const { start, end } = getPeriodRange(period);
  return filterByDateRange(projects || [], start, end);
};

/**
 * Cuenta entradas de diario en un período
 */
export const getJournalEntriesInPeriod = (journal, period) => {
  const { start, end } = getPeriodRange(period);
  return filterByDateRange(journal || [], start, end, 'createdAt');
};

/**
 * Genera datos para el heatmap de actividad (estilo GitHub)
 * Retorna un objeto con fechas como claves y nivel de actividad como valores
 */
export const generateHeatmapData = (data, year = new Date().getFullYear()) => {
  const heatmap = {};

  // Contar actividad de tareas completadas (en horizontes y en completed)
  ['quarterly', 'monthly', 'weekly', 'daily', 'completed'].forEach(horizon => {
    (data.objectives?.[horizon] || []).forEach(task => {
      if (task.completedAt) {
        const date = task.completedAt.split('T')[0];
        if (date.startsWith(year.toString())) {
          heatmap[date] = (heatmap[date] || 0) + 1;
        }
      }
    });
  });

  // Contar actividad de hábitos (peso doble)
  (data.habits?.history || []).forEach(entry => {
    const date = entry.date;
    if (date.startsWith(year.toString())) {
      heatmap[date] = (heatmap[date] || 0) + 2;
    }
  });

  // Contar actividad de diario
  (data.journal || []).forEach(entry => {
    if (entry.createdAt) {
      const date = entry.createdAt.split('T')[0];
      if (date.startsWith(year.toString())) {
        heatmap[date] = (heatmap[date] || 0) + 1;
      }
    }
  });

  return heatmap;
};

/**
 * Convierte conteo de actividad a nivel (0-4) para el heatmap
 */
export const getActivityLevel = (count) => {
  if (!count || count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 3;
  return 4;
};

/**
 * Genera el grid del heatmap para un año
 * Retorna array de semanas, cada una con 7 días
 */
export const generateHeatmapGrid = (data, year = new Date().getFullYear()) => {
  const heatmapData = generateHeatmapData(data, year);
  const grid = [];
  const today = new Date();

  // Empezar desde el primer día del año
  let currentDate = new Date(year, 0, 1);

  // Ajustar al lunes anterior si el año no empieza en lunes
  const dayOfWeek = currentDate.getDay() || 7;
  if (dayOfWeek !== 1) {
    currentDate.setDate(currentDate.getDate() - (dayOfWeek - 1));
  }

  // Generar 53 semanas
  for (let week = 0; week < 53; week++) {
    const weekDays = [];
    for (let day = 0; day < 7; day++) {
      const dateStr = getLocalDateString(currentDate);
      const count = heatmapData[dateStr] || 0;
      const isCurrentYear = currentDate.getFullYear() === year;
      const isFuture = currentDate > today;

      weekDays.push({
        date: dateStr,
        count,
        level: isCurrentYear && !isFuture ? getActivityLevel(count) : 0,
        isToday: dateStr === getLocalDateString(today),
        isFuture,
        isCurrentYear
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }
    grid.push(weekDays);
  }

  return grid;
};

/**
 * Genera texto narrativo de recapitulación
 */
export const generateRecapText = (data, period) => {
  const completedTasks = getCompletedTasksInPeriod(data.objectives || {}, period);
  const habitStats = getHabitStatsInPeriod(data.habits || {}, period);
  const journalEntries = getJournalEntriesInPeriod(data.journal || [], period);
  const projectsCompleted = getProjectsCompletedInPeriod(data.projects || [], period);

  const periodNames = {
    today: 'hoy',
    week: 'esta semana',
    month: 'este mes',
    quarter: 'este trimestre',
    year: 'este año'
  };

  const periodName = periodNames[period] || period;

  // Construir texto narrativo
  const parts = [];

  if (completedTasks.length > 0) {
    parts.push(`Completaste <strong>${completedTasks.length} tarea${completedTasks.length > 1 ? 's' : ''}</strong>`);
  }

  if (habitStats.completedDays > 0) {
    parts.push(`mantuviste tu hábito <strong>${habitStats.completedDays} de ${habitStats.totalDays} días</strong> (${habitStats.percentage}%)`);
  }

  if (journalEntries.length > 0) {
    parts.push(`escribiste <strong>${journalEntries.length} reflexión${journalEntries.length > 1 ? 'es' : ''}</strong> en tu diario`);
  }

  if (projectsCompleted.length > 0) {
    parts.push(`completaste <strong>${projectsCompleted.length} proyecto${projectsCompleted.length > 1 ? 's' : ''}</strong>`);
  }

  if (parts.length === 0) {
    return `<p class="recap-empty">Todavía no tienes logros registrados ${periodName}. ¡Cada pequeño paso cuenta!</p>`;
  }

  // Unir partes con comas y "y"
  let text;
  if (parts.length === 1) {
    text = parts[0];
  } else if (parts.length === 2) {
    text = parts.join(' y ');
  } else {
    text = parts.slice(0, -1).join(', ') + ' y ' + parts[parts.length - 1];
  }

  return `<p>${periodName.charAt(0).toUpperCase() + periodName.slice(1)}, ${text}.</p>`;
};

/**
 * Genera grid de heatmap para un hábito específico (90 días)
 * @param {string} habitId - ID del hábito
 * @param {Array} history - Array de {habitId, date, completedAt}
 * @param {number} days - Días a mostrar (default: 90)
 */
export const generateHabitHeatmapGrid = (habitId, history, days = 90) => {
  // Filtrar solo entradas del hábito
  const habitHistory = (history || []).filter(h => h.habitId === habitId);

  // Crear set de fechas completadas para búsqueda O(1)
  const completedDates = new Set(habitHistory.map(h => h.date));

  // Generar grid de N días hacia atrás
  const grid = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = getLocalDateString(date);

    grid.push({
      date: dateStr,
      completed: completedDates.has(dateStr),
      level: completedDates.has(dateStr) ? 4 : 0, // Binario: hecho o no
      isToday: i === 0,
      dayOfWeek: date.getDay()
    });
  }

  return grid;
};

/**
 * Agrupa el grid de hábitos por semanas (para layout visual)
 * @param {Array} grid - Grid generado por generateHabitHeatmapGrid
 */
export const groupHabitGridByWeeks = (grid) => {
  const weeks = [];
  let currentWeek = [];

  grid.forEach((day, index) => {
    currentWeek.push(day);

    // Nueva semana cada 7 días
    if (currentWeek.length === 7 || index === grid.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  return weeks;
};

/**
 * Obtiene estadísticas completas para un período
 */
export const getAchievementsStats = (data, period = 'week') => {
  const completedTasks = getCompletedTasksInPeriod(data.objectives || {}, period);
  const completedByHorizon = getCompletedCountByHorizon(data.objectives || {}, period);
  const habitStats = getHabitStatsInPeriod(data.habits || {}, period);
  const journalEntries = getJournalEntriesInPeriod(data.journal || [], period);
  const projectsCompleted = getProjectsCompletedInPeriod(data.projects || [], period);

  // Calcular racha actual si hay hábito activo
  const activeHabit = data.habits?.active;
  const currentStreak = activeHabit
    ? calculateStreak(activeHabit.id, data.habits?.history || [])
    : 0;

  return {
    totalTasks: completedTasks.length,
    tasksByHorizon: completedByHorizon,
    habitDays: habitStats.completedDays,
    habitPercentage: habitStats.percentage,
    currentStreak,
    journalEntries: journalEntries.length,
    projectsCompleted: projectsCompleted.length,
    graduatedHabits: (data.habits?.graduated || []).length
  };
};
