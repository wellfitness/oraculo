/**
 * Oráculo - Módulo de Logros
 * Vista de recapitulación y celebración de logros
 */

import {
  getAchievementsStats,
  generateRecapText,
  generateHeatmapGrid,
  getCompletedCountByHorizon
} from '../utils/achievements-calculator.js';

let currentPeriod = 'week';

const PERIODS = {
  week: 'Semana',
  month: 'Mes',
  quarter: 'Trimestre',
  year: 'Año'
};

const LIMITS = {
  quarterly: 3,
  monthly: 6,
  weekly: 10,
  daily: 3
};

/**
 * Renderiza la página de logros
 */
export const render = (data) => {
  const stats = getAchievementsStats(data, currentPeriod);
  const recapText = generateRecapText(data, currentPeriod);
  const graduatedHabits = data.habits?.graduated || [];

  return `
    <div class="achievements-page">
      <header class="page-header">
        <h1 class="page-title">
          <span class="material-symbols-outlined icon-lg icon-warning">emoji_events</span>
          Logros
        </h1>
        <p class="page-description">
          Celebra lo que has conseguido. Cada pequeño paso cuenta.
        </p>
      </header>

      <!-- Selector de período -->
      <div class="period-selector">
        ${Object.entries(PERIODS).map(([key, name]) => `
          <button class="period-btn ${currentPeriod === key ? 'active' : ''}" data-period="${key}">
            ${name}
          </button>
        `).join('')}
      </div>

      <!-- Resumen de contadores -->
      <section class="achievements-summary">
        <div class="stat-card">
          <span class="material-symbols-outlined stat-icon">task_alt</span>
          <span class="stat-value">${stats.totalTasks}</span>
          <span class="stat-label">Tareas completadas</span>
        </div>
        <div class="stat-card">
          <span class="material-symbols-outlined stat-icon filled icon-warning">local_fire_department</span>
          <span class="stat-value">${stats.habitDays}</span>
          <span class="stat-label">Días de hábito</span>
        </div>
        <div class="stat-card">
          <span class="material-symbols-outlined stat-icon">folder_special</span>
          <span class="stat-value">${stats.projectsCompleted}</span>
          <span class="stat-label">Proyectos completados</span>
        </div>
        <div class="stat-card">
          <span class="material-symbols-outlined stat-icon">edit_note</span>
          <span class="stat-value">${stats.journalEntries}</span>
          <span class="stat-label">Entradas de diario</span>
        </div>
      </section>

      <!-- Recapitulación narrativa -->
      <section class="achievements-recap">
        <h2>
          <span class="material-symbols-outlined icon-sm">auto_awesome</span>
          Resumen
        </h2>
        <div class="recap-card">
          ${recapText}
          ${stats.currentStreak > 0 ? `
            <p class="recap-highlight">
              <span class="material-symbols-outlined icon-warning filled">local_fire_department</span>
              Tu racha actual es de <strong>${stats.currentStreak} día${stats.currentStreak > 1 ? 's' : ''}</strong>. ¡Sigue así!
            </p>
          ` : ''}
        </div>
      </section>

      <!-- Barras de progreso por horizonte -->
      <section class="achievements-progress">
        <h2>
          <span class="material-symbols-outlined icon-sm">leaderboard</span>
          Progreso por horizonte
        </h2>
        <div class="progress-list">
          ${renderProgressBars(data.objectives || {})}
        </div>
      </section>

      <!-- Heatmap de actividad -->
      <section class="achievements-heatmap">
        <h2>
          <span class="material-symbols-outlined icon-sm">calendar_month</span>
          Actividad del año
        </h2>
        <div class="heatmap-container">
          ${renderHeatmap(data)}
        </div>
      </section>

      <!-- Hábitos graduados -->
      ${graduatedHabits.length > 0 ? `
        <section class="achievements-graduated">
          <h2>
            <span class="material-symbols-outlined icon-sm">workspace_premium</span>
            Hábitos consolidados
          </h2>
          <div class="graduated-badges">
            ${graduatedHabits.map(habit => `
              <div class="graduated-badge">
                <span class="material-symbols-outlined badge-icon">check_circle</span>
                <span class="badge-name">${habit.name}</span>
                <span class="badge-date">${formatShortDate(habit.graduatedAt)}</span>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
    </div>
  `;
};

/**
 * Inicializa eventos del módulo
 */
export const init = (data, updateData) => {
  // Selector de período
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPeriod = btn.dataset.period;

      // Actualizar botones activos
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Re-renderizar estadísticas
      updateStats(data);
    });
  });
};

/**
 * Actualiza las estadísticas sin recargar toda la página
 */
const updateStats = (data) => {
  const stats = getAchievementsStats(data, currentPeriod);
  const recapText = generateRecapText(data, currentPeriod);

  // Actualizar contadores
  const statCards = document.querySelectorAll('.stat-card .stat-value');
  if (statCards.length >= 4) {
    statCards[0].textContent = stats.totalTasks;
    statCards[1].textContent = stats.habitDays;
    statCards[2].textContent = stats.projectsCompleted;
    statCards[3].textContent = stats.journalEntries;
  }

  // Actualizar recapitulación
  const recapCard = document.querySelector('.recap-card');
  if (recapCard) {
    recapCard.innerHTML = `
      ${recapText}
      ${stats.currentStreak > 0 ? `
        <p class="recap-highlight">
          <span class="material-symbols-outlined icon-warning filled">local_fire_department</span>
          Tu racha actual es de <strong>${stats.currentStreak} día${stats.currentStreak > 1 ? 's' : ''}</strong>. ¡Sigue así!
        </p>
      ` : ''}
    `;
  }

  // Actualizar barras de progreso
  const progressList = document.querySelector('.progress-list');
  if (progressList) {
    progressList.innerHTML = renderProgressBars(data.objectives || {});
  }
};

/**
 * Renderiza las barras de progreso por horizonte
 */
const renderProgressBars = (objectives) => {
  const horizons = [
    { key: 'quarterly', name: 'Trimestre' },
    { key: 'monthly', name: 'Mes' },
    { key: 'weekly', name: 'Semana' },
    { key: 'daily', name: 'Hoy' }
  ];

  return horizons.map(({ key, name }) => {
    const items = objectives[key] || [];
    const completed = items.filter(i => i.completed).length;
    const total = items.length;
    const limit = LIMITS[key];
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return `
      <div class="progress-item">
        <div class="progress-header">
          <span class="progress-label">${name}</span>
          <span class="progress-value">${completed}/${total} completadas</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </div>
    `;
  }).join('');
};

/**
 * Renderiza el heatmap de actividad
 */
const renderHeatmap = (data) => {
  const year = new Date().getFullYear();
  const grid = generateHeatmapGrid(data, year);

  const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  return `
    <div class="heatmap-wrapper">
      <div class="heatmap-months">
        ${monthLabels.map(m => `<span>${m}</span>`).join('')}
      </div>
      <div class="heatmap-body">
        <div class="heatmap-days">
          ${dayLabels.map(d => `<span>${d}</span>`).join('')}
        </div>
        <div class="heatmap-grid">
          ${grid.map(week => `
            <div class="heatmap-week">
              ${week.map(day => `
                <div
                  class="heatmap-day level-${day.level} ${day.isToday ? 'today' : ''}"
                  title="${day.date}: ${day.count} actividad${day.count !== 1 ? 'es' : ''}"
                  data-date="${day.date}"
                ></div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="heatmap-legend">
      <span>Menos</span>
      <div class="legend-scale">
        <span class="level-0"></span>
        <span class="level-1"></span>
        <span class="level-2"></span>
        <span class="level-3"></span>
        <span class="level-4"></span>
      </div>
      <span>Más</span>
    </div>
  `;
};

/**
 * Formatea fecha corta
 */
const formatShortDate = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
};
