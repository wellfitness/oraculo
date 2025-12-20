/**
 * Oráculo - Brújula de Valores
 * Define los valores fundamentales para priorizar
 * Integrado con la Rueda de la Vida para sugerir valores
 */

import { generateId, showNotification } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';

let updateDataCallback = null;
let currentData = null;
const MAX_VALUES = 5;

/**
 * Renderiza la brújula de valores
 */
export const render = (data) => {
  const values = data.values || [];
  const wheelAreas = data.lifeWheel?.areas || [];
  const evaluations = data.lifeWheel?.evaluations || [];
  const suggestions = getWheelSuggestions(wheelAreas, evaluations, values);

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
        ${values.map(value => renderValueCard(value, wheelAreas)).join('')}

        ${values.length < MAX_VALUES ? `
          <button class="value-card value-card--add" id="add-value-btn">
            <span class="material-symbols-outlined icon-lg">add_circle</span>
            <span class="add-text">Añadir valor</span>
          </button>
        ` : ''}
      </section>

      ${suggestions.length > 0 && values.length < MAX_VALUES ? renderWheelSuggestions(suggestions) : ''}

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
          <blockquote class="quote quote--secondary">
            <p>"${getReflexionDelDia('values')}"</p>
            <cite>— Oliver Burkeman</cite>
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
  currentData = data;

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

  // Configurar botones de sugerencias desde la rueda
  setupSuggestionButtons();
};

/**
 * Renderiza una tarjeta de valor
 */
const renderValueCard = (value, wheelAreas = []) => {
  // Encontrar áreas de la rueda vinculadas a este valor
  const linkedAreas = wheelAreas.filter(area => area.linkedValueId === value.id);

  return `
    <article class="value-card" data-id="${value.id}">
      <div class="value-card__header">
        <span class="value-icon">${value.icon || ''}</span>
        <span class="material-symbols-outlined icon-lg icon-primary value-icon-symbol">star</span>
        <h3 class="value-name">${value.name}</h3>
      </div>

      <p class="value-description">${value.description || ''}</p>

      ${linkedAreas.length > 0 ? `
        <div class="value-linked-areas">
          <span class="linked-label">
            <span class="material-symbols-outlined icon-xs">donut_large</span>
            Áreas vinculadas:
          </span>
          <div class="linked-areas-list">
            ${linkedAreas.map(area => `
              <span class="linked-area-tag">
                <span class="material-symbols-outlined icon-xs">${area.icon}</span>
                ${area.name}
              </span>
            `).join('')}
          </div>
        </div>
      ` : ''}

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
};

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

/**
 * Obtiene sugerencias de valores basadas en la Rueda de la Vida
 * Prioriza áreas con brecha grande (deseado - actual) que no tienen valor vinculado
 */
const getWheelSuggestions = (wheelAreas, evaluations, existingValues) => {
  if (!evaluations || evaluations.length === 0) return [];

  // Obtener la última evaluación
  const lastEval = [...evaluations].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  )[0];

  if (!lastEval?.scores) return [];

  // Calcular brecha por área y filtrar las que no tienen valor vinculado
  const suggestions = wheelAreas
    .map(area => {
      const score = lastEval.scores[area.id];
      if (!score) return null;

      const gap = (score.desired || 10) - (score.current || 5);
      const hasLinkedValue = area.linkedValueId && existingValues.some(v => v.id === area.linkedValueId);

      return {
        area,
        current: score.current || 5,
        desired: score.desired || 10,
        gap,
        hasLinkedValue,
        reflection: score.reflection || ''
      };
    })
    .filter(s => s !== null && s.gap >= 2 && !s.hasLinkedValue) // Brecha >= 2 y sin valor vinculado
    .sort((a, b) => b.gap - a.gap) // Ordenar por mayor brecha
    .slice(0, 3); // Máximo 3 sugerencias

  return suggestions;
};

/**
 * Renderiza la sección de sugerencias desde la Rueda de la Vida
 */
const renderWheelSuggestions = (suggestions) => {
  if (suggestions.length === 0) return '';

  return `
    <section class="wheel-suggestions">
      <header class="suggestions-header">
        <span class="material-symbols-outlined">lightbulb</span>
        <h3>Sugerencias desde tu Rueda de la Vida</h3>
      </header>
      <p class="suggestions-intro">
        Estas áreas tienen una brecha significativa entre tu situación actual y la deseada.
        Considera si reflejan valores importantes para ti:
      </p>
      <div class="suggestions-grid">
        ${suggestions.map(s => `
          <div class="suggestion-card" data-area-id="${s.area.id}">
            <div class="suggestion-header">
              <span class="material-symbols-outlined suggestion-icon">${s.area.icon}</span>
              <div>
                <h4>${s.area.name}</h4>
                <span class="suggestion-gap">
                  Actual: ${s.current}/10 → Deseado: ${s.desired}/10
                </span>
              </div>
            </div>
            ${s.reflection ? `<p class="suggestion-reflection">"${s.reflection}"</p>` : ''}
            <button class="btn btn--secondary btn--small create-value-from-area"
                    data-area-name="${s.area.name}"
                    data-area-icon="${s.area.icon}">
              <span class="material-symbols-outlined icon-sm">add</span>
              Crear valor desde esta área
            </button>
          </div>
        `).join('')}
      </div>
      <p class="suggestions-footer">
        <a href="#life-wheel" data-view="life-wheel">
          <span class="material-symbols-outlined icon-sm">donut_large</span>
          Ver Rueda de la Vida completa
        </a>
      </p>
    </section>
  `;
};

/**
 * Configura los botones de crear valor desde sugerencia
 */
const setupSuggestionButtons = () => {
  document.querySelectorAll('.create-value-from-area').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const areaName = btn.dataset.areaName;
      const areaIcon = btn.dataset.areaIcon;

      // Pre-llenar el modal con datos del área
      const modal = document.getElementById('value-modal');
      document.getElementById('value-id').value = '';
      document.getElementById('value-name').value = areaName;
      document.getElementById('value-description').value = '';
      document.getElementById('value-icon').value = getEmojiForArea(areaIcon);
      document.getElementById('modal-title').textContent = 'Nuevo Valor';

      modal.showModal();
    });
  });
};

/**
 * Mapea iconos Material a emojis sugeridos
 */
const getEmojiForArea = (icon) => {
  const emojiMap = {
    'fitness_center': '💪',
    'psychology': '🧠',
    'school': '📚',
    'favorite': '❤️',
    'groups': '👥',
    'work': '💼',
    'savings': '💰',
    'spa': '🌿'
  };
  return emojiMap[icon] || '⭐';
};
