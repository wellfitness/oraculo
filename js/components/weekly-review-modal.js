/**
 * Oráculo - Modal de Revisión Semanal (GTD)
 * Wizard de 4 pasos para mantener el sistema al día
 *
 * Pasos:
 * 1. Pendientes - Procesar ideas sin decidir
 * 2. Horizontes - Revisar estado de tareas
 * 3. Proyectos - Verificar próximas acciones
 * 4. Propósitos - Elegir prioridades de la semana
 */

import { showNotification, generateId } from '../app.js';
import { escapeHTML } from '../utils/sanitizer.js';

let updateDataCallback = null;
let currentData = null;
let currentStep = 0;

// Pasos de la revisión
const REVIEW_STEPS = [
  {
    id: 'pendientes',
    title: 'Pendientes',
    icon: 'inbox',
    description: 'Procesa tus ideas capturadas'
  },
  {
    id: 'horizontes',
    title: 'Horizontes',
    icon: 'view_kanban',
    description: 'Revisa el estado de tus tareas'
  },
  {
    id: 'proyectos',
    title: 'Proyectos',
    icon: 'folder_open',
    description: 'Verifica las próximas acciones'
  },
  {
    id: 'propositos',
    title: 'Propósitos',
    icon: 'flag',
    description: 'Elige tus prioridades'
  }
];

/**
 * Renderiza el modal de revisión semanal
 */
export const renderWeeklyReviewModal = () => {
  return `
    <dialog id="weekly-review-modal" class="modal modal--large modal--review">
      <div class="modal-content review-content">
        <header class="review-header">
          <h2 class="review-title">
            <span class="material-symbols-outlined">checklist_rtl</span>
            Revisión Semanal
          </h2>
          <p class="review-subtitle">
            Mantén tu sistema al día. Solo unos minutos.
          </p>
        </header>

        <!-- Progress indicator -->
        <nav class="review-progress" id="review-progress">
          ${REVIEW_STEPS.map((step, i) => `
            <button class="review-step ${i === 0 ? 'review-step--active' : ''}"
                    data-step="${i}" type="button">
              <span class="material-symbols-outlined">${step.icon}</span>
              <span class="review-step__title">${step.title}</span>
            </button>
          `).join('')}
        </nav>

        <!-- Step content -->
        <div class="review-body" id="review-body">
          <!-- Contenido dinámico por paso -->
        </div>

        <!-- Footer -->
        <footer class="review-footer">
          <button type="button" class="btn btn--tertiary" id="review-close">
            Cerrar sin completar
          </button>
          <div class="review-footer__right">
            <button type="button" class="btn btn--secondary" id="review-prev" disabled>
              <span class="material-symbols-outlined">arrow_back</span>
              Anterior
            </button>
            <button type="button" class="btn btn--primary" id="review-next">
              Siguiente
              <span class="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </footer>
      </div>
    </dialog>
  `;
};

/**
 * Renderiza el contenido de cada paso
 */
const renderStepContent = (stepIndex) => {
  const step = REVIEW_STEPS[stepIndex];

  switch (step.id) {
    case 'pendientes':
      return renderPendientesStep();
    case 'horizontes':
      return renderHorizontesStep();
    case 'proyectos':
      return renderProyectosStep();
    case 'propositos':
      return renderPropositosStep();
    default:
      return '';
  }
};

/**
 * Paso 1: Revisar Pendientes
 */
const renderPendientesStep = () => {
  const backlog = currentData.objectives?.backlog || [];

  return `
    <div class="review-step-content">
      <h3>
        <span class="material-symbols-outlined">inbox</span>
        Ideas sin procesar (${backlog.length})
      </h3>

      ${backlog.length === 0 ? `
        <div class="review-empty">
          <span class="material-symbols-outlined icon-xl">check_circle</span>
          <p>¡Bandeja vacía! No tienes ideas pendientes de procesar.</p>
        </div>
      ` : `
        <p class="review-hint">
          Para cada idea, decide: ¿la mueves a un horizonte, la eliminas, o la dejas para después?
        </p>
        <ul class="review-list" id="backlog-review-list">
          ${backlog.map(item => `
            <li class="review-item" data-id="${item.id}">
              <span class="review-item__text">${escapeHTML(item.text)}</span>
              <select class="review-action-select" data-id="${item.id}">
                <option value="keep">Mantener</option>
                <option value="weekly">→ Semana</option>
                <option value="monthly">→ Mes</option>
                <option value="quarterly">→ Trimestre</option>
                <option value="delete">Eliminar</option>
              </select>
            </li>
          `).join('')}
        </ul>
        <button type="button" class="btn btn--secondary btn--sm" id="apply-backlog-changes">
          <span class="material-symbols-outlined">check</span>
          Aplicar cambios
        </button>
      `}
    </div>
  `;
};

/**
 * Paso 2: Revisar Horizontes
 */
const renderHorizontesStep = () => {
  const weekly = (currentData.objectives?.weekly || []).filter(t => !t.completed);
  const monthly = (currentData.objectives?.monthly || []).filter(t => !t.completed);

  return `
    <div class="review-step-content">
      <h3>
        <span class="material-symbols-outlined">view_kanban</span>
        Estado de tus horizontes
      </h3>

      <div class="review-horizons">
        <div class="review-horizon">
          <h4>Semana (${weekly.length} pendientes)</h4>
          ${weekly.length === 0 ? `
            <p class="review-empty-text">No hay tareas pendientes esta semana.</p>
          ` : `
            <ul class="review-checklist">
              ${weekly.map(task => `
                <li class="review-check-item">
                  <label>
                    <input type="checkbox" data-id="${task.id}" data-action="complete-weekly">
                    <span>${escapeHTML(task.text)}</span>
                  </label>
                  <span class="review-check-hint">¿Completada?</span>
                </li>
              `).join('')}
            </ul>
          `}
        </div>

        <div class="review-horizon">
          <h4>Mes (${monthly.length} pendientes)</h4>
          ${monthly.length === 0 ? `
            <p class="review-empty-text">No hay tareas pendientes este mes.</p>
          ` : `
            <ul class="review-checklist">
              ${monthly.map(task => `
                <li class="review-check-item">
                  <label>
                    <input type="checkbox" data-id="${task.id}" data-action="move-to-weekly">
                    <span>${escapeHTML(task.text)}</span>
                  </label>
                  <span class="review-check-hint">¿Mover a esta semana?</span>
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </div>
    </div>
  `;
};

/**
 * Paso 3: Revisar Proyectos
 */
const renderProyectosStep = () => {
  const activeProjects = (currentData.projects || []).filter(p => p.status === 'active');

  return `
    <div class="review-step-content">
      <h3>
        <span class="material-symbols-outlined">folder_open</span>
        Proyectos activos (${activeProjects.length})
      </h3>

      ${activeProjects.length === 0 ? `
        <div class="review-empty">
          <span class="material-symbols-outlined icon-xl">folder_off</span>
          <p>No tienes proyectos activos.</p>
        </div>
      ` : `
        <p class="review-hint">
          ¿Cada proyecto tiene una próxima acción clara?
        </p>
        <ul class="review-projects-list">
          ${activeProjects.map(project => {
            const hasNextAction = project.nextActionId != null;
            // Verificar si la tarea aún existe y no está completada
            const nextActionValid = hasNextAction && findTask(project.nextActionId);

            return `
              <li class="review-project ${nextActionValid ? 'review-project--ok' : 'review-project--needs-action'}">
                <span class="project-dot" style="background-color: ${project.color}"></span>
                <span class="review-project__name">${escapeHTML(project.name)}</span>
                <span class="review-project__status">
                  ${nextActionValid
                    ? '<span class="material-symbols-outlined icon-success">check_circle</span>'
                    : '<span class="material-symbols-outlined icon-warning">warning</span> Sin próxima acción'}
                </span>
              </li>
            `;
          }).join('')}
        </ul>
        <a href="#projects" data-view="projects" class="btn btn--secondary btn--sm" id="go-to-projects">
          <span class="material-symbols-outlined">open_in_new</span>
          Ir a Proyectos
        </a>
      `}
    </div>
  `;
};

/**
 * Paso 4: Propósitos de la semana
 */
const renderPropositosStep = () => {
  const weekly = currentData.objectives?.weekly || [];
  const daily = currentData.objectives?.daily || [];
  const allTasks = [...daily, ...weekly].filter(t => !t.completed);

  return `
    <div class="review-step-content">
      <h3>
        <span class="material-symbols-outlined">flag</span>
        Propósitos para esta semana
      </h3>

      ${allTasks.length === 0 ? `
        <div class="review-empty">
          <span class="material-symbols-outlined icon-xl">task</span>
          <p>No tienes tareas pendientes para priorizar.</p>
        </div>
      ` : `
        <p class="review-hint">
          Revisa tus tareas más importantes. ¿Están en el lugar correcto?
        </p>
        <ul class="review-priorities-list">
          ${allTasks.slice(0, 8).map(task => `
            <li class="review-priority-item">
              <span class="material-symbols-outlined icon-sm">task_alt</span>
              <span>${escapeHTML(task.text)}</span>
            </li>
          `).join('')}
          ${allTasks.length > 8 ? `
            <li class="review-priority-more">
              +${allTasks.length - 8} tareas más
            </li>
          ` : ''}
        </ul>
      `}

      <div class="review-complete-message">
        <span class="material-symbols-outlined icon-xl">celebration</span>
        <p><strong>¡Listo!</strong> Tu sistema está actualizado.</p>
        <p class="review-complete-hint">Pulsa "Completar" para guardar la fecha de esta revisión.</p>
      </div>
    </div>
  `;
};

/**
 * Busca una tarea en todos los horizontes
 */
const findTask = (taskId) => {
  const horizons = ['daily', 'weekly', 'monthly', 'quarterly', 'backlog'];
  for (const horizon of horizons) {
    const task = (currentData.objectives?.[horizon] || [])
      .find(t => t.id === taskId && !t.completed);
    if (task) return task;
  }
  return null;
};

/**
 * Actualiza el indicador de progreso
 */
const updateProgressIndicator = () => {
  document.querySelectorAll('.review-step').forEach((btn, i) => {
    btn.classList.toggle('review-step--active', i === currentStep);
    btn.classList.toggle('review-step--completed', i < currentStep);
  });
};

/**
 * Actualiza los botones de navegación
 */
const updateNavigationButtons = () => {
  const prevBtn = document.getElementById('review-prev');
  const nextBtn = document.getElementById('review-next');

  if (prevBtn) {
    prevBtn.disabled = currentStep === 0;
  }

  if (nextBtn) {
    const isLastStep = currentStep === REVIEW_STEPS.length - 1;
    nextBtn.innerHTML = isLastStep
      ? `Completar <span class="material-symbols-outlined">check</span>`
      : `Siguiente <span class="material-symbols-outlined">arrow_forward</span>`;
  }
};

/**
 * Navega al paso siguiente
 */
const nextStep = () => {
  if (currentStep < REVIEW_STEPS.length - 1) {
    currentStep++;
    renderCurrentStep();
  } else {
    // Completar revisión
    completeReview();
  }
};

/**
 * Navega al paso anterior
 */
const prevStep = () => {
  if (currentStep > 0) {
    currentStep--;
    renderCurrentStep();
  }
};

/**
 * Renderiza el paso actual
 */
const renderCurrentStep = () => {
  const body = document.getElementById('review-body');
  if (body) {
    body.innerHTML = renderStepContent(currentStep);
    setupStepEvents();
  }
  updateProgressIndicator();
  updateNavigationButtons();
};

/**
 * Configura eventos específicos de cada paso
 */
const setupStepEvents = () => {
  // Paso 1: Aplicar cambios en backlog
  document.getElementById('apply-backlog-changes')?.addEventListener('click', () => {
    applyBacklogChanges();
  });

  // Paso 2: Completar tareas de weekly
  document.querySelectorAll('[data-action="complete-weekly"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        completeTask(e.target.dataset.id, 'weekly');
      }
    });
  });

  // Paso 2: Mover tareas de monthly a weekly
  document.querySelectorAll('[data-action="move-to-weekly"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        moveTask(e.target.dataset.id, 'monthly', 'weekly');
      }
    });
  });

  // Paso 3: Ir a proyectos
  document.getElementById('go-to-projects')?.addEventListener('click', () => {
    const modal = document.getElementById('weekly-review-modal');
    modal?.close();
  });
};

/**
 * Aplica los cambios del backlog
 */
const applyBacklogChanges = () => {
  const selects = document.querySelectorAll('.review-action-select');
  let changes = 0;

  selects.forEach(select => {
    const action = select.value;
    const taskId = select.dataset.id;

    if (action === 'keep') return;

    const backlog = currentData.objectives.backlog || [];
    const taskIndex = backlog.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = backlog[taskIndex];

    if (action === 'delete') {
      backlog.splice(taskIndex, 1);
      changes++;
    } else if (['weekly', 'monthly', 'quarterly'].includes(action)) {
      // Mover a horizonte
      backlog.splice(taskIndex, 1);
      if (!currentData.objectives[action]) {
        currentData.objectives[action] = [];
      }
      currentData.objectives[action].push({
        ...task,
        movedAt: new Date().toISOString(),
        movedFrom: 'backlog'
      });
      changes++;
    }
  });

  if (changes > 0) {
    updateDataCallback('objectives', currentData.objectives);
    showNotification(`${changes} idea(s) procesada(s)`, 'success');
    renderCurrentStep();
  }
};

/**
 * Completa una tarea
 */
const completeTask = (taskId, horizon) => {
  const tasks = currentData.objectives[horizon] || [];
  const task = tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = true;
    task.completedAt = new Date().toISOString();
    updateDataCallback('objectives', currentData.objectives);
    showNotification('Tarea completada', 'success');
  }
};

/**
 * Mueve una tarea entre horizontes
 */
const moveTask = (taskId, fromHorizon, toHorizon) => {
  const fromTasks = currentData.objectives[fromHorizon] || [];
  const taskIndex = fromTasks.findIndex(t => t.id === taskId);

  if (taskIndex !== -1) {
    const task = fromTasks.splice(taskIndex, 1)[0];
    if (!currentData.objectives[toHorizon]) {
      currentData.objectives[toHorizon] = [];
    }
    currentData.objectives[toHorizon].push({
      ...task,
      movedAt: new Date().toISOString(),
      movedFrom: fromHorizon
    });
    updateDataCallback('objectives', currentData.objectives);
    showNotification(`Tarea movida a ${toHorizon === 'weekly' ? 'Semana' : toHorizon}`, 'success');
  }
};

/**
 * Completa la revisión semanal
 */
const completeReview = () => {
  // Guardar fecha de revisión
  currentData.settings.lastWeeklyReview = new Date().toISOString();
  updateDataCallback('settings', currentData.settings);

  const modal = document.getElementById('weekly-review-modal');
  modal?.close();

  showNotification('¡Revisión semanal completada! Tu sistema está al día.', 'success');
};

/**
 * Abre el modal de revisión semanal
 */
export const openWeeklyReview = () => {
  currentStep = 0;
  const modal = document.getElementById('weekly-review-modal');
  renderCurrentStep();
  modal?.showModal();
};

/**
 * Verifica si es necesario hacer la revisión semanal
 */
export const needsWeeklyReview = (data) => {
  const lastReview = data.settings?.lastWeeklyReview;
  if (!lastReview) return true;

  const daysSinceReview = Math.floor(
    (Date.now() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysSinceReview >= 7;
};

/**
 * Verifica si hoy es el día configurado para la revisión
 */
export const isReviewDay = (data) => {
  const today = new Date().getDay(); // 0=Domingo, 1=Lunes
  const reviewDay = data.settings?.weeklyReviewDay ?? 0;
  return today === reviewDay;
};

/**
 * Inicializa el modal de revisión semanal
 */
export const initWeeklyReviewModal = (data, updateData) => {
  currentData = data;
  updateDataCallback = updateData;

  const modal = document.getElementById('weekly-review-modal');
  if (!modal) return;

  // Cerrar modal
  document.getElementById('review-close')?.addEventListener('click', () => {
    modal.close();
  });

  // Navegación
  document.getElementById('review-prev')?.addEventListener('click', prevStep);
  document.getElementById('review-next')?.addEventListener('click', nextStep);

  // Click en indicador de paso
  document.querySelectorAll('.review-step').forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (i <= currentStep) { // Solo permitir ir a pasos anteriores
        currentStep = i;
        renderCurrentStep();
      }
    });
  });

  // Cerrar con click en backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.close();
    }
  });
};
