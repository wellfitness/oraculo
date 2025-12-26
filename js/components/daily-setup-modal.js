/**
 * Oráculo - Modal de Volumen Fijo (v3 - Tareas Inmediatas)
 * Setup diario basado en la técnica de Burkeman
 *
 * Vista única con 2 columnas:
 * - Izquierda: Tiempo + Energía + Mensaje
 * - Derecha: Lista de tareas (solo weekly + daily)
 *
 * Cambios v3:
 * - Tareas visibles inmediatamente al abrir
 * - Solo muestra tareas de weekly y daily
 * - Permite desmarcar tareas de daily para devolverlas
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

            <!-- Anticipación de obstáculos (opcional, colapsable) -->
            <details class="setup-obstacles" id="setup-obstacles" style="display: none;">
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
                  <textarea
                    id="potential-obstacle"
                    class="form-textarea form-textarea--sm"
                    placeholder="Ej: Reuniones largas, cansancio..."
                    maxlength="150"
                    rows="2"
                  ></textarea>
                </div>
                <div class="form-group form-group--compact">
                  <label for="contingency-plan" class="form-label form-label--sm">
                    Si pasa, haré...
                  </label>
                  <textarea
                    id="contingency-plan"
                    class="form-textarea form-textarea--sm"
                    placeholder="Ej: Dejaré una tarea para mañana"
                    maxlength="150"
                    rows="2"
                  ></textarea>
                </div>
              </div>
            </details>

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
              <span class="setup-tasks__counter" id="tasks-counter">0/3</span>
            </header>

            <ul class="setup-tasks__list" id="setup-tasks-list" role="list">
              <!-- Se llena dinámicamente por renderTasks() -->
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
 * Inicializa el modal de setup diario (versión 3 - tareas inmediatas)
 */
export const initDailySetupModal = (data, updateData) => {
  const modal = document.getElementById('daily-setup-modal');
  if (!modal) return;

  // === ESTADO ===
  let selectedTime = null;
  let selectedEnergy = null;
  let currentLimit = 3; // Default máximo, se recalcula al seleccionar tiempo/energía
  let tasksToMoveToDaily = [];     // Tareas de weekly que subirán a daily
  let tasksToRemoveFromDaily = []; // Tareas de daily que volverán a su origen

  // === FUNCIÓN AUXILIAR: Actualizar contador ===
  const updateCounter = () => {
    const counter = document.getElementById('tasks-counter');
    const dailyCount = (data.objectives?.daily || []).filter(i => !i.completed).length;

    // Calcular conteo efectivo: daily actual - las que se van + las que vienen
    const effectiveCount = dailyCount - tasksToRemoveFromDaily.length + tasksToMoveToDaily.length;

    counter.textContent = `${effectiveCount}/${currentLimit}`;
    counter.classList.toggle('setup-tasks__counter--full', effectiveCount >= currentLimit);

    // Warning visual si excede límite
    if (effectiveCount > currentLimit) {
      counter.classList.add('setup-tasks__counter--over');
    } else {
      counter.classList.remove('setup-tasks__counter--over');
    }
  };

  // === RENDERIZAR ITEM DE TAREA EN DAILY ===
  const renderDailyTaskItem = (item, project, animIndex = 0) => {
    const isMarkedForRemoval = tasksToRemoveFromDaily.some(t => t.id === item.id);

    return `
      <li class="task-item task-item--in-daily ${isMarkedForRemoval ? 'task-item--removing' : ''}"
          data-id="${item.id}"
          data-column="daily"
          data-moved-from="${item.movedFrom || 'weekly'}"
          style="animation-delay: ${animIndex * 0.03}s">
        <label class="task-item__checkbox">
          <input
            type="checkbox"
            data-id="${item.id}"
            data-column="daily"
            data-source="daily"
            data-moved-from="${item.movedFrom || 'weekly'}"
            ${!isMarkedForRemoval ? 'checked' : ''}
          >
          <span class="task-item__check-visual">
            <span class="material-symbols-outlined">check</span>
          </span>
        </label>
        <div class="task-item__content">
          <p class="task-item__text">${item.text}</p>
          <div class="task-item__meta">
            <span class="task-item__tag task-item__tag--in-daily">En foco</span>
            ${item.movedFrom ? `
              <span class="task-item__tag task-item__tag--origin">
                de ${COLUMN_NAMES[item.movedFrom]}
              </span>
            ` : ''}
            ${project ? `
              <span class="task-item__tag task-item__tag--project" style="--project-color: ${project.color}">
                ${project.name}
              </span>
            ` : ''}
          </div>
        </div>
      </li>
    `;
  };

  // === RENDERIZAR ITEM DE TAREA EN WEEKLY ===
  const renderWeeklyTaskItem = (item, project, animIndex = 0) => {
    const isSelected = tasksToMoveToDaily.some(t => t.id === item.id);

    return `
      <li class="task-item ${isSelected ? 'task-item--selected' : ''}"
          data-id="${item.id}"
          data-column="weekly"
          style="animation-delay: ${animIndex * 0.03}s">
        <label class="task-item__checkbox">
          <input
            type="checkbox"
            data-id="${item.id}"
            data-column="weekly"
            data-source="weekly"
            ${isSelected ? 'checked' : ''}
          >
          <span class="task-item__check-visual">
            <span class="material-symbols-outlined">check</span>
          </span>
        </label>
        <div class="task-item__content">
          <p class="task-item__text">${item.text}</p>
          <div class="task-item__meta">
            <span class="task-item__tag">Semana</span>
            ${project ? `
              <span class="task-item__tag task-item__tag--project" style="--project-color: ${project.color}">
                ${project.name}
              </span>
            ` : ''}
          </div>
        </div>
      </li>
    `;
  };

  // === CONFIGURAR CHECKBOXES ===
  const setupCheckboxes = () => {
    const checkboxes = document.querySelectorAll('.task-item__checkbox input');

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const taskId = checkbox.dataset.id;
        const source = checkbox.dataset.source; // 'daily' o 'weekly'
        const taskItem = checkbox.closest('.task-item');
        const dailyCount = (data.objectives?.daily || []).filter(i => !i.completed).length;

        if (source === 'daily') {
          // === TAREA DE DAILY ===
          if (!checkbox.checked) {
            // Desmarcar = Añadir a lista de remover
            if (!tasksToRemoveFromDaily.some(t => t.id === taskId)) {
              const movedFrom = checkbox.dataset.movedFrom || 'weekly';
              tasksToRemoveFromDaily.push({ id: taskId, movedFrom });
            }
            taskItem.classList.add('task-item--removing');
          } else {
            // Re-marcar = Quitar de lista de remover
            tasksToRemoveFromDaily = tasksToRemoveFromDaily.filter(t => t.id !== taskId);
            taskItem.classList.remove('task-item--removing');
          }
        } else if (source === 'weekly') {
          // === TAREA DE WEEKLY ===
          if (checkbox.checked) {
            // Verificar límite antes de añadir
            const effectiveDailyCount = dailyCount - tasksToRemoveFromDaily.length;
            const pendingToAdd = tasksToMoveToDaily.length;
            const totalAfterAdd = effectiveDailyCount + pendingToAdd + 1;

            if (totalAfterAdd > currentLimit) {
              checkbox.checked = false;
              showNotification(`Solo puedes tener ${currentLimit} prioridad${currentLimit > 1 ? 'es' : ''} en foco`, 'warning');
              return;
            }

            // Añadir a lista de mover
            if (!tasksToMoveToDaily.some(t => t.id === taskId)) {
              tasksToMoveToDaily.push({ id: taskId, column: 'weekly' });
            }
            taskItem.classList.add('task-item--selected');
          } else {
            // Quitar de lista de mover
            tasksToMoveToDaily = tasksToMoveToDaily.filter(t => t.id !== taskId);
            taskItem.classList.remove('task-item--selected');
          }
        }

        updateCounter();
      });
    });
  };

  // === RENDERIZAR LISTA DE TAREAS ===
  const renderTasks = () => {
    const tasksList = document.getElementById('setup-tasks-list');
    const objectives = data.objectives || {};
    const projects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

    // Tareas ya en daily (NO completadas)
    const dailyItems = (objectives.daily || []).filter(i => !i.completed);

    // SOLO tareas de weekly (NO completadas)
    const weeklyItems = (objectives.weekly || []).filter(i => !i.completed);

    if (weeklyItems.length === 0 && dailyItems.length === 0) {
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

    // 1. Mostrar tareas de daily primero (marcadas, NO disabled)
    dailyItems.forEach((item, index) => {
      const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
      html += renderDailyTaskItem(item, project, index);
    });

    // 2. Separador visual si hay ambos tipos
    if (dailyItems.length > 0 && weeklyItems.length > 0) {
      html += `
        <li class="task-item__separator">
          <span>Disponibles en Semana</span>
        </li>
      `;
    }

    // 3. Mostrar tareas de weekly (desmarcadas)
    weeklyItems.forEach((item, index) => {
      const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
      html += renderWeeklyTaskItem(item, project, dailyItems.length + index);
    });

    tasksList.innerHTML = html;

    // Configurar checkboxes
    setupCheckboxes();
  };

  // === ACTUALIZAR UI ===
  const updateUI = () => {
    const helpDiv = document.getElementById('setup-help');
    const resultDiv = document.getElementById('setup-result');
    const resultText = document.getElementById('result-text');
    const confirmBtn = document.getElementById('confirm-setup');
    const obstaclesDiv = document.getElementById('setup-obstacles');

    if (selectedTime && selectedEnergy) {
      // Recalcular límite
      const newLimit = calculateDailyLimit(selectedTime, selectedEnergy);

      // Verificar si hay problema con el nuevo límite
      const dailyCount = (data.objectives?.daily || []).filter(i => !i.completed).length;
      const effectiveCount = dailyCount - tasksToRemoveFromDaily.length + tasksToMoveToDaily.length;

      if (effectiveCount > newLimit) {
        // Warning: hay más tareas seleccionadas que el nuevo límite
        resultText.innerHTML = `
          <span class="setup-result__warning">
            <span class="material-symbols-outlined">warning</span>
            Tienes ${effectiveCount} tareas pero solo caben ${newLimit}. Desmarca ${effectiveCount - newLimit} para continuar.
          </span>
        `;
        confirmBtn.disabled = true;
      } else {
        currentLimit = newLimit;

        // Mensaje normal según límite
        let message = '';
        if (currentLimit === 1) {
          message = 'Hoy es día de <strong>UNA sola cosa</strong>. Elige lo que más importa.';
        } else if (currentLimit === 2) {
          message = 'Tienes espacio para <strong>2 prioridades</strong>. Menos es más.';
        } else {
          message = 'Puedes con hasta <strong>3 prioridades</strong> hoy.';
        }
        resultText.innerHTML = message;
        confirmBtn.disabled = false;
      }

      // Mostrar resultado y obstáculos, ocultar ayuda
      helpDiv.style.display = 'none';
      resultDiv.style.display = 'flex';
      obstaclesDiv.style.display = 'block';

      // Re-renderizar tareas para aplicar nuevo límite
      renderTasks();

    } else {
      // Mostrar ayuda, ocultar resultado y obstáculos
      helpDiv.style.display = 'block';
      resultDiv.style.display = 'none';
      obstaclesDiv.style.display = 'none';
      confirmBtn.disabled = true;
    }

    updateCounter();
  };

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

  // === OMITIR SETUP ===
  document.getElementById('skip-setup')?.addEventListener('click', () => {
    const today = getLocalDateString();

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

    const today = getLocalDateString();
    let needsReload = false;

    // 1. MOVER tareas de weekly → daily
    if (tasksToMoveToDaily.length > 0) {
      tasksToMoveToDaily.forEach(({ id, column }) => {
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
      needsReload = true;
    }

    // 2. DEVOLVER tareas de daily → movedFrom (o weekly por defecto)
    if (tasksToRemoveFromDaily.length > 0) {
      tasksToRemoveFromDaily.forEach(({ id, movedFrom }) => {
        const dailyItems = data.objectives.daily;
        if (!dailyItems) return;

        const itemIndex = dailyItems.findIndex(i => i.id === id);
        if (itemIndex === -1) return;

        const [item] = dailyItems.splice(itemIndex, 1);

        // Determinar destino
        const targetColumn = movedFrom || 'weekly';

        // Limpiar campos de movimiento
        delete item.movedAt;
        delete item.movedFrom;

        if (!data.objectives[targetColumn]) {
          data.objectives[targetColumn] = [];
        }
        data.objectives[targetColumn].push(item);
      });
      needsReload = true;
    }

    if (needsReload) {
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
    modal.close();

    // Mensaje de confirmación
    const addedCount = tasksToMoveToDaily.length;
    const removedCount = tasksToRemoveFromDaily.length;

    let message = '¡Día configurado!';
    if (addedCount > 0) {
      message += ` +${addedCount} al foco.`;
    }
    if (removedCount > 0) {
      message += ` ${removedCount} devuelta${removedCount > 1 ? 's' : ''}.`;
    }

    showNotification(message, 'success');

    // Recargar si hubo cambios en objetivos
    if (needsReload) {
      location.reload();
    }
  });

  // === RENDERIZAR TAREAS INMEDIATAMENTE ===
  renderTasks();
  updateCounter();

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
