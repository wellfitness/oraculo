/**
 * Oráculo - Kanban por Horizontes
 * Gestión de objetivos: Trimestre → Mes → Semana → Hoy
 */

import { generateId, showNotification } from '../app.js';

let updateDataCallback = null;
let draggedItem = null;
let currentData = null;
let activeFilter = null; // null = todos, '' = sin proyecto, 'id' = proyecto específico

// Límites por columna
const LIMITS = {
  quarterly: 3,
  monthly: 6,
  weekly: 10,
  daily: 3
};

// Nombres para mostrar
const COLUMN_NAMES = {
  quarterly: 'Trimestre',
  monthly: 'Mes',
  weekly: 'Semana',
  daily: 'Hoy'
};

/**
 * Renderiza el tablero Kanban
 */
export const render = (data) => {
  const objectives = data.objectives || {
    quarterly: [],
    monthly: [],
    weekly: [],
    daily: []
  };

  const projects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

  return `
    <div class="kanban-page">
      <header class="page-header">
        <div class="page-header__top">
          <div>
            <h1 class="page-title">Horizontes</h1>
            <p class="page-description">
              Fluye de lo grande a lo pequeño. Los objetivos trimestrales se convierten
              en metas mensuales, que se traducen en tareas semanales, que definen tu foco diario.
            </p>
          </div>

          ${projects.length > 0 ? `
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
          ` : ''}
        </div>
      </header>

      <div class="kanban-board">
        ${Object.keys(COLUMN_NAMES).map(column =>
          renderColumn(column, objectives[column], LIMITS[column], data.projects || [])
        ).join('')}
      </div>

      <div class="kanban-tips">
        <p><strong>Tip:</strong> Arrastra elementos entre columnas para descomponer objetivos en tareas concretas.</p>
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
};

/**
 * Renderiza una columna del Kanban
 */
const renderColumn = (columnKey, items, limit, projects = []) => {
  const count = items.length;
  const isFull = count >= limit;

  return `
    <section class="kanban-column" data-column="${columnKey}">
      <header class="kanban-column__header">
        <h2 class="kanban-column__title">${COLUMN_NAMES[columnKey]}</h2>
        <span class="kanban-column__count ${isFull ? 'count--full' : ''}">${count}/${limit}</span>
      </header>

      <ul class="kanban-column__items" data-column="${columnKey}">
        ${items.map(item => renderItem(item, columnKey, projects)).join('')}
      </ul>

      ${!isFull ? `
        <button class="kanban-add-btn" data-column="${columnKey}">
          <span class="material-symbols-outlined icon-sm">add</span>
          Añadir
        </button>
      ` : `
        <p class="kanban-limit-msg">
          ${columnKey === 'daily'
            ? 'Máximo 3 prioridades. Completa alguna antes de añadir más.'
            : 'Límite alcanzado. Completa o mueve algo antes de añadir.'}
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
          <span class="kanban-item__text">${item.text}</span>
        </label>
        ${item.notes ? `<p class="kanban-item__notes">${item.notes}</p>` : ''}
        ${project ? `
          <span class="kanban-item__project" style="--project-color: ${project.color}">
            <span class="project-dot" style="background-color: ${project.color}"></span>
            ${project.name}
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

  // Verificar límite de la columna destino
  if (data.objectives[targetColumn].length >= LIMITS[targetColumn]) {
    showNotification(`La columna "${COLUMN_NAMES[targetColumn]}" está llena.`, 'warning');
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
  showNotification(`Movido a ${COLUMN_NAMES[targetColumn]}`, 'success');
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
      const itemId = e.target.dataset.id;
      const column = findItemColumn(itemId, data.objectives);
      const item = data.objectives[column]?.find(i => i.id === itemId);
      if (item) openItemModal(item, column);
    });
  });

  // Eliminar
  document.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemId = e.target.dataset.id;
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

  document.getElementById('item-id').value = item?.id || '';
  document.getElementById('item-column').value = column;
  document.getElementById('item-text').value = item?.text || '';
  document.getElementById('item-notes').value = item?.notes || '';

  // Seleccionar proyecto si existe
  if (projectSelect) {
    projectSelect.value = item?.projectId || '';
  }

  const columnName = COLUMN_NAMES[column];
  title.textContent = item ? `Editar (${columnName})` : `Nuevo en ${columnName}`;

  modal.showModal();
};

/**
 * Guarda un item
 */
const saveItem = (data) => {
  const id = document.getElementById('item-id').value;
  const column = document.getElementById('item-column').value;
  const text = document.getElementById('item-text').value.trim();
  const notes = document.getElementById('item-notes').value.trim();
  const projectSelect = document.getElementById('item-project');
  const projectId = projectSelect ? projectSelect.value || null : null;

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
      item.updatedAt = new Date().toISOString();
    }
  } else {
    // Nuevo item
    if (data.objectives[column].length >= LIMITS[column]) {
      showNotification(`Límite alcanzado en ${COLUMN_NAMES[column]}`, 'warning');
      return;
    }

    data.objectives[column].push({
      id: generateId(),
      text,
      notes,
      projectId,
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
