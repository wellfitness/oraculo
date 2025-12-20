/**
 * Oráculo - Rueda de la Vida
 * Sistema de evaluación trimestral de áreas de vida
 */

import { generateId, showNotification, navigateTo } from '../app.js';
import { getReflexionDelDia } from '../data/burkeman.js';
import {
  getTrianguloFelicidad,
  getReflexionPorTema
} from '../data/markmanson.js';
import { renderWheelChart } from '../components/wheel-chart.js';
import { renderEvolutionChart } from '../components/evolution-chart.js';

let updateDataCallback = null;
let currentData = null;

// Estado de vista: 'main' o 'evaluation'
let currentView = 'main';

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

// Mapeo de áreas a pilares del Triángulo de la Felicidad (Mark Manson)
const AREA_TO_PILLAR = {
  health: 'salud',
  emotional: 'salud',
  growth: 'libertad',
  family: 'relaciones',
  social: 'relaciones',
  career: 'libertad',
  finances: 'libertad',
  leisure: 'libertad'
};

/**
 * Obtiene el pilar del Triángulo según el área con mayor brecha
 */
const getPillarForLargestGap = (scores, areas) => {
  let maxGap = 0;
  let areaWithMaxGap = null;

  areas.forEach(area => {
    const score = scores[area.id];
    if (score) {
      const gap = score.desired - score.current;
      if (gap > maxGap) {
        maxGap = gap;
        areaWithMaxGap = area.id;
      }
    }
  });

  if (!areaWithMaxGap || maxGap <= 0) return null;

  return {
    areaId: areaWithMaxGap,
    pillar: AREA_TO_PILLAR[areaWithMaxGap] || 'libertad',
    gap: maxGap
  };
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
 * Re-renderiza la página completa
 */
const reRender = () => {
  const container = document.getElementById('app-content');
  if (container && currentData) {
    container.innerHTML = render(currentData);
    init(currentData, updateDataCallback);
  }
};

/**
 * Renderiza la página de la Rueda de la Vida
 */
export const render = (data) => {
  currentData = data;

  // Si estamos en modo evaluación, mostrar wizard de página completa
  if (currentView === 'evaluation') {
    return renderEvaluationPage(data);
  }

  // Vista normal de la rueda
  return renderMainPage(data);
};

/**
 * Renderiza la página principal de la Rueda de la Vida
 */
const renderMainPage = (data) => {
  const lifeWheel = data.lifeWheel || {};
  const areas = lifeWheel.areas || getDefaultAreas();
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

      <!-- Triángulo de la Felicidad -->
      ${evaluations.length > 0 ? renderTriangleSection(lastEvaluation, areas) : ''}

      <!-- Reflexión de Mark Manson -->
      ${evaluations.length > 0 ? `
        <section class="wheel-reflection">
          <blockquote class="quote quote--secondary">
            <p>"${getReflexionPorTema('felicidad')}"</p>
            <cite>— Mark Manson</cite>
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
// WIZARD DE EVALUACIÓN - PÁGINA COMPLETA
// ============================================================

let wizardState = {
  currentStep: 0,
  scores: {},
  overallReflection: ''
};

/**
 * Renderiza la página de evaluación (wizard de página completa)
 * Navegacion en header, scroll natural del navegador
 */
const renderEvaluationPage = (data) => {
  const areas = data.lifeWheel?.areas || getDefaultAreas();
  const totalSteps = areas.length + 1; // 8 áreas + 1 resumen
  const step = wizardState.currentStep;
  const progress = ((step + 1) / totalSteps) * 100;

  return `
    <div class="wizard-page evaluation-page">
      <!-- Header con progreso y navegacion -->
      <header class="wizard-header">
        <!-- Izquierda: Cerrar -->
        <div class="wizard-header-left">
          <button class="btn btn--icon" id="eval-cancel" title="Cancelar evaluación">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <!-- Centro: Progreso -->
        <div class="wizard-header-center">
          <div class="wizard-progress-dots">
            ${Array.from({ length: totalSteps }, (_, i) => `
              <span class="wizard-dot ${i < step ? 'completed' : ''} ${i === step ? 'active' : ''}"></span>
            `).join('')}
          </div>
          <span class="wizard-progress-label">Paso ${step + 1} de ${totalSteps}</span>
        </div>

        <!-- Derecha: Navegacion -->
        <div class="wizard-header-right">
          <button class="btn btn--tertiary btn--sm" id="eval-cancel-btn">
            Cancelar
          </button>
          <button class="btn btn--secondary btn--sm" id="eval-prev" ${step === 0 ? 'disabled' : ''}>
            <span class="material-symbols-outlined">arrow_back</span>
          </button>
          <button class="btn btn--primary btn--sm" id="eval-next">
            ${step >= areas.length
              ? `<span class="material-symbols-outlined">check</span>`
              : `<span class="material-symbols-outlined">arrow_forward</span>`
            }
          </button>
        </div>
      </header>

      <!-- Contenido del paso actual - scroll natural -->
      <div class="wizard-content">
        ${step < areas.length
          ? renderEvaluationStep(areas[step], step)
          : renderEvaluationSummary(areas)}
      </div>

      <!-- Footer oculto por CSS -->
      <footer class="wizard-footer">
        <!-- Mantenido para compatibilidad, oculto por CSS -->
      </footer>
    </div>
  `;
};

/**
 * Renderiza un paso de evaluación de área
 */
const renderEvaluationStep = (area, stepIndex) => {
  const existingScore = wizardState.scores[area.id] || { current: 5, desired: 7, reflection: {} };
  const areaColor = AREA_COLORS[area.id] || '#6b7280';

  return `
    <div class="eval-step" data-area="${area.id}">
      <!-- Cabecera del área -->
      <div class="eval-area-header" style="--area-color: ${areaColor}">
        <span class="material-symbols-outlined eval-area-icon">${area.icon}</span>
        <h2 class="eval-area-title">${area.name}</h2>
        <p class="eval-area-subtitle">Evalúa esta área de tu vida</p>
      </div>

      <!-- Sliders de puntuación -->
      <div class="eval-sliders">
        <div class="eval-slider-group">
          <label class="eval-slider-label">
            <span>¿Cómo te sientes actualmente?</span>
            <span class="eval-slider-value" id="current-value">${existingScore.current}</span>
          </label>
          <input type="range" min="1" max="10" value="${existingScore.current}"
                 class="eval-slider" id="score-current">
          <div class="eval-slider-hints">
            <span>Muy insatisfecha</span>
            <span>Muy satisfecha</span>
          </div>
        </div>

        <div class="eval-slider-group eval-slider-group--desired">
          <label class="eval-slider-label">
            <span>¿Qué puntuación te gustaría tener?</span>
            <span class="eval-slider-value eval-slider-value--desired" id="desired-value">${existingScore.desired}</span>
          </label>
          <input type="range" min="1" max="10" value="${existingScore.desired}"
                 class="eval-slider eval-slider--desired" id="score-desired">
          <div class="eval-slider-hints">
            <span>1</span>
            <span>10</span>
          </div>
        </div>
      </div>

      <!-- Reflexiones -->
      <div class="eval-reflections">
        <h3 class="eval-reflections-title">
          <span class="material-symbols-outlined">edit_note</span>
          Reflexiones
        </h3>

        <div class="eval-reflection-card">
          <label for="reflection-why">
            <span class="material-symbols-outlined">psychology</span>
            ¿Por qué has puntuado así esta área?
          </label>
          <textarea id="reflection-why" class="input textarea" rows="3"
                    placeholder="Reflexiona sobre tu situación actual...">${existingScore.reflection?.why || ''}</textarea>
        </div>

        <div class="eval-reflection-card">
          <label for="reflection-improve">
            <span class="material-symbols-outlined">lightbulb</span>
            ¿Qué aspectos podrías mejorar?
          </label>
          <textarea id="reflection-improve" class="input textarea" rows="3"
                    placeholder="Identifica oportunidades de mejora...">${existingScore.reflection?.improve || ''}</textarea>
        </div>

        <div class="eval-reflection-card">
          <label for="reflection-actions">
            <span class="material-symbols-outlined">rocket_launch</span>
            ¿Qué harás para lograrlo?
          </label>
          <textarea id="reflection-actions" class="input textarea" rows="3"
                    placeholder="Define acciones concretas...">${existingScore.reflection?.actions || ''}</textarea>
        </div>
      </div>
    </div>
  `;
};

/**
 * Renderiza la sección del Triángulo de la Felicidad en la vista principal
 */
const renderTriangleSection = (evaluation, areas) => {
  if (!evaluation?.scores) return '';

  const triangulo = getTrianguloFelicidad();

  // Calcular promedio por pilar
  const pillarScores = {
    salud: { total: 0, count: 0 },
    relaciones: { total: 0, count: 0 },
    libertad: { total: 0, count: 0 }
  };

  areas.forEach(area => {
    const score = evaluation.scores[area.id];
    const pilar = AREA_TO_PILLAR[area.id];
    if (score && pilar && pillarScores[pilar]) {
      pillarScores[pilar].total += score.current;
      pillarScores[pilar].count++;
    }
  });

  // Calcular promedios
  const pillarAverages = {};
  Object.keys(pillarScores).forEach(pilar => {
    const ps = pillarScores[pilar];
    pillarAverages[pilar] = ps.count > 0 ? Math.round(ps.total / ps.count) : 0;
  });

  // Mapeo de nombre a key del pilar
  const nombreToKey = {
    'Salud': 'salud',
    'Relaciones': 'relaciones',
    'Libertad': 'libertad'
  };

  return `
    <section class="triangle-section">
      <h3>
        <span class="material-symbols-outlined">change_history</span>
        Triángulo de la Felicidad
      </h3>
      <p>
        Según Mark Manson, la felicidad se sostiene en tres pilares interconectados.
      </p>

      <div class="triangle-pillars">
        ${triangulo.areas.map(pilar => {
          const key = nombreToKey[pilar.nombre] || pilar.nombre.toLowerCase();
          const avg = pillarAverages[key] || 0;
          return `
            <div class="triangle-pillar ${key}">
              <span class="material-symbols-outlined">${pilar.icono}</span>
              <h4>${pilar.nombre}</h4>
              <span class="pillar-score">${avg}/10</span>
              <span class="pillar-areas">${pilar.descripcion}</span>
            </div>
          `;
        }).join('')}
      </div>

      <p class="triangle-connection">${triangulo.conexion}</p>
    </section>
  `;
};

/**
 * Renderiza el insight del Triángulo de la Felicidad según el área con mayor brecha
 */
const renderTriangleInsight = (pillarInfo, areas) => {
  if (!pillarInfo) return '';

  const triangulo = getTrianguloFelicidad();

  // Mapeo de key de pilar a nombre en el triángulo
  const keyToNombre = {
    salud: 'Salud',
    relaciones: 'Relaciones',
    libertad: 'Libertad'
  };

  const nombrePilar = keyToNombre[pillarInfo.pillar];
  const pilar = triangulo.areas.find(p => p.nombre === nombrePilar);
  if (!pilar) return '';

  const areaName = areas.find(a => a.id === pillarInfo.areaId)?.name || 'esta área';

  return `
    <div class="triangle-insight">
      <div class="triangle-insight__header">
        <span class="material-symbols-outlined">${pilar.icono}</span>
        <h3>Triángulo de la Felicidad</h3>
      </div>
      <p class="triangle-insight__area">
        Tu mayor brecha está en <strong>${areaName}</strong> (+${pillarInfo.gap}),
        que pertenece al pilar de <strong>${pilar.nombre}</strong>.
      </p>
      <blockquote class="triangle-insight__quote">
        <p>"${pilar.insight}"</p>
        <cite>— Mark Manson</cite>
      </blockquote>
    </div>
  `;
};

/**
 * Renderiza el resumen de la evaluación (paso final)
 */
const renderEvaluationSummary = (areas) => {
  const scores = wizardState.scores;
  const pillarInfo = getPillarForLargestGap(scores, areas);

  return `
    <div class="eval-summary">
      <h2 class="eval-summary-title">
        <span class="material-symbols-outlined">donut_large</span>
        Resumen de tu evaluación
      </h2>

      <div class="eval-summary-wheel">
        ${renderWheelChart(scores, areas, { size: 300, showLabels: true, showDesired: true, colors: AREA_COLORS })}
      </div>

      <div class="eval-summary-scores">
        ${areas.map(area => {
          const score = scores[area.id] || { current: 0, desired: 0 };
          const diff = score.desired - score.current;
          const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
          return `
            <div class="eval-summary-score" style="--area-color: ${AREA_COLORS[area.id] || '#6b7280'}">
              <span class="material-symbols-outlined">${area.icon}</span>
              <span class="name">${area.name}</span>
              <span class="scores">
                <span class="current">${score.current}</span>
                <span class="arrow">→</span>
                <span class="desired">${score.desired}</span>
                ${diff !== 0 ? `<span class="diff ${diffClass}">${diff > 0 ? '+' : ''}${diff}</span>` : ''}
              </span>
            </div>
          `;
        }).join('')}
      </div>

      ${renderTriangleInsight(pillarInfo, areas)}

      <div class="form-group eval-overall-reflection">
        <label for="overall-reflection">
          <span class="material-symbols-outlined icon-sm">edit_note</span>
          Reflexión general del trimestre
        </label>
        <textarea id="overall-reflection" class="input textarea" rows="4"
                  placeholder="¿Qué conclusiones sacas de esta evaluación? ¿Qué áreas quieres priorizar?">${wizardState.overallReflection}</textarea>
      </div>
    </div>
  `;
};

/**
 * Inicia el wizard de evaluación (cambia a vista de página completa)
 */
const startEvaluationWizard = () => {
  // Reiniciar estado
  wizardState = {
    currentStep: 0,
    scores: {},
    overallReflection: ''
  };

  // Cambiar a vista de evaluación
  currentView = 'evaluation';
  reRender();
};

/**
 * Cancela el wizard y vuelve a la vista principal
 */
const cancelEvaluationWizard = () => {
  currentView = 'main';
  wizardState = {
    currentStep: 0,
    scores: {},
    overallReflection: ''
  };
  reRender();
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
    reRender();
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
    reRender();
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

  // Volver a vista principal
  currentView = 'main';
  wizardState = { currentStep: 0, scores: {}, overallReflection: '' };

  showNotification('Evaluación guardada correctamente', 'success');
  reRender();
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

  // Si estamos en vista de evaluación, inicializar eventos del wizard
  if (currentView === 'evaluation') {
    initEvaluationEvents(areas);
    return;
  }

  // Eventos de la vista principal
  initMainViewEvents(data, areas);
};

/**
 * Inicializa eventos del wizard de evaluación
 */
const initEvaluationEvents = (areas) => {
  // Configurar sliders
  setupSliderEvents();

  // Botón cancelar (X en header)
  document.getElementById('eval-cancel')?.addEventListener('click', cancelEvaluationWizard);

  // Botón cancelar (footer)
  document.getElementById('eval-cancel-btn')?.addEventListener('click', cancelEvaluationWizard);

  // Navegación
  document.getElementById('eval-prev')?.addEventListener('click', () => wizardPrev(areas));
  document.getElementById('eval-next')?.addEventListener('click', () => wizardNext(areas));
};

/**
 * Inicializa eventos de la vista principal
 */
const initMainViewEvents = (data, areas) => {
  // Botón nueva evaluación
  document.getElementById('new-evaluation-btn')?.addEventListener('click', startEvaluationWizard);

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
    reRender();
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
