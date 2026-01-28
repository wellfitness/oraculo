/**
 * Oráculo - Speech Handler
 * Wrapper para Web Speech API con dictado universal
 *
 * Funcionalidades:
 * - Detectar campo de texto activo
 * - Insertar texto dictado en posición del cursor
 * - Emitir eventos para UI (start, result, end, error)
 * - Fallback elegante si no hay soporte
 */

/**
 * Clase principal para manejar reconocimiento de voz
 */
export class SpeechHandler {
  constructor() {
    // Detectar soporte del navegador
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    this.supported = !!SpeechRecognition;
    this.isListening = false;
    this._listeners = {};

    if (!this.supported) {
      console.warn('[SpeechHandler] Web Speech API no soportada en este navegador');
      return;
    }

    // Crear instancia de reconocimiento
    this.recognition = new SpeechRecognition();
    this._setupRecognition();
  }

  /**
   * Configurar opciones del reconocimiento
   */
  _setupRecognition() {
    // Configuración para español
    this.recognition.lang = 'es-ES';

    // Mostrar resultados mientras habla (no solo al final)
    this.recognition.interimResults = true;

    // No continuo - una frase y para
    this.recognition.continuous = false;

    // Máximo una alternativa
    this.recognition.maxAlternatives = 1;

    // === Eventos ===

    this.recognition.onstart = () => {
      this.isListening = true;
      this._emit('start');
    };

    this.recognition.onresult = (event) => {
      // Limpiar timeout al recibir cualquier resultado
      if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = null;
      }

      let interimTranscript = '';
      let finalTranscript = '';

      // Procesar todos los resultados
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      // Emitir resultado con ambos tipos
      this._emit('result', {
        interim: interimTranscript.trim(),
        final: finalTranscript.trim(),
        isFinal: !!finalTranscript
      });

      // Si hay resultado final, emitir evento específico
      if (finalTranscript.trim()) {
        this._emit('final', finalTranscript.trim());
      }
    };

    this.recognition.onerror = (event) => {
      const errorMessages = {
        'no-speech': 'No detecté voz. Habla más fuerte.',
        'audio-capture': 'Micrófono no disponible.',
        'not-allowed': 'Permiso de micrófono denegado.',
        'network': 'Error de conexión. Verifica tu internet.',
        'aborted': 'Dictado cancelado.',
        'service-not-allowed': 'Servicio de voz no disponible.'
      };

      const message = errorMessages[event.error] || `Error: ${event.error}`;
      this._emit('error', { code: event.error, message });
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // Limpiar timeout si existe
      if (this._timeout) {
        clearTimeout(this._timeout);
        this._timeout = null;
      }
      this._emit('end');
    };
  }

  /**
   * Iniciar reconocimiento de voz
   * @param {number} [timeout=10000] - Timeout en ms (0 = sin timeout)
   */
  start(timeout = 10000) {
    if (!this.supported) {
      this._emit('error', {
        code: 'not-supported',
        message: 'Dictado por voz no disponible en este navegador'
      });
      return false;
    }

    if (this.isListening) {
      console.warn('[SpeechHandler] Ya está escuchando');
      return false;
    }

    try {
      this.recognition.start();

      // Timeout de seguridad
      if (timeout > 0) {
        this._timeout = setTimeout(() => {
          if (this.isListening) {
            this.stop();
            this._emit('error', {
              code: 'timeout',
              message: 'Micrófono sin respuesta. Inténtalo de nuevo.'
            });
          }
        }, timeout);
      }

      return true;
    } catch (error) {
      console.error('[SpeechHandler] Error al iniciar:', error);
      this._emit('error', {
        code: 'start-failed',
        message: 'No se pudo iniciar el dictado'
      });
      return false;
    }
  }

  /**
   * Detener reconocimiento (espera a terminar de procesar)
   */
  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Abortar reconocimiento (inmediato, sin procesar)
   */
  abort() {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
    }
  }

  // === Utilidades para campos de texto ===

  /**
   * Obtener el campo de texto actualmente enfocado
   * @returns {HTMLElement|null} Input, textarea o contentEditable
   */
  getActiveTextField() {
    const el = document.activeElement;

    if (!el) return null;

    // Input de texto (no checkbox, radio, etc.)
    if (el.tagName === 'INPUT') {
      const textTypes = ['text', 'search', 'url', 'tel', 'email', 'password'];
      if (textTypes.includes(el.type)) {
        return el;
      }
      return null;
    }

    // Textarea
    if (el.tagName === 'TEXTAREA') {
      return el;
    }

    // ContentEditable
    if (el.isContentEditable) {
      return el;
    }

    return null;
  }

  /**
   * Insertar texto en la posición del cursor de un campo
   * @param {HTMLElement} field - Input, textarea o contentEditable
   * @param {string} text - Texto a insertar
   */
  insertAtCursor(field, text) {
    if (!field || !text) return;

    // Para input y textarea
    if (field.tagName === 'INPUT' || field.tagName === 'TEXTAREA') {
      const start = field.selectionStart || 0;
      const end = field.selectionEnd || 0;
      const before = field.value.substring(0, start);
      const after = field.value.substring(end);

      // Añadir espacio si hay texto antes y no termina en espacio
      const needsSpace = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
      const spacer = needsSpace ? ' ' : '';

      field.value = before + spacer + text + after;

      // Mover cursor al final del texto insertado
      const newPos = start + spacer.length + text.length;
      field.setSelectionRange(newPos, newPos);

      // Disparar evento input para que otros listeners detecten el cambio
      field.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    // Para contentEditable
    if (field.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();

        // Añadir espacio si es necesario
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);

        // Mover cursor al final
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);

        // Disparar evento
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // === Sistema de eventos simple ===

  /**
   * Suscribirse a un evento
   * @param {string} event - Nombre del evento (start, result, final, end, error)
   * @param {Function} callback - Función a ejecutar
   */
  on(event, callback) {
    if (!this._listeners[event]) {
      this._listeners[event] = [];
    }
    this._listeners[event].push(callback);
  }

  /**
   * Desuscribirse de un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función a remover
   */
  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Emitir un evento
   * @private
   */
  _emit(event, data) {
    if (this._listeners[event]) {
      this._listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`[SpeechHandler] Error en listener de ${event}:`, err);
        }
      });
    }
  }

  // === Detección de plataforma ===

  /**
   * Verificar si estamos en iOS
   */
  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * Verificar si la app está instalada como PWA
   */
  static isPWA() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  /**
   * Verificar si el dictado no funcionará (iOS + PWA)
   */
  static isUnsupportedPlatform() {
    return SpeechHandler.isIOS() && SpeechHandler.isPWA();
  }
}

// Instancia singleton para uso global
let speechHandlerInstance = null;

/**
 * Obtener instancia singleton del SpeechHandler
 * @returns {SpeechHandler}
 */
export const getSpeechHandler = () => {
  if (!speechHandlerInstance) {
    speechHandlerInstance = new SpeechHandler();
  }
  return speechHandlerInstance;
};

/**
 * Verificar si el dictado está soportado
 * @returns {boolean}
 */
export const isSpeechSupported = () => {
  const handler = getSpeechHandler();
  return handler.supported && !SpeechHandler.isUnsupportedPlatform();
};
