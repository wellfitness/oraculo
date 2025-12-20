/**
 * Oráculo - Página de Daily Setup (v2 - Layout 2 Columnas)
 * Configuración diaria basada en la técnica de Volumen Fijo de Burkeman
 *
 * Layout de 2 columnas:
 * - Izquierda: Tiempo + Energía + Mensaje
 * - Derecha: Lista de tareas
 */

import { showNotification, navigateTo } from '../app.js';

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
 * Renderiza la página de Daily Setup con layout de 2 columnas
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
    <div class="daily-setup-page setup-2col-page">
      <!-- BODY: 2 Columnas -->
      <div class="setup-2col__body">

        <!-- COLUMNA IZQUIERDA: Configuración -->
        <div class="setup-2col__left">

          <!-- Header compacto -->
          <header class="setup-header">
            <span class="material-symbols-outlined setup-icon">wb_twilight</span>
            <h1 class="setup-title">${getGreeting()}</h1>
            <p class="setup-subtitle">¿Cómo es tu día hoy?</p>
          </header>

          <!-- Selector de TIEMPO -->
          <section class="selector-group">
            <label class="selector-group__label">
              <span class="material-symbols-outlined">schedule</span>
              Tiempo
            </label>
            <div class="selector-chips" role="radiogroup" aria-label="Tiempo disponible">
              ${TIME_OPTIONS.map(opt => `
                <button type="button" class="selector-chip" data-time="${opt.value}"
                        role="radio" aria-pressed="false" title="${opt.label}">
                  <span class="material-symbols-outlined selector-chip__icon">${opt.icon}</span>
                  <span class="selector-chip__label">${opt.label}</span>
                </button>
              `).join('')}
            </div>
          </section>

          <!-- Selector de ENERGÍA -->
          <section class="selector-group">
            <label class="selector-group__label">
              <span class="material-symbols-outlined">bolt</span>
              Energía
            </label>
            <div class="selector-chips" role="radiogroup" aria-label="Nivel de energía">
              ${ENERGY_OPTIONS.map(opt => `
                <button type="button" class="selector-chip" data-energy="${opt.value}"
                        role="radio" aria-pressed="false" title="${opt.label}">
                  <span class="material-symbols-outlined selector-chip__icon">${opt.icon}</span>
                  <span class="selector-chip__label">${opt.label}</span>
                </button>
              `).join('')}
            </div>
          </section>

          <!-- Mensaje de ayuda (visible hasta seleccionar ambos) -->
          <div class="setup-help" id="setup-help">
            <p class="setup-help__text">
              <span class="material-symbols-outlined">help_outline</span>
              Selecciona cuánto tiempo tienes hoy para tus prioridades y cómo te sientes de energía ahora
            </p>
          </div>

          <!-- Resultado calculado (oculto hasta selección completa) -->
          <div class="setup-result" id="setup-result" style="display: none;">
            <span class="material-symbols-outlined setup-result__icon">tips_and_updates</span>
            <p class="setup-result__text" id="result-text"></p>
          </div>

        </div>

        <!-- COLUMNA DERECHA: Lista de tareas -->
        <div class="setup-2col__right">
          <header class="setup-tasks__header">
            <h2 class="setup-tasks__title">
              <span class="material-symbols-outlined">checklist</span>
              Elige tus prioridades
            </h2>
            <span class="setup-tasks__counter" id="tasks-counter" aria-label="Tareas seleccionadas">
              ${dailyTasks.length}/0
            </span>
          </header>

          <ul class="setup-tasks__list" id="tasks-list" role="list">
            ${renderTasksList(allTasks, dailyTasks, projects)}
          </ul>
        </div>

      </div>

      <!-- FOOTER: Botones de acción -->
      <footer class="setup-2col__footer">
        <a href="#" class="btn btn--tertiary" id="btn-skip">Omitir por hoy</a>
        <button type="button" class="btn btn--primary" id="btn-start-day" disabled>
          <span class="material-symbols-outlined icon-sm">check</span>
          Empezar el día
        </button>
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
        <p>No tienes tareas pendientes</p>
        <p class="hint">Añade tareas en Horizontes</p>
      </li>
    `;
  }

  return tasks.map((task, index) => {
    const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
    const columnName = COLUMN_NAMES[task.column];

    return `
      <li class="task-item ${task.isInDaily ? 'task-item--in-daily' : ''}"
          data-id="${task.id}" data-column="${task.column}"
          style="animation-delay: ${index * 0.03}s">
        <label class="task-item__checkbox">
          <input type="checkbox"
                 ${task.isInDaily ? 'checked disabled' : ''}
                 data-id="${task.id}"
                 data-column="${task.column}">
          <span class="task-item__check-visual">
            <span class="material-symbols-outlined">check</span>
          </span>
        </label>
        <div class="task-item__content">
          <p class="task-item__text">${task.text}</p>
          <div class="task-item__meta">
            <span class="task-item__tag">${columnName}</span>
            ${project ? `
              <span class="task-item__tag task-item__tag--project"
                    style="--project-color: ${project.color}">
                ${project.name}
              </span>
            ` : ''}
            ${task.isInDaily ? `
              <span class="task-item__tag task-item__tag--in-daily">En foco</span>
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
  let currentLimit = 0;

  const helpDiv = document.getElementById('setup-help');
  const resultDiv = document.getElementById('setup-result');
  const resultText = document.getElementById('result-text');
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

      // Ocultar ayuda, mostrar resultado
      helpDiv.style.display = 'none';
      resultDiv.style.display = 'flex';

      // Mensaje según límite
      let message = '';
      if (currentLimit === 1) {
        message = 'Hoy es día de <strong>UNA sola cosa</strong>. Elige lo que más importa.';
      } else if (currentLimit === 2) {
        message = 'Tienes espacio para <strong>2 prioridades</strong>. Menos es más.';
      } else {
        message = 'Puedes con hasta <strong>3 prioridades</strong> hoy.';
      }
      resultText.innerHTML = message;

      btnStart.disabled = false;
      updateCounter();
    }
  };

  // --- Actualizar contador de tareas ---
  const updateCounter = () => {
    const selected = document.querySelectorAll('.task-item input:checked:not([disabled])').length;
    const slotsAvailable = Math.max(0, currentLimit - dailyTasks.length);
    tasksCounter.textContent = `${selected}/${slotsAvailable}`;

    if (selected >= slotsAvailable && slotsAvailable > 0) {
      tasksCounter.classList.add('setup-tasks__counter--full');
    } else {
      tasksCounter.classList.remove('setup-tasks__counter--full');
    }
  };

  // --- Checkboxes de tareas ---
  document.querySelectorAll('.task-item input[type="checkbox"]:not([disabled])').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = cb.closest('.task-item');
      const slotsAvailable = Math.max(0, currentLimit - dailyTasks.length);

      // Verificar límite
      if (cb.checked) {
        const selected = document.querySelectorAll('.task-item input:checked:not([disabled])').length;
        if (selected > slotsAvailable) {
          cb.checked = false;
          showNotification(`Solo puedes elegir ${slotsAvailable} tarea${slotsAvailable > 1 ? 's' : ''} más`, 'warning');
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
      document.querySelectorAll('.task-item input:checked:not([disabled])')
    ).map(cb => ({
      id: cb.dataset.id,
      column: cb.dataset.column
    }));

    let movedCount = 0;
    selectedTasks.forEach(({ id, column }) => {
      if (column === 'daily') return;

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
