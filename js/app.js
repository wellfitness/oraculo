/**
 * Oráculo - Aplicación Principal
 * Sistema de gestión personal consciente
 */

import { loadData, saveData, getStorageUsage } from './storage-hybrid.js';
import { needsDailySetup } from './components/daily-setup-modal.js';
import {
  renderCalmTimerModal,
  initCalmTimer,
  openCalmTimer
} from './components/calm-timer.js';
import {
  renderSpontaneousModal,
  initSpontaneousModal,
  openSpontaneousModal
} from './components/spontaneous-achievement.js';
import {
  renderEveningCheckInModal,
  initEveningCheckInModal,
  openEveningCheckIn
} from './components/evening-check-in.js';
import {
  renderVoiceCaptureModal,
  initVoiceCaptureModal,
  openVoiceCapture
} from './components/voice-capture-modal.js';
import {
  renderWeeklyReviewModal,
  initWeeklyReviewModal,
  openWeeklyReview
} from './components/weekly-review-modal.js';
import {
  renderWelcomeModal,
  initWelcomeModal,
  shouldShowWelcome,
  getVisibleViews,
  USAGE_MODES
} from './components/welcome-modal.js';
import { getSpeechHandler, isSpeechSupported } from './utils/speech-handler.js';
import * as autoBackup from './utils/auto-backup.js';

// Exportar módulo de auto-backup para uso en settings
export { autoBackup };

// Exportar funciones para uso en otros módulos
export { openCalmTimer, openSpontaneousModal, openEveningCheckIn, openVoiceCapture, openWeeklyReview };

// Exportar funciones de modos de uso
export { getVisibleViews, USAGE_MODES };

// Estado global de la aplicación
const state = {
  currentView: 'dashboard',
  data: null,
  initialized: false,
  pendingSync: null // Datos de Supabase pendientes de aplicar (cuando hay modal abierto)
};

// Variable para rastrear último campo de texto activo (para dictado por voz)
let lastActiveTextField = null;

// Vistas disponibles
const VIEWS = {
  'daily-setup': 'Configurar Día',
  dashboard: 'Dashboard',
  values: 'Brújula de Valores',
  'life-wheel': 'Rueda de la Vida',
  kanban: 'Horizontes',
  projects: 'Proyectos',
  habits: 'Laboratorio de Hábitos',
  calendar: 'Calendario',
  journal: 'Diario',
  achievements: 'Logros',
  settings: 'Configuración',
  help: 'Ayuda'
};

/**
 * Extrae la vista base de un hash (antes del primer /)
 * Ej: "journal/new/gratitude" -> "journal"
 */
const getBaseView = (hash) => {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  return cleanHash.split('/')[0] || 'dashboard';
};

/**
 * Inicializa la aplicación
 */
export const init = () => {
  if (state.initialized) return;

  // Cargar datos
  state.data = loadData();

  // Configurar navegación
  setupNavigation();

  // Configurar eventos globales
  setupGlobalEvents();

  // Inyectar temporizador de calma
  injectCalmTimerModal();

  // Inyectar modal de logros espontáneos
  injectSpontaneousModal();

  // Inyectar modal de evening check-in
  injectEveningCheckInModal();

  // Inyectar modal de captura por voz
  injectVoiceCaptureModal();

  // Inyectar modal de bienvenida (onboarding)
  injectWelcomeModal();

  // Inyectar modal de revisión semanal GTD
  injectWeeklyReviewModal();

  // Actualizar menú según modo de uso
  updateMenuVisibility();

  // Configurar botón de voz en header
  setupVoiceButton();

  // Configurar botón de guardar backup en header
  setupSaveButton();

  // Configurar captura rápida GTD
  setupGlobalCapture();

  // Inicializar auto-backup
  initAutoBackup();

  // Verificar si necesita Daily Setup (página en lugar de modal)
  const setupEnabled = state.data.burkemanSettings?.dailySetupEnabled !== false;
  const needsSetup = setupEnabled && needsDailySetup(state.data);

  // Determinar vista inicial respetando el hash de la URL
  const fullHash = window.location.hash.slice(1);
  const baseView = getBaseView(fullHash);

  // IMPORTANTE: Daily setup tiene prioridad sobre URL hash (filosofía Burkeman)
  // El usuario debe configurar su día ANTES de ir a cualquier otra vista
  if (needsSetup) {
    // Guardar destino original para después del setup (si hay uno válido)
    if (fullHash && VIEWS[baseView] && baseView !== 'daily-setup') {
      sessionStorage.setItem('oraculo_postSetupView', fullHash);
    }
    navigateTo('daily-setup');
  } else if (fullHash && VIEWS[baseView]) {
    navigateTo(baseView, fullHash);
  } else {
    navigateTo('dashboard');
  }

  state.initialized = true;
  console.log('Oráculo inicializado');
};

/**
 * Configura la navegación entre vistas
 */
const setupNavigation = () => {
  // Manejar clicks en navegación
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('[data-view]');
    if (navLink) {
      e.preventDefault();
      const view = navLink.dataset.view;
      navigateTo(view);
    }
  });

  // Manejar navegación del navegador (back/forward)
  window.addEventListener('popstate', (e) => {
    // Manejar navegación atrás/adelante del navegador
    // e.state puede ser null si el usuario navegó a un estado sin history.pushState
    const view = e.state?.view || getBaseView(location.hash.slice(1)) || 'dashboard';
    renderView(view);
    updateActiveNav(view);
  });

  // Manejar cambios de hash (para subrutas como #journal/new/gratitude)
  window.addEventListener('hashchange', () => {
    const fullHash = window.location.hash.slice(1);
    const baseView = getBaseView(fullHash);

    // Solo re-renderizar si es una vista válida
    if (VIEWS[baseView]) {
      state.currentView = baseView;
      renderView(baseView);
      updateActiveNav(baseView);
    }
  });
};

/**
 * Configura eventos globales
 */
const setupGlobalEvents = () => {
  // Advertencia de almacenamiento
  window.addEventListener('storage-warning', (e) => {
    showNotification(
      `Almacenamiento casi lleno (${e.detail.percentage}%). Considera exportar tus datos.`,
      'warning'
    );
  });

  // Escuchar cuando llegan datos sincronizados desde Supabase
  window.addEventListener('data-synced-from-cloud', (e) => {
    console.log('[App] Datos sincronizados desde la nube');

    // Verificar si hay algún modal abierto
    const openModal = document.querySelector('dialog[open]');

    if (openModal) {
      // Hay un modal abierto - guardar datos para aplicar después
      console.log('[App] Modal abierto, difiriendo actualización');
      state.pendingSync = e.detail.data;
      showNotification('Datos actualizados. Se aplicarán al cerrar el modal.', 'info');
    } else {
      // No hay modal - aplicar inmediatamente
      state.data = e.detail.data;
      renderView(state.currentView);
      showNotification('✓ Datos sincronizados desde la nube', 'success');
    }
  });

  // Aplicar sync pendiente cuando se cierra un modal
  document.addEventListener('close', (e) => {
    if (e.target.tagName === 'DIALOG' && state.pendingSync) {
      console.log('[App] Modal cerrado, aplicando sync pendiente');
      state.data = state.pendingSync;
      state.pendingSync = null;
      renderView(state.currentView);
      showNotification('✓ Datos sincronizados desde la nube', 'success');
    }
  }, true);

  // Guardar antes de cerrar (sin diálogo - los datos siempre se guardan automáticamente)
  window.addEventListener('beforeunload', () => {
    if (state.data) {
      saveData(state.data);
    }
    // NOTA: No mostramos diálogo de confirmación porque:
    // 1. Los datos siempre se guardan automáticamente en localStorage
    // 2. El mensaje genérico "los cambios no se guardarán" confunde a los usuarios
    // 3. Si queremos recordar sobre el backup, mejor usar notificaciones en la app
  });

  // Escuchar cambios en el modo de uso para actualizar el menú
  window.addEventListener('usage-mode-changed', () => {
    updateMenuVisibility();
  });

  // Menú hamburguesa para tablets/móviles
  const navToggle = document.querySelector('.nav-toggle');
  const appNav = document.querySelector('.app-nav');

  if (navToggle && appNav) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = appNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Cerrar al hacer click en un link
    appNav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        appNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Cerrar al hacer click fuera (ignorar clicks en modales)
    document.addEventListener('click', (e) => {
      // Ignorar clicks dentro de modales
      if (e.target.closest('dialog')) return;

      if (!e.target.closest('.app-header')) {
        appNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
};

/**
 * Inyecta e inicializa el temporizador de calma
 */
const injectCalmTimerModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'calm-timer-container';
  modalContainer.innerHTML = renderCalmTimerModal();

  document.body.appendChild(modalContainer);
  initCalmTimer(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de logros espontáneos
 */
const injectSpontaneousModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'spontaneous-container';
  modalContainer.innerHTML = renderSpontaneousModal();

  document.body.appendChild(modalContainer);
  initSpontaneousModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de evening check-in
 */
const injectEveningCheckInModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'evening-check-in-container';
  modalContainer.innerHTML = renderEveningCheckInModal();

  document.body.appendChild(modalContainer);
  initEveningCheckInModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de captura por voz
 */
const injectVoiceCaptureModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'voice-capture-container';
  modalContainer.innerHTML = renderVoiceCaptureModal();

  document.body.appendChild(modalContainer);
  initVoiceCaptureModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de bienvenida (onboarding)
 */
const injectWelcomeModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'welcome-container';
  modalContainer.innerHTML = renderWelcomeModal();

  document.body.appendChild(modalContainer);
  initWelcomeModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de revisión semanal GTD
 */
const injectWeeklyReviewModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'weekly-review-container';
  modalContainer.innerHTML = renderWeeklyReviewModal();

  document.body.appendChild(modalContainer);
  initWeeklyReviewModal(state.data, updateData);
};

/**
 * Actualiza la visibilidad de las vistas en el menú según el modo de uso
 */
const updateMenuVisibility = () => {
  const usageMode = state.data.settings?.usageMode || 'complete';
  const visibleViews = getVisibleViews(usageMode);

  // Actualizar cada link de navegación
  document.querySelectorAll('[data-view]').forEach(link => {
    const view = link.dataset.view;

    // settings y help siempre visibles
    if (view === 'settings' || view === 'help') {
      link.style.display = '';
      return;
    }

    // Mostrar u ocultar según el modo
    if (visibleViews.includes(view)) {
      link.style.display = '';
    } else {
      link.style.display = 'none';
    }
  });
};

/**
 * Configura el botón de voz en el header
 * Comportamiento:
 * - Si hay campo de texto activo → dicta ahí
 * - Si no hay campo → abre modal de captura rápida
 *
 * Nota: Usamos lastActiveTextField porque al hacer clic en el botón,
 * el campo de texto pierde el foco ANTES del evento click.
 */
const setupVoiceButton = () => {
  const voiceBtn = document.getElementById('global-voice-btn');
  if (!voiceBtn) return;

  // Verificar soporte
  if (!isSpeechSupported()) {
    voiceBtn.classList.add('btn--disabled');
    voiceBtn.title = 'Dictado no disponible en este navegador';
    voiceBtn.addEventListener('click', () => {
      showNotification('Dictado por voz no disponible en este navegador', 'warning');
    });
    return;
  }

  const speechHandler = getSpeechHandler();

  // Rastrear campos de texto cuando reciben foco
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (
      (el.tagName === 'INPUT' && ['text', 'search', 'url', 'tel', 'email'].includes(el.type)) ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable
    ) {
      lastActiveTextField = el;
    }
  });

  // Limpiar referencia cuando el foco va a otro lugar que no sea el botón de voz
  document.addEventListener('focusout', (e) => {
    // Pequeño delay para que el nuevo foco se establezca
    setTimeout(() => {
      const newFocus = document.activeElement;
      // Solo limpiar si el nuevo foco no es el botón de voz ni el campo anterior
      if (newFocus !== voiceBtn && newFocus !== lastActiveTextField) {
        lastActiveTextField = null;
      }
    }, 10);
  });

  // Click en botón de voz - usar lastActiveTextField
  voiceBtn.addEventListener('click', () => {
    if (lastActiveTextField && document.body.contains(lastActiveTextField)) {
      // Hay campo guardado → dictar directamente ahí
      startInlineDictation(lastActiveTextField, voiceBtn, speechHandler);
    } else {
      // No hay campo → abrir modal de captura
      lastActiveTextField = null;
      openVoiceCapture();
    }
  });
};

/**
 * Inicia dictado directo en un campo de texto
 */
const startInlineDictation = (field, voiceBtn, speechHandler) => {
  // Actualizar estado visual del botón
  voiceBtn.classList.add('btn--listening');

  // Listeners temporales para esta sesión
  const onResult = ({ final }) => {
    if (final) {
      speechHandler.insertAtCursor(field, final);
    }
  };

  const onEnd = () => {
    voiceBtn.classList.remove('btn--listening');
    cleanup();
  };

  const onError = ({ message }) => {
    voiceBtn.classList.remove('btn--listening');
    showNotification(message, 'warning');
    cleanup();
  };

  const cleanup = () => {
    speechHandler.off('result', onResult);
    speechHandler.off('end', onEnd);
    speechHandler.off('error', onError);
  };

  // Registrar listeners
  speechHandler.on('result', onResult);
  speechHandler.on('end', onEnd);
  speechHandler.on('error', onError);

  // Iniciar
  speechHandler.start();
};

/**
 * Configura el botón de guardar backup en el header
 */
const setupSaveButton = () => {
  const saveBtn = document.getElementById('global-save-btn');
  if (!saveBtn) return;

  // Verificar soporte de File System Access API
  if (!autoBackup.isSupported()) {
    // Fallback: el botón descargará el archivo
    saveBtn.title = 'Descargar copia de seguridad';
  }

  // Actualizar estado visual inicial
  updateSaveButtonState(saveBtn);

  // Click en botón de guardar
  saveBtn.addEventListener('click', async () => {
    // Evitar doble click
    if (saveBtn.classList.contains('saving')) return;

    try {
      // Estado: guardando
      saveBtn.classList.add('saving');
      saveBtn.classList.remove('saved', 'error', 'unlinked');

      // Guardar datos actuales
      const result = await autoBackup.smartSave(state.data);

      saveBtn.classList.remove('saving');

      if (result.success) {
        // Estado: guardado exitoso
        saveBtn.classList.add('saved');

        const message = result.method === 'download'
          ? `Backup descargado: ${result.filename}`
          : `Backup guardado en ${result.folder}`;
        showNotification(message, 'success');

        // Volver al estado normal después de 2 segundos
        setTimeout(() => {
          saveBtn.classList.remove('saved');
          updateSaveButtonState(saveBtn);
        }, 2000);
      } else if (result.error === 'CANCELLED') {
        // Usuario canceló
        updateSaveButtonState(saveBtn);
      } else {
        // Error
        saveBtn.classList.add('error');
        showNotification('No se pudo guardar el backup', 'warning');

        setTimeout(() => {
          saveBtn.classList.remove('error');
          updateSaveButtonState(saveBtn);
        }, 2000);
      }
    } catch (error) {
      console.error('[SaveButton] Error:', error);
      saveBtn.classList.remove('saving');
      saveBtn.classList.add('error');
      showNotification('Error al guardar: ' + error.message, 'warning');

      setTimeout(() => {
        saveBtn.classList.remove('error');
        updateSaveButtonState(saveBtn);
      }, 2000);
    }
  });

  // Escuchar eventos de backup automático
  window.addEventListener('backup-saved', (e) => {
    const { filename, folder } = e.detail;
    console.log(`[AutoBackup] Guardado automático: ${filename} en ${folder}`);
    // Pequeño feedback visual
    saveBtn.classList.add('saved');
    setTimeout(() => {
      saveBtn.classList.remove('saved');
    }, 1000);
  });
};

/**
 * Configura la captura rápida GTD en el header
 * Captura "cosas" sin procesarlas (sin decidir horizonte)
 */
const setupGlobalCapture = () => {
  const input = document.getElementById('global-capture-input');
  const btn = document.getElementById('global-capture-btn');
  const counter = document.getElementById('capture-counter');

  if (!input || !btn) return;

  /**
   * Captura una idea y la envía directamente al backlog
   */
  const capture = () => {
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    // Crear tarea mínima (sin procesar)
    const newTask = {
      id: generateId(),
      text,
      notes: null,
      projectId: null,
      taskType: null,
      completed: false,
      createdAt: new Date().toISOString()
    };

    // Asegurar que existe el backlog
    if (!state.data.objectives) {
      state.data.objectives = {};
    }
    if (!state.data.objectives.backlog) {
      state.data.objectives.backlog = [];
    }

    // Añadir al inicio del backlog
    state.data.objectives.backlog.unshift(newTask);
    saveData(state.data);

    // Limpiar input
    input.value = '';
    input.focus();

    // Feedback visual
    showNotification('Capturado en Pendientes', 'success');

    // Actualizar contador
    updateCaptureCounter();

    // Re-renderizar si estamos en kanban o dashboard
    if (state.currentView === 'kanban' || state.currentView === 'dashboard') {
      renderView(state.currentView);
    }
  };

  /**
   * Actualiza el badge contador de ideas sin procesar
   */
  const updateCaptureCounter = () => {
    const backlogCount = state.data.objectives?.backlog?.length || 0;
    if (counter) {
      const numEl = counter.querySelector('.capture-banner__counter-num');
      if (numEl) {
        numEl.textContent = backlogCount;
      }
      counter.hidden = backlogCount === 0;
    }
  };

  // Event listeners
  btn.addEventListener('click', capture);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      capture();
    }
  });

  // Mostrar hint al enfocar (solo la primera vez)
  let hintShown = localStorage.getItem('oraculo_captureHintShown');
  if (!hintShown) {
    input.addEventListener('focus', () => {
      if (!hintShown) {
        showNotification('Anota "la cosa", no la acción. Ej: "Ana", no "Llamar a Ana"', 'info');
        localStorage.setItem('oraculo_captureHintShown', 'true');
        hintShown = true;
      }
    }, { once: true });
  }

  // Actualizar contador inicial
  updateCaptureCounter();

  // Actualizar contador cuando cambian los datos
  window.addEventListener('data-updated', (e) => {
    if (e.detail.section === 'objectives' || e.detail.section === 'objectives.backlog') {
      updateCaptureCounter();
    }
  });
};

/**
 * Actualiza el estado visual del botón de guardar
 */
const updateSaveButtonState = (btn) => {
  btn.classList.remove('saving', 'saved', 'error');

  if (autoBackup.hasLinkedFolder()) {
    btn.classList.remove('unlinked');
    btn.title = `Guardar backup (${autoBackup.getFolderName()})`;
  } else if (autoBackup.isSupported()) {
    btn.classList.add('unlinked');
    btn.title = 'Vincular carpeta para backups';
  } else {
    btn.classList.remove('unlinked');
    btn.title = 'Descargar copia de seguridad';
  }
};

/**
 * Inicializa el sistema de auto-backup
 */
const initAutoBackup = async () => {
  const hasFolder = await autoBackup.init(() => state.data);

  if (hasFolder) {
    console.log('[AutoBackup] Sistema inicializado con carpeta:', autoBackup.getFolderName());

    // Programar auto-guardado cuando los datos cambien
    window.addEventListener('data-updated', () => {
      autoBackup.scheduleAutoSave();
    });
  } else if (autoBackup.isSupported()) {
    console.log('[AutoBackup] Sistema listo, sin carpeta vinculada');
  } else {
    console.log('[AutoBackup] File System API no soportada, usando fallback');
  }

  // Actualizar botón
  const saveBtn = document.getElementById('global-save-btn');
  if (saveBtn) {
    updateSaveButtonState(saveBtn);
  }
};

/**
 * Navega a una vista específica
 */
export const navigateTo = (viewName) => {
  if (!VIEWS[viewName]) {
    console.error('Vista no encontrada:', viewName);
    return;
  }

  // Limpiar referencia a campo de texto de la vista anterior
  // para evitar que el dictado por voz apunte a elementos obsoletos
  lastActiveTextField = null;

  state.currentView = viewName;

  // Actualizar URL sin recargar
  history.pushState({ view: viewName }, '', `#${viewName}`);

  // Renderizar
  renderView(viewName);

  // Actualizar navegación activa
  updateActiveNav(viewName);
};

/**
 * Renderiza una vista en el contenedor principal
 */
const renderView = async (viewName) => {
  const container = document.getElementById('app-content');
  if (!container) return;

  // Mostrar loading
  container.innerHTML = '<div class="loading">Cargando...</div>';

  try {
    // Importar y renderizar el módulo correspondiente
    const module = await import(`./modules/${viewName === 'dashboard' ? 'dashboard' : viewName}.js`);

    if (module.render) {
      container.innerHTML = '';
      const content = module.render(state.data);

      if (typeof content === 'string') {
        container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        container.appendChild(content);
      }

      // Inicializar eventos del módulo
      if (module.init) {
        module.init(state.data, updateData);
      }
    }
  } catch (error) {
    console.error('Error cargando vista:', viewName, error);
    container.innerHTML = `
      <div class="empty-state empty-state--large">
        <span class="material-symbols-outlined icon-xl">error_outline</span>
        <h3>No se pudo cargar "${VIEWS[viewName] || viewName}"</h3>
        <p>Puede que haya un problema temporal. Intenta volver al inicio.</p>
        <button class="btn btn--primary" onclick="window.location.hash='dashboard'">
          <span class="material-symbols-outlined icon-sm">home</span>
          Volver al inicio
        </button>
      </div>
    `;
  }
};

/**
 * Actualiza la navegación activa
 */
const updateActiveNav = (viewName) => {
  document.querySelectorAll('[data-view]').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });
};

/**
 * Actualiza los datos y persiste
 */
export const updateData = (section, newData) => {
  if (section.includes('.')) {
    const parts = section.split('.');
    let target = state.data;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = newData;
  } else {
    state.data[section] = newData;
  }

  saveData(state.data);

  // Emitir evento para que los módulos puedan reaccionar
  window.dispatchEvent(new CustomEvent('data-updated', {
    detail: { section, data: newData }
  }));
};

/**
 * Obtiene los datos actuales
 */
export const getData = () => state.data;

/**
 * Recarga el estado desde localStorage
 * Útil después de importar datos para sincronizar state.data
 */
export const reloadStateFromStorage = () => {
  state.data = loadData();
  return state.data;
};

/**
 * Muestra una notificación
 */
export const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;

  // Atributos de accesibilidad
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', type === 'warning' || type === 'danger' ? 'assertive' : 'polite');

  document.body.appendChild(notification);

  // Animar entrada
  requestAnimationFrame(() => {
    notification.classList.add('notification--visible');
  });

  // Remover después de 4 segundos
  setTimeout(() => {
    notification.classList.remove('notification--visible');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
};

/**
 * Formatea una fecha para mostrar
 */
export const formatDate = (date, options = {}) => {
  const d = new Date(date);
  const defaultOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  };
  return d.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
};

/**
 * Genera un ID único
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Iniciar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
