/**
 * Oráculo - Dashboard
 * Vista principal con resumen del día
 */

import { generateId, formatDate, showNotification, openCalmTimer, openSpontaneousModal, openEveningCheckIn } from '../app.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { isEveningTime, hasEveningCheckIn } from '../components/evening-check-in.js';
import { getAchievementsStats, isHabitCompletedToday } from '../utils/achievements-calculator.js';
import { getReflexionDelDia } from '../data/burkeman.js';

let updateDataCallback = null;

/**
 * Renderiza el dashboard
 */
export const render = (data) => {
  const today = new Date();
  const dailyTasks = data.objectives.daily || [];
  const activeHabit = data.habits.active;
  const todayEvents = getTodayEvents(data.calendar.events, data.calendar.recurring);

  return `
    <div class="dashboard">
      <header class="dashboard__header">
        <h1 class="dashboard__title">Oráculo</h1>
        <p class="dashboard__date">${formatDate(today)}</p>
        <a href="#daily-setup" data-view="daily-setup" class="dashboard__reconfigure" title="Reconfigurar mi día">
          <span class="material-symbols-outlined">tune</span>
          <span>Reconfigurar día</span>
        </a>
      </header>

      <section class="dashboard__section dashboard__focus">
        <div class="section-header">
          <h2 class="section-title">Foco del Día</h2>
          <span class="section-limit">${dailyTasks.length}/3</span>
        </div>

        <ul class="focus-list" id="focus-list">
          ${dailyTasks.map(task => renderFocusTask(task)).join('')}
        </ul>

        ${dailyTasks.length < 3 ? `
          <form class="add-focus-form" id="add-focus-form">
            <input
              type="text"
              id="new-focus-input"
              placeholder="¿Cuál es tu prioridad?"
              class="input input--primary"
              maxlength="100"
            >
            <button type="submit" class="btn btn--primary btn--icon">
              <span class="material-symbols-outlined">add</span>
            </button>
          </form>
        ` : `
          <p class="limit-message">
            Ya tienes 3 prioridades. Completa alguna antes de añadir más.
          </p>
        `}
      </section>

      <section class="dashboard__section dashboard__habit">
        <h2 class="section-title">Hábito Activo</h2>

        ${activeHabit ? renderActiveHabit(activeHabit, data.habits.history) : `
          <div class="empty-state">
            <p>No tienes ningún hábito activo.</p>
            <a href="#habits" data-view="habits" class="btn btn--secondary">
              Crear mi primer hábito
            </a>
          </div>
        `}
      </section>

      <section class="dashboard__section dashboard__events">
        <h2 class="section-title">Próximos Eventos</h2>

        ${todayEvents.length > 0 ? `
          <ul class="events-list">
            ${todayEvents.map(event => `
              <li class="event-item">
                <span class="event-time">${event.time}</span>
                <span class="event-name">${escapeHTML(event.name)}</span>
              </li>
            `).join('')}
          </ul>
        ` : `
          <p class="empty-state">No hay eventos para hoy.</p>
        `}

        <a href="#calendar" data-view="calendar" class="link-subtle">
          Ver calendario completo →
        </a>
      </section>

      ${renderTodayAchievements(data)}

      <section class="dashboard__section dashboard__calm">
        <button class="calm-trigger" id="open-calm-timer">
          <span class="material-symbols-outlined">self_improvement</span>
          <div class="calm-trigger__content">
            <span class="calm-trigger__title">5 minutos de calma</span>
            <span class="calm-trigger__subtitle">Práctica de presencia</span>
          </div>
        </button>
      </section>

      ${renderEveningCheckInButton(data)}

      <section class="dashboard__section dashboard__quote">
        <blockquote class="quote">
          <p>"${getReflexionDelDia('dashboard')}"</p>
          <cite>— Oliver Burkeman</cite>
        </blockquote>
      </section>

      <!-- Botón flotante para logros espontáneos -->
      <button class="fab fab--achievement" id="fab-achievement" title="Registrar un logro espontáneo">
        <span class="material-symbols-outlined">celebration</span>
        <span class="fab-label">+ Logro</span>
      </button>
    </div>
  `;
};

/**
 * Inicializa los eventos del dashboard
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;

  // Formulario de nueva tarea
  const form = document.getElementById('add-focus-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAddFocus(data);
    });
  }

  // Checkboxes de tareas
  document.querySelectorAll('.focus-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      handleToggleTask(e.target.dataset.id, e.target.checked, data);
    });
  });

  // Botón de eliminar tarea
  document.querySelectorAll('.focus-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      handleDeleteTask(e.target.dataset.id, data);
    });
  });

  // Botón de Roca Principal
  document.querySelectorAll('.focus-rock').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleToggleRock(e.target.closest('[data-id]').dataset.id, data);
    });
  });

  // Marcar hábito como completado hoy
  const habitCheckBtn = document.getElementById('habit-check-today');
  if (habitCheckBtn) {
    habitCheckBtn.addEventListener('click', () => {
      handleHabitCheckToday(data);
    });
  }

  // Botón de temporizador de calma
  const calmTimerBtn = document.getElementById('open-calm-timer');
  if (calmTimerBtn) {
    calmTimerBtn.addEventListener('click', () => {
      openCalmTimer();
    });
  }

  // Botón flotante de logros espontáneos
  const fabAchievement = document.getElementById('fab-achievement');
  if (fabAchievement) {
    fabAchievement.addEventListener('click', () => {
      openSpontaneousModal();
    });
  }

  // Botón de evening check-in
  const eveningBtn = document.getElementById('open-evening-check-in');
  if (eveningBtn) {
    eveningBtn.addEventListener('click', () => {
      openEveningCheckIn();
    });
  }
};

/**
 * Renderiza una tarea del foco diario
 */
const renderFocusTask = (task) => {
  const isRock = task.isRocaPrincipal;
  return `
    <li class="focus-item ${task.completed ? 'focus-item--completed' : ''} ${isRock ? 'focus-item--rock' : ''}" data-id="${task.id}">
      <label class="focus-label">
        <input
          type="checkbox"
          class="focus-checkbox"
          data-id="${task.id}"
          ${task.completed ? 'checked' : ''}
        >
        ${isRock ? '<span class="material-symbols-outlined icon-rock filled">diamond</span>' : ''}
        <span class="focus-text">${escapeHTML(task.text)}</span>
      </label>
      <div class="focus-actions">
        <button
          class="focus-rock btn--icon ${isRock ? 'active' : ''}"
          data-id="${task.id}"
          title="${isRock ? 'Quitar como Roca Principal' : 'Marcar como Roca Principal'}"
        >
          <span class="material-symbols-outlined icon-sm">${isRock ? 'diamond' : 'workspaces'}</span>
        </button>
        <button class="focus-delete btn--icon" data-id="${task.id}" title="Eliminar">
          <span class="material-symbols-outlined icon-sm">close</span>
        </button>
      </div>
    </li>
  `;
};

/**
 * Renderiza el hábito activo
 */
const renderActiveHabit = (habit, history) => {
  const streak = calculateStreak(habit.id, history);
  const completedToday = isCompletedToday(habit.id, history);

  return `
    <div class="habit-card ${completedToday ? 'habit-card--completed' : ''}">
      <div class="habit-card__header">
        <span class="habit-identity">${escapeHTML(habit.identity || '')}</span>
      </div>

      <p class="habit-name">${escapeHTML(habit.name)}</p>
      <p class="habit-trigger">${escapeHTML(habit.trigger || '')}</p>

      <div class="habit-card__footer">
        <div class="habit-streak">
          <span class="streak-icon material-symbols-outlined filled icon-warning">local_fire_department</span>
          <span class="streak-count">${streak} ${streak === 1 ? 'día' : 'días'}</span>
        </div>

        ${completedToday ? `
          <span class="habit-done"><span class="material-symbols-outlined icon-success">check_circle</span> Hecho hoy</span>
        ` : `
          <button id="habit-check-today" class="btn btn--primary">
            <span class="material-symbols-outlined">check</span>
            Marcar como hecho
          </button>
        `}
      </div>
    </div>

    <a href="#habits" data-view="habits" class="link-subtle">
      Ver detalles del hábito →
    </a>
  `;
};

/**
 * Renderiza el botón de Evening Check-in (solo visible por la tarde/noche)
 */
const renderEveningCheckInButton = (data) => {
  // Solo mostrar a partir de las 18:00 y si no se ha hecho hoy
  if (!isEveningTime() || hasEveningCheckIn(data)) {
    return '';
  }

  return `
    <section class="dashboard__section dashboard__evening">
      <button class="evening-trigger" id="open-evening-check-in">
        <span class="material-symbols-outlined">bedtime</span>
        <div class="evening-trigger__content">
          <span class="evening-trigger__title">Cierre del día</span>
          <span class="evening-trigger__subtitle">Reflexiona antes de descansar</span>
        </div>
      </button>
    </section>
  `;
};

/**
 * Añade una nueva tarea al foco diario
 */
const handleAddFocus = (data) => {
  const input = document.getElementById('new-focus-input');
  const text = input.value.trim();

  if (!text) return;

  if (data.objectives.daily.length >= 3) {
    showNotification('Ya tienes 3 prioridades. Completa alguna primero.', 'warning');
    return;
  }

  const newTask = {
    id: generateId(),
    text,
    completed: false,
    isRocaPrincipal: false,
    createdAt: new Date().toISOString()
  };

  data.objectives.daily.push(newTask);
  updateDataCallback('objectives.daily', data.objectives.daily);

  // Re-renderizar
  window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
  location.reload(); // Temporal hasta tener routing reactivo
};

/**
 * Marca/desmarca una tarea como completada
 */
const handleToggleTask = (taskId, completed, data) => {
  const task = data.objectives.daily.find(t => t.id === taskId);
  if (task) {
    task.completed = completed;
    task.completedAt = completed ? new Date().toISOString() : null;
    updateDataCallback('objectives.daily', data.objectives.daily);

    if (completed) {
      showNotification('¡Bien hecho! Una prioridad menos.', 'success');
    }
  }
};

/**
 * Elimina una tarea del foco diario
 */
const handleDeleteTask = (taskId, data) => {
  data.objectives.daily = data.objectives.daily.filter(t => t.id !== taskId);
  updateDataCallback('objectives.daily', data.objectives.daily);
  location.reload(); // Temporal
};

/**
 * Marca/desmarca una tarea como Roca Principal
 * Solo puede haber UNA Roca Principal a la vez
 */
const handleToggleRock = (taskId, data) => {
  const task = data.objectives.daily.find(t => t.id === taskId);
  if (!task) return;

  if (task.isRocaPrincipal) {
    // Quitar como Roca Principal
    task.isRocaPrincipal = false;
    showNotification('Roca Principal quitada', 'info');
  } else {
    // Quitar cualquier otra Roca Principal existente
    data.objectives.daily.forEach(t => {
      t.isRocaPrincipal = false;
    });
    // Marcar esta como Roca Principal
    task.isRocaPrincipal = true;
    showNotification('🪨 Esta es tu Roca Principal de hoy. ¡Hazla primero!', 'success');
  }

  updateDataCallback('objectives.daily', data.objectives.daily);
  location.reload(); // Temporal
};

/**
 * Marca el hábito activo como completado hoy
 */
const handleHabitCheckToday = (data) => {
  if (!data.habits.active) return;

  const today = new Date().toISOString().split('T')[0];
  const habitId = data.habits.active.id;

  // Verificar si ya está marcado
  const alreadyDone = data.habits.history.some(
    h => h.habitId === habitId && h.date === today
  );

  if (alreadyDone) return;

  // Añadir al historial
  data.habits.history.push({
    habitId,
    date: today,
    completedAt: new Date().toISOString()
  });

  updateDataCallback('habits.history', data.habits.history);
  showNotification('¡Genial! Otro día más. 🔥', 'success');
  location.reload(); // Temporal
};

/**
 * Calcula la racha actual de un hábito
 */
const calculateStreak = (habitId, history) => {
  const habitHistory = history
    .filter(h => h.habitId === habitId)
    .map(h => h.date)
    .sort()
    .reverse();

  if (habitHistory.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Verificar si hoy está completado, si no, empezar desde ayer
  const todayStr = currentDate.toISOString().split('T')[0];
  if (!habitHistory.includes(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) { // Máximo 1 año de racha
    const dateStr = currentDate.toISOString().split('T')[0];
    if (habitHistory.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

/**
 * Verifica si el hábito se completó hoy
 */
const isCompletedToday = (habitId, history) => {
  const today = new Date().toISOString().split('T')[0];
  return history.some(h => h.habitId === habitId && h.date === today);
};

/**
 * Obtiene los eventos de hoy
 */
const getTodayEvents = (events, recurring) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();

  const todayEvents = [];

  // Eventos puntuales de hoy
  events.forEach(event => {
    if (event.date === todayStr) {
      todayEvents.push(event);
    }
  });

  // Eventos recurrentes
  recurring.forEach(event => {
    if (event.days && event.days.includes(dayOfWeek)) {
      todayEvents.push({ ...event, recurring: true });
    }
  });

  // Ordenar por hora
  return todayEvents.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
};

/**
 * Renderiza la sección de logros de hoy
 */
const renderTodayAchievements = (data) => {
  const stats = getAchievementsStats(data, 'today');
  const habitDone = data.habits.active
    ? isHabitCompletedToday(data.habits.active.id, data.habits.history || [])
    : false;

  // Si no hay logros hoy, mostrar mensaje motivacional
  if (stats.totalTasks === 0 && !habitDone) {
    return `
      <section class="dashboard__section dashboard__achievements">
        <div class="section-header">
          <h2 class="section-title">
            <span class="material-symbols-outlined icon-sm icon-warning">emoji_events</span>
            Logros de hoy
          </h2>
        </div>
        <p class="empty-state">
          Tu día está empezando. ¡Cada pequeño paso cuenta!
        </p>
        <a href="#achievements" data-view="achievements" class="link-subtle">
          Ver todos los logros →
        </a>
      </section>
    `;
  }

  return `
    <section class="dashboard__section dashboard__achievements">
      <div class="section-header">
        <h2 class="section-title">
          <span class="material-symbols-outlined icon-sm icon-warning">emoji_events</span>
          Logros de hoy
        </h2>
      </div>
      <div class="today-achievements">
        ${stats.totalTasks > 0 ? `
          <div class="achievement-item">
            <span class="material-symbols-outlined icon-success">task_alt</span>
            <span>${stats.totalTasks} tarea${stats.totalTasks > 1 ? 's' : ''} completada${stats.totalTasks > 1 ? 's' : ''}</span>
          </div>
        ` : ''}
        ${habitDone ? `
          <div class="achievement-item">
            <span class="material-symbols-outlined icon-warning filled">local_fire_department</span>
            <span>Hábito del día</span>
          </div>
        ` : ''}
        ${stats.journalEntries > 0 ? `
          <div class="achievement-item">
            <span class="material-symbols-outlined icon-primary">edit_note</span>
            <span>${stats.journalEntries} reflexión${stats.journalEntries > 1 ? 'es' : ''}</span>
          </div>
        ` : ''}
      </div>
      <a href="#achievements" data-view="achievements" class="link-subtle">
        Ver todos los logros →
      </a>
    </section>
  `;
};

// Las reflexiones de Burkeman ahora se importan de ../data/burkeman.js
// Usamos getReflexionDelDia('dashboard') que rota según el día del año
