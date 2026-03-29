/**
 * Oráculo - Evening Check-in
 * Modal para reflexión de fin de día
 *
 * Tres preguntas simples:
 * 1. ¿Qué salió bien hoy?
 * 2. ¿Qué aprendí?
 * 3. ¿Hay algo que necesito soltar?
 */

import { generateId, showNotification } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';

/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

/**
 * Verifica si es hora de mostrar el check-in vespertino (18:00+)
 */
export const isEveningTime = () => {
  const hour = new Date().getHours();
  return hour >= 18;
};

/**
 * Verifica si ya se hizo el check-in vespertino hoy
 */
export const hasEveningCheckIn = (data) => {
  const today = getLocalDateString();
  const todayEntries = (data.journal || []).filter(entry => {
    const entryDate = entry.createdAt?.split('T')[0];
    return entry.type === 'evening-check-in' && entryDate === today;
  });
  return todayEntries.length > 0;
};

/**
 * Renderiza el modal de check-in vespertino
 */
export const renderEveningCheckInModal = () => {
  const quote = getReflexionDelDia('journal');

  return `
    <dialog id="evening-check-in-modal" class="modal modal--evening"
            aria-labelledby="evening-modal-title"
            aria-describedby="evening-modal-desc">
      <div class="modal-content evening-content">

        <header class="evening-header">
          <button type="button" class="btn btn--icon evening-close" id="evening-close" aria-label="Cerrar">
            <span class="material-symbols-outlined">close</span>
          </button>
          <span class="material-symbols-outlined evening-icon" aria-hidden="true">bedtime</span>
          <h2 id="evening-modal-title" class="evening-title">Cierre del día</h2>
          <p id="evening-modal-desc" class="evening-subtitle">Unos minutos para reflexionar antes de descansar</p>
        </header>

        <form id="evening-form" class="evening-form">
          <div class="form-group">
            <label for="evening-went-well" class="form-label">
              <span class="material-symbols-outlined icon-sm">thumb_up</span>
              ¿Qué salió bien hoy?
            </label>
            <textarea
              id="evening-went-well"
              class="form-textarea"
              placeholder="Algo que funcionó, un pequeño logro, un momento agradable..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="evening-learned" class="form-label">
              <span class="material-symbols-outlined icon-sm">lightbulb</span>
              ¿Qué aprendí?
            </label>
            <textarea
              id="evening-learned"
              class="form-textarea"
              placeholder="Algo nuevo sobre ti, sobre otros, sobre la vida..."
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="evening-let-go" class="form-label">
              <span class="material-symbols-outlined icon-sm">delete_sweep</span>
              ¿Hay algo que necesito soltar?
            </label>
            <textarea
              id="evening-let-go"
              class="form-textarea"
              placeholder="Preocupaciones, frustraciones, cosas que no puedes controlar..."
              rows="3"
            ></textarea>
          </div>

          <!-- Sección de bienestar físico -->
          <fieldset class="wellbeing-section">
            <legend class="wellbeing-legend">
              <span class="material-symbols-outlined icon-sm">monitor_heart</span>
              ¿Cómo cuidaste tu cuerpo hoy?
            </legend>

            <div class="wellbeing-area">
              <div class="wellbeing-area__header">
                <span class="material-symbols-outlined icon-sm">restaurant</span>
                <span class="wellbeing-area__label">Alimentación</span>
              </div>
              <div class="wellbeing-rating" role="radiogroup" aria-label="Valoración de alimentación">
                <input type="radio" name="rating-food" id="rating-food-good" value="bien" class="wellbeing-radio">
                <label for="rating-food-good" class="wellbeing-btn wellbeing-btn--good" title="Bien">
                  <span class="material-symbols-outlined">sentiment_satisfied</span>
                </label>
                <input type="radio" name="rating-food" id="rating-food-regular" value="regular" class="wellbeing-radio">
                <label for="rating-food-regular" class="wellbeing-btn wellbeing-btn--regular" title="Regular">
                  <span class="material-symbols-outlined">sentiment_neutral</span>
                </label>
                <input type="radio" name="rating-food" id="rating-food-bad" value="mal" class="wellbeing-radio">
                <label for="rating-food-bad" class="wellbeing-btn wellbeing-btn--bad" title="Mal">
                  <span class="material-symbols-outlined">sentiment_dissatisfied</span>
                </label>
              </div>
              <input type="text" name="note-food" class="wellbeing-note" placeholder="¿Qué comiste? ¿Cómo te sentó?">
            </div>

            <div class="wellbeing-area">
              <div class="wellbeing-area__header">
                <span class="material-symbols-outlined icon-sm">fitness_center</span>
                <span class="wellbeing-area__label">Movimiento</span>
              </div>
              <div class="wellbeing-rating" role="radiogroup" aria-label="Valoración de movimiento">
                <input type="radio" name="rating-move" id="rating-move-good" value="bien" class="wellbeing-radio">
                <label for="rating-move-good" class="wellbeing-btn wellbeing-btn--good" title="Bien">
                  <span class="material-symbols-outlined">sentiment_satisfied</span>
                </label>
                <input type="radio" name="rating-move" id="rating-move-regular" value="regular" class="wellbeing-radio">
                <label for="rating-move-regular" class="wellbeing-btn wellbeing-btn--regular" title="Regular">
                  <span class="material-symbols-outlined">sentiment_neutral</span>
                </label>
                <input type="radio" name="rating-move" id="rating-move-bad" value="mal" class="wellbeing-radio">
                <label for="rating-move-bad" class="wellbeing-btn wellbeing-btn--bad" title="Mal">
                  <span class="material-symbols-outlined">sentiment_dissatisfied</span>
                </label>
              </div>
              <input type="text" name="note-move" class="wellbeing-note" placeholder="¿Te moviste hoy? ¿Qué hiciste?">
            </div>

            <div class="wellbeing-area">
              <div class="wellbeing-area__header">
                <span class="material-symbols-outlined icon-sm">bedtime</span>
                <span class="wellbeing-area__label">Descanso</span>
              </div>
              <div class="wellbeing-rating" role="radiogroup" aria-label="Valoración de descanso">
                <input type="radio" name="rating-sleep" id="rating-sleep-good" value="bien" class="wellbeing-radio">
                <label for="rating-sleep-good" class="wellbeing-btn wellbeing-btn--good" title="Bien">
                  <span class="material-symbols-outlined">sentiment_satisfied</span>
                </label>
                <input type="radio" name="rating-sleep" id="rating-sleep-regular" value="regular" class="wellbeing-radio">
                <label for="rating-sleep-regular" class="wellbeing-btn wellbeing-btn--regular" title="Regular">
                  <span class="material-symbols-outlined">sentiment_neutral</span>
                </label>
                <input type="radio" name="rating-sleep" id="rating-sleep-bad" value="mal" class="wellbeing-radio">
                <label for="rating-sleep-bad" class="wellbeing-btn wellbeing-btn--bad" title="Mal">
                  <span class="material-symbols-outlined">sentiment_dissatisfied</span>
                </label>
              </div>
              <input type="text" name="note-sleep" class="wellbeing-note" placeholder="¿Cómo dormiste anoche? ¿Descansaste?">
            </div>
          </fieldset>

          <blockquote class="quote quote--evening">
            <p>"${quote}"</p>
            <cite>— Oliver Burkeman</cite>
          </blockquote>

          <div class="evening-actions">
            <button type="button" class="btn btn--tertiary" id="evening-cancel">
              Ahora no
            </button>
            <button type="submit" class="btn btn--primary">
              <span class="material-symbols-outlined icon-sm">check</span>
              Guardar reflexión
            </button>
          </div>
        </form>

      </div>
    </dialog>
  `;
};

/**
 * Inicializa el modal de evening check-in
 */
export const initEveningCheckInModal = (data, updateData) => {
  const modal = document.getElementById('evening-check-in-modal');
  if (!modal) return;

  const form = document.getElementById('evening-form');
  const closeBtn = document.getElementById('evening-close');
  const cancelBtn = document.getElementById('evening-cancel');

  // Cerrar modal
  const closeModal = () => {
    modal.close();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Cerrar con click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Cerrar con Escape
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Guardar reflexión
  form?.addEventListener('submit', (e) => {
    e.preventDefault();

    const wentWell = document.getElementById('evening-went-well')?.value.trim();
    const learned = document.getElementById('evening-learned')?.value.trim();
    const letGo = document.getElementById('evening-let-go')?.value.trim();

    // Leer ratings de bienestar
    const ratingFood = form.elements['rating-food']?.value || '';
    const ratingMove = form.elements['rating-move']?.value || '';
    const ratingSleep = form.elements['rating-sleep']?.value || '';
    const noteFood = form.elements['note-food']?.value.trim() || '';
    const noteMove = form.elements['note-move']?.value.trim() || '';
    const noteSleep = form.elements['note-sleep']?.value.trim() || '';

    const hasReflection = wentWell || learned || letGo;
    const hasWellbeing = ratingFood || ratingMove || ratingSleep;

    // Validar que al menos uno tenga contenido
    if (!hasReflection && !hasWellbeing) {
      showNotification('Escribe al menos una reflexión o valora tu bienestar', 'warning');
      return;
    }

    // Formatear contenido (texto plano, sin Markdown)
    let content = '';
    if (wentWell) {
      content += `¿Qué salió bien hoy?\n${wentWell}\n\n`;
    }
    if (learned) {
      content += `¿Qué aprendí?\n${learned}\n\n`;
    }
    if (letGo) {
      content += `¿Hay algo que necesito soltar?\n${letGo}`;
    }

    // Añadir bienestar si hay datos
    if (hasWellbeing) {
      if (hasReflection) content += '\n\n---\n';
      content += '¿Cómo cuidaste tu cuerpo hoy?\n';
      if (ratingFood) {
        content += `Alimentación: ${ratingFood}`;
        if (noteFood) content += ` — ${noteFood}`;
        content += '\n';
      }
      if (ratingMove) {
        content += `Movimiento: ${ratingMove}`;
        if (noteMove) content += ` — ${noteMove}`;
        content += '\n';
      }
      if (ratingSleep) {
        content += `Descanso: ${ratingSleep}`;
        if (noteSleep) content += ` — ${noteSleep}`;
        content += '\n';
      }
    }

    // Crear entrada de diario
    const entry = {
      id: generateId(),
      type: 'evening-check-in',
      content: content.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Guardar
    if (!data.journal) data.journal = [];
    data.journal.push(entry);
    updateData('journal', data.journal);

    // Limpiar formulario
    form.reset();

    // Cerrar y notificar
    closeModal();
    showNotification('Reflexión guardada. Descansa bien.', 'success');
  });
};

/**
 * Abre el modal de evening check-in
 */
export const openEveningCheckIn = () => {
  const modal = document.getElementById('evening-check-in-modal');
  if (modal) {
    modal.showModal();
    // Focus en primer campo
    setTimeout(() => {
      document.getElementById('evening-went-well')?.focus();
    }, 100);
  }
};

export default {
  isEveningTime,
  hasEveningCheckIn,
  renderEveningCheckInModal,
  initEveningCheckInModal,
  openEveningCheckIn
};
