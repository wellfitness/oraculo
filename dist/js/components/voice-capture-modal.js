/**
 * Oráculo - Modal de Captura por Voz
 * Modal para captura rápida de ideas cuando no hay campo de texto activo
 *
 * Flujo:
 * 1. Usuario abre modal (sin campo activo)
 * 2. Toca botón de micrófono
 * 3. Habla → texto aparece en tiempo real
 * 4. Edita si es necesario
 * 5. Guarda → va a Pendientes (backlog)
 */

import { generateId, showNotification } from '../app.js';
import { getSpeechHandler, isSpeechSupported } from '../utils/speech-handler.js';

let updateDataCallback = null;
let currentData = null;

/**
 * Renderiza el HTML del modal
 */
export const renderVoiceCaptureModal = () => {
  const supported = isSpeechSupported();

  return `
    <dialog id="voice-capture-modal" class="modal voice-capture-modal">
      <div class="modal-content voice-capture-content">
        <header class="voice-capture-header">
          <h2 class="modal-title">
            <span class="material-symbols-outlined">mic</span>
            Captura rápida
          </h2>
          <button type="button" class="btn btn--icon voice-capture-close" aria-label="Cerrar">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="voice-capture-body">
          ${supported ? `
            <!-- Estado: Listo para dictar -->
            <div class="voice-capture-state voice-capture-state--idle" id="voice-state-idle">
              <button type="button" class="voice-capture-mic-btn" id="voice-capture-start">
                <span class="material-symbols-outlined">mic</span>
              </button>
              <p class="voice-capture-hint">Toca para hablar</p>
            </div>

            <!-- Estado: Escuchando -->
            <div class="voice-capture-state voice-capture-state--listening hidden" id="voice-state-listening">
              <div class="voice-capture-mic-btn voice-capture-mic-btn--listening">
                <span class="material-symbols-outlined">mic</span>
                <div class="voice-pulse"></div>
              </div>
              <p class="voice-capture-hint">Escuchando...</p>
              <p class="voice-capture-interim" id="voice-interim"></p>
            </div>
          ` : `
            <!-- Fallback: Sin soporte -->
            <div class="voice-capture-state voice-capture-state--fallback">
              <div class="voice-capture-mic-btn voice-capture-mic-btn--disabled">
                <span class="material-symbols-outlined">mic_off</span>
              </div>
              <p class="voice-capture-hint voice-capture-hint--error">
                Dictado no disponible en este navegador
              </p>
            </div>
          `}

          <!-- Área de texto (siempre visible para editar/escribir) -->
          <div class="voice-capture-text-area">
            <label for="voice-capture-text" class="voice-capture-label">
              ${supported ? 'Texto capturado (editable)' : 'Escribe tu idea'}
            </label>
            <textarea
              id="voice-capture-text"
              class="input textarea voice-capture-textarea"
              placeholder="El texto aparecerá aquí..."
              rows="4"
            ></textarea>
          </div>
        </div>

        <footer class="voice-capture-footer">
          <button type="button" class="btn btn--tertiary" id="voice-capture-cancel">
            Cancelar
          </button>
          <button type="button" class="btn btn--primary" id="voice-capture-save">
            <span class="material-symbols-outlined icon-sm">inbox</span>
            Guardar en Pendientes
          </button>
        </footer>
      </div>
    </dialog>
  `;
};

/**
 * Inicializa los eventos del modal
 */
export const initVoiceCaptureModal = (data, updateData) => {
  updateDataCallback = updateData;
  currentData = data;

  const modal = document.getElementById('voice-capture-modal');
  if (!modal) return;

  // Cerrar modal
  const closeBtn = modal.querySelector('.voice-capture-close');
  const cancelBtn = document.getElementById('voice-capture-cancel');

  closeBtn?.addEventListener('click', closeVoiceCapture);
  cancelBtn?.addEventListener('click', closeVoiceCapture);

  // Click fuera del modal
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeVoiceCapture();
  });

  // Guardar
  const saveBtn = document.getElementById('voice-capture-save');
  saveBtn?.addEventListener('click', saveCapture);

  // Iniciar dictado (solo si hay soporte)
  if (isSpeechSupported()) {
    setupSpeechListeners();
  }
};

/**
 * Configura los listeners del speech handler para el modal
 */
const setupSpeechListeners = () => {
  const startBtn = document.getElementById('voice-capture-start');
  const stateIdle = document.getElementById('voice-state-idle');
  const stateListening = document.getElementById('voice-state-listening');
  const interimText = document.getElementById('voice-interim');
  const textarea = document.getElementById('voice-capture-text');

  if (!startBtn) return;

  const speechHandler = getSpeechHandler();

  startBtn.addEventListener('click', () => {
    // Limpiar texto anterior si está vacío
    if (!textarea.value.trim()) {
      textarea.value = '';
    }

    // Mostrar estado listening
    stateIdle?.classList.add('hidden');
    stateListening?.classList.remove('hidden');

    // Iniciar reconocimiento
    speechHandler.start();
  });

  // Resultado parcial (interim)
  speechHandler.on('result', ({ interim, final }) => {
    if (interim && interimText) {
      interimText.textContent = interim;
    }

    if (final && textarea) {
      // Añadir texto final al textarea
      const currentText = textarea.value.trim();
      const separator = currentText ? ' ' : '';
      textarea.value = currentText + separator + final;

      // Limpiar interim
      if (interimText) interimText.textContent = '';
    }
  });

  // Fin de reconocimiento
  speechHandler.on('end', () => {
    // Volver a estado idle
    stateIdle?.classList.remove('hidden');
    stateListening?.classList.add('hidden');

    if (interimText) interimText.textContent = '';
  });

  // Error
  speechHandler.on('error', ({ message }) => {
    // Volver a estado idle
    stateIdle?.classList.remove('hidden');
    stateListening?.classList.add('hidden');

    if (interimText) interimText.textContent = '';

    showNotification(message, 'warning');
  });
};

/**
 * Abre el modal de captura por voz
 */
export const openVoiceCapture = () => {
  const modal = document.getElementById('voice-capture-modal');
  const textarea = document.getElementById('voice-capture-text');

  if (!modal) return;

  // Limpiar estado
  if (textarea) textarea.value = '';

  // Mostrar estado idle
  const stateIdle = document.getElementById('voice-state-idle');
  const stateListening = document.getElementById('voice-state-listening');
  stateIdle?.classList.remove('hidden');
  stateListening?.classList.add('hidden');

  // Abrir modal
  modal.showModal();
};

/**
 * Cierra el modal de captura por voz
 */
export const closeVoiceCapture = () => {
  const modal = document.getElementById('voice-capture-modal');
  const speechHandler = getSpeechHandler();

  // Detener si está escuchando
  if (speechHandler.isListening) {
    speechHandler.abort();
  }

  modal?.close();
};

/**
 * Guarda la captura en Pendientes (backlog)
 */
const saveCapture = () => {
  const textarea = document.getElementById('voice-capture-text');
  const text = textarea?.value.trim();

  if (!text) {
    showNotification('Escribe o dicta algo para guardar', 'warning');
    return;
  }

  // Asegurar que existe backlog
  if (!currentData.objectives) {
    currentData.objectives = {};
  }
  if (!currentData.objectives.backlog) {
    currentData.objectives.backlog = [];
  }

  // Crear nuevo item
  const newItem = {
    id: generateId(),
    text,
    notes: '',
    projectId: null,
    taskType: null,
    completed: false,
    source: 'voice', // Marcar como capturado por voz
    createdAt: new Date().toISOString()
  };

  // Añadir al backlog
  currentData.objectives.backlog.push(newItem);

  // Guardar
  updateDataCallback('objectives', currentData.objectives);

  // Cerrar modal
  closeVoiceCapture();

  // Notificación
  showNotification('Guardado en Pendientes', 'success');
};
