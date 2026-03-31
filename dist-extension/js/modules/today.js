/**
 * Oráculo - Vista "Hoy"
 * Todo lo esencial del día en una vista compacta sin scroll.
 * Roca + tareas foco + timer Muévete + hábito + próximo evento.
 */

import { generateId, showNotification, formatDate, openCalmTimer, recordDeletion } from '../app.js';
import { getMueveteState, formatTime, startWorkBlock } from '../components/muevete-timer.js';
import { isHabitCompletedToday } from '../utils/achievements-calculator.js';
import { getReflexionDelDia } from '../data/burkeman.js';
import { escapeHTML } from '../utils/sanitizer.js';

let updateDataCallback = null;
let todayTimerHandler = null;

const reRender = (data) => {
  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = render(data);
    init(data, updateDataCallback);
  }
};

/**
 * Obtiene eventos de hoy (puntuales + recurrentes)
 */
const getNextEvent = (calendar) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const dayOfWeek = now.getDay();

  const events = [];

  // Eventos puntuales de hoy
  (calendar?.events || []).forEach(e => {
    if (e.date === today && e.time) {
      const [h, m] = e.time.split(':').map(Number);
      const eventMinutes = h * 60 + m;
      if (eventMinutes >= currentMinutes) {
        events.push({ name: e.name, time: e.time, minutes: eventMinutes });
      }
    }
  });

  // Eventos recurrentes de hoy
  (calendar?.recurring || []).forEach(e => {
    if (e.days?.includes(dayOfWeek) && e.time) {
      const [h, m] = e.time.split(':').map(Number);
      const eventMinutes = h * 60 + m;
      if (eventMinutes >= currentMinutes) {
        events.push({ name: e.name, time: e.time, minutes: eventMinutes });
      }
    }
  });

  events.sort((a, b) => a.minutes - b.minutes);
  return events[0] || null;
};

export const render = (data) => {
  const dailyTasks = (data.objectives?.daily || []).filter(t => !t.completed);
  const rocaPrincipal = dailyTasks.find(t => t.isRocaPrincipal);
  const otherTasks = dailyTasks.filter(t => !t.isRocaPrincipal);
  const completedToday = (data.objectives?.daily || []).filter(t => t.completed).length;
  const totalDaily = (data.objectives?.daily || []).length;

  const activeHabit = data.habits?.active;
  const habitDone = activeHabit ? isHabitCompletedToday(activeHabit, data.habits?.history) : false;

  const mueveteState = getMueveteState();
  const nextEvent = getNextEvent(data.calendar);
  const reflexion = getReflexionDelDia('dashboard');

  // Hora del saludo
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';

  return `
    <div class="today">
      <header class="today__header">
        <h1 class="today__greeting">${greeting}</h1>
        <p class="today__date">${formatDate(new Date())}</p>
      </header>

      ${rocaPrincipal ? `
        <div class="today__roca">
          <div class="today__roca-label">
            <span class="material-symbols-outlined">diamond</span>
            Roca del día
          </div>
          <div class="today__roca-text">${escapeHTML(rocaPrincipal.text)}</div>
          <button class="today__roca-done" data-id="${rocaPrincipal.id}">
            <span class="material-symbols-outlined">check</span>
            Hecho
          </button>
        </div>
      ` : ''}

      ${otherTasks.length > 0 ? `
        <div class="today__tasks">
          ${otherTasks.map(t => `
            <div class="today__task">
              <button class="today__task-check" data-id="${t.id}">
                <span class="material-symbols-outlined">radio_button_unchecked</span>
              </button>
              <span class="today__task-text">${escapeHTML(t.text)}</span>
            </div>
          `).join('')}
          <div class="today__tasks-progress">
            ${completedToday}/${totalDaily} completadas
          </div>
        </div>
      ` : dailyTasks.length === 0 ? `
        <div class="today__empty">
          <span class="material-symbols-outlined">task_alt</span>
          <p>Sin tareas en foco. <a href="#kanban" data-view="kanban">Añadir desde Horizontes</a></p>
        </div>
      ` : ''}

      <div class="today__widgets">
        ${mueveteState.status !== 'idle' ? `
          <a href="#muevete" data-view="muevete" class="today__widget today__widget--muevete ${mueveteState.status === 'break_alert' ? 'today__widget--alert' : ''}">
            <span class="material-symbols-outlined">${mueveteState.status === 'break_alert' ? 'warning' : mueveteState.status === 'active_break' ? 'self_improvement' : 'directions_run'}</span>
            <span>${mueveteState.status === 'break_alert' ? '¡Muévete!' : formatTime(mueveteState.status === 'active_break' ? mueveteState.breakRemaining : mueveteState.workBlockRemaining)}</span>
          </a>
        ` : `
          <button class="today__widget today__widget--start" id="today-start-muevete">
            <span class="material-symbols-outlined">directions_run</span>
            <span>Iniciar bloque</span>
          </button>
        `}

        ${activeHabit ? `
          <a href="#habits" data-view="habits" class="today__widget today__widget--habit ${habitDone ? 'today__widget--done' : ''}">
            <span class="material-symbols-outlined">${habitDone ? 'task_alt' : 'science'}</span>
            <span>${habitDone ? 'Hábito hecho' : escapeHTML(activeHabit.name)}</span>
          </a>
        ` : ''}

        ${nextEvent ? `
          <div class="today__widget today__widget--event">
            <span class="material-symbols-outlined">schedule</span>
            <span>${nextEvent.time} ${escapeHTML(nextEvent.name)}</span>
          </div>
        ` : ''}
      </div>

      <div class="today__quote">
        <p>"${reflexion}"</p>
      </div>
    </div>
  `;
};

export const init = (data, updateData) => {
  updateDataCallback = updateData;

  // Completar tareas
  document.querySelectorAll('.today__task-check, .today__roca-done').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const task = data.objectives.daily.find(t => t.id === id);
      if (task) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
        task.updatedAt = new Date().toISOString();
        task.originalColumn = 'daily';

        // Registrar tombstone + mover a completed (igual que kanban/dashboard)
        recordDeletion(data, 'objectives.daily', id);
        if (!data.objectives.completed) data.objectives.completed = [];
        data.objectives.daily = data.objectives.daily.filter(t => t.id !== id);
        data.objectives.completed.push(task);

        updateData('objectives', data.objectives);
        showNotification('Tarea completada', 'success');
        reRender(data);
      }
    });
  });

  // Iniciar Muévete
  document.getElementById('today-start-muevete')?.addEventListener('click', () => {
    startWorkBlock();
    reRender(data);
  });

  // Escuchar cambios del timer (con cleanup)
  if (todayTimerHandler) {
    window.removeEventListener('muevete-state-changed', todayTimerHandler);
  }
  todayTimerHandler = () => {
    if (location.hash === '#today') reRender(data);
  };
  window.addEventListener('muevete-state-changed', todayTimerHandler);
};

export default { render, init };
