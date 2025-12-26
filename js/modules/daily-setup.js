/**
 * Oráculo - Página de Daily Setup (v3 - Solo Weekly + Daily)
 * Configuración diaria basada en la técnica de Volumen Fijo de Burkeman
 *
 * v3: Solo muestra tareas de weekly (para mover a daily) y daily (ya en foco)
 * NO muestra quarterly, monthly ni backlog - esas se trabajan en Kanban
 *
 * Layout de 2 columnas:
 * - Izquierda: Tiempo + Energía + Mensaje
 * - Derecha: Lista de tareas (daily + weekly)
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
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

/**
 * Verifica si el setup diario ya se ha hecho hoy
 */
export const needsDailySetup = (data) => {
  const today = getLocalDateString();
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

  // v3: Solo tareas de weekly (para seleccionar y mover a daily)
  // NO incluimos quarterly, monthly ni backlog - esas se trabajan en Kanban
  const weeklyTasks = (objectives.weekly || []).filter(i => !i.completed);

  // Tareas ya en daily (en foco)
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

        <!-- COLUMNA DERECHA -->
        <div class="setup-2col__right">
          <!-- FOOTER: Botones de acción -->
          <footer class="setup-2col__footer">
            <a href="#" class="btn btn--tertiary" id="btn-skip">Omitir por hoy</a>
            <button type="button" class="btn btn--primary" id="btn-start-day" disabled>
              <span class="material-symbols-outlined icon-sm">check</span>
              Empezar el día
            </button>
          </footer>

          <!-- Obstáculos (opcional) -->
          <details class="setup-obstacles" id="setup-obstacles">
            <summary class="setup-obstacles__summary">
              <span class="material-symbols-outlined">psychology</span>
              <span>Anticipar posibles obstáculos</span>
              <span class="setup-obstacles__optional">(opcional)</span>
            </summary>
            <div class="setup-obstacles__content">
              <div class="form-group form-group--compact">
                <label for="potential-obstacle" class="form-label form-label--sm">
                  ¿Qué podría dificultar hoy?
                </label>
                <textarea id="potential-obstacle" class="form-textarea form-textarea--sm"
                  placeholder="Ej: Reuniones largas, cansancio..." maxlength="150" rows="1"></textarea>
              </div>
              <div class="form-group form-group--compact">
                <label for="contingency-plan" class="form-label form-label--sm">
                  Si pasa, haré...
                </label>
                <textarea id="contingency-plan" class="form-textarea form-textarea--sm"
                  placeholder="Ej: Dejaré una tarea para mañana" maxlength="150" rows="1"></textarea>
              </div>
            </div>
          </details>

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
            ${renderTasksList(weeklyTasks, dailyTasks, projects)}
          </ul>
        </div>

      </div>
    </div>
  `;
};

/**
 * Renderiza la lista de tareas (v3)
 * Muestra: daily primero (para quitar del foco) + weekly (para añadir al foco)
 */
const renderTasksList = (weeklyTasks, dailyTasks, projects) => {
  // Si no hay tareas en ninguna columna
  if (dailyTasks.length === 0 && weeklyTasks.length === 0) {
    return `
      <li class="setup-tasks__empty">
        <span class="material-symbols-outlined">inbox</span>
        <p>No tienes tareas para hoy</p>
        <p class="hint">Añade tareas a "Semana" en Horizontes</p>
      </li>
    `;
  }

  let html = '';
  let index = 0;

  // 1. Tareas ya en DAILY (en foco) - marcadas, se pueden desmarcar
  if (dailyTasks.length > 0) {
    html += `<li class="setup-tasks__separator">En foco</li>`;
    dailyTasks.forEach(task => {
      const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
      html += `
        <li class="task-item task-item--in-daily task-item--selected"
            data-id="${task.id}" data-column="daily"
            style="animation-delay: ${index * 0.03}s">
          <label class="task-item__checkbox">
            <input type="checkbox" checked
                   data-id="${task.id}"
                   data-column="daily"
                   data-action="remove">
            <span class="task-item__check-visual">
              <span class="material-symbols-outlined">check</span>
            </span>
          </label>
          <div class="task-item__content">
            <p class="task-item__text">${task.text}</p>
            <div class="task-item__meta">
              <span class="task-item__tag task-item__tag--in-daily">En foco</span>
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
      index++;
    });
  }

  // 2. Tareas de WEEKLY (disponibles para mover a daily)
  if (weeklyTasks.length > 0) {
    html += `<li class="setup-tasks__separator">Esta semana</li>`;
    weeklyTasks.forEach(task => {
      const project = task.projectId ? projects.find(p => p.id === task.projectId) : null;
      html += `
        <li class="task-item"
            data-id="${task.id}" data-column="weekly"
            style="animation-delay: ${index * 0.03}s">
          <label class="task-item__checkbox">
            <input type="checkbox"
                   data-id="${task.id}"
                   data-column="weekly"
                   data-action="add">
            <span class="task-item__check-visual">
              <span class="material-symbols-outlined">check</span>
            </span>
          </label>
          <div class="task-item__content">
            <p class="task-item__text">${task.text}</p>
            <div class="task-item__meta">
              <span class="task-item__tag">Semana</span>
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
      index++;
    });
  }

  return html;
};

/**
 * Inicializa la página de Daily Setup (v3)
 * Maneja movimiento bidireccional: weekly ↔ daily
 */
export const init = (data, updateData) => {
  let selectedTime = null;
  let selectedEnergy = null;
  let currentLimit = 0;

  // Arrays para tracking de movimientos (v3)
  const tasksToMoveToDaily = [];      // IDs de tareas weekly a mover a daily
  const tasksToRemoveFromDaily = [];  // IDs de tareas daily a devolver a weekly

  const helpDiv = document.getElementById('setup-help');
  const resultDiv = document.getElementById('setup-result');
  const resultText = document.getElementById('result-text');
  const tasksCounter = document.getElementById('tasks-counter');
  const btnStart = document.getElementById('btn-start-day');
  const btnSkip = document.getElementById('btn-skip');

  // Obtener tareas ya en daily (cuenta inicial)
  const initialDailyCount = (data.objectives?.daily || []).filter(i => !i.completed).length;

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

      // Ocultar ayuda, mostrar resultado con animación
      helpDiv.style.display = 'none';
      resultDiv.style.display = 'flex';
      resultDiv.classList.add('visible');

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
    } else {
      // Si falta alguna selección, mostrar ayuda
      helpDiv.style.display = 'block';
      resultDiv.style.display = 'none';
      resultDiv.classList.remove('visible');
    }
  };

  // --- Actualizar contador de tareas (v3) ---
  const updateCounter = () => {
    // Calcular cuántas tareas estarán en daily después de los cambios
    const finalDailyCount = initialDailyCount
      + tasksToMoveToDaily.length
      - tasksToRemoveFromDaily.length;

    tasksCounter.textContent = `${finalDailyCount}/${currentLimit || '?'}`;

    if (finalDailyCount >= currentLimit && currentLimit > 0) {
      tasksCounter.classList.add('setup-tasks__counter--full');
    } else {
      tasksCounter.classList.remove('setup-tasks__counter--full');
    }
  };

  // --- Checkboxes de tareas (v3: bidireccional) ---
  document.querySelectorAll('.task-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      const item = cb.closest('.task-item');
      const taskId = cb.dataset.id;
      const action = cb.dataset.action; // 'add' o 'remove'

      if (action === 'add') {
        // Tarea de weekly → quiere añadir a daily
        if (cb.checked) {
          // Verificar límite antes de añadir
          const finalDailyCount = initialDailyCount
            + tasksToMoveToDaily.length
            - tasksToRemoveFromDaily.length;

          if (finalDailyCount >= currentLimit && currentLimit > 0) {
            cb.checked = false;
            showNotification(`Has alcanzado el límite de ${currentLimit} tarea${currentLimit > 1 ? 's' : ''}`, 'warning');
            return;
          }
          // Añadir a la lista de tareas a mover
          if (!tasksToMoveToDaily.includes(taskId)) {
            tasksToMoveToDaily.push(taskId);
          }
        } else {
          // Desmarcó → quitar de la lista
          const idx = tasksToMoveToDaily.indexOf(taskId);
          if (idx > -1) tasksToMoveToDaily.splice(idx, 1);
        }
      } else if (action === 'remove') {
        // Tarea de daily → quiere quitar del foco
        if (!cb.checked) {
          // Añadir a la lista de tareas a devolver a weekly
          if (!tasksToRemoveFromDaily.includes(taskId)) {
            tasksToRemoveFromDaily.push(taskId);
          }
        } else {
          // Volvió a marcar → quitar de la lista
          const idx = tasksToRemoveFromDaily.indexOf(taskId);
          if (idx > -1) tasksToRemoveFromDaily.splice(idx, 1);
        }
      }

      item.classList.toggle('task-item--selected', cb.checked);
      updateCounter();
    });
  });

  // --- Omitir setup ---
  btnSkip?.addEventListener('click', (e) => {
    e.preventDefault();
    const today = getLocalDateString();

    data.dailySetup = {
      ...data.dailySetup,
      date: today,
      skippedAt: new Date().toISOString()
    };

    updateData('dailySetup', data.dailySetup);
    navigateTo('dashboard');
  });

  // --- Confirmar setup (v3: movimiento bidireccional) ---
  btnStart?.addEventListener('click', () => {
    if (!selectedTime || !selectedEnergy) {
      showNotification('Selecciona tiempo y energía', 'warning');
      return;
    }

    const today = getLocalDateString();
    let addedCount = 0;
    let removedCount = 0;

    // 1. Mover tareas de weekly → daily
    tasksToMoveToDaily.forEach(taskId => {
      const weeklyItems = data.objectives.weekly || [];
      const itemIndex = weeklyItems.findIndex(i => i.id === taskId);
      if (itemIndex === -1) return;

      const [item] = weeklyItems.splice(itemIndex, 1);
      item.movedAt = new Date().toISOString();
      item.movedFrom = 'weekly';

      if (!data.objectives.daily) {
        data.objectives.daily = [];
      }
      data.objectives.daily.push(item);
      addedCount++;
    });

    // 2. Devolver tareas de daily → weekly
    tasksToRemoveFromDaily.forEach(taskId => {
      const dailyItems = data.objectives.daily || [];
      const itemIndex = dailyItems.findIndex(i => i.id === taskId);
      if (itemIndex === -1) return;

      const [item] = dailyItems.splice(itemIndex, 1);
      item.removedFromDailyAt = new Date().toISOString();
      // Devolver a weekly (o a su columna original si la tiene)
      const targetColumn = item.movedFrom || 'weekly';
      if (!data.objectives[targetColumn]) {
        data.objectives[targetColumn] = [];
      }
      data.objectives[targetColumn].push(item);
      removedCount++;
    });

    // Guardar cambios en objectives si hubo movimientos
    if (addedCount > 0 || removedCount > 0) {
      updateData('objectives', data.objectives);
    }

    // Capturar valores de obstáculos (opcionales)
    const potentialObstacle = document.getElementById('potential-obstacle')?.value.trim() || null;
    const contingencyPlan = document.getElementById('contingency-plan')?.value.trim() || null;

    // Guardar configuración del día
    data.dailySetup = {
      date: today,
      availableTime: selectedTime,
      energyLevel: selectedEnergy,
      dailyLimit: currentLimit,
      rocaPrincipal: data.dailySetup?.rocaPrincipal || null,
      setupAt: new Date().toISOString(),
      potentialObstacle,
      contingencyPlan
    };

    updateData('dailySetup', data.dailySetup);

    // Mensaje y navegar
    let tasksMsg = '';
    if (addedCount > 0) {
      tasksMsg += ` +${addedCount} tarea${addedCount > 1 ? 's' : ''} en foco.`;
    }
    if (removedCount > 0) {
      tasksMsg += ` -${removedCount} devuelta${removedCount > 1 ? 's' : ''} a semana.`;
    }

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
