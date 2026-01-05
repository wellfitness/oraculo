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
import { getSpeechHandler, isSpeechSupported } from './utils/speech-handler.js';
import * as autoBackup from './utils/auto-backup.js';

// Exportar módulo de auto-backup para uso en settings
export { autoBackup };

// Exportar funciones para uso en otros módulos
export { openCalmTimer, openSpontaneousModal, openEveningCheckIn, openVoiceCapture };

// Estado global de la aplicación
const state = {
  currentView: 'dashboard',
  data: null,
  initialized: false
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

  // Configurar botón de voz en header
  setupVoiceButton();

  // Configurar botón de guardar backup en header
  setupSaveButton();

  // Inicializar auto-backup
  initAutoBackup();

  // Verificar si necesita Daily Setup (página en lugar de modal)
  const setupEnabled = state.data.burkemanSettings?.dailySetupEnabled !== false;
  const needsSetup = setupEnabled && needsDailySetup(state.data);

  // Determinar vista inicial respetando el hash de la URL
  const fullHash = window.location.hash.slice(1);
  const baseView = getBaseView(fullHash);

  if (fullHash && VIEWS[baseView]) {
    navigateTo(baseView, fullHash);
  } else if (needsSetup) {
    navigateTo('daily-setup');
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
    if (e.state && e.state.view) {
      renderView(e.state.view);
    }
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
    console.log('[App] Datos sincronizados desde la nube, recargando vista...');
    state.data = e.detail.data;
    // Re-renderizar la vista actual con los nuevos datos
    renderView(state.currentView);
    showNotification('✓ Datos sincronizados desde la nube', 'success');
  });

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

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
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
    console.error('Error cargando vista:', error);
    container.innerHTML = `
      <div class="error-message">
        <h3>Error cargando ${VIEWS[viewName]}</h3>
        <p>Por favor, recarga la página.</p>
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
