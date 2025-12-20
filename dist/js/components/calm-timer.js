/**
 * Oráculo - Temporizador "No Hacer Nada"
 * Práctica de 5 minutos de presencia basada en Burkeman
 *
 * "Siéntate. No hagas nada. Observa qué surge."
 */

import { showNotification, generateId } from '../app.js';
import { getReflexionPorPilar } from '../data/burkeman.js';

const DEFAULT_DURATION = 5 * 60; // 5 minutos en segundos

let timerInterval = null;
let remainingTime = DEFAULT_DURATION;
let isRunning = false;

/**
 * Renderiza el modal del temporizador
 */
export const renderCalmTimerModal = () => {
  return `
    <dialog id="calm-timer-modal" class="modal modal--calm">
      <div class="calm-content">
        <header class="calm-header">
          <span class="material-symbols-outlined calm-icon">self_improvement</span>
          <h2 class="calm-title">5 minutos de calma</h2>
        </header>

        <div class="calm-body" id="calm-body">
          <p class="calm-instruction">
            Siéntate. No hagas nada.<br>
            Observa qué surge.
          </p>

          <div class="calm-timer" id="calm-timer">
            <span class="timer-display" id="timer-display">5:00</span>
          </div>

          <div class="calm-actions" id="calm-actions">
            <button class="btn btn--primary btn--large" id="start-calm">
              <span class="material-symbols-outlined">play_arrow</span>
              Comenzar
            </button>
          </div>
        </div>

        <div class="calm-completed" id="calm-completed" style="display: none;">
          <span class="material-symbols-outlined calm-done-icon">check_circle</span>
          <h3>Has completado la práctica</h3>
          <p class="calm-reflection">"${getReflexionPorPilar('insignificancia')}"</p>

          <div class="calm-journal">
            <p class="calm-journal-label">¿Quieres registrar esta experiencia?</p>
            <textarea
              id="calm-journal-text"
              class="input textarea"
              rows="3"
              placeholder="¿Qué surgió durante la práctica? ¿Qué notaste?"
            ></textarea>
          </div>

          <div class="calm-final-actions">
            <button class="btn btn--tertiary" id="skip-journal">
              Omitir
            </button>
            <button class="btn btn--primary" id="save-journal">
              <span class="material-symbols-outlined icon-sm">edit_note</span>
              Guardar reflexión
            </button>
          </div>
        </div>

        <button class="btn btn--icon calm-close" id="close-calm" title="Cerrar">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </dialog>
  `;
};

/**
 * Inicializa el temporizador
 */
export const initCalmTimer = (data, updateData) => {
  const modal = document.getElementById('calm-timer-modal');
  if (!modal) return;

  // Botón de iniciar
  document.getElementById('start-calm')?.addEventListener('click', () => {
    startTimer();
  });

  // Botón de cerrar
  document.getElementById('close-calm')?.addEventListener('click', () => {
    stopTimer();
    resetTimer();
    modal.close();
  });

  // Omitir registro
  document.getElementById('skip-journal')?.addEventListener('click', () => {
    resetTimer();
    modal.close();
    showNotification('Práctica completada. Bien hecho.', 'success');
  });

  // Guardar reflexión
  document.getElementById('save-journal')?.addEventListener('click', () => {
    const text = document.getElementById('calm-journal-text').value.trim();

    if (text) {
      const entry = {
        id: generateId(),
        type: 'meditation',
        content: text,
        duration: DEFAULT_DURATION / 60,
        createdAt: new Date().toISOString()
      };

      data.journal.push(entry);
      updateData('journal', data.journal);
      showNotification('Reflexión guardada en el diario', 'success');
    }

    resetTimer();
    modal.close();
  });

  // Cerrar al hacer click fuera
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (!isRunning) {
        modal.close();
      }
    }
  });
};

/**
 * Abre el temporizador
 */
export const openCalmTimer = () => {
  const modal = document.getElementById('calm-timer-modal');
  if (modal) {
    resetTimer();
    modal.showModal();
  }
};

/**
 * Inicia el temporizador
 */
const startTimer = () => {
  if (isRunning) return;

  isRunning = true;
  const actionsDiv = document.getElementById('calm-actions');
  const timerDisplay = document.getElementById('timer-display');

  // Cambiar botón a pausa
  actionsDiv.innerHTML = `
    <button class="btn btn--secondary" id="pause-calm">
      <span class="material-symbols-outlined">pause</span>
      Pausar
    </button>
  `;

  document.getElementById('pause-calm')?.addEventListener('click', pauseTimer);

  // Iniciar countdown
  timerInterval = setInterval(() => {
    remainingTime--;

    if (remainingTime <= 0) {
      completeTimer();
    } else {
      updateDisplay(remainingTime);
    }
  }, 1000);
};

/**
 * Pausa el temporizador
 */
const pauseTimer = () => {
  isRunning = false;
  clearInterval(timerInterval);

  const actionsDiv = document.getElementById('calm-actions');
  actionsDiv.innerHTML = `
    <button class="btn btn--primary" id="resume-calm">
      <span class="material-symbols-outlined">play_arrow</span>
      Continuar
    </button>
    <button class="btn btn--tertiary" id="reset-calm">
      <span class="material-symbols-outlined">restart_alt</span>
      Reiniciar
    </button>
  `;

  document.getElementById('resume-calm')?.addEventListener('click', startTimer);
  document.getElementById('reset-calm')?.addEventListener('click', () => {
    resetTimer();
    const actionsDiv = document.getElementById('calm-actions');
    actionsDiv.innerHTML = `
      <button class="btn btn--primary btn--large" id="start-calm">
        <span class="material-symbols-outlined">play_arrow</span>
        Comenzar
      </button>
    `;
    document.getElementById('start-calm')?.addEventListener('click', startTimer);
  });
};

/**
 * Detiene el temporizador
 */
const stopTimer = () => {
  isRunning = false;
  clearInterval(timerInterval);
};

/**
 * Reinicia el temporizador
 */
const resetTimer = () => {
  stopTimer();
  remainingTime = DEFAULT_DURATION;
  updateDisplay(remainingTime);

  // Mostrar body inicial, ocultar completed
  document.getElementById('calm-body').style.display = 'block';
  document.getElementById('calm-completed').style.display = 'none';

  // Restaurar botón inicial
  const actionsDiv = document.getElementById('calm-actions');
  if (actionsDiv) {
    actionsDiv.innerHTML = `
      <button class="btn btn--primary btn--large" id="start-calm">
        <span class="material-symbols-outlined">play_arrow</span>
        Comenzar
      </button>
    `;
  }
};

/**
 * Completa el temporizador
 */
const completeTimer = () => {
  stopTimer();

  // Ocultar body, mostrar completed
  document.getElementById('calm-body').style.display = 'none';
  document.getElementById('calm-completed').style.display = 'block';
  document.getElementById('calm-journal-text').value = '';

  // Sonido de campana (si está soportado)
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRoFJ4vW3ayGKAwujNHVoXYyFDaH0c6VaTMXQIPLw4JWOiBKg8e2dU81JFKA');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {
    // Ignorar errores de audio
  }
};

/**
 * Actualiza la visualización del tiempo
 */
const updateDisplay = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const display = document.getElementById('timer-display');
  if (display) {
    display.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }
};

export default {
  renderCalmTimerModal,
  initCalmTimer,
  openCalmTimer
};
