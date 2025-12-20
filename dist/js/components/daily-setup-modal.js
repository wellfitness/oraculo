/**
 * Oráculo - Modal de Volumen Fijo (v2 - Layout 2 Columnas)
 * Setup diario basado en la técnica de Burkeman
 *
 * Vista única con 2 columnas:
 * - Izquierda: Tiempo + Energía + Mensaje
 * - Derecha: Lista de tareas
 */

import { showNotification } from '../app.js';

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
  const setupDate = data.dailySetup?.date;

  if (!setupDate || setupDate !== today) {
    return true;
  }

  return false;
};

/**
 * Calcula el límite diario basado en tiempo y energía
 */
export const calculateDailyLimit = (availableTime, energyLevel) => {
  const timeOption = TIME_OPTIONS.find(t => t.value === availableTime) || TIME_OPTIONS[1];
  const energyOption = ENERGY_OPTIONS.find(e => e.value === energyLevel) || ENERGY_OPTIONS[1];

  let limit = timeOption.limit + energyOption.modifier;

  // Mínimo 1, máximo 3
  limit = Math.max(1, Math.min(3, limit));

  return limit;
};

/**
 * Renderiza el modal de setup diario en formato 2 columnas
 */
export const renderDailySetupModal = () => {
  return `
    <dialog id="daily-setup-modal" class="modal modal--setup modal--setup-2col">
      <div class="modal-content setup-content setup-2col">

        <!-- BODY: 2 Columnas -->
        <div class="setup-2col__body">

          <!-- COLUMNA IZQUIERDA: Configuración -->
          <div class="setup-2col__left">

            <!-- Header compacto -->
            <header class="setup-header">
              <span class="material-symbols-outlined setup-icon">wb_twilight</span>
              <h2 class="setup-title">Buenos días</h2>
              <p class="setup-subtitle">¿Cómo es tu día hoy?</p>
            </header>

            <!-- Selector de TIEMPO -->
            <section class="selector-group">
              <label class="selector-group__label">
                <span class="material-symbols-outlined">schedule</span>
                Tiempo
              </label>
              <div class="selector-chips" role="group" aria-label="Tiempo disponible">
                ${TIME_OPTIONS.map(opt => `
                  <button
                    type="button"
                    class="selector-chip"
                    data-time="${opt.value}"
                    aria-pressed="false"
                    title="${opt.label}"
                  >
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
              <div class="selector-chips" role="group" aria-label="Nivel de energía">
                ${ENERGY_OPTIONS.map(opt => `
                  <button
                    type="button"
                    class="selector-chip"
                    data-energy="${opt.value}"
                    aria-pressed="false"
                    title="${opt.label}"
                  >
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

            <!-- Inputs ocultos para guardar selección -->
            <input type="hidden" id="setup-time" value="">
            <input type="hidden" id="setup-energy" value="">

          </div>

          <!-- COLUMNA DERECHA: Lista de tareas -->
          <div class="setup-2col__right">
            <header class="setup-tasks__header">
              <h3 class="setup-tasks__title">
                <span class="material-symbols-outlined">checklist</span>
                Elige tus prioridades
              </h3>
              <span class="setup-tasks__counter" id="tasks-counter">0/0</span>
            </header>

            <ul class="setup-tasks__list" id="setup-tasks-list" role="list">
              <!-- Se llena dinámicamente -->
              <li class="setup-tasks__empty">
                <span class="material-symbols-outlined">hourglass_empty</span>
                <p>Selecciona tiempo y energía</p>
                <p class="hint">para ver cuántas tareas puedes elegir</p>
              </li>
            </ul>
          </div>

        </div>

        <!-- FOOTER: Botones de acción -->
        <footer class="setup-2col__footer">
          <button type="button" class="btn btn--tertiary" id="skip-setup">
            Omitir por hoy
          </button>
          <button type="button" class="btn btn--primary" id="confirm-setup" disabled>
            <span class="material-symbols-outlined icon-sm">check</span>
            Empezar el día
          </button>
        </footer>

      </div>
    </dialog>
  `;
};

/**
 * Inicializa el modal de setup diario (versión 2 columnas, sin pasos)
 */
export const initDailySetupModal = (data, updateData) => {
  const modal = document.getElementById('daily-setup-modal');
  if (!modal) return;

  let selectedTime = null;
  let selectedEnergy = null;
  let selectedTasks = [];
  let currentLimit = 0;

  // === SELECTORES DE TIEMPO ===
  document.querySelectorAll('.selector-chip[data-time]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Deseleccionar otros
      document.querySelectorAll('.selector-chip[data-time]').forEach(b => {
        b.setAttribute('aria-pressed', 'false');
      });
      // Seleccionar este
      btn.setAttribute('aria-pressed', 'true');
      selectedTime = btn.dataset.time;
      document.getElementById('setup-time').value = selectedTime;
      updateUI();
    });
  });

  // === SELECTORES DE ENERGÍA ===
  document.querySelectorAll('.selector-chip[data-energy]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Deseleccionar otros
      document.querySelectorAll('.selector-chip[data-energy]').forEach(b => {
        b.setAttribute('aria-pressed', 'false');
      });
      // Seleccionar este
      btn.setAttribute('aria-pressed', 'true');
      selectedEnergy = btn.dataset.energy;
      document.getElementById('setup-energy').value = selectedEnergy;
      updateUI();
    });
  });

  // === ACTUALIZAR UI ===
  const updateUI = () => {
    const helpDiv = document.getElementById('setup-help');
    const resultDiv = document.getElementById('setup-result');
    const resultText = document.getElementById('result-text');
    const confirmBtn = document.getElementById('confirm-setup');
    const tasksList = document.getElementById('setup-tasks-list');
    const counter = document.getElementById('tasks-counter');

    if (selectedTime && selectedEnergy) {
      // Calcular límite
      currentLimit = calculateDailyLimit(selectedTime, selectedEnergy);

      // Mostrar resultado, ocultar ayuda
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

      // Renderizar tareas
      renderTasks(currentLimit);

      // Actualizar contador
      const dailyCount = (data.objectives?.daily || []).filter(i => !i.completed).length;
      const available = Math.max(0, currentLimit - dailyCount);
      counter.textContent = `${selectedTasks.length}/${available}`;
      counter.classList.toggle('setup-tasks__counter--full', selectedTasks.length >= available);

      // Habilitar botón confirmar
      confirmBtn.disabled = false;

    } else {
      // Mostrar ayuda, ocultar resultado
      helpDiv.style.display = 'block';
      resultDiv.style.display = 'none';
      confirmBtn.disabled = true;
      counter.textContent = '0/0';

      // Mostrar estado inicial en lista
      tasksList.innerHTML = `
        <li class="setup-tasks__empty">
          <span class="material-symbols-outlined">hourglass_empty</span>
          <p>Selecciona tiempo y energía</p>
          <p class="hint">para ver cuántas tareas puedes elegir</p>
        </li>
      `;
    }
  };

  // === RENDERIZAR LISTA DE TAREAS ===
  const renderTasks = (limit) => {
    const tasksList = document.getElementById('setup-tasks-list');
    const objectives = data.objectives || {};
    const projects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

    // Tareas ya en daily
    const dailyItems = (objectives.daily || []).filter(i => !i.completed);
    const slotsUsed = dailyItems.length;
    const slotsAvailable = Math.max(0, limit - slotsUsed);

    // Combinar tareas de otras columnas
    const allItems = [];
    ['quarterly', 'monthly', 'weekly', 'backlog'].forEach(column => {
      (objectives[column] || []).forEach(item => {
        if (!item.completed) {
          allItems.push({ ...item, column });
        }
      });
    });

    if (allItems.length === 0 && dailyItems.length === 0) {
      tasksList.innerHTML = `
        <li class="setup-tasks__empty">
          <span class="material-symbols-outlined">inbox</span>
          <p>No tienes tareas pendientes</p>
          <p class="hint">Añade tareas en la vista de Horizontes</p>
        </li>
      `;
      return;
    }

    let html = '';

    // Mostrar tareas ya en foco primero
    dailyItems.forEach(item => {
      const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
      html += renderTaskItem(item, project, true, 'daily');
    });

    // Mostrar tareas disponibles
    allItems.forEach((item, index) => {
      const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
      html += renderTaskItem(item, project, false, item.column, index);
    });

    tasksList.innerHTML = html;

    // Configurar checkboxes
    setupCheckboxes(slotsAvailable);
  };

  // === RENDERIZAR ITEM DE TAREA ===
  const renderTaskItem = (item, project, isInDaily, column, animIndex = 0) => {
    return `
      <li class="task-item ${isInDaily ? 'task-item--in-daily' : ''}"
          data-id="${item.id}"
          data-column="${column}"
          style="animation-delay: ${animIndex * 0.03}s">
        <label class="task-item__checkbox">
          <input
            type="checkbox"
            data-id="${item.id}"
            data-column="${column}"
            ${isInDaily ? 'checked disabled' : ''}
          >
          <span class="task-item__check-visual">
            <span class="material-symbols-outlined">check</span>
          </span>
        </label>
        <div class="task-item__content">
          <p class="task-item__text">${item.text}</p>
          <div class="task-item__meta">
            <span class="task-item__tag">${COLUMN_NAMES[column]}</span>
            ${project ? `
              <span class="task-item__tag task-item__tag--project" style="--project-color: ${project.color}">
                ${project.name}
              </span>
            ` : ''}
            ${isInDaily ? `
              <span class="task-item__tag task-item__tag--in-daily">En foco</span>
            ` : ''}
          </div>
        </div>
      </li>
    `;
  };

  // === CONFIGURAR CHECKBOXES ===
  const setupCheckboxes = (maxSelectable) => {
    const checkboxes = document.querySelectorAll('.task-item__checkbox input:not([disabled])');
    const counter = document.getElementById('tasks-counter');

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        // Actualizar lista de seleccionados
        selectedTasks = Array.from(
          document.querySelectorAll('.task-item__checkbox input:checked:not([disabled])')
        ).map(cb => ({
          id: cb.dataset.id,
          column: cb.dataset.column
        }));

        // Verificar límite
        if (selectedTasks.length > maxSelectable) {
          checkbox.checked = false;
          selectedTasks = selectedTasks.filter(t => t.id !== checkbox.dataset.id);
          showNotification(`Solo puedes elegir ${maxSelectable} tarea${maxSelectable > 1 ? 's' : ''} más`, 'warning');
          return;
        }

        // Actualizar UI del item
        const taskItem = checkbox.closest('.task-item');
        taskItem.classList.toggle('task-item--selected', checkbox.checked);

        // Actualizar contador
        counter.textContent = `${selectedTasks.length}/${maxSelectable}`;
        counter.classList.toggle('setup-tasks__counter--full', selectedTasks.length >= maxSelectable);
      });
    });
  };

  // === OMITIR SETUP ===
  document.getElementById('skip-setup')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];

    data.dailySetup = {
      ...data.dailySetup,
      date: today,
      skippedAt: new Date().toISOString()
    };

    updateData('dailySetup', data.dailySetup);
    modal.close();
  });

  // === CONFIRMAR SETUP ===
  document.getElementById('confirm-setup')?.addEventListener('click', () => {
    if (!selectedTime || !selectedEnergy) return;

    const today = new Date().toISOString().split('T')[0];

    // Mover tareas seleccionadas a daily
    if (selectedTasks.length > 0) {
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
      });

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
    modal.close();

    // Mensaje de confirmación
    const tasksMsg = selectedTasks.length > 0
      ? ` Has elegido ${selectedTasks.length} tarea${selectedTasks.length > 1 ? 's' : ''}.`
      : '';

    showNotification(`¡Día configurado!${tasksMsg}`, 'success');

    // Recargar para ver cambios
    if (selectedTasks.length > 0) {
      location.reload();
    }
  });

  // === MOSTRAR MODAL SI ES NECESARIO ===
  if (needsDailySetup(data)) {
    setTimeout(() => {
      modal.showModal();
    }, 500);
  }
};

export default {
  needsDailySetup,
  calculateDailyLimit,
  renderDailySetupModal,
  initDailySetupModal
};
