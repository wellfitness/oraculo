/**
 * Oráculo - Dashboard
 * Vista principal con resumen del día
 */

import { generateId, formatDate, showNotification, openCalmTimer, openSpontaneousModal, openEveningCheckIn, openWeeklyReview, recordDeletion } from '../app.js';
import { needsWeeklyReview, isReviewDay } from '../components/weekly-review-modal.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { isEveningTime, hasEveningCheckIn } from '../components/evening-check-in.js';
import { getAchievementsStats, isHabitCompletedToday } from '../utils/achievements-calculator.js';
import { getReflexionDelDia } from '../data/burkeman.js';
import { getMueveteState, formatTime } from '../components/muevete-timer.js';

let updateDataCallback = null;

/**
 * Re-renderiza el dashboard sin recargar la página
 */
const reRender = (data) => {
  const container = document.getElementById('app-content');
  if (container) {
    container.innerHTML = render(data);
    init(data, updateDataCallback);
  }
};

/**
 * Renderiza el launcher compacto para la extensión Chrome
 */
const renderExtensionLauncher = (data) => {
  const mueveteState = getMueveteState();
  const activeHabit = data.habits.active;
  const rocaPrincipal = (data.objectives.daily || []).find(t => t.isRocaPrincipal && !t.completed);
  const dailyTasks = (data.objectives.daily || []).filter(t => !t.completed);
  const todayEvents = getTodayEvents(data.calendar?.events || [], data.calendar?.recurring || []);
  const completedToday = activeHabit ? isHabitCompletedToday(activeHabit, data.habits.history) : false;

  const tools = [
    { view: 'today', icon: 'today', label: 'Hoy' },
    { view: 'kanban', icon: 'view_kanban', label: 'Tareas', badge: dailyTasks.length || '' },
    { view: 'projects', icon: 'folder_open', label: 'Proyectos' },
    { view: 'habits', icon: 'science', label: 'Hábitos' },
    { view: 'muevete', icon: 'directions_run', label: 'Muévete' },
    { view: 'calendar', icon: 'calendar_month', label: 'Calendario', badge: todayEvents.length || '' },
    { view: 'journal', icon: 'auto_stories', label: 'Diario' },
    { view: 'values', icon: 'explore', label: 'Valores' },
    { view: 'life-wheel', icon: 'donut_large', label: 'Rueda' },
    { view: 'achievements', icon: 'emoji_events', label: 'Logros' }
  ];

  const toolsGrid = tools.map(t => `
    <a href="#${t.view}" data-view="${t.view}" class="launcher__tool">
      <span class="material-symbols-outlined launcher__tool-icon">${t.icon}</span>
      <span class="launcher__tool-label">${t.label}</span>
      ${t.badge ? `<span class="launcher__tool-badge">${t.badge}</span>` : ''}
    </a>
  `).join('');

  // Widgets activos
  let widgets = '';

  // Roca del día
  if (rocaPrincipal) {
    widgets += `
      <a href="#kanban" data-view="kanban" class="launcher__widget launcher__widget--roca">
        <span class="material-symbols-outlined">diamond</span>
        <div>
          <span class="launcher__widget-title">Roca del día</span>
          <span class="launcher__widget-value">${escapeHTML(rocaPrincipal.text)}</span>
        </div>
      </a>
    `;
  }

  // Muévete timer
  if (mueveteState.status !== 'idle') {
    const isAlert = mueveteState.status === 'break_alert';
    const isBreak = mueveteState.status === 'active_break';
    const time = isAlert ? '¡Muévete!' : formatTime(isBreak ? mueveteState.breakRemaining : mueveteState.workBlockRemaining);
    const icon = isAlert ? 'warning' : isBreak ? 'self_improvement' : 'directions_run';
    const cls = isAlert ? 'launcher__widget--alert' : isBreak ? 'launcher__widget--break' : 'launcher__widget--working';

    widgets += `
      <a href="#muevete" data-view="muevete" class="launcher__widget ${cls}">
        <span class="material-symbols-outlined">${icon}</span>
        <div>
          <span class="launcher__widget-title">${isBreak ? 'Vitamina M' : 'Trabajando'}</span>
          <span class="launcher__widget-value">${time}</span>
        </div>
      </a>
    `;
  }

  // Hábito activo
  if (activeHabit) {
    const streak = getHabitStreak(activeHabit.id, data.habits.history);
    widgets += `
      <a href="#habits" data-view="habits" class="launcher__widget launcher__widget--habit">
        <span class="material-symbols-outlined">${completedToday ? 'task_alt' : 'science'}</span>
        <div>
          <span class="launcher__widget-title">${escapeHTML(activeHabit.name)}</span>
          <span class="launcher__widget-value">${completedToday ? 'Hecho hoy' : `${streak} días de racha`}</span>
        </div>
      </a>
    `;
  }

  const reflexion = getReflexionDelDia('dashboard');

  return `
    <div class="launcher">
      <div class="launcher__grid">
        ${toolsGrid}
      </div>

      ${widgets ? `<div class="launcher__widgets">${widgets}</div>` : ''}

      <div class="launcher__quote">
        <p>"${reflexion}"</p>
      </div>
    </div>
  `;
};

/**
 * Calcula racha de hábito (simplificado)
 */
const getHabitStreak = (habitId, history) => {
  if (!history || !habitId) return 0;
  const dates = history.filter(h => h.habitId === habitId).map(h => h.date).sort().reverse();
  if (dates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const current = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dateStr = current.toISOString().split('T')[0];
    if (dates.includes(dateStr)) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else if (i === 0) {
      current.setDate(current.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};

/**
 * Renderiza el dashboard
 */
export const render = (data) => {
  // En la extensión Chrome, mostrar launcher compacto
  const isExtension = !!(window.__ORACULO_EXTENSION__ || (typeof chrome !== 'undefined' && chrome.runtime?.id));
  if (isExtension) {
    return renderExtensionLauncher(data);
  }

  const today = new Date();
  const dailyTasks = data.objectives.daily || [];
  const dailyLimit = getDailyLimit(data);
  const activeHabit = data.habits.active;
  const todayEvents = getTodayEvents(data.calendar?.events || [], data.calendar?.recurring || []);
  const activeProjects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

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
          <span class="section-limit">${dailyTasks.length}/${dailyLimit}</span>
        </div>

        <ul class="focus-list" id="focus-list">
          ${dailyTasks.map(task => renderFocusTask(task, activeProjects)).join('')}
        </ul>

        ${dailyTasks.length < dailyLimit ? `
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
            Ya tienes ${dailyLimit} prioridades. Completa alguna antes de añadir más.
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

      ${renderNextActions(data)}

      ${renderWeeklyReviewReminder(data)}

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

      <section class="dashboard__section dashboard__evening">
        ${renderEveningCheckInCard(data)}
      </section>

      ${renderTodayAchievements(data)}

      <section class="dashboard__section dashboard__move-calm">
        ${renderMueveteCard()}
        <button class="calm-trigger" id="open-calm-timer">
          <span class="material-symbols-outlined">self_improvement</span>
          <div class="calm-trigger__content">
            <span class="calm-trigger__title">5 minutos de calma</span>
            <span class="calm-trigger__subtitle">Práctica de presencia</span>
          </div>
        </button>
      </section>

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
let dashboardMueveteHandler = null;

export const init = (data, updateData) => {
  updateDataCallback = updateData;

  // En extensión: escuchar cambios del timer Muévete para actualizar widget
  const isExtension = !!(window.__ORACULO_EXTENSION__ || (typeof chrome !== 'undefined' && chrome.runtime?.id));
  if (isExtension) {
    if (dashboardMueveteHandler) {
      window.removeEventListener('muevete-state-changed', dashboardMueveteHandler);
    }
    dashboardMueveteHandler = () => {
      if (location.hash === '#dashboard' || location.hash === '' || location.hash === '#') {
        const widgetsEl = document.querySelector('.launcher__widgets');
        if (widgetsEl) reRender(data);
      }
    };
    window.addEventListener('muevete-state-changed', dashboardMueveteHandler);
  }

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
      e.stopPropagation();
      handleDeleteTask(btn.dataset.id, data);
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

  // Revisión semanal desde dashboard
  document.getElementById('start-review-from-dashboard')?.addEventListener('click', () => {
    openWeeklyReview();
  });

  // Descartar recordatorio de revisión (solo para esta sesión)
  document.getElementById('dismiss-review-reminder')?.addEventListener('click', () => {
    const reminder = document.querySelector('.dashboard__review-reminder');
    if (reminder) {
      reminder.style.display = 'none';
    }
  });
};

/**
 * Renderiza una tarea del foco diario
 * @param {Object} task - La tarea a renderizar
 * @param {Array} projects - Lista de proyectos activos (para mostrar badge)
 */
const renderFocusTask = (task, projects = []) => {
  const isRock = task.isRocaPrincipal;
  const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;

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
        ${project ? `
          <span class="focus-project" style="--project-color: ${project.color}">
            <span class="project-dot" style="background-color: ${project.color}"></span>
            ${escapeHTML(project.name)}
          </span>
        ` : ''}
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
const renderMueveteCard = () => {
  const state = getMueveteState();

  if (state.status === 'idle') {
    return `
      <a href="#muevete" data-view="muevete" class="calm-trigger muevete-dashboard-card">
        <span class="material-symbols-outlined">directions_run</span>
        <div class="calm-trigger__content">
          <span class="calm-trigger__title">Muévete</span>
          <span class="calm-trigger__subtitle">Inicia un bloque de trabajo</span>
        </div>
      </a>
    `;
  }

  if (state.status === 'working') {
    return `
      <a href="#muevete" data-view="muevete" class="calm-trigger muevete-dashboard-card muevete-dashboard-card--active">
        <span class="material-symbols-outlined">directions_run</span>
        <div class="calm-trigger__content">
          <span class="calm-trigger__title">Muévete — ${formatTime(state.workBlockRemaining)}</span>
          <span class="calm-trigger__subtitle">${state.blocksCompleted} vitamina${state.blocksCompleted !== 1 ? 's' : ''} M hoy</span>
        </div>
      </a>
    `;
  }

  if (state.status === 'break_alert') {
    return `
      <a href="#muevete" data-view="muevete" class="calm-trigger muevete-dashboard-card muevete-dashboard-card--alert">
        <span class="material-symbols-outlined">warning</span>
        <div class="calm-trigger__content">
          <span class="calm-trigger__title">¡Hora de moverse!</span>
          <span class="calm-trigger__subtitle">Tu cuerpo necesita una pausa</span>
        </div>
      </a>
    `;
  }

  // active_break
  return `
    <a href="#muevete" data-view="muevete" class="calm-trigger muevete-dashboard-card muevete-dashboard-card--break">
      <span class="material-symbols-outlined">self_improvement</span>
      <div class="calm-trigger__content">
        <span class="calm-trigger__title">Vitamina M — ${formatTime(state.breakRemaining)}</span>
        <span class="calm-trigger__subtitle">Break activo</span>
      </div>
    </a>
  `;
};

const renderActiveHabit = (habit, history) => {
  const streak = calculateStreak(habit.id, history);
  const completedToday = isHabitCompletedToday(habit.id, history);

  // Contexto "nunca falles dos veces"
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  const completedYesterday = history.some(h => h.habitId === habit.id && h.date === yesterdayStr);

  // Determinar el icono del trigger segun el contexto
  const triggerIcon = habit.scheduledTime ? 'schedule' : 'event';
  const triggerText = habit.trigger || '';

  // Mensaje de animo si no se ha hecho hoy
  let encouragement = '';
  if (!completedToday && completedYesterday && streak === 0) {
    encouragement = `<p class="streak-encouragement">No te lo saltes dos veces.</p>`;
  } else if (!completedToday && !completedYesterday && history.some(h => h.habitId === habit.id)) {
    encouragement = `<p class="streak-encouragement">Hoy puedes volver a empezar.</p>`;
  }

  return `
    <div class="habit-card ${completedToday ? 'habit-card--completed' : ''}">
      ${habit.identity ? `
        <div class="habit-card__header">
          <span class="habit-identity" title="Soy una persona que ${escapeHTML(habit.identity)}">Soy una persona que ${escapeHTML(habit.identity)}</span>
        </div>
      ` : ''}

      <div class="habit-card__body">
        <p class="habit-name" title="${escapeHTML(habit.name)}">${escapeHTML(habit.name)}</p>
        ${triggerText ? `
          <span class="habit-trigger">
            <span class="material-symbols-outlined habit-trigger__icon">${triggerIcon}</span>
            <span class="habit-trigger__text" title="${escapeHTML(triggerText)}">${escapeHTML(triggerText)}</span>
          </span>
        ` : ''}
      </div>

      <div class="habit-card__footer">
        <div class="habit-streak">
          <span class="streak-icon material-symbols-outlined filled icon-warning">local_fire_department</span>
          <span class="streak-count">${streak} ${streak === 1 ? 'dia' : 'dias'}</span>
        </div>

        ${completedToday ? `
          <span class="habit-done">
            <span class="material-symbols-outlined icon-success">check_circle</span>
            Hecho hoy
          </span>
        ` : `
          <button id="habit-check-today" class="btn btn--primary">
            <span class="material-symbols-outlined">check</span>
            Marcar como hecho
          </button>
        `}
      </div>

      ${encouragement}
    </div>

    <a href="#habits" data-view="habits" class="link-subtle">
      Ver detalles del habito
    </a>
  `;
};

/**
 * Renderiza la sección de Próximas Acciones GTD
 * Muestra la próxima acción de cada proyecto activo que tenga una definida
 */
const renderNextActions = (data) => {
  const activeProjects = (data.projects || []).filter(p =>
    p.status === 'active' && p.nextActionId
  );

  if (activeProjects.length === 0) return '';

  // Obtener las próximas acciones de cada proyecto
  const nextActions = activeProjects.map(project => {
    // Buscar la tarea en todos los horizontes
    const allHorizons = ['daily', 'weekly', 'monthly', 'quarterly', 'backlog'];
    let task = null;

    for (const horizon of allHorizons) {
      const tasks = data.objectives?.[horizon] || [];
      task = tasks.find(t => t.id === project.nextActionId && !t.completed);
      if (task) break;
    }

    return task ? { project, task } : null;
  }).filter(Boolean);

  if (nextActions.length === 0) return '';

  return `
    <section class="dashboard__section dashboard__next-actions">
      <h2 class="section-title">
        <span class="material-symbols-outlined icon-sm">play_arrow</span>
        Próximas Acciones
      </h2>
      <ul class="next-actions-list">
        ${nextActions.map(({ project, task }) => `
          <li class="next-action-item">
            <span class="project-dot" style="background-color: ${project.color}"></span>
            <div class="next-action-content">
              <span class="next-action-project">${escapeHTML(project.name)}</span>
              <span class="next-action-task">${escapeHTML(task.text)}</span>
            </div>
          </li>
        `).join('')}
      </ul>
      <a href="#projects" data-view="projects" class="link-subtle">
        Ver todos los proyectos →
      </a>
    </section>
  `;
};

/**
 * Renderiza el recordatorio de revisión semanal GTD
 * Solo visible si:
 * - Han pasado 7+ días desde la última revisión
 * - Es el día configurado (domingo o lunes)
 * - El recordatorio está activado en settings
 */
const renderWeeklyReviewReminder = (data) => {
  // Verificar si el recordatorio está desactivado
  if (data.settings?.weeklyReviewReminder === false) return '';

  // Verificar si necesita revisión
  if (!needsWeeklyReview(data)) return '';

  // Solo mostrar en el día configurado o si han pasado más de 10 días
  const lastReview = data.settings?.lastWeeklyReview;
  const daysSinceReview = lastReview
    ? Math.floor((Date.now() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Mostrar si es el día de revisión O si han pasado muchos días
  if (!isReviewDay(data) && daysSinceReview < 10) return '';

  return `
    <section class="dashboard__section dashboard__review-reminder">
      <div class="review-reminder">
        <span class="material-symbols-outlined review-reminder__icon">checklist_rtl</span>
        <strong class="review-reminder__title">Es hora de revisar tu sistema</strong>
        <p class="review-reminder__text">La revisión semanal te ayuda a mantener todo bajo control.</p>
        <div class="review-reminder__actions">
          <button class="btn btn--primary" id="start-review-from-dashboard">
            Revisar ahora
          </button>
          <button class="btn btn--ghost btn--sm" id="dismiss-review-reminder">
            Más tarde
          </button>
        </div>
      </div>
    </section>
  `;
};

/**
 * Renderiza la tarjeta de Cierre del día (sin wrapper section)
 */
const renderEveningCheckInCard = (data) => {
  const done = hasEveningCheckIn(data);

  if (done) {
    return `
      <div class="evening-trigger evening-trigger--done">
        <span class="material-symbols-outlined">task_alt</span>
        <div class="evening-trigger__content">
          <span class="evening-trigger__title">Cierre del día</span>
          <span class="evening-trigger__subtitle">Completado hoy</span>
        </div>
      </div>
    `;
  }

  return `
    <button class="evening-trigger" id="open-evening-check-in">
      <span class="material-symbols-outlined">bedtime</span>
      <div class="evening-trigger__content">
        <span class="evening-trigger__title">Cierre del día</span>
        <span class="evening-trigger__subtitle">Reflexión + bienestar</span>
      </div>
    </button>
  `;
};

/**
 * Parsea el texto para extraer hashtags de proyecto
 * Ejemplo: "Llamar al médico #Salud" → { text: "Llamar al médico", projectId: "abc123" }
 * @param {string} rawText - Texto con posible hashtag
 * @param {Array} projects - Lista de proyectos activos
 * @returns {{ text: string, projectId: string|null }}
 */
const parseProjectHashtag = (rawText, projects) => {
  // Buscar patrón #palabra (al final o en medio del texto)
  const hashtagMatch = rawText.match(/#(\S+)/);

  if (!hashtagMatch) {
    return { text: rawText, projectId: null };
  }

  const hashtagName = hashtagMatch[1].toLowerCase();

  // Buscar proyecto que coincida (case-insensitive, parcial)
  const matchedProject = projects.find(p =>
    p.name.toLowerCase().includes(hashtagName) ||
    hashtagName.includes(p.name.toLowerCase())
  );

  if (matchedProject) {
    // Quitar el hashtag del texto
    const cleanText = rawText.replace(/#\S+\s?/, '').trim();
    return { text: cleanText, projectId: matchedProject.id };
  }

  // Si no coincide ningún proyecto, mantener el texto original (con hashtag)
  return { text: rawText, projectId: null };
};

/**
 * Añade una nueva tarea al foco diario
 * Soporta sintaxis hashtag para asignar proyecto: "Tarea #Proyecto"
 */
const handleAddFocus = (data) => {
  const input = document.getElementById('new-focus-input');
  const rawText = input.value.trim();

  if (!rawText) return;

  const limit = getDailyLimit(data);
  if (data.objectives.daily.length >= limit) {
    showNotification(`Ya tienes ${limit} prioridades. Completa alguna primero.`, 'warning');
    return;
  }

  // Parsear hashtag de proyecto
  const activeProjects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');
  const { text, projectId } = parseProjectHashtag(rawText, activeProjects);

  const newTask = {
    id: generateId(),
    text,
    completed: false,
    isRocaPrincipal: false,
    projectId: projectId,
    createdAt: new Date().toISOString()
  };

  data.objectives.daily.push(newTask);
  updateDataCallback('objectives.daily', data.objectives.daily);

  // Notificación con info del proyecto si se asignó
  if (projectId) {
    const project = activeProjects.find(p => p.id === projectId);
    showNotification(`Añadido a "${project.name}"`, 'success');
  }

  // Re-renderizar
  reRender(data);
};

/**
 * Marca/desmarca una tarea como completada
 */
const handleToggleTask = (taskId, completed, data) => {
  const task = data.objectives.daily.find(t => t.id === taskId);
  if (!task) return;

  if (completed) {
    // Marcar como completada
    task.completed = true;
    task.completedAt = new Date().toISOString();
    task.originalColumn = 'daily'; // Guardar origen para posible restauración

    // Mover a objectives.completed (igual que en kanban)
    if (!data.objectives.completed) {
      data.objectives.completed = [];
    }
    data.objectives.daily = data.objectives.daily.filter(t => t.id !== taskId);
    data.objectives.completed.push(task);

    updateDataCallback('objectives', data.objectives);
    showNotification('¡Bien hecho! Una prioridad menos.', 'success');
    reRender(data);
  } else {
    // Desmarcar (solo actualizar estado, no mover)
    task.completed = false;
    task.completedAt = null;
    updateDataCallback('objectives.daily', data.objectives.daily);
    reRender(data);
  }
};

/**
 * Elimina una tarea del foco diario
 * Requiere confirmación para evitar borrados accidentales
 */
const handleDeleteTask = (taskId, data) => {
  if (!confirm('¿Eliminar esta prioridad?')) return;

  recordDeletion(data, 'objectives.daily', taskId);
  data.objectives.daily = data.objectives.daily.filter(t => t.id !== taskId);
  updateDataCallback('objectives.daily', data.objectives.daily);
  showNotification('Prioridad eliminada', 'info');
  reRender(data);
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
  reRender(data);
};

/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 * (evita toISOString() que convierte a UTC y causa desfases)
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA'); // 'en-CA' devuelve YYYY-MM-DD
};

/**
 * Obtiene el límite diario dinámico según el Volumen Fijo configurado
 * Si no hay setup del día, usa el límite por defecto (3)
 */
const getDailyLimit = (data) => {
  const today = getLocalDateString();
  if (data.dailySetup?.date === today && data.dailySetup?.dailyLimit) {
    return data.dailySetup.dailyLimit;
  }
  return 3; // fallback
};

/**
 * Marca el hábito activo como completado hoy
 */
const handleHabitCheckToday = (data) => {
  if (!data.habits.active) return;

  const today = getLocalDateString();
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
  reRender(data);
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
  const todayStr = getLocalDateString(currentDate);
  if (!habitHistory.includes(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) { // Máximo 1 año de racha
    const dateStr = getLocalDateString(currentDate);
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
 * Obtiene los eventos de hoy
 */
const getTodayEvents = (events, recurring) => {
  const today = new Date();
  const todayStr = getLocalDateString(today);
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
