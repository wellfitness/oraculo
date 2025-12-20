/**
 * Oráculo - Página de Daily Setup
 * Configuración diaria basada en la técnica de Volumen Fijo de Burkeman
 *
 * Reemplaza el modal por una página completa más cómoda.
 */

import { showNotification, navigateTo } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';

// Nombres de columnas para mostrar
const COLUMN_NAMES = {
  backlog: 'Backlog',
  quarterly: 'Trimestre',
  monthly: 'Mes',
  weekly: 'Semana',
  daily: 'Hoy'
};

// Opciones de tiempo disponible
const TIME_OPTIONS = [
  { value: '2h', label: '2h', icon: 'hourglass_empty', limit: 1 },
  { value: '4h', label: '4h', icon: 'hourglass_bottom', limit: 2 },
  { value: '6h', label: '6h', icon: 'hourglass_top', limit: 3 },
  { value: 'full', label: 'Full', icon: 'wb_sunny', limit: 3 }
];

// Opciones de nivel de energía
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', icon: 'battery_1_bar', modifier: -1 },
  { value: 'medium', label: 'Media', icon: 'battery_4_bar', modifier: 0 },
  { value: 'high', label: 'Alta', icon: 'battery_full', modifier: 1 }
];

/**
 * Verifica si el setup diario ya se ha hecho hoy
 */
export const needsDailySetup = (data) => {
  const today = new Date().toISOString().split('T')[0];
  const setupDate = data?.dailySetup?.date;
  return !setupDate || setupDate !== today;
};

/**
 * Calcula el límite diario basado en tiempo y energía
 */
export const calculateDailyLimit = (availableTime, energyLevel) => {
  const timeOption = TIME_OPTIONS.find(t => t.value === availableTime) || TIME_OPTIONS[1];
  const energyOption = ENERGY_OPTIONS.find(e => e.value === energyLevel) || ENERGY_OPTIONS[1];
  let limit = timeOption.limit + energyOption.modifier;
  return Math.max(1, Math.min(3, limit));
};

/**
 * Obtiene el saludo según la hora del día
 */
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
};

/**
 * Renderiza la página de Daily Setup
 */
export const render = (data) => {
  const objectives = data?.objectives || {};
  const projects = (data?.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

  // Obtener todas las tareas no completadas
  const allTasks = [];
  ['quarterly', 'monthly', 'weekly', 'backlog'].forEach(column => {
    (objectives[column] || []).forEach(item => {
      if (!item.completed) {
        allTasks.push({ ...item, column });
      }
    });
  });

  // Tareas ya en daily
  const dailyTasks = (objectives.daily || []).filter(i => !i.completed);

  return `
    <div class="daily-setup-page">
      <!-- Header compacto -->
      <header class="setup-page-header">
        <span class="material-symbols-outlined setup-page-header__icon">wb_twilight</span>
        <h1 class="setup-page-header__title">${getGreeting()}</h1>
        <p class="setup-page-header__subtitle">¿Cómo es tu día hoy?</p>
      </header>

      <!-- Selectores de Tiempo y Energía -->
      <section class="setup-selectors" aria-label="Configuración del día">
        <!-- Tiempo disponible -->
        <div class="selector-group">
          <span class="selector-group__label">
            <span class="material-symbols-outlined">schedule</span>
            Tiempo
          </span>
          <div class="selector-chips" role="radiogroup" aria-label="Tiempo disponible">
            ${TIME_OPTIONS.map(opt => `
              <button type="button" class="selector-chip" data-time="${opt.value}"
                      role="radio" aria-pressed="false" aria-label="${opt.label}">
                <span class="material-symbols-outlined selector-chip__icon">${opt.icon}</span>
                <span class="selector-chip__label">${opt.label}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Nivel de energía -->
        <div class="selector-group">
          <span class="selector-group__label">
            <span class="material-symbols-outlined">bolt</span>
            Energía
          </span>
          <div class="selector-chips" role="radiogroup" aria-label="Nivel de energía">
            ${ENERGY_OPTIONS.map(opt => `
              <button type="button" class="selector-chip" data-energy="${opt.value}"
                      role="radio" aria-pressed="false" aria-label="Energía ${opt.label}">
                <span class="material-symbols-outlined selector-chip__icon">${opt.icon}</span>
                <span class="selector-chip__label">${opt.label}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </section>

      <!-- Resultado calculado -->
      <div class="setup-result" id="setup-result" aria-live="polite">
        <span class="material-symbols-outlined setup-result__icon">tips_and_updates</span>
        <span class="setup-result__text">Hoy puedes:</span>
        <span class="setup-result__limit" id="result-limit">2 tareas</span>
      </div>

      <!-- Lista de tareas -->
      <section class="setup-tasks" aria-label="Selecciona tus prioridades">
        <header class="setup-tasks__header">
          <h2 class="setup-tasks__title">
            <span class="material-symbols-outlined">checklist</span>
            Elige tus prioridades
          </h2>
          <span class="setup-tasks__counter" id="tasks-counter" aria-label="Tareas seleccionadas">
            ${dailyTasks.length}/2
          </span>
        </header>

        <ul class="setup-tasks__list" role="list" id="tasks-list">
          ${renderTasksList(allTasks, dailyTasks, projects)}
        </ul>
      </section>

      <!-- Botón de acción -->
      <footer class="setup-actions">
        <button type="button" class="btn-start" id="btn-start-day" disabled>
          <span class="material-symbols-outlined">check_circle</span>
          Empezar el día
        </button>
        <a href="#" class="setup-skip" id="btn-skip">Omitir por hoy</a>
      </footer>
    </div>
  `;
};

/**
 * Renderiza la lista de tareas
 */
const renderTasksList = (allTasks, dailyTasks, projects) => {
  // Combinar daily (ya seleccionadas) + pendientes
  const tasks = [
    ...dailyTasks.map(t => ({ ...t, column: 'daily', isInDaily: true })),
    ...allTasks
  ];

  if (tasks.length === 0) {
    return `
      <li class="setup-tasks__empty">
        <span class="material-symbols-outlined">inbox</span>
        <p>No tienes tareas pendientes.</p>
        <p>Añade tareas en Horizontes.</p>
      </li>
    `;
  }

  return tasks.map(task => {
    const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
    const columnName = COLUMN_NAMES[task.column];

    return `
      <li class="task-item ${task.isInDaily ? 'task-item--selected' : ''}"
          data-id="${task.id}" data-column="${task.column}">
        <label class="task-item__checkbox">
          <input type="checkbox"
                 ${task.isInDaily ? 'checked' : ''}
                 aria-label="Seleccionar tarea"
                 data-id="${task.id}"
                 data-column="${task.column}">
          <span class="task-item__check-icon">
            <span class="material-symbols-outlined">check</span>
          </span>
        </label>
        <div class="task-item__content">
          <p class="task-item__text">${task.text}</p>
          <div class="task-item__meta">
            <span class="task-item__tag task-item__tag--horizon">${columnName}</span>
            ${project ? `
              <span class="task-item__tag task-item__tag--project"
                    style="--project-color: ${project.color}">
                ${project.name}
              </span>
            ` : ''}
          </div>
        </div>
      </li>
    `;
  }).join('');
};

/**
 * Inicializa la página de Daily Setup
 */
export const init = (data, updateData) => {
  let selectedTime = null;
  let selectedEnergy = null;
  let currentLimit = 2;

  const resultDiv = document.getElementById('setup-result');
  const resultLimit = document.getElementById('result-limit');
  const tasksCounter = document.getElementById('tasks-counter');
  const btnStart = document.getElementById('btn-start-day');
  const btnSkip = document.getElementById('btn-skip');

  // Obtener tareas ya en daily
  const dailyTasks = (data.objectives?.daily || []).filter(i => !i.completed);

  // --- Selectores de tiempo ---
  document.querySelectorAll('[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-time]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      selectedTime = btn.dataset.time;
      updateResult();
    });
  });

  // --- Selectores de energía ---
  document.querySelectorAll('[data-energy]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-energy]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      selectedEnergy = btn.dataset.energy;
      updateResult();
    });
  });

  // --- Actualizar resultado ---
  const updateResult = () => {
    if (selectedTime && selectedEnergy) {
      currentLimit = calculateDailyLimit(selectedTime, selectedEnergy);
      resultDiv.classList.add('visible');
      resultLimit.textContent = currentLimit + ' tarea' + (currentLimit > 1 ? 's' : '');
      btnStart.disabled = false;
      updateCounter();
    }
  };

  // --- Actualizar contador de tareas ---
  const updateCounter = () => {
    const selected = document.querySelectorAll('.task-item input:checked').length;
    tasksCounter.textContent = `${selected}/${currentLimit}`;

    if (selected >= currentLimit) {
      tasksCounter.classList.add('setup-tasks__counter--full');
    } else {
      tasksCounter.classList.remove('setup-tasks__counter--full');
    }
  };

  // --- Checkboxes de tareas ---
  document.querySelectorAll('.task-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = cb.closest('.task-item');
      const isInDaily = item.dataset.column === 'daily';

      // Verificar límite (solo para nuevas selecciones)
      if (cb.checked && !isInDaily) {
        const selected = document.querySelectorAll('.task-item input:checked').length;
        if (selected > currentLimit) {
          cb.checked = false;
          showNotification(`Solo puedes elegir ${currentLimit} tarea${currentLimit > 1 ? 's' : ''}`, 'warning');
          return;
        }
      }

      item.classList.toggle('task-item--selected', cb.checked);
      updateCounter();
    });
  });

  // --- Omitir setup ---
  btnSkip?.addEventListener('click', (e) => {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];

    data.dailySetup = {
      ...data.dailySetup,
      date: today,
      skippedAt: new Date().toISOString()
    };

    updateData('dailySetup', data.dailySetup);
    navigateTo('dashboard');
  });

  // --- Confirmar setup ---
  btnStart?.addEventListener('click', () => {
    if (!selectedTime || !selectedEnergy) {
      showNotification('Selecciona tiempo y energía', 'warning');
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    // Mover tareas seleccionadas a daily
    const selectedTasks = Array.from(
      document.querySelectorAll('.task-item input:checked')
    ).map(cb => ({
      id: cb.dataset.id,
      column: cb.dataset.column
    }));

    let movedCount = 0;
    selectedTasks.forEach(({ id, column }) => {
      if (column === 'daily') return; // Ya está en daily

      const sourceItems = data.objectives[column];
      if (!sourceItems) return;

      const itemIndex = sourceItems.findIndex(i => i.id === id);
      if (itemIndex === -1) return;

      const [item] = sourceItems.splice(itemIndex, 1);
      item.movedAt = new Date().toISOString();
      item.movedFrom = column;

      if (!data.objectives.daily) {
        data.objectives.daily = [];
      }
      data.objectives.daily.push(item);
      movedCount++;
    });

    if (movedCount > 0) {
      updateData('objectives', data.objectives);
    }

    // Guardar configuración del día
    data.dailySetup = {
      date: today,
      availableTime: selectedTime,
      energyLevel: selectedEnergy,
      dailyLimit: currentLimit,
      rocaPrincipal: data.dailySetup?.rocaPrincipal || null,
      setupAt: new Date().toISOString()
    };

    updateData('dailySetup', data.dailySetup);

    // Mensaje y navegar
    const tasksMsg = movedCount > 0
      ? ` Has elegido ${movedCount} tarea${movedCount > 1 ? 's' : ''}.`
      : '';

    showNotification(`¡Día configurado!${tasksMsg}`, 'success');
    navigateTo('dashboard');
  });

  // Inicializar contador
  updateCounter();
};

export default {
  render,
  init,
  needsDailySetup,
  calculateDailyLimit
};
