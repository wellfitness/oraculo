/**
 * Oráculo - Modal de Confirmación para Acciones Peligrosas
 *
 * Reemplaza los confirm() nativos del navegador con un modal
 * más amigable y consistente con el diseño de la app.
 */

import { escapeHTML } from './sanitizer.js';

/**
 * Muestra un modal de confirmación para acciones destructivas
 * @param {Object} options - Opciones del modal
 * @param {string} options.title - Título del modal (ej: "¿Eliminar este valor?")
 * @param {string} options.message - Mensaje descriptivo (opcional)
 * @param {string} options.confirmText - Texto del botón de confirmar (default: "Eliminar")
 * @param {string} options.cancelText - Texto del botón de cancelar (default: "Cancelar")
 * @param {string} options.type - Tipo de modal: 'danger' | 'warning' (default: 'danger')
 * @param {Function} onConfirm - Callback cuando el usuario confirma
 * @param {Function} onCancel - Callback cuando el usuario cancela (opcional)
 */
export const confirmDanger = ({
  title = '¿Estás segura?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Eliminar',
  cancelText = 'Cancelar',
  type = 'danger'
}, onConfirm, onCancel = null) => {
  // Crear el modal
  const modal = document.createElement('dialog');
  modal.className = `confirm-modal confirm-modal--${type}`;
  modal.innerHTML = `
    <div class="confirm-modal__content">
      <div class="confirm-modal__icon">
        <span class="material-symbols-outlined">${type === 'danger' ? 'warning' : 'help_outline'}</span>
      </div>
      <h2 class="confirm-modal__title">${escapeHTML(title)}</h2>
      <p class="confirm-modal__message">${escapeHTML(message)}</p>
      <div class="confirm-modal__actions">
        <button type="button" class="btn btn--secondary" data-action="cancel">${escapeHTML(cancelText)}</button>
        <button type="button" class="btn btn--${type}" data-action="confirm">${escapeHTML(confirmText)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Handlers
  let cerrado = false;

  const handleClose = (confirmed) => {
    if (cerrado) return;
    cerrado = true;

    modal.close();

    if (confirmed && onConfirm) {
      onConfirm();
    } else if (!confirmed && onCancel) {
      onCancel();
    }
  };

  // El modal se quita del documento cuando ya se ha cerrado. Quitarlo antes
  // haría que el evento 'close' no llegara nunca al documento: el elemento
  // deja de estar conectado cuando el evento se despacha, y quien escuche
  // los cierres desde fuera no se enteraría de nada.
  modal.addEventListener('close', () => {
    modal.remove();
  });

  // Event listeners
  modal.querySelector('[data-action="cancel"]').addEventListener('click', () => handleClose(false));
  modal.querySelector('[data-action="confirm"]').addEventListener('click', () => handleClose(true));

  // Cerrar con ESC
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      handleClose(false);
    }
  });

  // Cerrar con click fuera
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      handleClose(false);
    }
  });

  // Mostrar modal
  modal.showModal();

  // Focus en el botón de cancelar (más seguro)
  modal.querySelector('[data-action="cancel"]').focus();

  return modal;
};

/**
 * Versión simplificada que retorna una Promise
 * Útil para usar con async/await
 *
 * @example
 * const confirmed = await confirmDangerAsync({
 *   title: '¿Eliminar este valor?'
 * });
 * if (confirmed) {
 *   // eliminar...
 * }
 */
export const confirmDangerAsync = (options) => {
  return new Promise((resolve) => {
    confirmDanger(options, () => resolve(true), () => resolve(false));
  });
};

/**
 * Variante para acciones de borrado de datos (más severa)
 */
export const confirmDeleteData = (dataName, onConfirm) => {
  confirmDanger({
    title: `¿Eliminar ${dataName}?`,
    message: 'Esta acción es permanente y no se puede deshacer. Tus datos se perderán.',
    confirmText: 'Sí, eliminar',
    cancelText: 'No, mantener',
    type: 'danger'
  }, onConfirm);
};

export default {
  confirmDanger,
  confirmDangerAsync,
  confirmDeleteData
};
