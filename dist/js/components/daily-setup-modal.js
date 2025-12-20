/**
 * Oráculo - Modal de Volumen Fijo
 * Setup diario basado en la técnica de Burkeman
 *
 * Al abrir la app, el usuario define:
 * - Tiempo disponible
 * - Nivel de energía
 * - Qué tareas elige para hoy (Modo Menú)
 *
 * El sistema ajusta los límites del día según estos parámetros.
 */

import { showNotification, generateId } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';

// Tipos de tarea para Modo Menú
const TASK_TYPES = {
  importante: { name: 'Importante', icon: 'priority_high', color: 'var(--rosa-600)' },
  divertido: { name: 'Divertido', icon: 'mood', color: 'var(--tulip-tree-500)' },
  atelico: { name: 'Ocio', icon: 'spa', color: 'var(--turquesa-600)' },
  sincronia: { name: 'Sincronía', icon: 'group', color: 'var(--rosa-400)' }
};

// Nombres de columnas para mostrar
const COLUMN_NAMES = {
  backlog: 'Backlog',
  quarterly: 'Trimestre',
  monthly: 'Mes',
  weekly: 'Semana',
  daily: 'Hoy'
};

// Opciones de tiempo disponible
const TIME_OPTIONS = [
  { value: '2h', label: '2 horas', icon: 'schedule', limit: 1 },
  { value: '4h', label: '4 horas', icon: 'schedule', limit: 2 },
  { value: '6h', label: '6 horas', icon: 'schedule', limit: 3 },
  { value: 'full', label: 'Día completo', icon: 'wb_sunny', limit: 3 }
];

// Opciones de nivel de energía
const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', icon: 'battery_1_bar', modifier: -1, color: 'var(--rosa-400)' },
  { value: 'medium', label: 'Media', icon: 'battery_4_bar', modifier: 0, color: 'var(--gris-500)' },
  { value: 'high', label: 'Alta', icon: 'battery_full', modifier: 1, color: 'var(--turquesa-500)' }
];

/**
 * Verifica si el setup diario ya se ha hecho hoy
 */
export const needsDailySetup = (data) => {
  const today = new Date().toISOString().split('T')[0];
  const setupDate = data.dailySetup?.date;

  // Si no hay setup o es de otro día, necesita configurarse
  if (!setupDate || setupDate !== today) {
    return true;
  }

  return false;
};

/**
 * Calcula el límite diario basado en tiempo y energía
 */
export const calculateDailyLimit = (availableTime, energyLevel) => {
  const timeOption = TIME_OPTIONS.find(t => t.value === availableTime) || TIME_OPTIONS[1];
  const energyOption = ENERGY_OPTIONS.find(e => e.value === energyLevel) || ENERGY_OPTIONS[1];

  let limit = timeOption.limit + energyOption.modifier;

  // Mínimo 1, máximo 3
  limit = Math.max(1, Math.min(3, limit));

  return limit;
};

/**
 * Renderiza el modal de setup diario con 3 pasos:
 * 1. Tiempo y energía
 * 2. Selección de tareas (Modo Menú)
 * 3. Confirmación
 */
export const renderDailySetupModal = () => {
  return `
    <dialog id="daily-setup-modal" class="modal modal--setup">
      <div class="modal-content setup-content" id="daily-setup-form">

        <!-- PASO 1: Tiempo y Energía -->
        <div class="setup-step" id="setup-step-1" data-step="1">
          <header class="setup-header">
            <span class="material-symbols-outlined setup-icon">wb_twilight</span>
            <h2 class="setup-title">Buenos días</h2>
            <p class="setup-subtitle">¿Cómo es tu día hoy?</p>
          </header>

          <blockquote class="quote quote--inline setup-quote">
            <p>"${getReflexionDelDia('decisions')}"</p>
          </blockquote>

          <div class="setup-section">
            <label class="setup-label">
              <span class="material-symbols-outlined icon-sm">schedule</span>
              ¿Cuánto tiempo tienes para tus prioridades?
            </label>
            <div class="setup-options time-options">
              ${TIME_OPTIONS.map(opt => `
                <button
                  type="button"
                  class="setup-option time-option"
                  data-time="${opt.value}"
                >
                  <span class="material-symbols-outlined">${opt.icon}</span>
                  <span class="option-label">${opt.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="setup-section">
            <label class="setup-label">
              <span class="material-symbols-outlined icon-sm">battery_charging_full</span>
              ¿Cuál es tu nivel de energía?
            </label>
            <div class="setup-options energy-options">
              ${ENERGY_OPTIONS.map(opt => `
                <button
                  type="button"
                  class="setup-option energy-option"
                  data-energy="${opt.value}"
                  style="--option-color: ${opt.color}"
                >
                  <span class="material-symbols-outlined">${opt.icon}</span>
                  <span class="option-label">${opt.label}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="setup-result" id="setup-result" style="display: none;">
            <div class="result-card">
              <span class="material-symbols-outlined result-icon">tips_and_updates</span>
              <p class="result-text" id="result-text"></p>
            </div>
          </div>

          <input type="hidden" id="setup-time" value="">
          <input type="hidden" id="setup-energy" value="">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="skip-setup">
              Omitir
            </button>
            <button type="button" class="btn btn--primary" id="next-to-menu" disabled>
              Siguiente: Elegir tareas
              <span class="material-symbols-outlined icon-sm">arrow_forward</span>
            </button>
          </div>
        </div>

        <!-- PASO 2: Modo Menú - Elegir Tareas -->
        <div class="setup-step" id="setup-step-2" data-step="2" style="display: none;">
          <header class="setup-header">
            <span class="material-symbols-outlined setup-icon">restaurant_menu</span>
            <h2 class="setup-title">¿Qué eliges hoy?</h2>
            <p class="setup-subtitle">
              Esto no es una lista para terminar, es un menú para elegir.
            </p>
          </header>

          <div class="menu-slots-indicator" id="menu-slots-indicator">
            <span class="material-symbols-outlined">target</span>
            <span id="slots-count">Puedes elegir hasta <strong>3</strong> tareas</span>
          </div>

          <div class="menu-container" id="menu-tasks-container">
            <!-- Se llena dinámicamente con las tareas -->
            <p class="loading">Cargando tareas...</p>
          </div>

          <blockquote class="quote quote--inline setup-quote">
            <p>"${getReflexionDelDia('kanban')}"</p>
          </blockquote>

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="back-to-step1">
              <span class="material-symbols-outlined icon-sm">arrow_back</span>
              Volver
            </button>
            <button type="button" class="btn btn--primary" id="confirm-setup">
              <span class="material-symbols-outlined icon-sm">check</span>
              Empezar el día
            </button>
          </div>
        </div>

      </div>
    </dialog>
  `;
};

/**
 * Renderiza las tareas pendientes en formato Menú
 */
const renderMenuTasks = (data, limit) => {
  const objectives = data.objectives || {};
  const projects = (data.projects || []).filter(p => p.status === 'active' || p.status === 'paused');

  // Combinar tareas de todas las columnas excepto daily
  const allItems = [];
  ['quarterly', 'monthly', 'weekly', 'backlog'].forEach(column => {
    (objectives[column] || []).forEach(item => {
      if (!item.completed) {
        allItems.push({ ...item, column });
      }
    });
  });

  // Tareas ya en daily (para mostrarlas como ya elegidas)
  const dailyItems = (objectives.daily || []).filter(i => !i.completed);

  if (allItems.length === 0 && dailyItems.length === 0) {
    return `
      <div class="menu-empty">
        <span class="material-symbols-outlined">inbox</span>
        <p>No tienes tareas pendientes.</p>
        <p class="hint">Añade tareas en la vista de Horizontes.</p>
      </div>
    `;
  }

  // Agrupar por tipo
  const byType = {
    importante: allItems.filter(i => i.taskType === 'importante'),
    divertido: allItems.filter(i => i.taskType === 'divertido'),
    atelico: allItems.filter(i => i.taskType === 'atelico'),
    sincronia: allItems.filter(i => i.taskType === 'sincronia'),
    otros: allItems.filter(i => !i.taskType || !TASK_TYPES[i.taskType])
  };

  let html = '';

  // Mostrar tareas ya en foco
  if (dailyItems.length > 0) {
    html += `
      <section class="menu-section menu-section--current">
        <h3 class="menu-section__title menu-section__title--current">
          <span class="material-symbols-outlined">today</span>
          Ya en foco (${dailyItems.length})
        </h3>
        <ul class="menu-items">
          ${dailyItems.map(item => renderSetupMenuItem(item, projects, true)).join('')}
        </ul>
      </section>
    `;
  }

  // Mostrar tareas disponibles agrupadas por tipo
  Object.entries(byType).forEach(([type, items]) => {
    if (items.length === 0) return;

    const typeInfo = TASK_TYPES[type] || { name: 'Otras tareas', icon: 'list', color: 'var(--gris-500)' };

    html += `
      <section class="menu-section" data-type="${type}">
        <h3 class="menu-section__title" style="--type-color: ${typeInfo.color}">
          <span class="material-symbols-outlined">${typeInfo.icon}</span>
          ${typeInfo.name}
          <span class="menu-section__count">${items.length}</span>
        </h3>
        <ul class="menu-items">
          ${items.map(item => renderSetupMenuItem(item, projects, false)).join('')}
        </ul>
      </section>
    `;
  });

  return html || `
    <div class="menu-empty">
      <span class="material-symbols-outlined">check_circle</span>
      <p>¡Todas tus tareas ya están en foco!</p>
    </div>
  `;
};

/**
 * Renderiza un item del menú en el setup
 */
const renderSetupMenuItem = (item, projects, isInDaily = false) => {
  const project = item.projectId ? projects.find(p => p.id === item.projectId) : null;
  const columnName = COLUMN_NAMES[item.column];

  return `
    <li class="menu-item ${isInDaily ? 'menu-item--in-daily' : ''}" data-id="${item.id}" data-column="${item.column || 'daily'}">
      <label class="menu-item__select">
        <input
          type="checkbox"
          class="menu-item__checkbox"
          data-id="${item.id}"
          ${isInDaily ? 'checked disabled' : ''}
        >
        <span class="menu-item__text">${item.text}</span>
      </label>

      <div class="menu-item__meta">
        <span class="menu-item__horizon" title="Horizonte: ${columnName}">
          ${columnName}
        </span>
        ${project ? `
          <span class="menu-item__project" style="--project-color: ${project.color}">
            ${project.name}
          </span>
        ` : ''}
      </div>

      ${isInDaily ? `
        <span class="menu-item__badge">
          <span class="material-symbols-outlined icon-sm">check</span>
          En foco
        </span>
      ` : ''}
    </li>
  `;
};

/**
 * Inicializa el modal de setup diario con navegación entre pasos
 */
export const initDailySetupModal = (data, updateData) => {
  const modal = document.getElementById('daily-setup-modal');
  if (!modal) return;

  let selectedTime = null;
  let selectedEnergy = null;
  let selectedTasks = []; // IDs de tareas seleccionadas para hoy
  let currentLimit = 3;

  // === PASO 1: Selección de tiempo y energía ===

  // Selección de tiempo
  document.querySelectorAll('.time-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedTime = btn.dataset.time;
      document.getElementById('setup-time').value = selectedTime;
      updateResult();
    });
  });

  // Selección de energía
  document.querySelectorAll('.energy-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.energy-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEnergy = btn.dataset.energy;
      document.getElementById('setup-energy').value = selectedEnergy;
      updateResult();
    });
  });

  // Actualizar resultado del paso 1
  const updateResult = () => {
    const nextBtn = document.getElementById('next-to-menu');
    const resultDiv = document.getElementById('setup-result');
    const resultText = document.getElementById('result-text');

    if (selectedTime && selectedEnergy) {
      currentLimit = calculateDailyLimit(selectedTime, selectedEnergy);
      nextBtn.disabled = false;
      resultDiv.style.display = 'block';

      let message = '';
      if (currentLimit === 1) {
        message = 'Hoy es un día para enfocarte en UNA sola cosa. Elige tu Roca Principal.';
      } else if (currentLimit === 2) {
        message = 'Tienes espacio para 2 prioridades. Recuerda: menos es más.';
      } else {
        message = 'Puedes abordar hasta 3 prioridades hoy.';
      }

      resultText.textContent = message;
    } else {
      nextBtn.disabled = true;
      resultDiv.style.display = 'none';
    }
  };

  // Omitir setup - guardar la fecha para no volver a mostrar hoy
  document.getElementById('skip-setup')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];

    // Guardar solo la fecha (sin tiempo/energía) para evitar que vuelva a aparecer
    data.dailySetup = {
      ...data.dailySetup,
      date: today,
      skippedAt: new Date().toISOString()
    };

    updateData('dailySetup', data.dailySetup);
    modal.close();
  });

  // Ir al paso 2 (Modo Menú)
  document.getElementById('next-to-menu')?.addEventListener('click', () => {
    if (!selectedTime || !selectedEnergy) return;

    // Ocultar paso 1, mostrar paso 2
    document.getElementById('setup-step-1').style.display = 'none';
    document.getElementById('setup-step-2').style.display = 'block';

    // Actualizar indicador de slots
    const dailyTasks = (data.objectives?.daily || []).filter(i => !i.completed);
    const slotsUsed = dailyTasks.length;
    const slotsAvailable = Math.max(0, currentLimit - slotsUsed);

    document.getElementById('slots-count').innerHTML = slotsAvailable > 0
      ? `Puedes elegir hasta <strong>${slotsAvailable}</strong> tarea${slotsAvailable > 1 ? 's' : ''} más`
      : `<strong>Sin slots disponibles</strong>. Completa algo primero.`;

    // Renderizar tareas en modo menú
    const container = document.getElementById('menu-tasks-container');
    container.innerHTML = renderMenuTasks(data, currentLimit);

    // Configurar checkboxes de selección
    setupMenuCheckboxes(slotsAvailable);
  });

  // Configurar checkboxes del menú
  const setupMenuCheckboxes = (maxSelectable) => {
    const checkboxes = document.querySelectorAll('.menu-item__checkbox:not([disabled])');

    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        selectedTasks = Array.from(document.querySelectorAll('.menu-item__checkbox:checked:not([disabled])'))
          .map(cb => ({
            id: cb.dataset.id,
            column: cb.closest('.menu-item').dataset.column
          }));

        // Verificar límite
        if (selectedTasks.length > maxSelectable) {
          checkbox.checked = false;
          selectedTasks = selectedTasks.filter(t => t.id !== checkbox.dataset.id);
          showNotification(`Solo puedes elegir ${maxSelectable} tarea${maxSelectable > 1 ? 's' : ''} más`, 'warning');
          return;
        }

        // Actualizar visual
        updateSelectionCount(maxSelectable);
      });
    });
  };

  // Actualizar contador de selección
  const updateSelectionCount = (maxSelectable) => {
    const slotsIndicator = document.getElementById('slots-count');
    const remaining = maxSelectable - selectedTasks.length;

    if (remaining === 0) {
      slotsIndicator.innerHTML = `<strong>¡Slots completos!</strong> Has elegido ${selectedTasks.length} tarea${selectedTasks.length > 1 ? 's' : ''}`;
    } else {
      slotsIndicator.innerHTML = `Has elegido <strong>${selectedTasks.length}</strong> de ${maxSelectable} slots disponibles`;
    }
  };

  // Volver al paso 1
  document.getElementById('back-to-step1')?.addEventListener('click', () => {
    document.getElementById('setup-step-2').style.display = 'none';
    document.getElementById('setup-step-1').style.display = 'block';
    selectedTasks = [];
  });

  // Confirmar setup
  document.getElementById('confirm-setup')?.addEventListener('click', () => {
    if (!selectedTime || !selectedEnergy) return;

    const today = new Date().toISOString().split('T')[0];

    // Mover tareas seleccionadas a daily
    if (selectedTasks.length > 0) {
      selectedTasks.forEach(({ id, column }) => {
        if (column === 'daily') return; // Ya está en daily

        const sourceItems = data.objectives[column];
        if (!sourceItems) return;

        const itemIndex = sourceItems.findIndex(i => i.id === id);
        if (itemIndex === -1) return;

        const [item] = sourceItems.splice(itemIndex, 1);
        item.movedAt = new Date().toISOString();
        item.movedFrom = column;

        if (!data.objectives.daily) {
          data.objectives.daily = [];
        }
        data.objectives.daily.push(item);
      });

      updateData('objectives', data.objectives);
    }

    // Guardar configuración del día
    data.dailySetup = {
      date: today,
      availableTime: selectedTime,
      energyLevel: selectedEnergy,
      dailyLimit: currentLimit,
      rocaPrincipal: data.dailySetup?.rocaPrincipal || null,
      setupAt: new Date().toISOString()
    };

    updateData('dailySetup', data.dailySetup);
    modal.close();

    // Mensaje de confirmación
    const tasksMsg = selectedTasks.length > 0
      ? ` Has elegido ${selectedTasks.length} tarea${selectedTasks.length > 1 ? 's' : ''}.`
      : '';

    showNotification(`¡Día configurado!${tasksMsg}`, 'success');

    // Recargar para ver los cambios
    if (selectedTasks.length > 0) {
      location.reload();
    }
  });

  // Mostrar modal si es necesario
  if (needsDailySetup(data)) {
    setTimeout(() => {
      modal.showModal();
    }, 500);
  }
};

export default {
  needsDailySetup,
  calculateDailyLimit,
  renderDailySetupModal,
  initDailySetupModal
};
