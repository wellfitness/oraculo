/**
 * Oráculo - Modal de Bienvenida (Onboarding)
 * Aparece la primera vez que el usuario abre la app
 *
 * Permite:
 * - Elegir un modo de uso (completo, hábitos, diario, complemento)
 * - Destacar Rueda de la Vida + Valores como punto de partida recomendado
 * - Marcar el onboarding como completado
 */

import { showNotification } from '../app.js';

// Definición de modos de uso
export const USAGE_MODES = {
  complete: {
    id: 'complete',
    name: 'Sistema Completo',
    icon: 'dashboard',
    description: 'Todas las funciones de Oráculo',
    idealFor: 'Quien quiere una gestión integral de su vida',
    includes: ['Dashboard', 'Valores', 'Rueda de la Vida', 'Horizontes', 'Proyectos', 'Hábitos', 'Calendario', 'Diario', 'Logros'],
    views: ['dashboard', 'values', 'life-wheel', 'kanban', 'projects', 'habits', 'calendar', 'journal', 'achievements', 'settings', 'help', 'daily-setup']
  },
  habits: {
    id: 'habits',
    name: 'Solo Hábitos',
    icon: 'science',
    description: 'Laboratorio de hábitos + reflexión',
    idealFor: 'Quien ya tiene otra app de tareas pero quiere crear hábitos',
    includes: ['Dashboard', 'Hábitos', 'Diario', 'Logros', 'Valores', 'Rueda de la Vida'],
    views: ['dashboard', 'values', 'life-wheel', 'habits', 'journal', 'achievements', 'settings', 'help']
  },
  journal: {
    id: 'journal',
    name: 'Solo Diario',
    icon: 'auto_stories',
    description: 'Reflexiones y check-ins',
    idealFor: 'Quien busca un espacio de reflexión personal',
    includes: ['Dashboard', 'Diario', 'Logros', 'Valores', 'Rueda de la Vida'],
    views: ['dashboard', 'values', 'life-wheel', 'journal', 'achievements', 'settings', 'help']
  },
  complement: {
    id: 'complement',
    name: 'Complemento',
    icon: 'add_circle',
    description: 'Valores + reflexión junto a otra app',
    idealFor: 'Quien usa Todoist/Notion y quiere añadir claridad',
    includes: ['Dashboard', 'Valores', 'Rueda de la Vida', 'Diario'],
    views: ['dashboard', 'values', 'life-wheel', 'journal', 'settings', 'help']
  }
};

/**
 * Verifica si debe mostrarse el modal de bienvenida
 */
export const shouldShowWelcome = (data) => {
  // Mostrar si onboarding no existe o no está completado
  return !data.onboarding || data.onboarding.completed !== true;
};

/**
 * Obtiene las vistas visibles según el modo de uso
 */
export const getVisibleViews = (mode) => {
  const modeConfig = USAGE_MODES[mode] || USAGE_MODES.complete;
  return modeConfig.views;
};

/**
 * Renderiza el modal de bienvenida
 */
export const renderWelcomeModal = () => {
  return `
    <dialog id="welcome-modal" class="modal modal--welcome">
      <div class="modal-content welcome-content">

        <!-- Header -->
        <header class="welcome-header">
          <div class="welcome-logo">
            <span class="material-symbols-outlined welcome-icon">auto_awesome</span>
          </div>
          <h1 class="welcome-title">Bienvenida a Oráculo</h1>
          <p class="welcome-subtitle">Tu sistema de gestión personal consciente</p>
        </header>

        <!-- Recomendación destacada -->
        <section class="welcome-recommendation">
          <div class="welcome-recommendation__badge">
            <span class="material-symbols-outlined">tips_and_updates</span>
            Recomendado
          </div>
          <h2 class="welcome-recommendation__title">Empieza por la reflexión</h2>
          <p class="welcome-recommendation__text">
            Antes de organizar tareas, tómate un momento para evaluar dónde estás
            y definir qué te importa.
          </p>
          <div class="welcome-recommendation__steps">
            <div class="welcome-step">
              <span class="material-symbols-outlined welcome-step__icon">target</span>
              <div class="welcome-step__content">
                <strong>1. Rueda de la Vida</strong>
                <span>Evalúa las 8 áreas de tu vida</span>
              </div>
            </div>
            <div class="welcome-step__arrow">
              <span class="material-symbols-outlined">arrow_forward</span>
            </div>
            <div class="welcome-step">
              <span class="material-symbols-outlined welcome-step__icon">explore</span>
              <div class="welcome-step__content">
                <strong>2. Brújula de Valores</strong>
                <span>Define qué te importa</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Selector de modo -->
        <section class="welcome-modes">
          <h3 class="welcome-modes__title">
            <span class="material-symbols-outlined">tune</span>
            ¿Cómo quieres usar Oráculo?
          </h3>
          <p class="welcome-modes__hint">Puedes cambiar esto en cualquier momento en Configuración</p>

          <div class="welcome-modes__grid" role="radiogroup" aria-label="Modo de uso">
            ${Object.values(USAGE_MODES).map(mode => `
              <button
                type="button"
                class="welcome-mode-card ${mode.id === 'complete' ? 'welcome-mode-card--selected' : ''}"
                data-mode="${mode.id}"
                role="radio"
                aria-checked="${mode.id === 'complete' ? 'true' : 'false'}"
              >
                <span class="material-symbols-outlined welcome-mode-card__icon">${mode.icon}</span>
                <h4 class="welcome-mode-card__name">${mode.name}</h4>
                <p class="welcome-mode-card__desc">${mode.description}</p>
                <span class="welcome-mode-card__check">
                  <span class="material-symbols-outlined">check_circle</span>
                </span>
              </button>
            `).join('')}
          </div>
        </section>

        <!-- Footer -->
        <footer class="welcome-footer">
          <button type="button" class="btn btn--primary btn--lg" id="welcome-start">
            <span class="material-symbols-outlined">rocket_launch</span>
            Empezar
          </button>
        </footer>

      </div>
    </dialog>
  `;
};

/**
 * Inicializa el modal de bienvenida
 */
export const initWelcomeModal = (data, updateData) => {
  const modal = document.getElementById('welcome-modal');
  if (!modal) return;

  let selectedMode = 'complete';

  // Manejar selección de modo
  const modeCards = document.querySelectorAll('.welcome-mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      // Deseleccionar todas
      modeCards.forEach(c => {
        c.classList.remove('welcome-mode-card--selected');
        c.setAttribute('aria-checked', 'false');
      });

      // Seleccionar esta
      card.classList.add('welcome-mode-card--selected');
      card.setAttribute('aria-checked', 'true');
      selectedMode = card.dataset.mode;
    });
  });

  // Botón de empezar
  const startBtn = document.getElementById('welcome-start');
  startBtn?.addEventListener('click', () => {
    // Guardar onboarding como completado
    const onboardingData = {
      completed: true,
      completedAt: new Date().toISOString(),
      selectedMode: selectedMode
    };

    // Actualizar settings con el modo de uso
    const currentSettings = data.settings || {};
    const newSettings = {
      ...currentSettings,
      usageMode: selectedMode
    };

    // Guardar ambos
    updateData('onboarding', onboardingData);
    updateData('settings', newSettings);

    // Notificar cambio de modo para actualizar menú
    window.dispatchEvent(new CustomEvent('usage-mode-changed'));

    // Cerrar modal
    modal.close();

    // Mensaje de bienvenida
    const modeName = USAGE_MODES[selectedMode]?.name || 'Sistema Completo';
    showNotification(`¡Bienvenida! Modo: ${modeName}`, 'success');

    // Redirigir a Rueda de la Vida para empezar
    window.location.hash = 'life-wheel';
  });

  // Mostrar modal si es necesario
  if (shouldShowWelcome(data)) {
    // Pequeño delay para que la app cargue primero
    setTimeout(() => {
      modal.showModal();
    }, 300);
  }
};

/**
 * Abre manualmente el modal de bienvenida (para testing o reset)
 */
export const openWelcomeModal = () => {
  const modal = document.getElementById('welcome-modal');
  if (modal) {
    modal.showModal();
  }
};

export default {
  USAGE_MODES,
  shouldShowWelcome,
  getVisibleViews,
  renderWelcomeModal,
  initWelcomeModal,
  openWelcomeModal
};
