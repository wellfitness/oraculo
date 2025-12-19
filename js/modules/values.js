/**
 * Oráculo - Brújula de Valores
 * Define los valores fundamentales para priorizar
 */

import { generateId, showNotification } from '../app.js';

let updateDataCallback = null;
const MAX_VALUES = 5;

/**
 * Renderiza la brújula de valores
 */
export const render = (data) => {
  const values = data.values || [];

  return `
    <div class="values-page">
      <header class="page-header">
        <h1 class="page-title">Brújula de Valores</h1>
        <p class="page-description">
          Tus valores son tu brújula. Te ayudan a decidir qué merece tu tiempo
          y energía, y qué puedes soltar sin culpa.
        </p>
      </header>

      <section class="values-grid">
        ${values.map(value => renderValueCard(value)).join('')}

        ${values.length < MAX_VALUES ? `
          <button class="value-card value-card--add" id="add-value-btn">
            <span class="material-symbols-outlined icon-lg">add_circle</span>
            <span class="add-text">Añadir valor</span>
          </button>
        ` : ''}
      </section>

      ${values.length === 0 ? `
        <div class="empty-state empty-state--large">
          <h3>Define tus valores fundamentales</h3>
          <p>
            Piensa en las 3-5 cosas más importantes para ti.
            No lo que "deberías" valorar, sino lo que realmente te importa.
          </p>
          <ul class="value-examples">
            <li><strong>Salud</strong> — Cuidar mi cuerpo y mi mente</li>
            <li><strong>Familia</strong> — Tiempo de calidad con quienes amo</li>
            <li><strong>Crecimiento</strong> — Aprender y mejorar constantemente</li>
            <li><strong>Libertad</strong> — Poder elegir cómo uso mi tiempo</li>
            <li><strong>Contribución</strong> — Ayudar a otros y dejar huella</li>
          </ul>
        </div>
      ` : ''}

      ${values.length > 0 ? `
        <section class="values-reflection">
          <h2>Reflexión</h2>
          <p>Cuando tengas que decidir a qué dedicar tu tiempo, pregúntate:</p>
          <blockquote class="reflection-prompt">
            "¿Esto me acerca a vivir según mis valores de
            <strong>${values.map(v => v.name).join(', ')}</strong>?"
          </blockquote>
        </section>
      ` : ''}

      <!-- Modal para añadir/editar valor -->
      <dialog id="value-modal" class="modal">
        <form method="dialog" class="modal-content" id="value-form">
          <h2 class="modal-title" id="modal-title">Nuevo Valor</h2>

          <div class="form-group">
            <label for="value-name">Nombre del valor</label>
            <input
              type="text"
              id="value-name"
              class="input"
              placeholder="Ej: Salud"
              maxlength="30"
              required
            >
          </div>

          <div class="form-group">
            <label for="value-description">¿Qué significa para ti?</label>
            <textarea
              id="value-description"
              class="input textarea"
              placeholder="Describe con tus palabras qué significa este valor en tu vida..."
              rows="4"
              maxlength="300"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="value-icon">Ícono (emoji)</label>
            <input
              type="text"
              id="value-icon"
              class="input input--small"
              placeholder="💪"
              maxlength="2"
            >
          </div>

          <input type="hidden" id="value-id">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-value">
              Cancelar
            </button>
            <button type="submit" class="btn btn--primary">
              Guardar
            </button>
          </div>
        </form>
      </dialog>
    </div>
  `;
};

/**
 * Inicializa los eventos de la página
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;

  const modal = document.getElementById('value-modal');
  const form = document.getElementById('value-form');

  // Botón añadir valor
  const addBtn = document.getElementById('add-value-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      openModal();
    });
  }

  // Botones de editar
  document.querySelectorAll('.value-edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const valueId = e.target.closest('[data-id]').dataset.id;
      const value = data.values.find(v => v.id === valueId);
      if (value) openModal(value);
    });
  });

  // Botones de eliminar
  document.querySelectorAll('.value-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const valueId = e.target.closest('[data-id]').dataset.id;
      handleDeleteValue(valueId, data);
    });
  });

  // Cancelar modal
  document.getElementById('cancel-value')?.addEventListener('click', () => {
    modal.close();
  });

  // Guardar valor
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSaveValue(data);
  });

  // Cerrar modal con click fuera
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
};

/**
 * Renderiza una tarjeta de valor
 */
const renderValueCard = (value) => `
  <article class="value-card" data-id="${value.id}">
    <div class="value-card__header">
      <span class="value-icon">${value.icon || ''}</span>
      <span class="material-symbols-outlined icon-lg icon-primary value-icon-symbol">star</span>
      <h3 class="value-name">${value.name}</h3>
    </div>

    <p class="value-description">${value.description || ''}</p>

    <div class="value-card__actions">
      <button class="btn btn--icon value-edit" title="Editar">
        <span class="material-symbols-outlined">edit</span>
      </button>
      <button class="btn btn--icon value-delete" title="Eliminar">
        <span class="material-symbols-outlined">delete</span>
      </button>
    </div>
  </article>
`;

/**
 * Abre el modal para añadir/editar valor
 */
const openModal = (value = null) => {
  const modal = document.getElementById('value-modal');
  const title = document.getElementById('modal-title');

  document.getElementById('value-id').value = value?.id || '';
  document.getElementById('value-name').value = value?.name || '';
  document.getElementById('value-description').value = value?.description || '';
  document.getElementById('value-icon').value = value?.icon || '';

  title.textContent = value ? 'Editar Valor' : 'Nuevo Valor';
  modal.showModal();
};

/**
 * Guarda un valor (nuevo o editado)
 */
const handleSaveValue = (data) => {
  const id = document.getElementById('value-id').value;
  const name = document.getElementById('value-name').value.trim();
  const description = document.getElementById('value-description').value.trim();
  const icon = document.getElementById('value-icon').value.trim();

  if (!name) {
    showNotification('El nombre del valor es obligatorio', 'warning');
    return;
  }

  if (id) {
    // Editar existente
    const index = data.values.findIndex(v => v.id === id);
    if (index !== -1) {
      data.values[index] = { ...data.values[index], name, description, icon };
    }
  } else {
    // Nuevo valor
    if (data.values.length >= MAX_VALUES) {
      showNotification(`Máximo ${MAX_VALUES} valores. Menos es más.`, 'warning');
      return;
    }

    data.values.push({
      id: generateId(),
      name,
      description,
      icon: icon || '⭐',
      createdAt: new Date().toISOString()
    });
  }

  updateDataCallback('values', data.values);
  document.getElementById('value-modal').close();
  showNotification('Valor guardado', 'success');
  location.reload(); // Temporal
};

/**
 * Elimina un valor
 */
const handleDeleteValue = (valueId, data) => {
  if (!confirm('¿Eliminar este valor?')) return;

  data.values = data.values.filter(v => v.id !== valueId);
  updateDataCallback('values', data.values);
  showNotification('Valor eliminado', 'info');
  location.reload(); // Temporal
};
