/**
 * Oráculo - Modal de Logros Espontáneos
 * Registra logros que no estaban planificados (Done List de Burkeman)
 */

import { generateId, showNotification } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';

let updateDataCallback = null;
let currentData = null;

const MOODS = [
  { id: 'proud', icon: 'sentiment_very_satisfied', name: 'Orgullosa' },
  { id: 'relieved', icon: 'sentiment_satisfied', name: 'Aliviada' },
  { id: 'surprised', icon: 'mood', name: 'Sorprendida' },
  { id: 'grateful', icon: 'favorite', name: 'Agradecida' },
  { id: 'energized', icon: 'bolt', name: 'Energizada' }
];

/**
 * Renderiza el modal de logros espontáneos
 */
export const renderSpontaneousModal = () => {
  return `
    <dialog id="spontaneous-modal" class="modal modal--spontaneous">
      <div class="modal-content spontaneous-content">
        <header class="modal-header">
          <h2 class="modal-title">
            <span class="material-symbols-outlined icon-warning">celebration</span>
            Logro Espontáneo
          </h2>
          <button type="button" class="modal-close" id="spontaneous-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form id="spontaneous-form" class="spontaneous-form">
          <p class="spontaneous-intro">
            Celebra algo que lograste sin haberlo planificado.
          </p>

          <div class="form-group">
            <label for="spontaneous-text" class="form-label">
              ¿Qué has conseguido?
            </label>
            <textarea
              id="spontaneous-text"
              class="form-textarea"
              rows="3"
              placeholder="Hoy logré..."
              maxlength="200"
              required
            ></textarea>
            <span class="form-hint">
              Puede ser algo pequeño: una buena conversación, ayudar a alguien, resolver un problema inesperado...
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">¿Cómo te sientes?</label>
            <div class="mood-selector" id="mood-selector">
              ${MOODS.map((mood, index) => `
                <button
                  type="button"
                  class="mood-btn ${index === 0 ? 'active' : ''}"
                  data-mood="${mood.id}"
                  title="${mood.name}"
                >
                  <span class="material-symbols-outlined">${mood.icon}</span>
                  <span class="mood-label">${mood.name}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <blockquote class="quote quote--sm">
            <p>"${getReflexionDelDia('achievements')}"</p>
          </blockquote>

          <div class="modal-actions">
            <button type="button" class="btn btn--secondary" id="spontaneous-cancel">
              Cancelar
            </button>
            <button type="submit" class="btn btn--primary">
              <span class="material-symbols-outlined">add</span>
              Guardar logro
            </button>
          </div>
        </form>
      </div>
    </dialog>
  `;
};

/**
 * Inicializa el modal de logros espontáneos
 */
export const initSpontaneousModal = (data, updateData) => {
  currentData = data;
  updateDataCallback = updateData;

  const modal = document.getElementById('spontaneous-modal');
  const form = document.getElementById('spontaneous-form');
  const closeBtn = document.getElementById('spontaneous-close');
  const cancelBtn = document.getElementById('spontaneous-cancel');
  const moodSelector = document.getElementById('mood-selector');

  if (!modal) return;

  // Cerrar modal
  closeBtn?.addEventListener('click', closeSpontaneousModal);
  cancelBtn?.addEventListener('click', closeSpontaneousModal);

  // Click fuera del modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeSpontaneousModal();
    }
  });

  // Escape para cerrar
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSpontaneousModal();
    }
  });

  // Selector de mood
  moodSelector?.addEventListener('click', (e) => {
    const btn = e.target.closest('.mood-btn');
    if (btn) {
      moodSelector.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  });

  // Submit del formulario
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveSpontaneousAchievement();
  });
};

/**
 * Abre el modal de logros espontáneos
 */
export const openSpontaneousModal = () => {
  const modal = document.getElementById('spontaneous-modal');
  const textarea = document.getElementById('spontaneous-text');
  const moodSelector = document.getElementById('mood-selector');

  if (!modal) return;

  // Reset form
  if (textarea) textarea.value = '';
  if (moodSelector) {
    moodSelector.querySelectorAll('.mood-btn').forEach((btn, index) => {
      btn.classList.toggle('active', index === 0);
    });
  }

  // Abrir
  modal.showModal();
  textarea?.focus();
};

/**
 * Cierra el modal
 */
export const closeSpontaneousModal = () => {
  const modal = document.getElementById('spontaneous-modal');
  modal?.close();
};

/**
 * Guarda un logro espontáneo
 */
const saveSpontaneousAchievement = () => {
  const textarea = document.getElementById('spontaneous-text');
  const moodSelector = document.getElementById('mood-selector');
  const activeBtn = moodSelector?.querySelector('.mood-btn.active');

  const text = textarea?.value.trim();
  if (!text) return;

  const mood = activeBtn?.dataset.mood || 'proud';

  // Crear nuevo logro
  const achievement = {
    id: generateId(),
    text,
    mood,
    createdAt: new Date().toISOString()
  };

  // Añadir a los datos
  if (!currentData.spontaneousAchievements) {
    currentData.spontaneousAchievements = [];
  }
  currentData.spontaneousAchievements.unshift(achievement);

  // Guardar
  updateDataCallback('spontaneousAchievements', currentData.spontaneousAchievements);

  // Cerrar y notificar
  closeSpontaneousModal();
  showNotification('¡Logro registrado! Cada pequeño paso cuenta.', 'success');
};

/**
 * Obtiene los logros espontáneos del período
 */
export const getSpontaneousAchievements = (data, period = 'week') => {
  const achievements = data.spontaneousAchievements || [];
  const now = new Date();
  let startDate;

  switch (period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case 'quarter':
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 3);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
  }

  return achievements.filter(a => new Date(a.createdAt) >= startDate);
};

/**
 * Elimina un logro espontáneo
 */
export const deleteSpontaneousAchievement = (achievementId, data, updateData) => {
  if (!confirm('¿Eliminar este logro?')) return;

  const achievements = data.spontaneousAchievements || [];
  const filtered = achievements.filter(a => a.id !== achievementId);

  updateData('spontaneousAchievements', filtered);
  showNotification('Logro eliminado', 'info');
};

/**
 * Obtiene el icono del mood
 */
export const getMoodIcon = (moodId) => {
  const mood = MOODS.find(m => m.id === moodId);
  return mood?.icon || 'mood';
};

/**
 * Obtiene el nombre del mood
 */
export const getMoodName = (moodId) => {
  const mood = MOODS.find(m => m.id === moodId);
  return mood?.name || 'Neutral';
};
