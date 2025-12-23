/**
 * Oráculo - Kanban por Horizontes
 * Gestión de objetivos con layout de 3 secciones:
 * - En Foco: Tareas del día con slots dinámicos (Volumen Fijo)
 * - Horizontes: Trimestre → Mes → Semana
 * - Pendientes: Captura de ideas sin límite
 */

import { generateId, showNotification } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';
import { escapeHTML } from '../utils/sanitizer.js';

let updateDataCallback = null;
let draggedItem = null;
let currentData = null;
let activeFilter = null; // null = todos, '' = sin proyecto, 'id' = proyecto específico
let selectedHorizonItemId = null; // ID del item de horizonte seleccionado
let selectedFocusItemId = null; // ID del item de En Foco seleccionado
let selectedBacklogItemId = null; // ID del item de Pendientes seleccionado

// Tipos de tarea (simplificado a solo "importante")
const TASK_TYPES = {
  importante: { name: 'Importante', icon: 'priority_high', color: 'var(--rosa-600)' }
};

// Límites por columna (null = sin límite)
const LIMITS = {
  backlog: null,  // Sin límite - lista abierta
  quarterly: 3,
  monthly: 6,
  weekly: 10,
  daily: 3        // "En Foco" - lista cerrada (pero dinámico según Volumen Fijo)
};

/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
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
  return LIMITS.daily; // fallback a 3
};

/**
 * Cuenta las tareas ACTIVAS (no completadas) en una columna
 * El límite solo aplica a tareas pendientes, no al total
 */
const getActiveTasksCount = (items) => {
  return items.filter(item => !item.completed).length;
};

// Nombres para mostrar
const COLUMN_NAMES = {
  backlog: 'Pendientes',
  quarterly: 'Trimestre',
  monthly: 'Mes',
  weekly: 'Semana',
  daily: 'En Foco'
};

// Agrupación de columnas para el nuevo layout
const SECTIONS = {
  focus: ['daily'],
  horizons: ['quarterly', 'monthly', 'weekly'],
  backlog: ['backlog']
};

// Estado del backlog (colapsado por defecto)
let isBacklogExpanded = false;

/**
 * SECCIÓN 1: EN FOCO
 * Renderiza la sección principal del día con máxima prominencia
 */
const renderFocusSection = (items, projects, data) => {
  const limit = getDailyLimit(data);
  const activeCount = getActiveTasksCount(items);
  const isFull = activeCount >= limit;
  const slotsAvailable = limit - activeCount;

  // Obtener roca principal si existe
  const rocaPrincipal = data.dailySetup?.rocaPrincipal;
  const rocaItem = rocaPrincipal ? items.find(i => i.id === rocaPrincipal) : null;
  const otherItems = rocaItem ? items.filter(i => i.id !== rocaPrincipal) : items;

  const getSlotMessage = () => {
    if (slotsAvailable === 0) {
      return `<span class="material-symbols-outlined icon-sm">block</span> Sin slots disponibles. ¡Completa algo primero!`;
    } else if (slotsAvailable === 1) {
      return `<span class="material-symbols-outlined icon-sm">looks_one</span> 1 slot disponible`;
    } else {
      return `<span class="material-symbols-outlined icon-sm">target</span> ${slotsAvailable} slots disponibles`;
    }
  };

  return `
    <section class="kanban-section kanban-section--focus" data-section="focus">
      <header class="section-header section-header--focus">
        <h2 class="section-title">
          <span class="material-symbols-outlined">target</span>
          En Foco
        </h2>
        <div class="section-header__right">
          <div class="section-actions" id="focus-actions" hidden>
            <button class="btn btn--icon" id="focus-action-edit" title="Editar">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn--icon btn--danger" id="focus-action-delete" title="Eliminar">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="section-meta">
            <span class="slots-indicator ${isFull ? 'slots--full' : ''}">${activeCount}/${limit} activas</span>
          </div>
        </div>
      </header>

      <p class="section-hint ${isFull ? 'hint--full' : ''}">
        ${getSlotMessage()}
      </p>

      ${rocaItem ? `
        <div class="roca-principal">
          <span class="roca-badge">
            <span class="material-symbols-outlined icon-sm">diamond</span>
            Roca Principal
          </span>
          ${renderFocusItem(rocaItem, projects, true)}
        </div>
      ` : ''}

      <ul class="focus-items kanban-column__items" data-column="daily">
        ${otherItems.map(item => renderFocusItem(item, projects, false)).join('')}
      </ul>

      ${!isFull ? `
        <button class="kanban-add-btn kanban-add-btn--focus" data-column="daily">
          <span class="material-symbols-outlined icon-sm">add</span>
          Añadir al foco
        </button>
      ` : `
        <p class="kanban-limit-msg">
          ¡Completa algo para liberar un slot! La magia está en terminar.
        </p>
      `}
    </section>
  `;
};

/**
 * Renderiza un item en la sección En Foco
 * (versión más prominente con checkboxes grandes)
 */
const renderFocusItem = (item, projects, isRoca = false) => {
  const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;

  return `
    <li
      class="kanban-item focus-item ${item.completed ? 'kanban-item--completed' : ''} ${isRoca ? 'focus-item--roca' : ''}"
      data-id="${item.id}"
      data-project="${item.projectId || ''}"
      draggable="true"
    >
      <label class="focus-item__checkbox">
        <input type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
        <span class="focus-item__check-icon">
          <span class="material-symbols-outlined">${item.completed ? 'check_circle' : 'radio_button_unchecked'}</span>
        </span>
      </label>

      <div class="focus-item__content">
        <div class="focus-item__title-row">
          <span class="focus-item__text ${item.completed ? 'text--completed' : ''}">${escapeHTML(item.text)}</span>
        </div>
        ${item.notes ? `<p class="focus-item__notes">${escapeHTML(item.notes)}</p>` : ''}
        ${project ? `
          <span class="focus-item__project" style="--project-color: ${project.color}">
            <span class="project-dot" style="background-color: ${project.color}"></span>
            ${escapeHTML(project.name)}
          </span>
        ` : ''}
      </div>
    </li>
  `;
};

/**
 * SECCIÓN 2: HORIZONTES
 * Renderiza las 3 columnas de planificación temporal en grid
 */
const renderHorizonsSection = (objectives, projects, data) => {
  const horizons = [
    { key: 'quarterly', name: 'Trimestre', icon: 'calendar_view_month' },
    { key: 'monthly', name: 'Mes', icon: 'calendar_today' },
    { key: 'weekly', name: 'Semana', icon: 'date_range' }
  ];

  return `
    <section class="kanban-section kanban-section--horizons" data-section="horizons">
      <header class="section-header section-header--horizons">
        <h2 class="section-title">
          <span class="material-symbols-outlined">leaderboard</span>
          Horizontes
        </h2>
        <div class="horizons-actions" id="horizons-actions" hidden>
          <button class="btn btn--icon" id="horizon-action-edit" title="Editar">
            <span class="material-symbols-outlined">edit</span>
          </button>
          <button class="btn btn--icon btn--danger" id="horizon-action-delete" title="Eliminar">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </header>

      <div class="horizons-grid">
        ${horizons.map(h => renderHorizonColumn(h.key, objectives[h.key] || [], LIMITS[h.key], projects, h.icon)).join('')}
      </div>
    </section>
  `;
};

/**
 * Renderiza una columna de horizonte (trimestre/mes/semana)
 */
const renderHorizonColumn = (columnKey, items, limit, projects, icon) => {
  const count = items.length;
  const hasLimit = limit !== null;
  const isFull = hasLimit && count >= limit;

  return `
    <div class="horizon-column" data-column="${columnKey}">
      <header class="horizon-header">
        <h3 class="horizon-title">
          <span class="material-symbols-outlined icon-sm">${icon}</span>
          ${COLUMN_NAMES[columnKey]}
        </h3>
        <span class="horizon-count ${isFull ? 'count--full' : ''}">${count}/${limit}</span>
      </header>

      <ul class="horizon-items kanban-column__items" data-column="${columnKey}">
        ${items.map(item => renderHorizonItem(item, projects)).join('')}
      </ul>

      ${!isFull ? `
        <button class="kanban-add-btn horizon-add-btn" data-column="${columnKey}">
          <span class="material-symbols-outlined icon-sm">add</span>
        </button>
      ` : ''}
    </div>
  `;
};

/**
 * Renderiza un item en una columna de horizonte
 */
const renderHorizonItem = (item, projects) => {
  const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;

  return `
    <li
      class="kanban-item horizon-item ${item.completed ? 'kanban-item--completed' : ''}"
      data-id="${item.id}"
      data-project="${item.projectId || ''}"
      draggable="true"
    >
      <label class="horizon-item__checkbox">
        <input type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
        <span class="horizon-item__text">${escapeHTML(item.text)}</span>
      </label>
      ${project ? `
        <span class="horizon-item__project" style="background-color: ${project.color}15; color: ${project.color}">
          ${escapeHTML(project.name)}
        </span>
      ` : ''}
    </li>
  `;
};

/**
 * SECCIÓN 3: BACKLOG
 * Renderiza el backlog colapsable para capturar ideas
 */
const SOFT_LIMIT_PENDIENTES = 10;

const renderBacklogSection = (items, projects, data) => {
  const count = items.length;
  const showSoftLimitWarning = count >= SOFT_LIMIT_PENDIENTES;

  return `
    <section class="kanban-section kanban-section--backlog ${isBacklogExpanded ? 'expanded' : ''}" data-section="backlog">
      <header class="section-header section-header--backlog" id="backlog-toggle">
        <h2 class="section-title">
          <span class="material-symbols-outlined">inbox</span>
          Pendientes
          <span class="backlog-count ${showSoftLimitWarning ? 'backlog-count--warning' : ''}">${count}</span>
        </h2>
        <div class="section-header__right">
          <div class="section-actions" id="backlog-actions" hidden>
            <button class="btn btn--icon" id="backlog-action-edit" title="Editar">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn btn--icon btn--danger" id="backlog-action-delete" title="Eliminar">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <button class="backlog-expand-btn" type="button">
            <span class="material-symbols-outlined">
              ${isBacklogExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </header>

      <div class="backlog-content ${isBacklogExpanded ? 'expanded' : ''}">
        ${showSoftLimitWarning ? `
          <div class="backlog-soft-limit">
            <span class="material-symbols-outlined">lightbulb</span>
            <p>
              Tienes ${count} ideas esperando.
              <a href="#" class="backlog-process-link" data-action="expand-horizons">
                ¿Buen momento para procesarlas?
              </a>
            </p>
          </div>
        ` : `
          <p class="section-hint section-hint--backlog">
            Captura aquí todas las ideas. Sin filtro, sin límite.
          </p>
        `}

        <ul class="backlog-items kanban-column__items" data-column="backlog">
          ${items.map(item => renderBacklogItem(item, projects)).join('')}
        </ul>

        <button class="kanban-add-btn backlog-add-btn" data-column="backlog">
          <span class="material-symbols-outlined icon-sm">add</span>
          Capturar idea
        </button>
      </div>
    </section>
  `;
};

/**
 * Renderiza un item del backlog
 */
const renderBacklogItem = (item, projects) => {
  const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;

  return `
    <li
      class="kanban-item backlog-item"
      data-id="${item.id}"
      data-project="${item.projectId || ''}"
      draggable="true"
    >
      <div class="backlog-item__content">
        <span class="backlog-item__text">${escapeHTML(item.text)}</span>
        ${project ? `
          <span class="backlog-item__project" style="--project-color: ${project.color}">
            ${escapeHTML(project.name)}
          </span>
        ` : ''}
      </div>
    </li>
  `;
};

/**
 * Renderiza el tablero Kanban con 3 secciones verticales
 */
export const render = (data) => {
  const objectives = data.objectives || {
    backlog: [],
    quarterly: [],
    monthly: [],
    weekly: [],
    daily: []
  };

  // Asegurar que backlog existe
  if (!objectives.backlog) {
    objectives.backlog = [];
  }

  const projects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

  return `
    <div class="kanban-page">
      <header class="page-header">
        <div class="page-header__top">
          <div>
            <h1 class="page-title">Horizontes</h1>
            <p class="page-description">
              Elige tu foco del día, planifica en los horizontes y captura ideas en Pendientes.
            </p>
            <a href="#daily-setup" data-view="daily-setup" class="dashboard__reconfigure" title="Reconfigurar mi día">
              <span class="material-symbols-outlined">tune</span>
              <span>Reconfigurar día</span>
            </a>
          </div>

          ${projects.length > 0 ? `
            <div class="kanban-controls">
              <div class="kanban-filter">
                <label for="project-filter" class="filter-label">
                  <span class="material-symbols-outlined icon-sm">filter_list</span>
                  Filtrar:
                </label>
                <select id="project-filter" class="input input--small">
                  <option value="">Todas las tareas</option>
                  <option value="none">Sin proyecto</option>
                  ${projects.map(p => `
                    <option value="${p.id}">${p.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>
          ` : ''}
        </div>
      </header>

      <!-- Vista Kanban: 3 Secciones Verticales -->
      <div class="kanban-sections" id="kanban-view">

        <!-- SECCIÓN 1: EN FOCO -->
        ${renderFocusSection(objectives.daily || [], projects, data)}

        <!-- SECCIÓN 2: HORIZONTES -->
        ${renderHorizonsSection(objectives, projects, data)}

        <!-- SECCIÓN 3: BACKLOG -->
        ${renderBacklogSection(objectives.backlog || [], projects, data)}

      </div>

      <div class="kanban-tips burkeman-reflexion">
        <blockquote class="quote quote--inline">
          <p>"${getReflexionDelDia('kanban')}"</p>
          <cite>— Oliver Burkeman</cite>
        </blockquote>
      </div>

      <!-- Modal para añadir/editar item -->
      <dialog id="item-modal" class="modal">
        <form method="dialog" class="modal-content" id="item-form">
          <h2 class="modal-title" id="item-modal-title">Nuevo Objetivo</h2>

          <div class="form-group">
            <label for="item-text">Descripción</label>
            <input
              type="text"
              id="item-text"
              class="input"
              placeholder="¿Qué quieres lograr?"
              maxlength="150"
              required
            >
          </div>

          <div class="form-group">
            <label for="item-notes">Notas (opcional)</label>
            <textarea
              id="item-notes"
              class="input textarea"
              placeholder="Contexto adicional..."
              rows="3"
              maxlength="500"
            ></textarea>
          </div>

          ${projects.length > 0 ? `
            <div class="form-group">
              <label for="item-project">Proyecto (opcional)</label>
              <select id="item-project" class="input">
                <option value="">Sin proyecto</option>
                ${projects.map(p => `
                  <option value="${p.id}">${p.name}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}

          <div class="form-group">
            <label class="checkbox-label checkbox-label--important">
              <input type="checkbox" id="item-important" class="checkbox">
              <span class="material-symbols-outlined icon-sm" style="color: var(--rosa-600)">priority_high</span>
              Marcar como importante
            </label>
          </div>

          <input type="hidden" id="item-id">
          <input type="hidden" id="item-column">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-item">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>

    </div>
  `;
};

/**
 * Configura selección de items en Horizontes y barra de acciones
 */
const setupHorizonSelection = (data) => {
  const actionsBar = document.getElementById('horizons-actions');
  if (!actionsBar) return;

  // Clic en items de horizonte para seleccionar
  document.querySelectorAll('.kanban-section--horizons .horizon-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Si es clic en checkbox, no seleccionar
      if (e.target.closest('.horizon-item__checkbox input')) return;

      const itemId = item.dataset.id;

      // Si ya está seleccionado, deseleccionar
      if (selectedHorizonItemId === itemId) {
        item.classList.remove('horizon-item--selected');
        selectedHorizonItemId = null;
        actionsBar.hidden = true;
        return;
      }

      // Quitar selección anterior (de cualquier sección)
      clearAllSelections();

      // Seleccionar este
      item.classList.add('horizon-item--selected');
      selectedHorizonItemId = itemId;
      actionsBar.hidden = false;
    });
  });

  // Botón Editar
  document.getElementById('horizon-action-edit')?.addEventListener('click', () => {
    if (!selectedHorizonItemId) return;
    const column = findItemColumn(selectedHorizonItemId, data.objectives);
    const item = data.objectives[column]?.find(i => i.id === selectedHorizonItemId);
    if (item) openItemModal(item, column);
  });

  // Botón Eliminar
  document.getElementById('horizon-action-delete')?.addEventListener('click', () => {
    if (!selectedHorizonItemId) return;
    deleteItem(selectedHorizonItemId, data);
    selectedHorizonItemId = null;
    actionsBar.hidden = true;
  });
};

/**
 * Configura selección de items en En Foco y barra de acciones
 */
const setupFocusSelection = (data) => {
  const actionsBar = document.getElementById('focus-actions');
  if (!actionsBar) return;

  // Clic en items de focus para seleccionar
  document.querySelectorAll('.kanban-section--focus .focus-item').forEach(item => {
    item.addEventListener('click', (e) => {
      // Si es clic en checkbox, no seleccionar
      if (e.target.closest('.focus-item__checkbox input')) return;

      const itemId = item.dataset.id;

      // Si ya está seleccionado, deseleccionar
      if (selectedFocusItemId === itemId) {
        item.classList.remove('focus-item--selected');
        selectedFocusItemId = null;
        actionsBar.hidden = true;
        return;
      }

      // Quitar selección anterior (de cualquier sección)
      clearAllSelections();

      // Seleccionar este
      item.classList.add('focus-item--selected');
      selectedFocusItemId = itemId;
      actionsBar.hidden = false;
    });
  });

  // Botón Editar
  document.getElementById('focus-action-edit')?.addEventListener('click', () => {
    if (!selectedFocusItemId) return;
    const item = data.objectives.daily?.find(i => i.id === selectedFocusItemId);
    if (item) openItemModal(item, 'daily');
  });

  // Botón Eliminar
  document.getElementById('focus-action-delete')?.addEventListener('click', () => {
    if (!selectedFocusItemId) return;
    deleteItem(selectedFocusItemId, data);
    selectedFocusItemId = null;
    actionsBar.hidden = true;
  });
};

/**
 * Configura selección de items en Pendientes y barra de acciones
 */
const setupBacklogSelection = (data) => {
  const actionsBar = document.getElementById('backlog-actions');
  if (!actionsBar) return;

  // Clic en items de backlog para seleccionar
  document.querySelectorAll('.kanban-section--backlog .backlog-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const itemId = item.dataset.id;

      // Si ya está seleccionado, deseleccionar
      if (selectedBacklogItemId === itemId) {
        item.classList.remove('backlog-item--selected');
        selectedBacklogItemId = null;
        actionsBar.hidden = true;
        return;
      }

      // Quitar selección anterior (de cualquier sección)
      clearAllSelections();

      // Seleccionar este
      item.classList.add('backlog-item--selected');
      selectedBacklogItemId = itemId;
      actionsBar.hidden = false;
    });
  });

  // Botón Editar
  document.getElementById('backlog-action-edit')?.addEventListener('click', () => {
    if (!selectedBacklogItemId) return;
    const item = data.objectives.backlog?.find(i => i.id === selectedBacklogItemId);
    if (item) openItemModal(item, 'backlog');
  });

  // Botón Eliminar
  document.getElementById('backlog-action-delete')?.addEventListener('click', () => {
    if (!selectedBacklogItemId) return;
    deleteItem(selectedBacklogItemId, data);
    selectedBacklogItemId = null;
    actionsBar.hidden = true;
  });
};

/**
 * Limpia todas las selecciones de las 3 secciones
 */
const clearAllSelections = () => {
  // Limpiar Horizontes
  document.querySelectorAll('.horizon-item--selected').forEach(i => i.classList.remove('horizon-item--selected'));
  selectedHorizonItemId = null;
  document.getElementById('horizons-actions')?.setAttribute('hidden', '');

  // Limpiar Focus
  document.querySelectorAll('.focus-item--selected').forEach(i => i.classList.remove('focus-item--selected'));
  selectedFocusItemId = null;
  document.getElementById('focus-actions')?.setAttribute('hidden', '');

  // Limpiar Backlog
  document.querySelectorAll('.backlog-item--selected').forEach(i => i.classList.remove('backlog-item--selected'));
  selectedBacklogItemId = null;
  document.getElementById('backlog-actions')?.setAttribute('hidden', '');
};

/**
 * Configura deselección global al hacer clic fuera
 */
const setupGlobalDeselection = () => {
  document.addEventListener('click', (e) => {
    const isInsideItem = e.target.closest('.horizon-item, .focus-item, .backlog-item');
    const isInsideActions = e.target.closest('.section-actions, .horizons-actions');

    if (!isInsideItem && !isInsideActions) {
      clearAllSelections();
    }
  });
};

/**
 * Inicializa eventos del Kanban
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;
  currentData = data;

  setupDragAndDrop(data);
  setupAddButtons(data);
  setupItemActions(data);
  setupModal(data);
  setupProjectFilter(data);
  setupBacklogToggle();
  setupSoftLimitLink();
  setupHorizonSelection(data);
  setupFocusSelection(data);
  setupBacklogSelection(data);
  setupGlobalDeselection();
};

/**
 * Configura el link de "procesarlas" cuando hay 10+ pendientes
 */
const setupSoftLimitLink = () => {
  const processLink = document.querySelector('.backlog-process-link');
  if (!processLink) return;

  processLink.addEventListener('click', (e) => {
    e.preventDefault();

    // Hacer scroll suave a la sección de Horizontes
    const horizonsSection = document.querySelector('.kanban-section--horizons');
    if (horizonsSection) {
      horizonsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
};

/**
 * Configura el toggle de expandir/colapsar el backlog
 */
const setupBacklogToggle = () => {
  const backlogToggle = document.getElementById('backlog-toggle');
  const backlogSection = document.querySelector('.kanban-section--backlog');
  const backlogContent = document.querySelector('.backlog-content');
  const expandBtn = document.querySelector('.backlog-expand-btn');

  backlogToggle?.addEventListener('click', () => {
    isBacklogExpanded = !isBacklogExpanded;

    backlogSection?.classList.toggle('expanded', isBacklogExpanded);
    backlogContent?.classList.toggle('expanded', isBacklogExpanded);

    // Actualizar icono
    if (expandBtn) {
      expandBtn.innerHTML = `
        <span class="material-symbols-outlined">
          ${isBacklogExpanded ? 'expand_less' : 'expand_more'}
        </span>
      `;
    }
  });
};

/**
 * Renderiza una columna del Kanban
 * Para "En Foco" (daily): el límite es dinámico y cuenta solo tareas activas
 */
const renderColumn = (columnKey, items, limit, projects = [], data = null) => {
  // Para la columna daily, usamos límite dinámico y contamos solo activas
  const isDaily = columnKey === 'daily';
  const effectiveLimit = isDaily && data ? getDailyLimit(data) : limit;
  const activeCount = getActiveTasksCount(items);
  const totalCount = items.length;

  const hasLimit = effectiveLimit !== null;
  // Solo las tareas ACTIVAS cuentan para el límite
  const isFull = hasLimit && activeCount >= effectiveLimit;
  const slotsAvailable = hasLimit ? effectiveLimit - activeCount : null;

  // Clases especiales para columnas
  const columnClasses = [
    'kanban-column',
    columnKey === 'backlog' ? 'kanban-column--backlog' : '',
    isDaily ? 'kanban-column--focus' : ''
  ].filter(Boolean).join(' ');

  // Formato del contador - para daily mostramos activas/límite
  const countDisplay = hasLimit
    ? (isDaily ? `${activeCount}/${effectiveLimit} activas` : `${totalCount}/${effectiveLimit}`)
    : `${totalCount}`;
  const countClasses = [
    'kanban-column__count',
    isFull ? 'count--full' : '',
    !hasLimit ? 'count--unlimited' : ''
  ].filter(Boolean).join(' ');

  // Mensajes según el estado
  const getLimitMessage = () => {
    if (isDaily) {
      return 'Completa algo para liberar un slot. ¡La magia está en terminar!';
    }
    return 'Límite alcanzado. Completa o mueve algo antes de añadir.';
  };

  // Hint dinámico para daily
  const getDailyHint = () => {
    if (slotsAvailable === 0) {
      return `<span class="material-symbols-outlined icon-sm">block</span> Sin slots. Completa algo primero.`;
    } else if (slotsAvailable === 1) {
      return `<span class="material-symbols-outlined icon-sm">looks_one</span> 1 slot disponible`;
    } else {
      return `<span class="material-symbols-outlined icon-sm">target</span> ${slotsAvailable} slots disponibles`;
    }
  };

  return `
    <section class="${columnClasses}" data-column="${columnKey}">
      <header class="kanban-column__header">
        <h2 class="kanban-column__title">
          ${columnKey === 'backlog' ? '<span class="material-symbols-outlined icon-sm">inbox</span>' : ''}
          ${isDaily ? '<span class="material-symbols-outlined icon-sm">target</span>' : ''}
          ${COLUMN_NAMES[columnKey]}
        </h2>
        <span class="${countClasses}">${countDisplay}</span>
      </header>

      ${columnKey === 'backlog' ? `
        <p class="kanban-column__hint">
          Captura aquí todas las ideas. Sin filtro, sin límite.
        </p>
      ` : ''}

      ${isDaily ? `
        <p class="kanban-column__hint kanban-column__hint--focus ${isFull ? 'hint--full' : ''}">
          ${getDailyHint()}
        </p>
      ` : ''}

      <ul class="kanban-column__items" data-column="${columnKey}">
        ${items.map(item => renderItem(item, columnKey, projects)).join('')}
      </ul>

      ${!isFull ? `
        <button class="kanban-add-btn" data-column="${columnKey}">
          <span class="material-symbols-outlined icon-sm">add</span>
          ${columnKey === 'backlog' ? 'Capturar idea' : 'Añadir'}
        </button>
      ` : `
        <p class="kanban-limit-msg">
          ${getLimitMessage()}
        </p>
      `}
    </section>
  `;
};

/**
 * Renderiza un item del Kanban
 */
const renderItem = (item, columnKey, projects = []) => {
  const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;

  return `
    <li
      class="kanban-item ${item.completed ? 'kanban-item--completed' : ''}"
      data-id="${item.id}"
      data-project="${item.projectId || ''}"
      draggable="true"
    >
      <div class="kanban-item__content">
        <label class="kanban-item__checkbox">
          <input type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}">
          <span class="kanban-item__text">${escapeHTML(item.text)}</span>
        </label>
        ${item.notes ? `<p class="kanban-item__notes">${escapeHTML(item.notes)}</p>` : ''}
        ${project ? `
          <span class="kanban-item__project" style="--project-color: ${project.color}">
            <span class="project-dot" style="background-color: ${project.color}"></span>
            ${escapeHTML(project.name)}
          </span>
        ` : ''}
      </div>

      <div class="kanban-item__actions">
        <button class="btn btn--icon item-edit" data-id="${item.id}" title="Editar">
          <span class="material-symbols-outlined icon-sm">edit</span>
        </button>
        <button class="btn btn--icon item-delete" data-id="${item.id}" title="Eliminar">
          <span class="material-symbols-outlined icon-sm">close</span>
        </button>
      </div>
    </li>
  `;
};


/**
 * Configura drag and drop
 */
const setupDragAndDrop = (data) => {
  // Items arrastrables
  document.querySelectorAll('.kanban-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
  });

  // Columnas como zonas de drop
  document.querySelectorAll('.kanban-column__items').forEach(column => {
    column.addEventListener('dragover', handleDragOver);
    column.addEventListener('dragenter', handleDragEnter);
    column.addEventListener('dragleave', handleDragLeave);
    column.addEventListener('drop', (e) => handleDrop(e, data));
  });
};

const handleDragStart = (e) => {
  draggedItem = e.target;
  e.target.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
};

const handleDragEnd = (e) => {
  e.target.classList.remove('dragging');
  document.querySelectorAll('.kanban-column__items').forEach(col => {
    col.classList.remove('drag-over');
  });
};

const handleDragOver = (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

const handleDragEnter = (e) => {
  e.currentTarget.classList.add('drag-over');
};

const handleDragLeave = (e) => {
  e.currentTarget.classList.remove('drag-over');
};

const handleDrop = (e, data) => {
  e.preventDefault();
  const targetColumn = e.currentTarget.dataset.column;

  if (!draggedItem || !targetColumn) return;

  const itemId = draggedItem.dataset.id;
  const sourceColumn = findItemColumn(itemId, data.objectives);

  if (!sourceColumn || sourceColumn === targetColumn) return;

  // Asegurar que existe la columna destino
  if (!data.objectives[targetColumn]) {
    data.objectives[targetColumn] = [];
  }

  // Para daily: usar límite dinámico y contar solo tareas activas
  const isDaily = targetColumn === 'daily';
  const limit = isDaily ? getDailyLimit(data) : LIMITS[targetColumn];
  const activeCount = isDaily
    ? getActiveTasksCount(data.objectives[targetColumn])
    : data.objectives[targetColumn].length;

  // Verificar límite (solo tareas activas para daily)
  if (limit !== null && activeCount >= limit) {
    if (isDaily) {
      const slotsMsg = limit === 1 ? '1 tarea activa' : `${limit} tareas activas`;
      showNotification(`Ya tienes ${slotsMsg}. ¡Completa algo para liberar un slot!`, 'warning');
    } else {
      showNotification(`La columna "${COLUMN_NAMES[targetColumn]}" está llena.`, 'warning');
    }
    return;
  }

  // Mover item
  const itemIndex = data.objectives[sourceColumn].findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  const [item] = data.objectives[sourceColumn].splice(itemIndex, 1);
  item.movedAt = new Date().toISOString();
  item.movedFrom = sourceColumn;
  data.objectives[targetColumn].push(item);

  updateDataCallback('objectives', data.objectives);

  // Mensaje especial según destino
  if (isDaily) {
    const remaining = limit - activeCount - 1;
    const remainingMsg = remaining > 0 ? ` (${remaining} slot${remaining > 1 ? 's' : ''} libre${remaining > 1 ? 's' : ''})` : '';
    showNotification(`¡Añadido al foco!${remainingMsg}`, 'success');
  } else if (targetColumn === 'backlog') {
    showNotification('Guardado en Pendientes', 'info');
  } else {
    showNotification(`Movido a ${COLUMN_NAMES[targetColumn]}`, 'success');
  }

  location.reload(); // Temporal
};

/**
 * Encuentra en qué columna está un item
 */
const findItemColumn = (itemId, objectives) => {
  for (const column of Object.keys(objectives)) {
    if (objectives[column].some(item => item.id === itemId)) {
      return column;
    }
  }
  return null;
};

/**
 * Configura botones de añadir
 */
const setupAddButtons = (data) => {
  document.querySelectorAll('.kanban-add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const column = btn.dataset.column;
      openItemModal(null, column);
    });
  });
};

/**
 * Configura acciones de items (editar, eliminar, completar)
 */
const setupItemActions = (data) => {
  // Checkboxes
  document.querySelectorAll('.kanban-item__checkbox input').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const itemId = e.target.dataset.id;
      toggleItemComplete(itemId, e.target.checked, data);
    });
  });

  // Editar
  document.querySelectorAll('.item-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.id;
      const column = findItemColumn(itemId, data.objectives);
      const item = data.objectives[column]?.find(i => i.id === itemId);
      if (item) openItemModal(item, column);
    });
  });

  // Eliminar
  document.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = btn.dataset.id;
      deleteItem(itemId, data);
    });
  });
};

/**
 * Configura el modal
 */
const setupModal = (data) => {
  const modal = document.getElementById('item-modal');
  const form = document.getElementById('item-form');

  document.getElementById('cancel-item')?.addEventListener('click', () => {
    modal.close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveItem(data);
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

};

/**
 * Abre el modal para añadir/editar
 */
const openItemModal = (item = null, column = 'weekly') => {
  const modal = document.getElementById('item-modal');
  const title = document.getElementById('item-modal-title');
  const projectSelect = document.getElementById('item-project');
  const importantCheckbox = document.getElementById('item-important');

  document.getElementById('item-id').value = item?.id || '';
  document.getElementById('item-column').value = column;
  document.getElementById('item-text').value = item?.text || '';
  document.getElementById('item-notes').value = item?.notes || '';

  // Seleccionar proyecto si existe
  if (projectSelect) {
    projectSelect.value = item?.projectId || '';
  }

  // Marcar como importante si lo era
  importantCheckbox.checked = item?.taskType === 'importante';

  const columnName = COLUMN_NAMES[column];
  title.textContent = item ? `Editar (${columnName})` : `Nuevo en ${columnName}`;

  modal.showModal();
};

/**
 * Guarda un item
 * Para daily: usa límite dinámico y cuenta solo tareas activas
 */
const saveItem = (data) => {
  const id = document.getElementById('item-id').value;
  const column = document.getElementById('item-column').value;
  const text = document.getElementById('item-text').value.trim();
  const notes = document.getElementById('item-notes').value.trim();
  const projectSelect = document.getElementById('item-project');
  const projectId = projectSelect ? projectSelect.value || null : null;
  const isImportant = document.getElementById('item-important').checked;
  const taskType = isImportant ? 'importante' : null;

  if (!text) {
    showNotification('La descripción es obligatoria', 'warning');
    return;
  }

  if (id) {
    // Editar existente
    const oldColumn = findItemColumn(id, data.objectives);
    const item = data.objectives[oldColumn]?.find(i => i.id === id);
    if (item) {
      item.text = text;
      item.notes = notes;
      item.projectId = projectId;
      item.taskType = taskType;
      item.updatedAt = new Date().toISOString();
    }
  } else {
    // Nuevo item - verificar límite
    const isDaily = column === 'daily';
    const limit = isDaily ? getDailyLimit(data) : LIMITS[column];
    const count = isDaily
      ? getActiveTasksCount(data.objectives[column])
      : data.objectives[column].length;

    if (limit !== null && count >= limit) {
      if (isDaily) {
        showNotification('¡Completa algo para liberar un slot!', 'warning');
      } else {
        showNotification(`Límite alcanzado en ${COLUMN_NAMES[column]}`, 'warning');
      }
      return;
    }

    data.objectives[column].push({
      id: generateId(),
      text,
      notes,
      projectId,
      taskType,
      completed: false,
      createdAt: new Date().toISOString()
    });
  }

  updateDataCallback('objectives', data.objectives);
  document.getElementById('item-modal').close();
  showNotification('Guardado', 'success');
  location.reload();
};

/**
 * Marca/desmarca un item como completado
 */
const toggleItemComplete = (itemId, completed, data) => {
  const column = findItemColumn(itemId, data.objectives);
  if (!column) return;

  const item = data.objectives[column].find(i => i.id === itemId);
  if (item) {
    item.completed = completed;
    item.completedAt = completed ? new Date().toISOString() : null;
    updateDataCallback('objectives', data.objectives);

    if (completed) {
      showNotification('¡Completado! Buen trabajo.', 'success');
    }
  }
};

/**
 * Elimina un item
 */
const deleteItem = (itemId, data) => {
  if (!confirm('¿Eliminar este elemento?')) return;

  const column = findItemColumn(itemId, data.objectives);
  if (!column) return;

  data.objectives[column] = data.objectives[column].filter(i => i.id !== itemId);
  updateDataCallback('objectives', data.objectives);
  showNotification('Eliminado', 'info');
  location.reload();
};

/**
 * Configura el filtro por proyecto
 */
const setupProjectFilter = (data) => {
  const filterSelect = document.getElementById('project-filter');
  if (!filterSelect) return;

  filterSelect.addEventListener('change', () => {
    const filterValue = filterSelect.value;
    activeFilter = filterValue;

    document.querySelectorAll('.kanban-item').forEach(item => {
      const itemProjectId = item.dataset.project || '';

      let visible = true;

      if (filterValue === 'none') {
        // Mostrar solo sin proyecto
        visible = !itemProjectId;
      } else if (filterValue) {
        // Mostrar solo del proyecto seleccionado
        visible = itemProjectId === filterValue;
      }

      item.style.display = visible ? '' : 'none';
    });
  });
};
