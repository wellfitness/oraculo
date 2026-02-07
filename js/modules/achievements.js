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
import { getReflexionDelDia } from '../data/burkeman.js';
import {
  getSpontaneousAchievements,
  getMoodIcon,
  getMoodName,
  deleteSpontaneousAchievement
} from '../components/spontaneous-achievement.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { emptyStateFor } from '../components/empty-state.js';

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
  const spontaneous = getSpontaneousAchievements(data, currentPeriod);

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
        <blockquote class="quote quote--header">
          <p>"${getReflexionDelDia('achievements')}"</p>
          <cite>— Oliver Burkeman</cite>
        </blockquote>
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
      <section class="achievements-summary" role="region" aria-label="Resumen de logros">
        <div class="stat-card" role="status" aria-label="${stats.totalTasks} tareas completadas">
          <span class="material-symbols-outlined stat-icon" aria-hidden="true">task_alt</span>
          <span class="stat-value">${stats.totalTasks}</span>
          <span class="stat-label">Tareas completadas</span>
        </div>
        <div class="stat-card" role="status" aria-label="${stats.habitDays} días de hábito">
          <span class="material-symbols-outlined stat-icon filled icon-warning" aria-hidden="true">local_fire_department</span>
          <span class="stat-value">${stats.habitDays}</span>
          <span class="stat-label">Días de hábito</span>
        </div>
        <div class="stat-card" role="status" aria-label="${stats.projectsCompleted} proyectos completados">
          <span class="material-symbols-outlined stat-icon" aria-hidden="true">folder_special</span>
          <span class="stat-value">${stats.projectsCompleted}</span>
          <span class="stat-label">Proyectos completados</span>
        </div>
        <div class="stat-card" role="status" aria-label="${stats.journalEntries} entradas de diario">
          <span class="material-symbols-outlined stat-icon" aria-hidden="true">edit_note</span>
          <span class="stat-value">${stats.journalEntries}</span>
          <span class="stat-label">Entradas de diario</span>
        </div>
        <div class="stat-card stat-card--spontaneous" role="status" aria-label="${spontaneous.length} logros espontáneos">
          <span class="material-symbols-outlined stat-icon icon-warning" aria-hidden="true">celebration</span>
          <span class="stat-value">${spontaneous.length}</span>
          <span class="stat-label">Logros espontáneos</span>
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

      <!-- Logros espontáneos -->
      ${renderSpontaneousSection(spontaneous)}

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
                <span class="badge-name">${escapeHTML(habit.name)}</span>
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

      // Re-renderizar estadísticas y logros espontáneos
      updateStats(data);
      updateSpontaneousList(data);
    });
  });

  // Botones de eliminar logros espontáneos
  document.querySelectorAll('.spontaneous-item__delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('[data-id]').dataset.id;
      deleteSpontaneousAchievement(id, data, updateData);
      // Re-renderizar la lista
      updateSpontaneousList(data);
    });
  });
};

/**
 * Actualiza las estadísticas sin recargar toda la página
 */
const updateStats = (data) => {
  const stats = getAchievementsStats(data, currentPeriod);
  const recapText = generateRecapText(data, currentPeriod);
  const spontaneous = getSpontaneousAchievements(data, currentPeriod);

  // Actualizar contadores
  const statCards = document.querySelectorAll('.stat-card .stat-value');
  if (statCards.length >= 5) {
    statCards[0].textContent = stats.totalTasks;
    statCards[1].textContent = stats.habitDays;
    statCards[2].textContent = stats.projectsCompleted;
    statCards[3].textContent = stats.journalEntries;
    statCards[4].textContent = spontaneous.length;
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
 * Actualiza la lista de logros espontáneos
 */
const updateSpontaneousList = (data) => {
  const spontaneous = getSpontaneousAchievements(data, currentPeriod);
  const section = document.querySelector('.achievements-spontaneous');

  if (section) {
    section.outerHTML = renderSpontaneousSection(spontaneous);

    // Re-añadir event listeners para los nuevos botones de eliminar
    document.querySelectorAll('.spontaneous-item__delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.closest('[data-id]').dataset.id;
        deleteSpontaneousAchievement(id, data, () => {
          // Actualizar datos en memoria
          data.spontaneousAchievements = data.spontaneousAchievements.filter(a => a.id !== id);
          updateSpontaneousList(data);
          updateStats(data);
        });
      });
    });
  }
};

/**
 * Renderiza las barras de progreso por horizonte
 * Cuenta tareas activas + completadas (incluyendo las movidas a objectives.completed)
 */
const renderProgressBars = (objectives) => {
  const horizons = [
    { key: 'quarterly', name: 'Trimestre' },
    { key: 'monthly', name: 'Mes' },
    { key: 'weekly', name: 'Semana' },
    { key: 'daily', name: 'Hoy' }
  ];

  // Contar tareas completadas por horizonte desde objectives.completed
  const completedFromPool = {};
  (objectives.completed || []).forEach(task => {
    const origin = task.originalColumn || 'daily';
    completedFromPool[origin] = (completedFromPool[origin] || 0) + 1;
  });

  return horizons.map(({ key, name }) => {
    const items = objectives[key] || [];
    const stillInHorizon = items.filter(i => i.completed).length;
    const movedToCompleted = completedFromPool[key] || 0;
    const completed = stillInHorizon + movedToCompleted;
    const total = items.length + movedToCompleted;
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

/**
 * Renderiza la sección de logros espontáneos
 */
const renderSpontaneousSection = (achievements) => {
  if (!achievements || achievements.length === 0) {
    return `
      <section class="achievements-spontaneous">
        <h2>
          <span class="material-symbols-outlined icon-sm icon-warning">celebration</span>
          Logros espontáneos
        </h2>
        ${emptyStateFor('spontaneous', { variant: 'inline' })}
      </section>
    `;
  }

  return `
    <section class="achievements-spontaneous">
      <h2>
        <span class="material-symbols-outlined icon-sm icon-warning">celebration</span>
        Logros espontáneos
      </h2>
      <ul class="spontaneous-list">
        ${achievements.map(a => renderSpontaneousItem(a)).join('')}
      </ul>
    </section>
  `;
};

/**
 * Renderiza un item de logro espontáneo
 */
const renderSpontaneousItem = (achievement) => {
  const date = new Date(achievement.createdAt);
  const formattedDate = date.toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  return `
    <li class="spontaneous-item" data-id="${achievement.id}">
      <div class="spontaneous-item__mood">
        <span class="material-symbols-outlined">${getMoodIcon(achievement.mood)}</span>
      </div>
      <div class="spontaneous-item__content">
        <p class="spontaneous-item__text">${escapeHTML(achievement.text)}</p>
        <span class="spontaneous-item__meta">
          ${formattedDate} · ${getMoodName(achievement.mood)}
        </span>
      </div>
      <button class="spontaneous-item__delete btn--icon" data-id="${achievement.id}" title="Eliminar">
        <span class="material-symbols-outlined icon-sm">close</span>
      </button>
    </li>
  `;
};
