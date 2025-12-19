/**
 * Oráculo - Aplicación Principal
 * Sistema de gestión personal consciente
 */

import { loadData, saveData, getStorageUsage } from './storage.js';
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

// Exportar funciones para uso en otros módulos
export { openCalmTimer, openSpontaneousModal };

// Estado global de la aplicación
const state = {
  currentView: 'dashboard',
  data: null,
  initialized: false
};

// Vistas disponibles
const VIEWS = {
  'daily-setup': 'Configurar Día',
  dashboard: 'Dashboard',
  values: 'Brújula de Valores',
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

  // Verificar si necesita Daily Setup (página en lugar de modal)
  const setupEnabled = state.data.burkemanSettings?.dailySetupEnabled !== false;
  const needsSetup = setupEnabled && needsDailySetup(state.data);

  // Renderizar vista inicial
  if (needsSetup) {
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

  // Guardar antes de cerrar
  window.addEventListener('beforeunload', () => {
    if (state.data) {
      saveData(state.data);
    }
  });
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
