/**
 * Oráculo - Laboratorio de Hábitos
 * Psicología conductista aplicada (Hábitos Atómicos)
 */

import { generateId, showNotification } from '../app.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { getReflexionDelDia, getReflexionPorPilar } from '../data/burkeman.js';
import { getHabitosManson } from '../data/markmanson.js';

// Áreas de vida para priorización de hábitos (v1.5)
const LIFE_AREAS = [
  { id: 'alimentacion', name: 'Alimentación', icon: 'restaurant', description: 'Comer bien, cocinar, hidratación' },
  { id: 'ejercicio', name: 'Ejercicio Físico', icon: 'fitness_center', description: 'Movimiento, fuerza, movilidad' },
  { id: 'descanso', name: 'Descanso y Recuperación', icon: 'bedtime', description: 'Sueño, pausas, relajación' },
  { id: 'organizacion', name: 'Organización', icon: 'event_note', description: 'Tiempo, espacio, planificación' }
];

// Estado actual de la vista (lab | audit | wizard)
let currentView = 'lab';
let wizardStep = 1;
let wizardData = {};
let auditStep = 1;

// Iconos disponibles para actividades atélicas
const ATELIC_ICONS = [
  { icon: 'palette', name: 'Arte' },
  { icon: 'music_note', name: 'Música' },
  { icon: 'menu_book', name: 'Lectura' },
  { icon: 'park', name: 'Naturaleza' },
  { icon: 'sports_tennis', name: 'Deportes' },
  { icon: 'local_florist', name: 'Jardinería' },
  { icon: 'videogame_asset', name: 'Juegos' },
  { icon: 'camera', name: 'Fotografía' },
  { icon: 'restaurant', name: 'Cocina' },
  { icon: 'handyman', name: 'Manualidades' },
  { icon: 'pets', name: 'Mascotas' },
  { icon: 'directions_walk', name: 'Pasear' }
];

let updateDataCallback = null;

/**
 * Renderiza el laboratorio de hábitos
 */
export const render = (data) => {
  // Si estamos en auditoría, mostrar esa vista
  if (currentView === 'audit') {
    return renderAuditSection(data);
  }

  // Si estamos en wizard, mostrar esa vista
  if (currentView === 'wizard') {
    return renderHabitWizard();
  }

  // Vista normal del laboratorio
  const activeHabit = data.habits.active;
  const graduatedHabits = data.habits.graduated || [];
  const history = data.habits.history || [];

  return `
    <div class="habits-page habits-page--layout">
      <!-- Sidebar con Las 4 Leyes + Ocio -->
      <aside class="habits-sidebar">
        <div class="habits-sidebar__section">
          <h2 class="habits-sidebar__title">
            <span class="material-symbols-outlined">auto_stories</span>
            Las 4 Leyes
          </h2>
          <ol class="laws-list">
            <li class="law-item">
              <span class="law-item__number">1</span>
              <div class="law-item__content">
                <strong>Hacerlo Obvio</strong>
                <span>La señal debe ser visible</span>
              </div>
            </li>
            <li class="law-item">
              <span class="law-item__number">2</span>
              <div class="law-item__content">
                <strong>Hacerlo Atractivo</strong>
                <span>Vincúlalo con algo que disfrutes</span>
              </div>
            </li>
            <li class="law-item">
              <span class="law-item__number">3</span>
              <div class="law-item__content">
                <strong>Hacerlo Fácil</strong>
                <span>Reduce la fricción al mínimo</span>
              </div>
            </li>
            <li class="law-item">
              <span class="law-item__number">4</span>
              <div class="law-item__content">
                <strong>Hacerlo Satisfactorio</strong>
                <span>Recompénsate inmediatamente</span>
              </div>
            </li>
          </ol>
        </div>

        ${renderAtelicSidebar(data.atelicActivities || [])}
      </aside>

      <!-- Contenido principal -->
      <main class="habits-main">
        <header class="page-header">
        <h1 class="page-title">Laboratorio de Hábitos</h1>
        <p class="page-description">
          Un hábito a la vez. Los hábitos compiten por recursos cognitivos.
          Instala uno completamente antes de empezar otro.
        </p>
        <blockquote class="quote quote--header">
          <p>"${getReflexionDelDia('habits')}"</p>
        </blockquote>
      </header>

      <section class="habits-active">
        <h2>Hábito Activo</h2>

        ${activeHabit ? renderActiveHabit(activeHabit, history) : `
          <div class="empty-state empty-state--habits">
            <span class="material-symbols-outlined icon-xl icon-muted">psychology</span>
            <h3>Antes de empezar...</h3>
            <p>¿Quieres reflexionar sobre tus hábitos actuales antes de crear uno nuevo?</p>

            <div class="empty-state-actions">
              <button class="btn btn--secondary" id="start-audit-btn">
                <span class="material-symbols-outlined icon-sm">checklist</span>
                Comenzar auditoría
              </button>
              <button class="btn btn--primary" id="create-habit-btn">
                <span class="material-symbols-outlined icon-sm">arrow_forward</span>
                Ya sé qué quiero
              </button>
            </div>
          </div>

          ${renderHabitSuggestions()}
        `}
      </section>

      ${graduatedHabits.length > 0 ? `
        <section class="habits-graduated">
          <h2>Hábitos Consolidados</h2>
          <p class="section-description">
            Estos hábitos ya forman parte de tu rutina automática. ¡Felicidades!
          </p>
          <ul class="graduated-list">
            ${graduatedHabits.map(h => `
              <li class="graduated-item">
                <span class="material-symbols-outlined icon-success">check_circle</span>
                <span class="graduated-name">${escapeHTML(h.name)}</span>
                <span class="graduated-date">Desde ${formatShortDate(h.graduatedAt)}</span>
              </li>
            `).join('')}
          </ul>
        </section>
      ` : ''}

      </main>

      <!-- Modal para crear/editar hábito -->
      <dialog id="habit-modal" class="modal modal--large">
        <form method="dialog" class="modal-content" id="habit-form">
          <h2 class="modal-title">Diseña tu Hábito</h2>

          <div class="form-section">
            <h3>Identidad</h3>
            <div class="form-group">
              <label for="habit-identity">¿Quién quieres ser?</label>
              <input
                type="text"
                id="habit-identity"
                class="input"
                placeholder="Soy una persona que se mueve a diario"
                maxlength="100"
              >
              <small>Los hábitos basados en identidad son más duraderos.</small>
            </div>
          </div>

          <div class="form-section">
            <h3>El Hábito</h3>
            <div class="form-group">
              <label for="habit-name">¿Qué hábito quieres instalar?</label>
              <input
                type="text"
                id="habit-name"
                class="input"
                placeholder="Hacer 5 minutos de movilidad"
                maxlength="100"
                required
              >
            </div>

            <div class="form-group">
              <label for="habit-micro">Micro-versión (regla de 2 minutos)</label>
              <input
                type="text"
                id="habit-micro"
                class="input"
                placeholder="Abrir la esterilla"
                maxlength="100"
              >
              <small>La versión tan pequeña que es imposible fallar.</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Habit Stacking (Ley 1: Obvio)</h3>
            <div class="form-group">
              <label for="habit-trigger">Después de [hábito existente]...</label>
              <input
                type="text"
                id="habit-trigger"
                class="input"
                placeholder="Después de servir mi café de la mañana"
                maxlength="100"
              >
              <small>Vincular el nuevo hábito a uno que ya haces automáticamente.</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Hacerlo Atractivo (Ley 2)</h3>
            <div class="form-group">
              <label for="habit-attractive">¿Con qué lo emparejamos?</label>
              <input
                type="text"
                id="habit-attractive"
                class="input"
                placeholder="Mientras escucho mi podcast favorito"
                maxlength="100"
              >
            </div>
          </div>

          <div class="form-section">
            <h3>Hacerlo Fácil (Ley 3)</h3>
            <div class="form-group">
              <label for="habit-easy">¿Cómo reducimos la fricción?</label>
              <input
                type="text"
                id="habit-easy"
                class="input"
                placeholder="Dejo la esterilla desplegada junto a la cama"
                maxlength="100"
              >
            </div>
          </div>

          <div class="form-section">
            <h3>Recompensa (Ley 4: Satisfactorio)</h3>
            <div class="form-group">
              <label for="habit-reward">¿Qué te das justo después?</label>
              <input
                type="text"
                id="habit-reward"
                class="input"
                placeholder="Me digo: ¡Bien hecho! y marco el día en mi tracker"
                maxlength="100"
              >
            </div>
          </div>

          <div class="form-section">
            <h3>Duración Estimada</h3>
            <div class="form-group">
              <label for="habit-duration">¿Cuánto tiempo para instalarlo?</label>
              <select id="habit-duration" class="input">
                <option value="14">2 semanas (hábitos simples)</option>
                <option value="30" selected>1 mes (mayoría de hábitos)</option>
                <option value="60">2 meses (hábitos complejos)</option>
                <option value="90">3 meses (cambios de estilo de vida)</option>
              </select>
              <small>No existe el "21 días mágicos". Cada hábito tiene su tiempo.</small>
            </div>
          </div>

          <input type="hidden" id="habit-id">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-habit">Cancelar</button>
            <button type="submit" class="btn btn--primary">Activar Hábito</button>
          </div>
        </form>
      </dialog>

      <!-- Modal para actividades atélicas -->
      <dialog id="atelic-modal" class="modal">
        <form method="dialog" class="modal-content" id="atelic-form">
          <h2 class="modal-title">
            <span class="material-symbols-outlined icon-primary">spa</span>
            Registrar Actividad de Ocio
          </h2>

          <p class="modal-subtitle">
            Ocio sin objetivo. Está permitido "ser malo" en esto.
          </p>

          <div class="form-group">
            <label for="atelic-name">¿Qué hiciste?</label>
            <input
              type="text"
              id="atelic-name"
              class="input"
              placeholder="Pintar sin presión, tocar la guitarra mal..."
              maxlength="100"
              required
            >
          </div>

          <div class="form-group">
            <label>Elige un icono</label>
            <div class="atelic-icons" id="atelic-icons">
              ${ATELIC_ICONS.map((item, i) => `
                <button type="button" class="atelic-icon-btn ${i === 0 ? 'selected' : ''}" data-icon="${item.icon}" title="${item.name}">
                  <span class="material-symbols-outlined">${item.icon}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label for="atelic-duration">Duración aproximada (opcional)</label>
            <select id="atelic-duration" class="input">
              <option value="">No quiero medir</option>
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="120">2+ horas</option>
            </select>
          </div>

          <div class="form-group">
            <label for="atelic-note">¿Cómo te sentiste? (opcional)</label>
            <textarea
              id="atelic-note"
              class="input textarea"
              placeholder="Simplemente disfruté, sin pensar en el resultado..."
              rows="2"
              maxlength="200"
            ></textarea>
          </div>

          <input type="hidden" id="atelic-id">
          <input type="hidden" id="atelic-icon" value="palette">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-atelic">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>
    </div>
  `;
};

/**
 * Renderiza el sidebar de actividades atélicas (versión compacta)
 */
const renderAtelicSidebar = (activities) => {
  const recentActivities = activities
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);

  return `
    <div class="habits-sidebar__section habits-sidebar__section--atelic">
      <div class="habits-sidebar__header">
        <h2 class="habits-sidebar__title">
          <span class="material-symbols-outlined">spa</span>
          Ocio sin Objetivo
        </h2>
        <button class="btn btn--icon btn--sm" id="add-atelic-btn-sidebar" title="Registrar actividad">
          <span class="material-symbols-outlined icon-sm">add</span>
        </button>
      </div>

      <p class="habits-sidebar__hint">
        También está permitido simplemente ser.
      </p>

      ${recentActivities.length > 0 ? `
        <ul class="atelic-mini-list">
          ${recentActivities.map(a => `
            <li class="atelic-mini-item">
              <span class="material-symbols-outlined icon-sm">${a.icon || 'spa'}</span>
              <span>${a.name}</span>
            </li>
          `).join('')}
        </ul>
      ` : `
        <p class="habits-sidebar__empty">
          ¿Cuándo fue la última vez que hiciste algo solo por el placer de hacerlo?
        </p>
      `}
    </div>
  `;
};

/**
 * Renderiza la sección de Descanso Atélico
 */
const renderAtelicSection = (activities) => {
  const recentActivities = activities
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return `
    <section class="habits-atelic">
      <div class="atelic-header">
        <div>
          <h2>
            <span class="material-symbols-outlined icon-primary">spa</span>
            Actividades de Ocio
          </h2>
          <p class="section-description">
            Ocio sin objetivo. Aquí no hay racha, ni metas, ni "mejorar".
          </p>
        </div>
        <button class="btn btn--secondary" id="add-atelic-btn">
          <span class="material-symbols-outlined icon-sm">add</span>
          Registrar
        </button>
      </div>

      <blockquote class="quote quote--secondary">
        <p>"${getReflexionPorPilar('imperfeccion')}"</p>
      </blockquote>

      ${recentActivities.length > 0 ? `
        <div class="atelic-list">
          ${recentActivities.map(activity => `
            <div class="atelic-item" data-id="${activity.id}">
              <span class="material-symbols-outlined atelic-item__icon">${activity.icon || 'spa'}</span>
              <div class="atelic-item__content">
                <span class="atelic-item__name">${activity.name}</span>
                <span class="atelic-item__date">${formatShortDate(activity.date)}</span>
                ${activity.note ? `<p class="atelic-item__note">${activity.note}</p>` : ''}
              </div>
              ${activity.duration ? `
                <span class="atelic-item__duration">${activity.duration} min</span>
              ` : ''}
              <button class="btn btn--icon atelic-item__delete" data-id="${activity.id}" title="Eliminar">
                <span class="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state atelic-empty">
          <span class="material-symbols-outlined icon-xl icon-muted">self_improvement</span>
          <p>
            ¿Cuándo fue la última vez que hiciste algo solo por el placer de hacerlo?<br>
            Sin presión, sin metas, sin "ser buena" en ello.
          </p>
        </div>
      `}
    </section>
  `;
};

/**
 * Inicializa eventos
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;

  // ============================================================
  // EVENTOS DE LA VISTA NORMAL DEL LABORATORIO
  // ============================================================

  // Botón iniciar auditoría
  document.getElementById('start-audit-btn')?.addEventListener('click', () => {
    currentView = 'audit';
    auditStep = 1;
    reRender(data);
  });

  // Botón crear hábito (salta auditoría, va directo al wizard)
  document.getElementById('create-habit-btn')?.addEventListener('click', () => {
    currentView = 'wizard';
    wizardStep = 1;
    wizardData = {};
    reRender(data);
  });

  // Configurar tarjetas de sugerencias de hábitos (Mark Manson)
  setupSuggestionCards(data);

  // Botón editar hábito activo (abre wizard con datos existentes)
  document.getElementById('edit-habit-btn')?.addEventListener('click', () => {
    const habit = data.habits.active;
    if (habit) {
      wizardData = { ...habit };
      currentView = 'wizard';
      wizardStep = 1;
      reRender(data);
    }
  });

  // Botón marcar como hecho hoy
  document.getElementById('habit-done-today')?.addEventListener('click', () => {
    markHabitDone(data);
  });

  // Botón graduar hábito
  document.getElementById('graduate-habit-btn')?.addEventListener('click', () => {
    graduateHabit(data);
  });

  // Botón abandonar hábito
  document.getElementById('abandon-habit-btn')?.addEventListener('click', () => {
    abandonHabit(data);
  });

  // Modal de hábitos (legacy, por si acaso)
  setupModal(data);

  // Modal de actividades atélicas
  setupAtelicModal(data);

  // Botón añadir actividad atélica
  document.getElementById('add-atelic-btn')?.addEventListener('click', () => {
    openAtelicModal();
  });

  // Botón añadir actividad atélica (en sidebar)
  document.getElementById('add-atelic-btn-sidebar')?.addEventListener('click', () => {
    openAtelicModal();
  });

  // Eliminar actividades atélicas
  document.querySelectorAll('.atelic-item__delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteAtelicActivity(btn.dataset.id, data);
    });
  });

  // ============================================================
  // EVENTOS DE AUDITORÍA
  // ============================================================
  initAuditEvents(data);

  // ============================================================
  // EVENTOS DEL WIZARD
  // ============================================================
  initWizardEvents(data);
};

/**
 * Re-renderiza la página del laboratorio
 */
const reRender = (data) => {
  const container = document.querySelector('main');
  if (container) {
    container.innerHTML = render(data);
    init(data, updateDataCallback);
  }
};

/**
 * Inicializa eventos de la auditoría
 */
const initAuditEvents = (data) => {
  // Volver al laboratorio
  document.getElementById('audit-back-to-lab')?.addEventListener('click', () => {
    currentView = 'lab';
    auditStep = 1;
    reRender(data);
  });

  document.getElementById('audit-back-to-lab-btn')?.addEventListener('click', () => {
    currentView = 'lab';
    auditStep = 1;
    reRender(data);
  });

  // Añadir actividad
  document.getElementById('audit-add-activity-btn')?.addEventListener('click', () => {
    addAuditActivity(data);
  });

  // Enter en input de actividad
  document.getElementById('audit-new-activity')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAuditActivity(data);
    }
  });

  // Eliminar actividades
  document.querySelectorAll('.audit-activity-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteAuditActivity(btn.dataset.id, data);
    });
  });

  // Botones de navegación
  document.getElementById('audit-next-btn')?.addEventListener('click', () => {
    if (auditStep < 3) {
      auditStep++;
      reRender(data);
    }
  });

  document.getElementById('audit-prev-btn')?.addEventListener('click', () => {
    if (auditStep > 1) {
      auditStep--;
      reRender(data);
    }
  });

  document.getElementById('audit-prev-btn-footer')?.addEventListener('click', () => {
    if (auditStep > 1) {
      auditStep--;
      reRender(data);
    }
  });

  // Botones de evaluación
  document.querySelectorAll('.btn--eval').forEach(btn => {
    btn.addEventListener('click', () => {
      evaluateAuditActivity(btn.dataset.id, btn.dataset.eval, data);
    });
  });

  // Seleccionar actividad para transformar
  document.querySelectorAll('.audit-select-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const activityName = btn.dataset.name;
      // Guardar timestamp de auditoría
      data.habits.audit.lastAuditAt = new Date().toISOString();
      updateDataCallback('habits', data.habits);

      // Iniciar wizard con la actividad seleccionada
      wizardData = {
        fromAudit: true,
        originalActivity: activityName,
        name: '' // El usuario decidirá el nombre del nuevo hábito
      };
      currentView = 'wizard';
      wizardStep = 1;
      reRender(data);
    });
  });

  // Crear hábito nuevo (sin auditoría)
  document.getElementById('audit-create-new-btn')?.addEventListener('click', () => {
    currentView = 'wizard';
    wizardStep = 1;
    wizardData = {};
    reRender(data);
  });

  document.getElementById('audit-skip-btn')?.addEventListener('click', () => {
    currentView = 'wizard';
    wizardStep = 1;
    wizardData = {};
    reRender(data);
  });
};

/**
 * Inicializa eventos del wizard
 */
const initWizardEvents = (data) => {
  // Cancelar wizard
  document.getElementById('wizard-cancel-btn')?.addEventListener('click', () => {
    if (confirm('¿Cancelar la creación del hábito?')) {
      currentView = 'lab';
      wizardStep = 1;
      wizardData = {};
      reRender(data);
    }
  });

  document.getElementById('wizard-cancel-footer-btn')?.addEventListener('click', () => {
    if (confirm('¿Cancelar la creación del hábito?')) {
      currentView = 'lab';
      wizardStep = 1;
      wizardData = {};
      reRender(data);
    }
  });

  // Navegación atrás
  document.getElementById('wizard-prev-btn')?.addEventListener('click', () => {
    saveCurrentWizardStep();
    if (wizardStep > 1) {
      wizardStep--;
      reRender(data);
    }
  });

  document.getElementById('wizard-prev-footer-btn')?.addEventListener('click', () => {
    saveCurrentWizardStep();
    if (wizardStep > 1) {
      wizardStep--;
      reRender(data);
    }
  });

  // Navegación siguiente
  document.getElementById('wizard-next-btn')?.addEventListener('click', () => {
    saveCurrentWizardStep();
    if (validateCurrentWizardStep()) {
      wizardStep++;
      reRender(data);
    }
  });

  // Habilitar/deshabilitar botón siguiente en paso 3 cuando se escribe el nombre
  const wizardNameInput = document.getElementById('wizard-name');
  const wizardNextBtn = document.getElementById('wizard-next-btn');
  if (wizardNameInput && wizardNextBtn && wizardStep === 3) {
    wizardNameInput.addEventListener('input', () => {
      const hasName = wizardNameInput.value.trim().length > 0;
      wizardNextBtn.disabled = !hasName;
      // Actualizar wizardData en tiempo real
      wizardData.name = wizardNameInput.value.trim();
    });
  }

  // Selección de área
  document.querySelectorAll('.wizard-area-card').forEach(card => {
    card.addEventListener('click', () => {
      wizardData.area = card.dataset.area;
      reRender(data);
    });
  });

  // Selección de duración
  document.querySelectorAll('input[name="duration"]').forEach(radio => {
    radio.addEventListener('change', () => {
      wizardData.duration = parseInt(radio.value);
      // Actualizar UI
      document.querySelectorAll('.wizard-duration-option').forEach(opt => {
        opt.classList.toggle('selected', opt.querySelector('input').value === radio.value);
      });
    });
  });

  // Guardar hábito
  document.getElementById('wizard-save-btn')?.addEventListener('click', () => {
    saveCurrentWizardStep();
    saveHabitFromWizard(data);
  });
};

/**
 * Guarda los valores del paso actual del wizard
 */
const saveCurrentWizardStep = () => {
  switch (wizardStep) {
    case 2:
      wizardData.identity = document.getElementById('wizard-identity')?.value?.trim() || '';
      break;
    case 3:
      wizardData.name = document.getElementById('wizard-name')?.value?.trim() || '';
      wizardData.micro = document.getElementById('wizard-micro')?.value?.trim() || '';
      break;
    case 4:
      wizardData.scheduledTime = document.getElementById('wizard-time')?.value || '';
      wizardData.location = document.getElementById('wizard-location')?.value?.trim() || '';
      break;
    case 5:
      wizardData.trigger = document.getElementById('wizard-trigger')?.value?.trim() || '';
      break;
    case 6:
      wizardData.attractive = document.getElementById('wizard-attractive')?.value?.trim() || '';
      wizardData.easy = document.getElementById('wizard-easy')?.value?.trim() || '';
      wizardData.reward = document.getElementById('wizard-reward')?.value?.trim() || '';
      break;
    case 7:
      const selectedDuration = document.querySelector('input[name="duration"]:checked');
      if (selectedDuration) {
        wizardData.duration = parseInt(selectedDuration.value);
      }
      break;
  }
};

/**
 * Valida el paso actual del wizard
 */
const validateCurrentWizardStep = () => {
  switch (wizardStep) {
    case 1:
      if (!wizardData.area) {
        showNotification('Selecciona un área de vida', 'warning');
        return false;
      }
      break;
    case 3:
      if (!wizardData.name?.trim()) {
        showNotification('El nombre del hábito es obligatorio', 'warning');
        return false;
      }
      break;
  }
  return true;
};

/**
 * Guarda el hábito desde el wizard
 */
const saveHabitFromWizard = (data) => {
  if (!wizardData.name?.trim()) {
    showNotification('El nombre del hábito es obligatorio', 'warning');
    return;
  }

  const habitData = {
    id: wizardData.id || generateId(),
    name: wizardData.name,
    identity: wizardData.identity || '',
    micro: wizardData.micro || '',
    trigger: wizardData.trigger || '',
    attractive: wizardData.attractive || '',
    easy: wizardData.easy || '',
    reward: wizardData.reward || '',
    duration: wizardData.duration || 30,
    // Nuevos campos v1.5
    area: wizardData.area || null,
    scheduledTime: wizardData.scheduledTime || null,
    location: wizardData.location || null,
    fromAudit: wizardData.fromAudit || false,
    originalActivity: wizardData.originalActivity || null,
    // Timestamps
    createdAt: wizardData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.habits.active = habitData;
  updateDataCallback('habits', data.habits);

  // Resetear estado
  currentView = 'lab';
  wizardStep = 1;
  wizardData = {};

  showNotification('¡Hábito activado! Recuerda: un día a la vez.', 'success');
  location.reload();
};

// ============================================================
// FUNCIONES AUXILIARES DE AUDITORÍA
// ============================================================

/**
 * Añade una actividad a la auditoría
 */
const addAuditActivity = (data) => {
  const input = document.getElementById('audit-new-activity');
  const name = input?.value?.trim();

  if (!name) {
    showNotification('Escribe una actividad', 'warning');
    return;
  }

  // Asegurar que existe la estructura
  if (!data.habits.audit) {
    data.habits.audit = { activities: [], lastAuditAt: null };
  }

  data.habits.audit.activities.push({
    id: generateId(),
    name,
    evaluation: null,
    createdAt: new Date().toISOString()
  });

  updateDataCallback('habits', data.habits);
  reRender(data);
};

/**
 * Elimina una actividad de la auditoría
 */
const deleteAuditActivity = (activityId, data) => {
  if (!data.habits.audit) return;

  data.habits.audit.activities = data.habits.audit.activities.filter(a => a.id !== activityId);
  updateDataCallback('habits', data.habits);
  reRender(data);
};

/**
 * Evalúa una actividad (+mantener, -cambiar, /indiferente)
 */
const evaluateAuditActivity = (activityId, evaluation, data) => {
  if (!data.habits.audit) return;

  const activity = data.habits.audit.activities.find(a => a.id === activityId);
  if (activity) {
    activity.evaluation = evaluation;
    updateDataCallback('habits', data.habits);
    reRender(data);
  }
};

/**
 * Renderiza el hábito activo con su tracker
 */
const renderActiveHabit = (habit, history) => {
  const streak = calculateStreak(habit.id, history);
  const completedToday = isCompletedToday(habit.id, history);
  const progress = calculateProgress(habit, history);
  const calendarDays = generateCalendarDays(habit, history);
  const areaInfo = LIFE_AREAS.find(a => a.id === habit.area);

  return `
    <div class="active-habit-card">
      <div class="habit-header">
        ${areaInfo ? `
          <div class="habit-area-badge">
            <span class="material-symbols-outlined icon-sm">${areaInfo.icon}</span>
            ${areaInfo.name}
          </div>
        ` : ''}
        ${habit.identity ? `<p class="habit-identity">"${escapeHTML(habit.identity)}"</p>` : ''}
        <h3 class="habit-name">${escapeHTML(habit.name)}</h3>
        ${(habit.scheduledTime || habit.location) ? `
          <p class="habit-when-where">
            ${habit.scheduledTime ? `<span class="material-symbols-outlined icon-sm">schedule</span> ${habit.scheduledTime}` : ''}
            ${habit.location ? `<span class="material-symbols-outlined icon-sm">location_on</span> ${escapeHTML(habit.location)}` : ''}
          </p>
        ` : ''}
      </div>

      <div class="habit-formula">
        ${habit.trigger ? `<p><strong>Señal:</strong> ${escapeHTML(habit.trigger)}</p>` : ''}
        ${habit.micro ? `<p><strong>Micro-versión:</strong> ${escapeHTML(habit.micro)}</p>` : ''}
        ${habit.attractive ? `<p><strong>Lo hago atractivo:</strong> ${escapeHTML(habit.attractive)}</p>` : ''}
        ${habit.easy ? `<p><strong>Lo hago fácil:</strong> ${escapeHTML(habit.easy)}</p>` : ''}
        ${habit.reward ? `<p><strong>Recompensa:</strong> ${escapeHTML(habit.reward)}</p>` : ''}
      </div>

      <div class="habit-stats">
        <div class="stat">
          <span class="stat-value">${streak}</span>
          <span class="stat-label">días seguidos</span>
        </div>
        <div class="stat">
          <span class="stat-value">${progress.completed}</span>
          <span class="stat-label">de ${progress.target} días</span>
        </div>
        <div class="stat">
          <span class="stat-value">${progress.percentage}%</span>
          <span class="stat-label">completado</span>
        </div>
      </div>

      <div class="habit-calendar">
        <h4>Registro de este mes</h4>
        <div class="calendar-grid">
          ${calendarDays.map(day => `
            <div class="calendar-day ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}">
              <span class="day-number">${day.day}</span>
              ${day.completed ? '<span class="material-symbols-outlined day-check icon-sm filled">check</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="habit-actions">
        ${completedToday ? `
          <p class="done-message">
            <span class="material-symbols-outlined icon-success">check_circle</span>
            Hecho hoy. ¡Sigue así!
          </p>
        ` : `
          <button class="btn btn--primary btn--large" id="habit-done-today">
            <span class="material-symbols-outlined">check</span>
            Marcar como hecho hoy
          </button>
        `}
      </div>

      <div class="habit-secondary-actions">
        <button class="btn btn--tertiary" id="edit-habit-btn">
          <span class="material-symbols-outlined icon-sm">edit</span>
          Editar
        </button>
        ${progress.percentage >= 80 ? `
          <button class="btn btn--secondary" id="graduate-habit-btn">
            <span class="material-symbols-outlined icon-sm">workspace_premium</span>
            Graduar hábito
          </button>
        ` : ''}
        <button class="btn btn--danger-subtle" id="abandon-habit-btn">
          <span class="material-symbols-outlined icon-sm">close</span>
          Abandonar
        </button>
      </div>
    </div>
  `;
};

/**
 * Configura el modal
 */
const setupModal = (data) => {
  const modal = document.getElementById('habit-modal');
  const form = document.getElementById('habit-form');

  document.getElementById('cancel-habit')?.addEventListener('click', () => {
    modal.close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveHabit(data);
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
};

/**
 * Abre el modal
 */
const openHabitModal = (habit = null) => {
  const modal = document.getElementById('habit-modal');

  document.getElementById('habit-id').value = habit?.id || '';
  document.getElementById('habit-identity').value = habit?.identity || '';
  document.getElementById('habit-name').value = habit?.name || '';
  document.getElementById('habit-micro').value = habit?.micro || '';
  document.getElementById('habit-trigger').value = habit?.trigger || '';
  document.getElementById('habit-attractive').value = habit?.attractive || '';
  document.getElementById('habit-easy').value = habit?.easy || '';
  document.getElementById('habit-reward').value = habit?.reward || '';
  document.getElementById('habit-duration').value = habit?.duration || '30';

  modal.showModal();
};

/**
 * Guarda el hábito
 */
const saveHabit = (data) => {
  const name = document.getElementById('habit-name').value.trim();
  if (!name) {
    showNotification('El nombre del hábito es obligatorio', 'warning');
    return;
  }

  const habitData = {
    id: document.getElementById('habit-id').value || generateId(),
    name,
    identity: document.getElementById('habit-identity').value.trim(),
    micro: document.getElementById('habit-micro').value.trim(),
    trigger: document.getElementById('habit-trigger').value.trim(),
    attractive: document.getElementById('habit-attractive').value.trim(),
    easy: document.getElementById('habit-easy').value.trim(),
    reward: document.getElementById('habit-reward').value.trim(),
    duration: parseInt(document.getElementById('habit-duration').value),
    createdAt: data.habits.active?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.habits.active = habitData;
  updateDataCallback('habits', data.habits);

  document.getElementById('habit-modal').close();
  showNotification('¡Hábito activado! Recuerda: un día a la vez.', 'success');
  location.reload();
};

/**
 * Marca el hábito como hecho hoy
 */
const markHabitDone = (data) => {
  if (!data.habits.active) return;

  const today = getLocalDateString();
  const habitId = data.habits.active.id;

  // Verificar si ya está marcado
  if (isCompletedToday(habitId, data.habits.history)) return;

  data.habits.history.push({
    habitId,
    date: today,
    completedAt: new Date().toISOString()
  });

  updateDataCallback('habits', data.habits);
  showNotification('¡Genial! Otro día más en tu racha. 🔥', 'success');
  location.reload();
};

/**
 * Gradúa el hábito (lo marca como consolidado)
 */
const graduateHabit = (data) => {
  if (!data.habits.active) return;

  if (!confirm('¿Este hábito ya forma parte de tu rutina automática? Una vez graduado, podrás empezar uno nuevo.')) {
    return;
  }

  const graduated = {
    ...data.habits.active,
    graduatedAt: new Date().toISOString()
  };

  data.habits.graduated.push(graduated);
  data.habits.active = null;

  updateDataCallback('habits', data.habits);
  showNotification('🎉 ¡Felicidades! Hábito consolidado. Ya puedes empezar uno nuevo.', 'success');
  location.reload();
};

/**
 * Abandona el hábito actual
 */
const abandonHabit = (data) => {
  if (!confirm('¿Segura que quieres abandonar este hábito? El historial se mantendrá pero el hábito dejará de estar activo.')) {
    return;
  }

  data.habits.active = null;
  updateDataCallback('habits', data.habits);
  showNotification('Hábito abandonado. Cuando quieras, puedes empezar otro.', 'info');
  location.reload();
};

// --- Funciones auxiliares ---

/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 * (evita toISOString() que convierte a UTC y causa desfases)
 * @param {Date} date - Fecha opcional (por defecto hoy)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA'); // 'en-CA' devuelve YYYY-MM-DD
};

const calculateStreak = (habitId, history) => {
  const habitHistory = history
    .filter(h => h.habitId === habitId)
    .map(h => h.date)
    .sort()
    .reverse();

  if (habitHistory.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayStr = getLocalDateString(today);
  if (!habitHistory.includes(todayStr)) {
    today.setDate(today.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = getLocalDateString(today);
    if (habitHistory.includes(dateStr)) {
      streak++;
      today.setDate(today.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

const isCompletedToday = (habitId, history) => {
  const today = getLocalDateString();
  return history.some(h => h.habitId === habitId && h.date === today);
};

const calculateProgress = (habit, history) => {
  const completedDays = history.filter(h => h.habitId === habit.id).length;
  const target = habit.duration || 30;
  const percentage = Math.min(100, Math.round((completedDays / target) * 100));

  return { completed: completedDays, target, percentage };
};

const generateCalendarDays = (habit, history) => {
  const today = new Date();
  const todayDay = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const habitDates = history
    .filter(h => h.habitId === habit.id)
    .map(h => h.date);

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = getLocalDateString(date);

    days.push({
      day: d,
      completed: habitDates.includes(dateStr),
      isToday: d === todayDay,
      isFuture: d > todayDay
    });
  }

  return days;
};

const formatShortDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
};

// ============================================================
// FUNCIONES PARA AUDITORÍA DE HÁBITOS (v1.5)
// ============================================================

/**
 * Renderiza la sección de auditoría de hábitos
 */
const renderAuditSection = (data) => {
  const audit = data.habits.audit || { activities: [], lastAuditAt: null };
  const activities = audit.activities || [];
  const activitiesToChange = activities.filter(a => a.evaluation === 'change');

  // Paso 1: Listar actividades
  if (auditStep === 1) {
    return `
      <div class="audit-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="audit-back-to-lab">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            <span class="wizard-step active">1</span>
            <span class="wizard-step">2</span>
            <span class="wizard-step">3</span>
          </div>
          <div class="wizard-progress-label">Paso 1 de 3</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">Auditoría de Hábitos</h1>
          <p class="wizard-subtitle">
            Piensa en 2 días representativos de tu rutina.<br>
            ¿Qué actividades sueles hacer?
          </p>

          <div class="audit-activities-list" id="audit-activities-list">
            ${activities.map(a => `
              <div class="audit-activity-item" data-id="${a.id}">
                <span class="audit-activity-name">${a.name}</span>
                <button class="btn btn--icon audit-activity-delete" data-id="${a.id}">
                  <span class="material-symbols-outlined icon-sm">close</span>
                </button>
              </div>
            `).join('')}
          </div>

          <div class="audit-add-form">
            <input type="text" id="audit-new-activity" class="input" placeholder="Ej: Desayunar viendo el móvil" maxlength="100">
            <button class="btn btn--secondary" id="audit-add-activity-btn">
              <span class="material-symbols-outlined icon-sm">add</span>
              Añadir
            </button>
          </div>

          ${activities.length === 0 ? `
            <div class="audit-empty-hint">
              <p>Ejemplos: "Café de media mañana", "Comer en 10 minutos", "Ver series antes de dormir"</p>
            </div>
          ` : ''}
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="audit-back-to-lab-btn">Cancelar</button>
          <button class="btn btn--primary" id="audit-next-btn" ${activities.length < 2 ? 'disabled' : ''}>
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 2: Evaluar actividades
  if (auditStep === 2) {
    return `
      <div class="audit-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="audit-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            <span class="wizard-step completed">1</span>
            <span class="wizard-step active">2</span>
            <span class="wizard-step">3</span>
          </div>
          <div class="wizard-progress-label">Paso 2 de 3</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">¿Qué quieres hacer con cada actividad?</h1>
          <p class="wizard-subtitle">
            Evalúa cada una según lo que necesitas.
          </p>

          <div class="audit-evaluate-list">
            ${activities.map(a => `
              <div class="audit-evaluate-item" data-id="${a.id}">
                <span class="audit-evaluate-name">${a.name}</span>
                <div class="audit-evaluate-buttons">
                  <button class="btn btn--eval ${a.evaluation === 'maintain' ? 'selected maintain' : ''}" data-id="${a.id}" data-eval="maintain">
                    <span class="material-symbols-outlined icon-sm">add</span>
                    Mantener
                  </button>
                  <button class="btn btn--eval ${a.evaluation === 'change' ? 'selected change' : ''}" data-id="${a.id}" data-eval="change">
                    <span class="material-symbols-outlined icon-sm">remove</span>
                    Cambiar
                  </button>
                  <button class="btn btn--eval ${a.evaluation === 'indifferent' ? 'selected indifferent' : ''}" data-id="${a.id}" data-eval="indifferent">
                    <span class="material-symbols-outlined icon-sm">horizontal_rule</span>
                    Indiferente
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="audit-prev-btn-footer">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary" id="audit-next-btn" ${activities.some(a => !a.evaluation) ? 'disabled' : ''}>
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 3: Elegir una para transformar
  if (auditStep === 3) {
    return `
      <div class="audit-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="audit-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            <span class="wizard-step completed">1</span>
            <span class="wizard-step completed">2</span>
            <span class="wizard-step active">3</span>
          </div>
          <div class="wizard-progress-label">Paso 3 de 3</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">¿Cuál quieres trabajar primero?</h1>
          <p class="wizard-subtitle">
            Has marcado ${activitiesToChange.length} actividad${activitiesToChange.length !== 1 ? 'es' : ''} para cambiar.<br>
            <strong>Recuerda: solo 1 hábito a la vez.</strong>
          </p>

          ${activitiesToChange.length > 0 ? `
            <div class="audit-select-list">
              ${activitiesToChange.map(a => `
                <button class="audit-select-item" data-id="${a.id}" data-name="${a.name}">
                  <span class="material-symbols-outlined">change_circle</span>
                  <span>${a.name}</span>
                  <span class="material-symbols-outlined icon-sm">arrow_forward</span>
                </button>
              `).join('')}
            </div>
          ` : `
            <div class="audit-no-changes">
              <span class="material-symbols-outlined icon-xl icon-muted">check_circle</span>
              <p>No has marcado ninguna actividad para cambiar.</p>
              <p>Puedes crear un hábito nuevo directamente.</p>
              <button class="btn btn--primary" id="audit-create-new-btn">
                Crear hábito nuevo
              </button>
            </div>
          `}
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="audit-prev-btn-footer">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          ${activitiesToChange.length === 0 ? '' : `
            <button class="btn btn--secondary" id="audit-skip-btn">
              Crear otro hábito
            </button>
          `}
        </footer>
      </div>
    `;
  }

  return '';
};

/**
 * Renderiza el wizard de creación de hábito (página completa)
 */
const renderHabitWizard = () => {
  const totalSteps = 7;

  // Paso 1: Área de vida
  if (wizardStep === 1) {
    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-cancel-btn">
            <span class="material-symbols-outlined">close</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">¿A qué área de tu vida pertenece?</h1>
          <p class="wizard-subtitle">
            Prioriza un área antes de dispersarte en varias.
          </p>

          <div class="wizard-area-grid">
            ${LIFE_AREAS.map(area => `
              <button class="wizard-area-card ${wizardData.area === area.id ? 'selected' : ''}" data-area="${area.id}">
                <span class="material-symbols-outlined wizard-area-icon">${area.icon}</span>
                <span class="wizard-area-name">${area.name}</span>
                <span class="wizard-area-desc">${area.description}</span>
              </button>
            `).join('')}
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-cancel-footer-btn">Cancelar</button>
          <button class="btn btn--primary" id="wizard-next-btn" ${!wizardData.area ? 'disabled' : ''}>
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 2: Identidad
  if (wizardStep === 2) {
    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">¿Quién quieres ser?</h1>
          <p class="wizard-subtitle">
            Los hábitos basados en identidad son más duraderos que los basados en resultados.
          </p>

          <div class="wizard-form-group">
            <label for="wizard-identity">Soy una persona que...</label>
            <input
              type="text"
              id="wizard-identity"
              class="input input--large"
              placeholder="cuida su cuerpo"
              value="${wizardData.identity || ''}"
              maxlength="100"
            >
            <small class="wizard-examples">
              Ejemplos: "se mueve cada día", "come conscientemente", "descansa bien"
            </small>
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-prev-footer-btn">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary" id="wizard-next-btn">
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 3: El Hábito + Micro-versión
  if (wizardStep === 3) {
    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">¿Qué hábito quieres instalar?</h1>

          <div class="wizard-form-group">
            <label for="wizard-name">El hábito *</label>
            <input
              type="text"
              id="wizard-name"
              class="input input--large"
              placeholder="Hacer 5 minutos de movilidad"
              value="${wizardData.name || ''}"
              maxlength="100"
              required
            >
          </div>

          <div class="wizard-form-group">
            <label for="wizard-micro">Micro-versión (regla de 2 minutos)</label>
            <input
              type="text"
              id="wizard-micro"
              class="input"
              placeholder="Abrir la esterilla"
              value="${wizardData.micro || ''}"
              maxlength="100"
            >
            <small class="wizard-hint">La versión tan pequeña que es imposible fallar.</small>
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-prev-footer-btn">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary" id="wizard-next-btn" ${!wizardData.name?.trim() ? 'disabled' : ''}>
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 4: Cuándo y Dónde
  if (wizardStep === 4) {
    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">¿Cuándo y dónde lo harás?</h1>
          <p class="wizard-subtitle">
            "Voy a <strong>${wizardData.name || '[hábito]'}</strong> a las <strong>[HORA]</strong> en <strong>[LUGAR]</strong>"
          </p>

          <div class="wizard-form-group">
            <label for="wizard-time">
              <span class="material-symbols-outlined icon-sm">schedule</span>
              Hora específica
            </label>
            <input
              type="time"
              id="wizard-time"
              class="input"
              value="${wizardData.scheduledTime || '07:30'}"
            >
          </div>

          <div class="wizard-form-group">
            <label for="wizard-location">
              <span class="material-symbols-outlined icon-sm">location_on</span>
              Ubicación
            </label>
            <input
              type="text"
              id="wizard-location"
              class="input"
              placeholder="en la cocina, en el salón, en el parque..."
              value="${wizardData.location || ''}"
              maxlength="100"
            >
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-prev-footer-btn">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary" id="wizard-next-btn">
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 5: Habit Stack (Ley 1)
  if (wizardStep === 5) {
    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <div class="wizard-law-badge">Ley 1: Hacerlo Obvio</div>
          <h1 class="wizard-title">Habit Stacking</h1>
          <p class="wizard-subtitle">
            Vincular el nuevo hábito a uno que ya haces automáticamente.
          </p>

          <div class="wizard-form-group">
            <label for="wizard-trigger">Después de...</label>
            <input
              type="text"
              id="wizard-trigger"
              class="input input--large"
              placeholder="servir mi café de la mañana"
              value="${wizardData.trigger || ''}"
              maxlength="100"
            >
            <small class="wizard-examples">
              Ejemplos: "lavarme los dientes", "vestirme", "terminar de comer"
            </small>
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-prev-footer-btn">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary" id="wizard-next-btn">
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 6: Las 3 Leyes Restantes
  if (wizardStep === 6) {
    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">Diseña tu entorno</h1>

          <div class="wizard-form-group">
            <div class="wizard-law-badge small">Ley 2: Hacerlo Atractivo</div>
            <label for="wizard-attractive">¿Con qué lo emparejamos?</label>
            <input
              type="text"
              id="wizard-attractive"
              class="input"
              placeholder="Mientras escucho mi podcast favorito"
              value="${wizardData.attractive || ''}"
              maxlength="100"
            >
          </div>

          <div class="wizard-form-group">
            <div class="wizard-law-badge small">Ley 3: Hacerlo Fácil</div>
            <label for="wizard-easy">¿Cómo reducimos la fricción?</label>
            <input
              type="text"
              id="wizard-easy"
              class="input"
              placeholder="Dejo la esterilla desplegada junto a la cama"
              value="${wizardData.easy || ''}"
              maxlength="100"
            >
          </div>

          <div class="wizard-form-group">
            <div class="wizard-law-badge small">Ley 4: Hacerlo Satisfactorio</div>
            <label for="wizard-reward">¿Qué recompensa te das justo después?</label>
            <input
              type="text"
              id="wizard-reward"
              class="input"
              placeholder="Me digo: ¡Bien hecho! y marco el día"
              value="${wizardData.reward || ''}"
              maxlength="100"
            >
          </div>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-prev-footer-btn">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary" id="wizard-next-btn">
            Siguiente
            <span class="material-symbols-outlined icon-sm">arrow_forward</span>
          </button>
        </footer>
      </div>
    `;
  }

  // Paso 7: Duración y Confirmación
  if (wizardStep === 7) {
    const areaInfo = LIFE_AREAS.find(a => a.id === wizardData.area);

    return `
      <div class="wizard-page">
        <header class="wizard-header">
          <button class="btn btn--icon" id="wizard-prev-btn">
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <div class="wizard-progress">
            ${Array.from({length: totalSteps}, (_, i) => `
              <span class="wizard-step ${i + 1 === wizardStep ? 'active' : i + 1 < wizardStep ? 'completed' : ''}"></span>
            `).join('')}
          </div>
          <div class="wizard-progress-label">Paso ${wizardStep} de ${totalSteps}</div>
        </header>

        <main class="wizard-content">
          <h1 class="wizard-title">Tu compromiso</h1>

          <div class="wizard-summary">
            ${areaInfo ? `
              <div class="wizard-summary-item">
                <span class="material-symbols-outlined">${areaInfo.icon}</span>
                <span>${areaInfo.name}</span>
              </div>
            ` : ''}
            <div class="wizard-summary-habit">
              <strong>${wizardData.name}</strong>
              ${wizardData.scheduledTime ? `<span>a las ${wizardData.scheduledTime}</span>` : ''}
              ${wizardData.location ? `<span>${wizardData.location}</span>` : ''}
            </div>
          </div>

          <div class="wizard-form-group">
            <label>¿Cuánto tiempo para instalarlo?</label>
            <div class="wizard-duration-options">
              <label class="wizard-duration-option ${(wizardData.duration || 30) === 14 ? 'selected' : ''}">
                <input type="radio" name="duration" value="14" ${(wizardData.duration || 30) === 14 ? 'checked' : ''}>
                <span class="wizard-duration-value">2 semanas</span>
                <span class="wizard-duration-desc">Hábitos simples</span>
              </label>
              <label class="wizard-duration-option ${(wizardData.duration || 30) === 30 ? 'selected' : ''}">
                <input type="radio" name="duration" value="30" ${(wizardData.duration || 30) === 30 ? 'checked' : ''}>
                <span class="wizard-duration-value">1 mes</span>
                <span class="wizard-duration-desc">Mayoría de hábitos</span>
              </label>
              <label class="wizard-duration-option ${(wizardData.duration || 30) === 60 ? 'selected' : ''}">
                <input type="radio" name="duration" value="60" ${(wizardData.duration || 30) === 60 ? 'checked' : ''}>
                <span class="wizard-duration-value">2 meses</span>
                <span class="wizard-duration-desc">Hábitos complejos</span>
              </label>
              <label class="wizard-duration-option ${(wizardData.duration || 30) === 90 ? 'selected' : ''}">
                <input type="radio" name="duration" value="90" ${(wizardData.duration || 30) === 90 ? 'checked' : ''}>
                <span class="wizard-duration-value">3 meses</span>
                <span class="wizard-duration-desc">Cambios de estilo de vida</span>
              </label>
            </div>
          </div>

          <blockquote class="quote quote--wizard">
            <p>"No existe el '21 días mágicos'. Cada hábito tiene su tiempo."</p>
          </blockquote>
        </main>

        <footer class="wizard-footer">
          <button class="btn btn--tertiary" id="wizard-prev-footer-btn">
            <span class="material-symbols-outlined icon-sm">arrow_back</span>
            Atrás
          </button>
          <button class="btn btn--primary btn--large" id="wizard-save-btn">
            <span class="material-symbols-outlined">check</span>
            Activar Hábito
          </button>
        </footer>
      </div>
    `;
  }

  return '';
};

// ============================================================
// SUGERENCIAS DE HÁBITOS (Mark Manson)
// ============================================================

/**
 * Renderiza las sugerencias de hábitos de Mark Manson
 */
const renderHabitSuggestions = () => {
  const habitos = getHabitosManson();

  return `
    <section class="habit-suggestions">
      <header class="habit-suggestions__header">
        <span class="material-symbols-outlined">lightbulb</span>
        <div>
          <h3>6 Hábitos que Cambiarán tu Vida</h3>
          <p>Según Mark Manson, estos son los hábitos más transformadores (aunque nada sexis).</p>
        </div>
      </header>

      <div class="suggestion-cards">
        ${habitos.map(h => `
          <button class="suggestion-card" data-habit-id="${h.id}">
            <span class="material-symbols-outlined suggestion-card__icon">${h.icono}</span>
            <h4 class="suggestion-card__name">${h.nombre}</h4>
            <p class="suggestion-card__desc">${h.descripcion}</p>
            <div class="suggestion-card__benefits">
              ${h.beneficios.map(b => `<span class="benefit-tag">${b}</span>`).join('')}
            </div>
            <span class="suggestion-card__cta">
              <span class="material-symbols-outlined icon-sm">add</span>
              Crear este hábito
            </span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
};

/**
 * Configura los handlers para las tarjetas de sugerencia
 * @param {Object} data - Datos de la app para reRender
 */
const setupSuggestionCards = (data) => {
  const habitos = getHabitosManson();

  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const habitId = card.dataset.habitId;
      const habito = habitos.find(h => h.id === habitId);

      if (habito) {
        // Pre-rellenar wizardData con los datos de la sugerencia
        wizardData = {
          area: habito.area,
          identity: habito.identidad,
          name: habito.nombre,
          micro: habito.microVersion,
          fromSuggestion: true
        };

        // Iniciar el wizard
        currentView = 'wizard';
        wizardStep = 1;
        reRender(data);
      }
    });
  });
};

// ============================================================
// FUNCIONES PARA DESCANSO ATÉLICO
// ============================================================

/**
 * Configura el modal de actividades atélicas
 */
const setupAtelicModal = (data) => {
  const modal = document.getElementById('atelic-modal');
  const form = document.getElementById('atelic-form');

  document.getElementById('cancel-atelic')?.addEventListener('click', () => {
    modal.close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAtelicActivity(data);
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  // Configurar selección de iconos
  document.querySelectorAll('.atelic-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.atelic-icon-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('atelic-icon').value = btn.dataset.icon;
    });
  });
};

/**
 * Abre el modal de actividades atélicas
 */
const openAtelicModal = () => {
  const modal = document.getElementById('atelic-modal');

  // Resetear formulario
  document.getElementById('atelic-id').value = '';
  document.getElementById('atelic-name').value = '';
  document.getElementById('atelic-duration').value = '';
  document.getElementById('atelic-note').value = '';
  document.getElementById('atelic-icon').value = 'palette';

  // Resetear selección de iconos
  document.querySelectorAll('.atelic-icon-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === 0);
  });

  modal.showModal();
};

/**
 * Guarda una actividad atélica
 */
const saveAtelicActivity = (data) => {
  const name = document.getElementById('atelic-name').value.trim();

  if (!name) {
    showNotification('Describe qué hiciste', 'warning');
    return;
  }

  // Asegurar que existe el array
  if (!data.atelicActivities) {
    data.atelicActivities = [];
  }

  const activity = {
    id: document.getElementById('atelic-id').value || generateId(),
    name,
    icon: document.getElementById('atelic-icon').value,
    duration: document.getElementById('atelic-duration').value || null,
    note: document.getElementById('atelic-note').value.trim() || null,
    date: new Date().toISOString()
  };

  data.atelicActivities.push(activity);
  updateDataCallback('atelicActivities', data.atelicActivities);

  document.getElementById('atelic-modal').close();
  showNotification('¡Actividad de ocio registrada! El ocio es un fin en sí mismo.', 'success');
  location.reload();
};

/**
 * Elimina una actividad atélica
 */
const deleteAtelicActivity = (activityId, data) => {
  if (!confirm('¿Eliminar esta actividad?')) return;

  data.atelicActivities = data.atelicActivities.filter(a => a.id !== activityId);
  updateDataCallback('atelicActivities', data.atelicActivities);

  showNotification('Actividad eliminada', 'info');
  location.reload();
};
