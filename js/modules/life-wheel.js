/**
 * Oráculo - Rueda de la Vida
 * Sistema de evaluación trimestral de áreas de vida
 */

import { generateId, showNotification, navigateTo } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';
import { renderWheelChart } from '../components/wheel-chart.js';
import { renderEvolutionChart } from '../components/evolution-chart.js';

let updateDataCallback = null;
let currentData = null;

// Colores por área para gráficos
const AREA_COLORS = {
  health: '#10b981',      // Verde
  emotional: '#8b5cf6',   // Violeta
  growth: '#3b82f6',      // Azul
  family: '#e11d48',      // Rosa
  social: '#f97316',      // Naranja
  career: '#06b6d4',      // Cian
  finances: '#eab308',    // Amarillo
  leisure: '#6b7280'      // Gris
};

/**
 * Obtiene el trimestre actual (Q1-Q4)
 */
const getCurrentQuarter = () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const quarter = Math.floor(month / 3) + 1;
  return `Q${quarter}-${year}`;
};

/**
 * Renderiza la página principal de la Rueda de la Vida
 */
export const render = (data) => {
  currentData = data;
  const lifeWheel = data.lifeWheel || {};
  const areas = lifeWheel.areas || [];
  const evaluations = lifeWheel.evaluations || [];
  const lastEvaluation = evaluations[evaluations.length - 1] || null;
  const currentQuarter = getCurrentQuarter();

  // Determinar si hay evaluación del trimestre actual
  const hasCurrentQuarterEval = evaluations.some(e => e.quarter === currentQuarter);

  return `
    <div class="life-wheel-page">
      <header class="page-header">
        <h1 class="page-title">
          <span class="material-symbols-outlined icon-lg">donut_large</span>
          Rueda de la Vida
        </h1>
        <p class="page-description">
          Evalúa trimestralmente las áreas más importantes de tu vida.
          Una visión global que te ayuda a descubrir tus valores y prioridades.
        </p>
      </header>

      <!-- Acciones principales -->
      <div class="wheel-actions">
        <button class="btn btn--primary" id="new-evaluation-btn">
          <span class="material-symbols-outlined">add_circle</span>
          ${hasCurrentQuarterEval ? 'Repetir evaluación' : 'Nueva evaluación'} (${currentQuarter})
        </button>

        ${evaluations.length > 0 ? `
          <div class="view-toggle">
            <button class="btn btn--secondary active" data-view="wheel">
              <span class="material-symbols-outlined">donut_large</span>
              Rueda
            </button>
            <button class="btn btn--secondary" data-view="evolution">
              <span class="material-symbols-outlined">show_chart</span>
              Evolución
            </button>
            ${evaluations.length >= 2 ? `
              <button class="btn btn--secondary" data-view="compare">
                <span class="material-symbols-outlined">compare</span>
                Comparar
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <!-- Contenido principal -->
      <div class="wheel-content" id="wheel-content">
        ${evaluations.length === 0
          ? renderEmptyState()
          : renderWheelView(lastEvaluation, areas)}
      </div>

      <!-- Selector de evaluación (si hay histórico) -->
      ${evaluations.length > 1 ? `
        <div class="evaluation-selector">
          <label for="evaluation-select">Ver evaluación:</label>
          <select id="evaluation-select" class="input">
            ${evaluations.map((e, i) => `
              <option value="${e.id}" ${i === evaluations.length - 1 ? 'selected' : ''}>
                ${e.quarter} - ${new Date(e.date).toLocaleDateString('es-ES')}
              </option>
            `).join('')}
          </select>
        </div>
      ` : ''}

      <!-- Reflexión de Burkeman -->
      ${evaluations.length > 0 ? `
        <section class="wheel-reflection">
          <blockquote class="quote quote--secondary">
            <p>"${getReflexionDelDia('values')}"</p>
            <cite>— Oliver Burkeman</cite>
          </blockquote>
        </section>
      ` : ''}

      <!-- Gestión de áreas -->
      <section class="wheel-areas-management">
        <h2>
          <span class="material-symbols-outlined">tune</span>
          Personalizar áreas
        </h2>
        <p class="text-muted">
          Puedes ajustar las áreas para que reflejen lo que es importante para ti.
        </p>
        <div class="areas-list">
          ${areas.map((area, index) => renderAreaItem(area, index, data.values)).join('')}
        </div>
      </section>

      <!-- Modal de evaluación -->
      ${renderEvaluationModal(areas)}

      <!-- Modal de editar área -->
      ${renderEditAreaModal()}
    </div>
  `;
};

/**
 * Renderiza el estado vacío
 */
const renderEmptyState = () => `
  <div class="empty-state empty-state--large wheel-empty">
    <span class="material-symbols-outlined icon-xl">donut_large</span>
    <h3>Tu primera evaluación trimestral</h3>
    <p>
      La Rueda de la Vida es una herramienta de coaching que te permite evaluar
      tu satisfacción en 8 áreas clave. Al completarla trimestralmente,
      podrás ver tu evolución y descubrir qué valores son más importantes para ti.
    </p>
    <div class="wheel-preview">
      ${renderWheelChart({}, getDefaultAreas(), { size: 300, showLabels: true, interactive: false })}
    </div>
    <p class="text-sm text-muted">
      Solo te llevará unos minutos. ¿Empezamos?
    </p>
  </div>
`;

/**
 * Renderiza la vista de la rueda
 */
const renderWheelView = (evaluation, areas) => {
  if (!evaluation) return renderEmptyState();

  const scores = evaluation.scores || {};

  return `
    <div class="wheel-view">
      <div class="wheel-chart-container">
        ${renderWheelChart(scores, areas, {
          size: 400,
          showLabels: true,
          showDesired: true,
          interactive: true,
          colors: AREA_COLORS
        })}
      </div>

      <div class="wheel-legend">
        <div class="legend-item">
          <span class="legend-color legend-color--current"></span>
          <span>Puntuación actual</span>
        </div>
        <div class="legend-item">
          <span class="legend-color legend-color--desired"></span>
          <span>Puntuación deseada</span>
        </div>
      </div>

      <div class="wheel-scores-grid">
        ${areas.map(area => {
          const score = scores[area.id] || { current: 0, desired: 0 };
          const diff = score.desired - score.current;
          return `
            <div class="score-card" data-area="${area.id}" style="--area-color: ${AREA_COLORS[area.id] || '#6b7280'}">
              <div class="score-card__header">
                <span class="material-symbols-outlined">${area.icon}</span>
                <span class="score-card__name">${area.name}</span>
              </div>
              <div class="score-card__scores">
                <span class="score-current">${score.current}</span>
                <span class="score-arrow">→</span>
                <span class="score-desired">${score.desired}</span>
                ${diff > 0 ? `<span class="score-diff score-diff--positive">+${diff}</span>` : ''}
              </div>
              ${score.reflection ? `
                <button class="btn btn--text score-card__details" data-area="${area.id}">
                  Ver reflexión
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      ${evaluation.overallReflection ? `
        <div class="overall-reflection">
          <h3>Reflexión general</h3>
          <p>${evaluation.overallReflection}</p>
        </div>
      ` : ''}
    </div>
  `;
};

/**
 * Renderiza un item de área para gestión
 */
const renderAreaItem = (area, index, values) => {
  const linkedValue = values?.find(v => v.id === area.linkedValueId);

  return `
    <div class="area-item" data-area-id="${area.id}">
      <span class="area-item__order">${index + 1}</span>
      <span class="material-symbols-outlined area-item__icon">${area.icon}</span>
      <span class="area-item__name">${area.name}</span>
      ${linkedValue ? `
        <span class="area-item__value" title="Vinculado a: ${linkedValue.name}">
          <span class="material-symbols-outlined icon-xs">link</span>
          ${linkedValue.name}
        </span>
      ` : ''}
      <button class="btn btn--icon area-item__edit" title="Editar área">
        <span class="material-symbols-outlined">edit</span>
      </button>
    </div>
  `;
};

/**
 * Renderiza el modal de evaluación (wizard)
 */
const renderEvaluationModal = (areas) => `
  <dialog id="evaluation-modal" class="modal modal--large">
    <div class="modal-content evaluation-wizard">
      <header class="wizard-header">
        <h2 class="modal-title">Evaluación Trimestral</h2>
        <div class="wizard-progress">
          <span class="wizard-step-indicator">Paso <span id="current-step">1</span> de ${areas.length + 1}</span>
          <div class="wizard-progress-bar">
            <div class="wizard-progress-fill" id="wizard-progress-fill"></div>
          </div>
        </div>
      </header>

      <div class="wizard-content" id="wizard-content">
        <!-- El contenido se genera dinámicamente -->
      </div>

      <footer class="wizard-footer">
        <button type="button" class="btn btn--tertiary" id="wizard-cancel">
          Cancelar
        </button>
        <div class="wizard-nav">
          <button type="button" class="btn btn--secondary" id="wizard-prev" disabled>
            <span class="material-symbols-outlined">arrow_back</span>
            Anterior
          </button>
          <button type="button" class="btn btn--primary" id="wizard-next">
            Siguiente
            <span class="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>
      </footer>
    </div>
  </dialog>
`;

/**
 * Renderiza el modal de editar área
 */
const renderEditAreaModal = () => `
  <dialog id="edit-area-modal" class="modal">
    <form method="dialog" class="modal-content" id="edit-area-form">
      <h2 class="modal-title">Editar Área</h2>

      <div class="form-group">
        <label for="area-name">Nombre del área</label>
        <input type="text" id="area-name" class="input" maxlength="30" required>
      </div>

      <div class="form-group">
        <label for="area-icon">Icono (Material Symbol)</label>
        <input type="text" id="area-icon" class="input" placeholder="fitness_center">
        <p class="form-hint">
          Ver iconos en <a href="https://fonts.google.com/icons" target="_blank">Material Symbols</a>
        </p>
      </div>

      <div class="form-group">
        <label for="area-value">Vincular a valor (opcional)</label>
        <select id="area-value" class="input">
          <option value="">Sin vincular</option>
        </select>
      </div>

      <input type="hidden" id="area-id">

      <div class="modal-actions">
        <button type="button" class="btn btn--tertiary" id="cancel-area">Cancelar</button>
        <button type="submit" class="btn btn--primary">Guardar</button>
      </div>
    </form>
  </dialog>
`;

/**
 * Obtiene las áreas por defecto
 */
const getDefaultAreas = () => [
  { id: 'health', name: 'Salud física', icon: 'fitness_center', order: 0 },
  { id: 'emotional', name: 'Estado emocional', icon: 'psychology', order: 1 },
  { id: 'growth', name: 'Desarrollo personal', icon: 'school', order: 2 },
  { id: 'family', name: 'Familia/Pareja', icon: 'favorite', order: 3 },
  { id: 'social', name: 'Relaciones sociales', icon: 'groups', order: 4 },
  { id: 'career', name: 'Profesión', icon: 'work', order: 5 },
  { id: 'finances', name: 'Finanzas', icon: 'savings', order: 6 },
  { id: 'leisure', name: 'Ocio/Tiempo libre', icon: 'spa', order: 7 }
];

// ============================================================
// WIZARD DE EVALUACIÓN
// ============================================================

let wizardState = {
  currentStep: 0,
  scores: {},
  overallReflection: ''
};

/**
 * Inicia el wizard de evaluación
 */
const startEvaluationWizard = () => {
  const areas = currentData.lifeWheel?.areas || getDefaultAreas();
  const modal = document.getElementById('evaluation-modal');

  // Reiniciar estado
  wizardState = {
    currentStep: 0,
    scores: {},
    overallReflection: ''
  };

  // Renderizar primer paso
  renderWizardStep(areas);
  updateWizardProgress(areas.length + 1);

  modal.showModal();
};

/**
 * Renderiza un paso del wizard
 */
const renderWizardStep = (areas) => {
  const container = document.getElementById('wizard-content');
  const step = wizardState.currentStep;

  if (step < areas.length) {
    // Paso de evaluación de área
    const area = areas[step];
    const existingScore = wizardState.scores[area.id] || { current: 5, desired: 7, reflection: {} };

    container.innerHTML = `
      <div class="wizard-step wizard-step--area">
        <div class="wizard-area-header" style="--area-color: ${AREA_COLORS[area.id] || '#6b7280'}">
          <span class="material-symbols-outlined icon-xl">${area.icon}</span>
          <h3>${area.name}</h3>
        </div>

        <div class="wizard-sliders">
          <div class="slider-group">
            <label>
              ¿Cómo te sientes actualmente en esta área?
              <span class="slider-value" id="current-value">${existingScore.current}</span>
            </label>
            <input type="range" min="1" max="10" value="${existingScore.current}"
                   class="slider" id="score-current">
            <div class="slider-labels">
              <span>1 - Muy insatisfecha</span>
              <span>10 - Muy satisfecha</span>
            </div>
          </div>

          <div class="slider-group">
            <label>
              ¿Qué puntuación te gustaría tener?
              <span class="slider-value" id="desired-value">${existingScore.desired}</span>
            </label>
            <input type="range" min="1" max="10" value="${existingScore.desired}"
                   class="slider" id="score-desired">
            <div class="slider-labels">
              <span>1</span>
              <span>10</span>
            </div>
          </div>
        </div>

        <div class="wizard-reflections">
          <div class="form-group">
            <label for="reflection-why">¿Por qué has puntuado así esta área?</label>
            <textarea id="reflection-why" class="input textarea" rows="2"
                      placeholder="Reflexiona sobre tu situación actual...">${existingScore.reflection?.why || ''}</textarea>
          </div>

          <div class="form-group">
            <label for="reflection-improve">¿Qué aspectos podrías mejorar?</label>
            <textarea id="reflection-improve" class="input textarea" rows="2"
                      placeholder="Identifica oportunidades de mejora...">${existingScore.reflection?.improve || ''}</textarea>
          </div>

          <div class="form-group">
            <label for="reflection-actions">¿Qué harás para lograrlo?</label>
            <textarea id="reflection-actions" class="input textarea" rows="2"
                      placeholder="Define acciones concretas...">${existingScore.reflection?.actions || ''}</textarea>
          </div>
        </div>
      </div>
    `;

    // Eventos de sliders
    setupSliderEvents();
  } else {
    // Paso final: resumen y reflexión general
    container.innerHTML = renderWizardSummary(areas);
  }

  // Actualizar botones de navegación
  updateWizardNavigation(areas.length);
};

/**
 * Renderiza el resumen del wizard
 */
const renderWizardSummary = (areas) => {
  const scores = wizardState.scores;

  return `
    <div class="wizard-step wizard-step--summary">
      <h3>Resumen de tu evaluación</h3>

      <div class="summary-wheel">
        ${renderWheelChart(scores, areas, { size: 300, showLabels: true, showDesired: true })}
      </div>

      <div class="summary-scores">
        ${areas.map(area => {
          const score = scores[area.id] || { current: 0, desired: 0 };
          return `
            <div class="summary-score-item">
              <span class="material-symbols-outlined">${area.icon}</span>
              <span class="name">${area.name}</span>
              <span class="scores">${score.current} → ${score.desired}</span>
            </div>
          `;
        }).join('')}
      </div>

      <div class="form-group">
        <label for="overall-reflection">Reflexión general del trimestre</label>
        <textarea id="overall-reflection" class="input textarea" rows="4"
                  placeholder="¿Qué conclusiones sacas de esta evaluación? ¿Qué áreas quieres priorizar?">${wizardState.overallReflection}</textarea>
      </div>
    </div>
  `;
};

/**
 * Configura eventos de sliders
 */
const setupSliderEvents = () => {
  const currentSlider = document.getElementById('score-current');
  const desiredSlider = document.getElementById('score-desired');
  const currentValue = document.getElementById('current-value');
  const desiredValue = document.getElementById('desired-value');

  currentSlider?.addEventListener('input', (e) => {
    currentValue.textContent = e.target.value;
  });

  desiredSlider?.addEventListener('input', (e) => {
    desiredValue.textContent = e.target.value;
  });
};

/**
 * Actualiza la barra de progreso del wizard
 */
const updateWizardProgress = (totalSteps) => {
  const progress = ((wizardState.currentStep + 1) / totalSteps) * 100;
  const fill = document.getElementById('wizard-progress-fill');
  const stepIndicator = document.getElementById('current-step');

  if (fill) fill.style.width = `${progress}%`;
  if (stepIndicator) stepIndicator.textContent = wizardState.currentStep + 1;
};

/**
 * Actualiza los botones de navegación del wizard
 */
const updateWizardNavigation = (totalAreas) => {
  const prevBtn = document.getElementById('wizard-prev');
  const nextBtn = document.getElementById('wizard-next');
  const step = wizardState.currentStep;

  if (prevBtn) prevBtn.disabled = step === 0;

  if (nextBtn) {
    if (step >= totalAreas) {
      nextBtn.innerHTML = `
        <span class="material-symbols-outlined">check</span>
        Guardar evaluación
      `;
    } else {
      nextBtn.innerHTML = `
        Siguiente
        <span class="material-symbols-outlined">arrow_forward</span>
      `;
    }
  }
};

/**
 * Guarda los datos del paso actual antes de avanzar
 */
const saveCurrentStepData = (areas) => {
  const step = wizardState.currentStep;

  if (step < areas.length) {
    const area = areas[step];
    wizardState.scores[area.id] = {
      current: parseInt(document.getElementById('score-current')?.value || 5),
      desired: parseInt(document.getElementById('score-desired')?.value || 7),
      reflection: {
        why: document.getElementById('reflection-why')?.value || '',
        improve: document.getElementById('reflection-improve')?.value || '',
        actions: document.getElementById('reflection-actions')?.value || ''
      }
    };
  } else {
    wizardState.overallReflection = document.getElementById('overall-reflection')?.value || '';
  }
};

/**
 * Navega al paso anterior del wizard
 */
const wizardPrev = (areas) => {
  if (wizardState.currentStep > 0) {
    saveCurrentStepData(areas);
    wizardState.currentStep--;
    renderWizardStep(areas);
    updateWizardProgress(areas.length + 1);
  }
};

/**
 * Navega al paso siguiente del wizard o guarda
 */
const wizardNext = (areas) => {
  saveCurrentStepData(areas);

  if (wizardState.currentStep >= areas.length) {
    // Guardar evaluación
    saveEvaluation(areas);
  } else {
    wizardState.currentStep++;
    renderWizardStep(areas);
    updateWizardProgress(areas.length + 1);
  }
};

/**
 * Guarda la evaluación completa
 */
const saveEvaluation = (areas) => {
  const evaluation = {
    id: generateId(),
    date: new Date().toISOString(),
    quarter: getCurrentQuarter(),
    scores: wizardState.scores,
    overallReflection: wizardState.overallReflection,
    createdAt: new Date().toISOString()
  };

  const lifeWheel = currentData.lifeWheel || { areas: getDefaultAreas(), evaluations: [], settings: {} };
  lifeWheel.evaluations = [...(lifeWheel.evaluations || []), evaluation];

  updateDataCallback('lifeWheel', lifeWheel);

  document.getElementById('evaluation-modal').close();
  showNotification('Evaluación guardada correctamente', 'success');

  // Recargar vista
  location.reload();
};

// ============================================================
// INICIALIZACIÓN
// ============================================================

/**
 * Inicializa los eventos de la página
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;
  currentData = data;

  const areas = data.lifeWheel?.areas || getDefaultAreas();

  // Botón nueva evaluación
  document.getElementById('new-evaluation-btn')?.addEventListener('click', startEvaluationWizard);

  // Navegación del wizard
  document.getElementById('wizard-prev')?.addEventListener('click', () => wizardPrev(areas));
  document.getElementById('wizard-next')?.addEventListener('click', () => wizardNext(areas));
  document.getElementById('wizard-cancel')?.addEventListener('click', () => {
    document.getElementById('evaluation-modal').close();
  });

  // Toggle de vistas
  document.querySelectorAll('.view-toggle [data-view]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = e.currentTarget.dataset.view;
      switchView(view, data);

      // Actualizar estado activo
      document.querySelectorAll('.view-toggle [data-view]').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
    });
  });

  // Selector de evaluación
  document.getElementById('evaluation-select')?.addEventListener('change', (e) => {
    const evalId = e.target.value;
    const evaluation = data.lifeWheel?.evaluations?.find(ev => ev.id === evalId);
    if (evaluation) {
      renderSelectedEvaluation(evaluation, areas);
    }
  });

  // Editar áreas
  document.querySelectorAll('.area-item__edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const areaId = e.target.closest('.area-item').dataset.areaId;
      const area = areas.find(a => a.id === areaId);
      if (area) openEditAreaModal(area, data.values);
    });
  });

  // Formulario editar área
  document.getElementById('edit-area-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAreaEdit(data);
  });

  document.getElementById('cancel-area')?.addEventListener('click', () => {
    document.getElementById('edit-area-modal').close();
  });

  // Ver reflexión de área
  document.querySelectorAll('.score-card__details').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const areaId = e.target.dataset.area;
      showAreaReflection(areaId, data);
    });
  });

  // Cerrar modales con click fuera
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.close();
    });
  });
};

/**
 * Cambia entre vistas (rueda/evolución/comparar)
 */
const switchView = (view, data) => {
  const container = document.getElementById('wheel-content');
  const areas = data.lifeWheel?.areas || getDefaultAreas();
  const evaluations = data.lifeWheel?.evaluations || [];
  const lastEval = evaluations[evaluations.length - 1];

  switch (view) {
    case 'wheel':
      container.innerHTML = renderWheelView(lastEval, areas);
      break;
    case 'evolution':
      container.innerHTML = renderEvolutionView(evaluations, areas);
      break;
    case 'compare':
      container.innerHTML = renderCompareView(evaluations, areas);
      break;
  }

  // Reinicializar eventos específicos de la vista
  initViewEvents(view, data);
};

/**
 * Renderiza la vista de evolución
 */
const renderEvolutionView = (evaluations, areas) => {
  if (evaluations.length < 2) {
    return `
      <div class="empty-state">
        <span class="material-symbols-outlined icon-lg">show_chart</span>
        <p>Necesitas al menos 2 evaluaciones para ver la evolución.</p>
      </div>
    `;
  }

  return `
    <div class="evolution-view">
      <div class="evolution-chart-container">
        ${renderEvolutionChart(evaluations, areas, { width: 700, height: 350, colors: AREA_COLORS })}
      </div>

      <div class="evolution-legend">
        ${areas.map(area => `
          <label class="evolution-legend-item">
            <input type="checkbox" data-area="${area.id}" checked>
            <span class="legend-color" style="background: ${AREA_COLORS[area.id] || '#6b7280'}"></span>
            <span>${area.name}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;
};

/**
 * Renderiza la vista de comparación
 */
const renderCompareView = (evaluations, areas) => {
  if (evaluations.length < 2) {
    return `
      <div class="empty-state">
        <span class="material-symbols-outlined icon-lg">compare</span>
        <p>Necesitas al menos 2 evaluaciones para comparar.</p>
      </div>
    `;
  }

  const eval1 = evaluations[evaluations.length - 2];
  const eval2 = evaluations[evaluations.length - 1];

  return `
    <div class="compare-view">
      <div class="compare-selectors">
        <select id="compare-eval-1" class="input">
          ${evaluations.map((e, i) => `
            <option value="${e.id}" ${i === evaluations.length - 2 ? 'selected' : ''}>
              ${e.quarter}
            </option>
          `).join('')}
        </select>
        <span class="compare-vs">vs</span>
        <select id="compare-eval-2" class="input">
          ${evaluations.map((e, i) => `
            <option value="${e.id}" ${i === evaluations.length - 1 ? 'selected' : ''}>
              ${e.quarter}
            </option>
          `).join('')}
        </select>
      </div>

      <div class="compare-wheels">
        <div class="compare-wheel">
          <h4>${eval1.quarter}</h4>
          ${renderWheelChart(eval1.scores, areas, { size: 280, showLabels: true })}
        </div>
        <div class="compare-wheel">
          <h4>${eval2.quarter}</h4>
          ${renderWheelChart(eval2.scores, areas, { size: 280, showLabels: true })}
        </div>
      </div>

      <div class="compare-diff">
        <h4>Cambios</h4>
        ${areas.map(area => {
          const score1 = eval1.scores[area.id]?.current || 0;
          const score2 = eval2.scores[area.id]?.current || 0;
          const diff = score2 - score1;
          const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : 'neutral';

          return `
            <div class="compare-diff-item">
              <span class="material-symbols-outlined">${area.icon}</span>
              <span class="name">${area.name}</span>
              <span class="diff diff--${diffClass}">
                ${diff > 0 ? '+' : ''}${diff}
              </span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
};

/**
 * Inicializa eventos específicos de cada vista
 */
const initViewEvents = (view, data) => {
  if (view === 'evolution') {
    document.querySelectorAll('.evolution-legend-item input').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        // Actualizar gráfico con áreas seleccionadas
        const selectedAreas = Array.from(document.querySelectorAll('.evolution-legend-item input:checked'))
          .map(cb => cb.dataset.area);
        // TODO: Actualizar gráfico
      });
    });
  }

  if (view === 'compare') {
    const select1 = document.getElementById('compare-eval-1');
    const select2 = document.getElementById('compare-eval-2');

    [select1, select2].forEach(select => {
      select?.addEventListener('change', () => {
        updateCompareView(data);
      });
    });
  }
};

/**
 * Abre el modal de editar área
 */
const openEditAreaModal = (area, values) => {
  const modal = document.getElementById('edit-area-modal');

  document.getElementById('area-id').value = area.id;
  document.getElementById('area-name').value = area.name;
  document.getElementById('area-icon').value = area.icon;

  // Poblar selector de valores
  const valueSelect = document.getElementById('area-value');
  valueSelect.innerHTML = `
    <option value="">Sin vincular</option>
    ${(values || []).map(v => `
      <option value="${v.id}" ${area.linkedValueId === v.id ? 'selected' : ''}>
        ${v.name}
      </option>
    `).join('')}
  `;

  modal.showModal();
};

/**
 * Guarda la edición de un área
 */
const saveAreaEdit = (data) => {
  const areaId = document.getElementById('area-id').value;
  const name = document.getElementById('area-name').value.trim();
  const icon = document.getElementById('area-icon').value.trim();
  const linkedValueId = document.getElementById('area-value').value || null;

  if (!name) {
    showNotification('El nombre del área es obligatorio', 'warning');
    return;
  }

  const lifeWheel = data.lifeWheel || { areas: getDefaultAreas(), evaluations: [], settings: {} };
  const areaIndex = lifeWheel.areas.findIndex(a => a.id === areaId);

  if (areaIndex !== -1) {
    lifeWheel.areas[areaIndex] = {
      ...lifeWheel.areas[areaIndex],
      name,
      icon: icon || 'circle',
      linkedValueId
    };

    updateDataCallback('lifeWheel', lifeWheel);
    document.getElementById('edit-area-modal').close();
    showNotification('Área actualizada', 'success');
    location.reload();
  }
};

/**
 * Renderiza una evaluación seleccionada
 */
const renderSelectedEvaluation = (evaluation, areas) => {
  const container = document.getElementById('wheel-content');
  container.innerHTML = renderWheelView(evaluation, areas);
};

/**
 * Muestra la reflexión de un área específica
 */
const showAreaReflection = (areaId, data) => {
  const evaluations = data.lifeWheel?.evaluations || [];
  const lastEval = evaluations[evaluations.length - 1];
  const score = lastEval?.scores?.[areaId];
  const area = data.lifeWheel?.areas?.find(a => a.id === areaId);

  if (!score?.reflection || !area) return;

  // Mostrar en un alert simple (se puede mejorar con un modal dedicado)
  const reflection = score.reflection;
  alert(`
${area.name} (${score.current} → ${score.desired})

¿Por qué?
${reflection.why || 'Sin respuesta'}

¿Qué mejorar?
${reflection.improve || 'Sin respuesta'}

¿Qué harás?
${reflection.actions || 'Sin respuesta'}
  `);
};

/**
 * Actualiza la vista de comparación
 */
const updateCompareView = (data) => {
  const eval1Id = document.getElementById('compare-eval-1').value;
  const eval2Id = document.getElementById('compare-eval-2').value;
  const evaluations = data.lifeWheel?.evaluations || [];
  const areas = data.lifeWheel?.areas || getDefaultAreas();

  const eval1 = evaluations.find(e => e.id === eval1Id);
  const eval2 = evaluations.find(e => e.id === eval2Id);

  if (eval1 && eval2) {
    const container = document.getElementById('wheel-content');
    // Re-renderizar con las nuevas selecciones
    // TODO: Implementar actualización parcial
  }
};
