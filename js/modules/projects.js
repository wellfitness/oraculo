/**
 * Oráculo - Módulo de Proyectos
 * Agrupa tareas bajo contextos específicos (viajes, proyectos, etc.)
 */

import { generateId, showNotification } from '../app.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { MAX_ACTIVE_PROJECTS } from '../storage.js';
import {
  renderObjectiveEvaluator,
  initObjectiveEvaluator,
  openObjectiveEvaluator,
  getEvaluationBadge,
  getObjectiveEvaluation
} from '../components/objective-evaluator.js';
import { emptyStateFor } from '../components/empty-state.js';

let updateDataCallback = null;
let currentData = null;

// Estados de proyecto con descripciones para tooltips
const PROJECT_STATUS = {
  active: {
    name: 'Activo',
    icon: 'play_circle',
    iconClass: 'icon-success',
    description: 'Proyecto en el que estás trabajando activamente'
  },
  paused: {
    name: 'Pausado',
    icon: 'pause_circle',
    iconClass: 'icon-warning',
    description: 'Proyecto pausado temporalmente (cuenta para el límite)'
  },
  completed: {
    name: 'Completado',
    icon: 'check_circle',
    iconClass: 'icon-primary',
    description: 'Proyecto terminado (no cuenta para el límite)'
  },
  archived: {
    name: 'Archivado',
    icon: 'inventory_2',
    iconClass: 'icon-muted',
    description: 'Proyecto guardado para referencia (oculto por defecto)'
  }
};

// Colores disponibles para proyectos
const PROJECT_COLORS = [
  { value: '#f43f5e', name: 'Rosa' },
  { value: '#f97316', name: 'Naranja' },
  { value: '#eab308', name: 'Amarillo' },
  { value: '#22c55e', name: 'Verde' },
  { value: '#06b6d4', name: 'Cian' },
  { value: '#3b82f6', name: 'Azul' },
  { value: '#8b5cf6', name: 'Violeta' },
  { value: '#6b7280', name: 'Gris' }
];

/**
 * Calcula el progreso de un proyecto basado en sus tareas
 */
const calculateProgress = (projectId, objectives) => {
  let total = 0;
  let completed = 0;

  ['backlog', 'quarterly', 'monthly', 'weekly', 'daily'].forEach(horizon => {
    const tasks = objectives[horizon] || [];
    tasks.forEach(task => {
      if (task.projectId === projectId) {
        total++;
        if (task.completed) completed++;
      }
    });
  });

  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
};

/**
 * Obtiene todas las tareas de un proyecto
 */
const getProjectTasks = (projectId, objectives) => {
  const tasks = [];
  const horizonNames = {
    backlog: 'Pendientes',
    quarterly: 'Trimestre',
    monthly: 'Mes',
    weekly: 'Semana',
    daily: 'Hoy'
  };

  ['backlog', 'quarterly', 'monthly', 'weekly', 'daily'].forEach(horizon => {
    const horizonTasks = objectives[horizon] || [];
    horizonTasks.forEach(task => {
      if (task.projectId === projectId) {
        tasks.push({
          ...task,
          horizon,
          horizonName: horizonNames[horizon]
        });
      }
    });
  });

  return tasks;
};

/**
 * Cuenta proyectos activos
 */
const countActiveProjects = (projects) => {
  return projects.filter(p => p.status === 'active').length;
};

/**
 * Renderiza la vista principal de proyectos
 */
export const render = (data) => {
  const projects = data.projects || [];
  const activeProjects = projects.filter(p => p.status === 'active');
  const pausedProjects = projects.filter(p => p.status === 'paused');
  const completedProjects = projects.filter(p => p.status === 'completed');
  const archivedProjects = projects.filter(p => p.status === 'archived');

  const canCreateNew = activeProjects.length < MAX_ACTIVE_PROJECTS;

  return `
    <div class="projects-page">
      <header class="page-header">
        <h1 class="page-title">Proyectos</h1>
        <p class="page-description">
          Agrupa tus tareas por contexto. Un proyecto puede ser un viaje, una reforma,
          un objetivo laboral... Lo que necesites organizar.
        </p>
      </header>

      <section class="projects-actions">
        <button class="btn btn--primary" id="new-project-btn" ${!canCreateNew ? 'disabled' : ''}>
          <span class="material-symbols-outlined">add</span>
          Nuevo proyecto
        </button>
        ${!canCreateNew ? `
          <p class="limit-warning">
            <span class="material-symbols-outlined icon-sm">info</span>
            Máximo ${MAX_ACTIVE_PROJECTS} proyectos activos. Completa o pausa uno para crear otro.
          </p>
        ` : `
          <p class="projects-count">${activeProjects.length} de ${MAX_ACTIVE_PROJECTS} proyectos activos</p>
        `}
      </section>

      <!-- Proyectos activos -->
      ${activeProjects.length > 0 ? `
        <section class="projects-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined icon-success">play_circle</span>
            Activos
          </h2>
          <div class="projects-grid">
            ${activeProjects.map(p => renderProjectCard(p, data.objectives)).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Proyectos pausados -->
      ${pausedProjects.length > 0 ? `
        <section class="projects-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined icon-warning">pause_circle</span>
            Pausados
          </h2>
          <div class="projects-grid">
            ${pausedProjects.map(p => renderProjectCard(p, data.objectives)).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Proyectos completados -->
      ${completedProjects.length > 0 ? `
        <section class="projects-section">
          <h2 class="section-title">
            <span class="material-symbols-outlined icon-primary">check_circle</span>
            Completados
          </h2>
          <div class="projects-grid projects-grid--compact">
            ${completedProjects.map(p => renderProjectCard(p, data.objectives, true)).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Proyectos archivados -->
      ${archivedProjects.length > 0 ? `
        <section class="projects-section projects-section--collapsed">
          <button class="section-toggle" id="toggle-archived">
            <span class="material-symbols-outlined icon-muted">inventory_2</span>
            <span>Archivados (${archivedProjects.length})</span>
            <span class="material-symbols-outlined toggle-icon">expand_more</span>
          </button>
          <div class="projects-grid projects-grid--compact" id="archived-projects" style="display: none;">
            ${archivedProjects.map(p => renderProjectCard(p, data.objectives, true)).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Estado vacío -->
      ${projects.length === 0 ? emptyStateFor('projects') : ''}

      <!-- Modal crear/editar proyecto -->
      <dialog id="project-modal" class="modal">
        <form method="dialog" class="modal-content" id="project-form">
          <h2 class="modal-title" id="project-modal-title">Nuevo proyecto</h2>

          <div class="form-group">
            <label for="project-name">Nombre del proyecto *</label>
            <input type="text" id="project-name" class="input" placeholder="Ej: Viaje a Grecia" required>
          </div>

          <div class="form-group">
            <label for="project-description">Descripción (opcional)</label>
            <textarea id="project-description" class="input textarea" rows="3"
              placeholder="¿De qué trata este proyecto?"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="project-color">Color</label>
              <div class="color-picker" id="color-picker">
                ${PROJECT_COLORS.map(c => `
                  <button type="button" class="color-option" data-color="${c.value}"
                    style="background-color: ${c.value}" title="${c.name}"></button>
                `).join('')}
              </div>
              <input type="hidden" id="project-color" value="${PROJECT_COLORS[0].value}">
            </div>

            <div class="form-group">
              <label for="project-deadline">Fecha límite (opcional)</label>
              <input type="date" id="project-deadline" class="input">
            </div>
          </div>

          <div class="form-group">
            <label for="project-value">Vinculado a valor (opcional)</label>
            <select id="project-value" class="input">
              <option value="">Sin vincular</option>
              ${(data.values || []).map(v => `
                <option value="${v.id}">${v.name}</option>
              `).join('')}
            </select>
          </div>

          <input type="hidden" id="project-id">
          <input type="hidden" id="project-status" value="active">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-project">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>

      <!-- Modal detalle de proyecto -->
      <dialog id="project-detail-modal" class="modal modal--large">
        <div class="modal-content" id="project-detail-content">
          <!-- Contenido generado dinámicamente -->
        </div>
      </dialog>

      <!-- Modal del evaluador de proyectos -->
      ${renderObjectiveEvaluator()}
    </div>
  `;
};

/**
 * Renderiza una tarjeta de proyecto con preview de tareas
 */
const renderProjectCard = (project, objectives, compact = false) => {
  const progress = calculateProgress(project.id, objectives);
  const statusInfo = PROJECT_STATUS[project.status];
  const linkedValue = currentData?.values?.find(v => v.id === project.valueId);

  const deadlineInfo = project.deadline ? formatDeadline(project.deadline) : null;

  // Obtener primeras 4 tareas pendientes para preview
  const allTasks = getProjectTasks(project.id, objectives);
  const pendingTasks = allTasks.filter(t => !t.completed);
  const previewTasks = pendingTasks.slice(0, 4);
  const hasMoreTasks = pendingTasks.length > 4;

  return `
    <article class="project-card ${compact ? 'project-card--compact' : ''}"
      data-id="${project.id}" style="--project-color: ${project.color}">
      <header class="project-card__header">
        <div class="project-card__color" style="background-color: ${project.color}"></div>
        <h3 class="project-card__name">${escapeHTML(project.name)}</h3>
        <button class="btn btn--icon btn--ghost project-card__menu" data-id="${project.id}" title="Evaluar proyecto">
          <span class="material-symbols-outlined">balance</span>
        </button>
      </header>

      ${!compact && project.description ? `
        <p class="project-card__description">${escapeHTML(project.description)}</p>
      ` : ''}

      <div class="project-card__progress">
        <div class="progress-bar">
          <div class="progress-bar__fill" style="width: ${progress.percentage}%; background-color: ${project.color}"></div>
        </div>
        <span class="progress-text">${progress.completed}/${progress.total} tareas</span>
      </div>

      ${!compact && previewTasks.length > 0 ? `
        <ul class="project-card__tasks">
          ${previewTasks.map(task => `
            <li class="project-card__task">
              <span class="material-symbols-outlined icon-xs">radio_button_unchecked</span>
              <span class="project-card__task-text">${escapeHTML(task.text)}</span>
            </li>
          `).join('')}
          ${hasMoreTasks ? `
            <li class="project-card__task project-card__task--more">
              <span class="material-symbols-outlined icon-xs">more_horiz</span>
              <span>+${pendingTasks.length - 4} más</span>
            </li>
          ` : ''}
        </ul>
      ` : ''}

      ${!compact ? `
        <footer class="project-card__footer">
          ${linkedValue ? `
            <span class="project-card__value" title="Vinculado a: ${linkedValue.name}">
              <span class="material-symbols-outlined icon-xs">explore</span>
              ${linkedValue.name}
            </span>
          ` : ''}
          ${deadlineInfo ? `
            <span class="project-card__deadline ${deadlineInfo.urgent ? 'deadline--urgent' : ''}">
              <span class="material-symbols-outlined icon-xs">event</span>
              ${deadlineInfo.text}
            </span>
          ` : ''}
        </footer>
      ` : ''}
    </article>
  `;
};

/**
 * Formatea la fecha límite
 */
const formatDeadline = (deadline) => {
  const date = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

  let text;
  let urgent = false;

  if (diffDays < 0) {
    text = 'Vencido';
    urgent = true;
  } else if (diffDays === 0) {
    text = 'Hoy';
    urgent = true;
  } else if (diffDays === 1) {
    text = 'Mañana';
    urgent = true;
  } else if (diffDays <= 7) {
    text = `${diffDays} días`;
    urgent = true;
  } else {
    text = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  }

  return { text, urgent };
};

/**
 * Renderiza el detalle de un proyecto
 */
const renderProjectDetail = (project) => {
  const progress = calculateProgress(project.id, currentData.objectives);
  const tasks = getProjectTasks(project.id, currentData.objectives);
  const statusInfo = PROJECT_STATUS[project.status];
  const linkedValue = currentData?.values?.find(v => v.id === project.valueId);

  const completedTasks = tasks.filter(t => t.completed);
  const pendingTasks = tasks.filter(t => !t.completed);

  return `
    <header class="project-detail__header">
      <button class="btn btn--icon btn--ghost" id="close-project-detail" title="Cerrar">
        <span class="material-symbols-outlined">close</span>
      </button>
      <div class="project-detail__color" style="background-color: ${project.color}"></div>
      <h2 class="project-detail__name">${escapeHTML(project.name)}</h2>
      <span class="status-badge status-badge--${project.status}" title="${statusInfo.description}">
        <span class="material-symbols-outlined icon-sm ${statusInfo.iconClass}">${statusInfo.icon}</span>
        ${statusInfo.name}
      </span>
    </header>

    ${project.description ? `
      <p class="project-detail__description">${escapeHTML(project.description)}</p>
    ` : ''}

    <div class="project-detail__meta">
      ${linkedValue ? `
        <div class="meta-item">
          <span class="material-symbols-outlined icon-sm">explore</span>
          <span>Vinculado a: <strong>${linkedValue.name}</strong></span>
        </div>
      ` : ''}
      ${project.deadline ? `
        <div class="meta-item">
          <span class="material-symbols-outlined icon-sm">event</span>
          <span>Fecha límite: <strong>${new Date(project.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></span>
        </div>
      ` : ''}
    </div>

    <div class="project-detail__progress">
      <div class="progress-info">
        <span class="progress-percentage">${progress.percentage}%</span>
        <span class="progress-count">${progress.completed} de ${progress.total} tareas</span>
      </div>
      <div class="progress-bar progress-bar--large">
        <div class="progress-bar__fill" style="width: ${progress.percentage}%; background-color: ${project.color}"></div>
      </div>
    </div>

    <section class="project-detail__tasks">
      <h3>Tareas</h3>

      ${tasks.length === 0 ? `
        <p class="empty-message">
          Este proyecto no tiene tareas asignadas.<br>
          Ve a <a href="#kanban">Horizontes</a> y asigna tareas a este proyecto.
        </p>
      ` : `
        ${pendingTasks.length > 0 ? `
          <div class="task-group">
            <h4 class="task-group__title">Pendientes (${pendingTasks.length})</h4>
            <ul class="task-list">
              ${pendingTasks.map(task => `
                <li class="task-item">
                  <span class="task-item__checkbox"></span>
                  <span class="task-item__text">${escapeHTML(task.text)}</span>
                  <span class="task-item__horizon">${task.horizonName}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        ${completedTasks.length > 0 ? `
          <div class="task-group task-group--completed">
            <h4 class="task-group__title">Completadas (${completedTasks.length})</h4>
            <ul class="task-list">
              ${completedTasks.map(task => `
                <li class="task-item task-item--completed">
                  <span class="task-item__checkbox task-item__checkbox--checked">
                    <span class="material-symbols-outlined icon-xs">check</span>
                  </span>
                  <span class="task-item__text">${escapeHTML(task.text)}</span>
                  <span class="task-item__horizon">${task.horizonName}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}
      `}

      ${project.status === 'active' ? `
        <div class="project-add-task">
          <button type="button" class="btn btn--secondary project-add-task-btn" id="add-task-to-project">
            <span class="material-symbols-outlined icon-sm">add</span>
            Añadir tarea
          </button>

          <form class="project-add-task-form" id="project-task-form" hidden>
            <input
              type="text"
              class="input"
              id="project-task-text"
              placeholder="Descripción de la tarea..."
              maxlength="150"
              required
            >
            <label class="checkbox-label checkbox-label--important">
              <input type="checkbox" id="project-task-important" class="checkbox">
              <span class="material-symbols-outlined icon-sm" style="color: var(--rosa-600)">priority_high</span>
              Importante
            </label>
            <div class="project-add-task-actions">
              <button type="button" class="btn btn--tertiary btn--sm" id="cancel-project-task">
                Cancelar
              </button>
              <button type="submit" class="btn btn--primary btn--sm">
                Guardar
              </button>
            </div>
          </form>

          <p class="project-add-task-hint" id="project-task-hint">
            <span class="material-symbols-outlined icon-xs">info</span>
            La tarea aparecerá en Pendientes del tablero
          </p>
        </div>
      ` : ''}
    </section>

    <footer class="project-detail__actions">
      <button class="btn btn--secondary" id="edit-project-btn" data-id="${project.id}">
        <span class="material-symbols-outlined">edit</span>
        Editar
      </button>

      ${project.status === 'active' ? `
        <button class="btn btn--secondary" id="pause-project-btn" data-id="${project.id}"
          title="${PROJECT_STATUS.paused.description}">
          <span class="material-symbols-outlined">pause</span>
          Pausar
        </button>
      ` : project.status === 'paused' ? `
        <button class="btn btn--secondary" id="resume-project-btn" data-id="${project.id}"
          title="${PROJECT_STATUS.active.description}">
          <span class="material-symbols-outlined">play_arrow</span>
          Reanudar
        </button>
      ` : ''}

      ${project.status !== 'completed' && project.status !== 'archived' ? `
        <button class="btn btn--primary" id="complete-project-btn" data-id="${project.id}"
          title="${PROJECT_STATUS.completed.description}">
          <span class="material-symbols-outlined">check_circle</span>
          Completar
        </button>
      ` : ''}

      ${project.status === 'completed' ? `
        <button class="btn btn--secondary" id="archive-project-btn" data-id="${project.id}"
          title="${PROJECT_STATUS.archived.description}">
          <span class="material-symbols-outlined">inventory_2</span>
          Archivar
        </button>
      ` : ''}

      <button class="btn btn--danger" id="delete-project-btn" data-id="${project.id}">
        <span class="material-symbols-outlined">delete</span>
        Eliminar
      </button>
    </footer>
  `;
};

/**
 * Inicializa eventos
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;
  currentData = data;

  const modal = document.getElementById('project-modal');
  const detailModal = document.getElementById('project-detail-modal');

  // Botón nuevo proyecto
  document.getElementById('new-project-btn')?.addEventListener('click', () => {
    openProjectModal();
  });

  // Click en tarjeta de proyecto -> abrir detalle del proyecto
  document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('click', (e) => {
      // Si es menú, no hacer nada (el menú tiene su propio handler)
      if (e.target.closest('.project-card__menu')) return;

      const projectId = card.dataset.id;
      const project = data.projects.find(p => p.id === projectId);
      if (project) openProjectDetail(project);
    });
  });

  // Menú de opciones (⋮) -> abrir evaluador
  document.querySelectorAll('.project-card__menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const projectId = btn.dataset.id;
      const project = data.projects.find(p => p.id === projectId);
      if (!project) return;

      // Abrir evaluador
      const projectForEvaluator = {
        id: project.id,
        title: project.name,
        text: project.name,
        icon: 'folder_open'
      };
      openObjectiveEvaluator(projectForEvaluator, (evaluation) => {
        saveProjectEvaluation(project.id, evaluation);
      });
    });
  });

  // Toggle proyectos archivados
  document.getElementById('toggle-archived')?.addEventListener('click', () => {
    const container = document.getElementById('archived-projects');
    const icon = document.querySelector('#toggle-archived .toggle-icon');
    if (container.style.display === 'none') {
      container.style.display = 'grid';
      icon.textContent = 'expand_less';
    } else {
      container.style.display = 'none';
      icon.textContent = 'expand_more';
    }
  });

  setupProjectModal(data, modal);
  setupDetailModal(data, detailModal);

  // Inicializar el evaluador de proyectos
  initObjectiveEvaluator(data, updateData);
};

/**
 * Configura el modal de crear/editar proyecto
 */
const setupProjectModal = (data, modal) => {
  const form = document.getElementById('project-form');

  // Cancelar
  document.getElementById('cancel-project')?.addEventListener('click', () => {
    modal.close();
  });

  // Click fuera cierra
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  // Selector de color
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('project-color').value = btn.dataset.color;
    });
  });

  // Guardar
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveProject(data);
  });

  // Atajo Ctrl+Enter para guardar
  form?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      saveProject(data);
    }
  });

  // Validación en tiempo real del nombre
  const nameInput = document.getElementById('project-name');
  const submitBtn = form?.querySelector('button[type="submit"]');

  const validateName = () => {
    const name = nameInput.value.trim();
    const isValid = name.length >= 3;

    if (!isValid && name.length > 0) {
      nameInput.classList.add('input--error');
      nameInput.setCustomValidity('El nombre debe tener al menos 3 caracteres');
    } else {
      nameInput.classList.remove('input--error');
      nameInput.setCustomValidity('');
    }

    if (submitBtn) {
      submitBtn.disabled = !isValid;
    }
  };

  nameInput?.addEventListener('input', validateName);
};

/**
 * Configura el modal de detalle
 */
const setupDetailModal = (data, modal) => {
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
};

/**
 * Abre el modal para crear/editar proyecto
 */
const openProjectModal = (project = null) => {
  const modal = document.getElementById('project-modal');
  const title = document.getElementById('project-modal-title');

  // Resetear formulario
  document.getElementById('project-id').value = project?.id || '';
  document.getElementById('project-name').value = project?.name || '';
  document.getElementById('project-description').value = project?.description || '';
  document.getElementById('project-color').value = project?.color || PROJECT_COLORS[0].value;
  document.getElementById('project-deadline').value = project?.deadline || '';
  document.getElementById('project-value').value = project?.valueId || '';
  document.getElementById('project-status').value = project?.status || 'active';

  // Actualizar selector de color
  document.querySelectorAll('.color-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === (project?.color || PROJECT_COLORS[0].value));
  });

  title.textContent = project ? 'Editar proyecto' : 'Nuevo proyecto';
  modal.showModal();
};

/**
 * Abre el detalle de un proyecto
 */
const openProjectDetail = (project) => {
  const modal = document.getElementById('project-detail-modal');
  const content = document.getElementById('project-detail-content');

  content.innerHTML = renderProjectDetail(project);
  modal.showModal();

  // Configurar eventos del detalle
  document.getElementById('close-project-detail')?.addEventListener('click', () => {
    modal.close();
  });

  document.getElementById('edit-project-btn')?.addEventListener('click', () => {
    modal.close();
    openProjectModal(project);
  });

  document.getElementById('pause-project-btn')?.addEventListener('click', () => {
    updateProjectStatus(project.id, 'paused');
    modal.close();
  });

  document.getElementById('resume-project-btn')?.addEventListener('click', () => {
    const activeCount = countActiveProjects(currentData.projects);
    if (activeCount >= MAX_ACTIVE_PROJECTS) {
      showNotification(`Máximo ${MAX_ACTIVE_PROJECTS} proyectos activos. Pausa o completa uno primero.`, 'warning');
      return;
    }
    updateProjectStatus(project.id, 'active');
    modal.close();
  });

  document.getElementById('complete-project-btn')?.addEventListener('click', () => {
    updateProjectStatus(project.id, 'completed');
    modal.close();
  });

  document.getElementById('archive-project-btn')?.addEventListener('click', () => {
    updateProjectStatus(project.id, 'archived');
    modal.close();
  });

  document.getElementById('delete-project-btn')?.addEventListener('click', () => {
    if (confirm('¿Eliminar este proyecto? Las tareas no se eliminarán, solo se desvinculan.')) {
      deleteProject(project.id);
      modal.close();
    }
  });

  // === Creación de tareas desde proyecto ===
  const addTaskBtn = document.getElementById('add-task-to-project');
  const taskForm = document.getElementById('project-task-form');
  const taskInput = document.getElementById('project-task-text');
  const taskHint = document.getElementById('project-task-hint');
  const importantCheckbox = document.getElementById('project-task-important');

  // Mostrar formulario
  addTaskBtn?.addEventListener('click', () => {
    addTaskBtn.hidden = true;
    taskForm.hidden = false;
    taskHint.hidden = true;
    taskInput.focus();
  });

  // Cancelar
  document.getElementById('cancel-project-task')?.addEventListener('click', () => {
    taskForm.hidden = true;
    addTaskBtn.hidden = false;
    taskHint.hidden = false;
    taskInput.value = '';
    importantCheckbox.checked = false;
  });

  // Guardar tarea
  taskForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = taskInput.value.trim();
    const isImportant = importantCheckbox.checked;

    if (addTaskFromProject(project.id, text, isImportant)) {
      showNotification('Tarea añadida a Pendientes', 'success');

      // Re-renderizar el detalle para mostrar la nueva tarea
      content.innerHTML = renderProjectDetail(project);

      // Re-configurar eventos (llamada recursiva)
      openProjectDetail(project);
    }
  });
};

/**
 * Guarda un proyecto
 */
const saveProject = (data) => {
  const id = document.getElementById('project-id').value;
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();
  const color = document.getElementById('project-color').value;
  const deadline = document.getElementById('project-deadline').value || null;
  const valueId = document.getElementById('project-value').value || null;
  const status = document.getElementById('project-status').value;

  if (!name) {
    showNotification('El nombre es obligatorio', 'warning');
    return;
  }

  // Verificar límite de proyectos activos (solo para nuevos o al cambiar a activo)
  if (!id && status === 'active') {
    const activeCount = countActiveProjects(data.projects);
    if (activeCount >= MAX_ACTIVE_PROJECTS) {
      showNotification(`Máximo ${MAX_ACTIVE_PROJECTS} proyectos activos`, 'warning');
      return;
    }
  }

  const projectData = {
    id: id || generateId(),
    name,
    description,
    color,
    deadline,
    valueId,
    status,
    createdAt: id ? data.projects.find(p => p.id === id)?.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : null
  };

  if (id) {
    const index = data.projects.findIndex(p => p.id === id);
    if (index !== -1) data.projects[index] = projectData;
  } else {
    data.projects.push(projectData);
  }

  updateDataCallback('projects', data.projects);
  document.getElementById('project-modal').close();
  showNotification(id ? 'Proyecto actualizado' : 'Proyecto creado', 'success');
  location.reload();
};

/**
 * Actualiza el estado de un proyecto
 */
const updateProjectStatus = (projectId, newStatus) => {
  const project = currentData.projects.find(p => p.id === projectId);
  if (!project) return;

  project.status = newStatus;
  project.updatedAt = new Date().toISOString();

  if (newStatus === 'completed') {
    project.completedAt = new Date().toISOString();
  }

  updateDataCallback('projects', currentData.projects);
  showNotification(`Proyecto ${PROJECT_STATUS[newStatus].name.toLowerCase()}`, 'success');
  location.reload();
};

/**
 * Guarda la evaluación de un proyecto
 */
const saveProjectEvaluation = (projectId, evaluation) => {
  const project = currentData.projects.find(p => p.id === projectId);
  if (!project) return;

  project.lastEvaluation = evaluation;
  project.updatedAt = new Date().toISOString();

  updateDataCallback('projects', currentData.projects);

  // Mensaje según el resultado
  const resultMessages = {
    proceed: '¡Adelante con este proyecto!',
    review: 'Proyecto evaluado: considera ajustes',
    reconsider: 'Quizás no sea el momento para este proyecto'
  };
  showNotification(resultMessages[evaluation.result.recommendation] || 'Evaluación guardada', 'success');
  location.reload();
};

/**
 * Añade una tarea al proyecto (va a backlog/pendientes)
 */
const addTaskFromProject = (projectId, text, isImportant) => {
  // Validar texto
  if (!text || !text.trim()) {
    showNotification('La descripción es obligatoria', 'warning');
    return false;
  }

  // Verificar que el proyecto existe y está activo
  const project = currentData.projects.find(p => p.id === projectId);
  if (!project || project.status !== 'active') {
    showNotification('Solo puedes añadir tareas a proyectos activos', 'warning');
    return false;
  }

  // Asegurar que backlog existe
  if (!currentData.objectives.backlog) {
    currentData.objectives.backlog = [];
  }

  // Crear la nueva tarea
  const newTask = {
    id: generateId(),
    text: text.trim(),
    notes: null,
    projectId: projectId,
    taskType: isImportant ? 'importante' : null,
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    completedAt: null,
    movedAt: null,
    movedFrom: null
  };

  // Guardar en backlog
  currentData.objectives.backlog.push(newTask);
  updateDataCallback('objectives', currentData.objectives);

  return true;
};

/**
 * Elimina un proyecto (desvincula tareas)
 */
const deleteProject = (projectId) => {
  // Desvincular tareas
  ['quarterly', 'monthly', 'weekly', 'daily'].forEach(horizon => {
    currentData.objectives[horizon].forEach(task => {
      if (task.projectId === projectId) {
        task.projectId = null;
      }
    });
  });

  // Eliminar proyecto
  currentData.projects = currentData.projects.filter(p => p.id !== projectId);

  updateDataCallback('projects', currentData.projects);
  updateDataCallback('objectives', currentData.objectives);
  showNotification('Proyecto eliminado', 'info');
  location.reload();
};
