/**
 * Oráculo - Evaluador de Proyectos
 * Modal para evaluar proyectos contra 10 criterios ponderados
 * Basado en filosofía Burkeman: priorizar lo esencial
 */

// Estado del evaluador
let evaluatorState = {
  isOpen: false,
  objective: null,
  scores: {},
  onComplete: null,
  currentPage: 0
};

// Constantes de paginación
const CRITERIA_PER_PAGE = 5;
const TOTAL_PAGES = Math.ceil(10 / CRITERIA_PER_PAGE); // 2 páginas

// Criterios de evaluación con pesos
const EVALUATION_CRITERIA = [
  {
    id: 'relevance',
    name: 'Relevancia para mis valores',
    description: '¿Este objetivo está alineado con lo que realmente importa para mí?',
    weight: 1.5,
    icon: 'explore'
  },
  {
    id: 'intrinsic',
    name: 'Valor intrínseco (disfrute)',
    description: '¿Disfrutaré el proceso, no solo el resultado?',
    weight: 1.2,
    icon: 'mood'
  },
  {
    id: 'utility',
    name: 'Utilidad práctica',
    description: '¿Resuelve un problema real o mejora mi vida concretamente?',
    weight: 1.0,
    icon: 'construction'
  },
  {
    id: 'opportunity',
    name: 'Coste de oportunidad',
    description: '¿A qué estoy renunciando por dedicar tiempo a esto?',
    weight: 1.3,
    icon: 'compare_arrows',
    inverted: true // Puntuación alta = bajo coste
  },
  {
    id: 'timeEffect',
    name: 'Tiempo hasta ver efectos',
    description: '¿Cuánto tardaré en ver resultados tangibles?',
    weight: 1.0,
    icon: 'schedule'
  },
  {
    id: 'capability',
    name: 'Capacidad actual',
    description: '¿Tengo las habilidades necesarias o puedo adquirirlas?',
    weight: 1.1,
    icon: 'psychology_alt'
  },
  {
    id: 'support',
    name: 'Soporte social disponible',
    description: '¿Cuento con personas que me apoyen en esto?',
    weight: 0.9,
    icon: 'handshake'
  },
  {
    id: 'timeAvailable',
    name: 'Tiempo disponible',
    description: '¿Tengo el tiempo realista que esto requiere?',
    weight: 1.2,
    icon: 'hourglass_empty'
  },
  {
    id: 'resources',
    name: 'Recursos necesarios',
    description: '¿Tengo o puedo obtener los recursos que necesito?',
    weight: 1.0,
    icon: 'inventory_2'
  },
  {
    id: 'strength',
    name: 'Fortaleza/Motivación',
    description: '¿Tengo la energía y motivación para mantenerlo?',
    weight: 1.2,
    icon: 'bolt'
  }
];

// Umbrales de resultado
const THRESHOLDS = {
  proceed: 75,    // >= 75%: Adelante
  review: 50      // 50-74%: Revisar / < 50%: Reconsiderar
};

// Mensajes por resultado
const RESULT_MESSAGES = {
  proceed: {
    title: 'ADELANTE',
    icon: 'check_circle',
    class: 'result--proceed',
    description: 'Este proyecto está bien alineado con tus valores y recursos. Es un buen momento para avanzar.',
    quote: '"Lo que hacemos hoy es lo que importa más" — Thich Nhat Hanh'
  },
  review: {
    title: 'REVISAR',
    icon: 'help_outline',
    class: 'result--review',
    description: 'Este proyecto tiene potencial pero requiere ajustes. Considera qué aspectos podrías mejorar.',
    quote: '"A veces hay que dar un paso atrás para dar dos adelante"'
  },
  reconsider: {
    title: 'RECONSIDERAR',
    icon: 'pause_circle',
    class: 'result--reconsider',
    description: 'Quizás no sea el momento adecuado para este proyecto. No significa que sea malo, solo que ahora no.',
    quote: '"Decir no a algo es decir sí a otra cosa" — Oliver Burkeman'
  }
};

/**
 * Renderiza el modal del evaluador
 */
export const renderObjectiveEvaluator = () => {
  return `
    <div class="modal objective-evaluator-modal" id="objective-evaluator-modal">
      <div class="modal__backdrop" data-action="close-evaluator"></div>
      <div class="modal__content objective-evaluator">
        <header class="evaluator-header">
          <div class="evaluator-title">
            <span class="material-symbols-outlined">balance</span>
            <h2>Evaluar Proyecto</h2>
          </div>
          <button class="btn btn--icon" data-action="close-evaluator" title="Cerrar">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="evaluator-objective-name" id="evaluator-objective-name">
          <!-- Se llena dinámicamente -->
        </div>

        <div class="evaluator-body" id="evaluator-body">
          <!-- Criterios o resultado -->
        </div>

        <footer class="evaluator-footer" id="evaluator-footer">
          <!-- Botones de acción -->
        </footer>
      </div>
    </div>
  `;
};

/**
 * Renderiza el indicador de paginación (dots)
 */
const renderPagination = () => {
  const currentPage = evaluatorState.currentPage;

  return `
    <div class="evaluator-pagination">
      ${Array.from({ length: TOTAL_PAGES }, (_, i) => `
        <span class="pagination-dot ${i === currentPage ? 'active' : ''}"></span>
      `).join('')}
      <span class="page-indicator">${currentPage + 1} / ${TOTAL_PAGES}</span>
    </div>
  `;
};

/**
 * Renderiza los criterios de la página actual
 */
const renderCurrentPage = () => {
  const currentPage = evaluatorState.currentPage;
  const startIndex = currentPage * CRITERIA_PER_PAGE;
  const endIndex = startIndex + CRITERIA_PER_PAGE;
  const pageCriteria = EVALUATION_CRITERIA.slice(startIndex, endIndex);

  return `
    <div class="evaluator-intro">
      <p>Evalúa este proyecto del 1 al 10 en cada criterio.</p>
    </div>

    ${renderPagination()}

    <div class="criteria-list">
      ${pageCriteria.map(criterion => {
        const currentValue = evaluatorState.scores[criterion.id] || 5;
        return `
        <div class="criterion-item" data-criterion="${criterion.id}">
          <div class="criterion-header">
            <span class="criterion-icon material-symbols-outlined">${criterion.icon}</span>
            <div class="criterion-info">
              <h4 class="criterion-name">${criterion.name}</h4>
              <p class="criterion-description">${criterion.description}</p>
            </div>
            <div class="criterion-weight" title="Peso: ${criterion.weight}x">
              ${criterion.weight > 1 ? `<span class="weight-badge">x${criterion.weight}</span>` : ''}
            </div>
          </div>
          <div class="criterion-slider">
            <input
              type="range"
              min="1"
              max="10"
              value="${currentValue}"
              class="slider"
              id="criterion-${criterion.id}"
              data-criterion-id="${criterion.id}"
            >
            <div class="slider-labels">
              <span>1</span>
              <span class="slider-value" id="value-${criterion.id}">${currentValue}</span>
              <span>10</span>
            </div>
          </div>
        </div>
      `}).join('')}
    </div>
  `;
};

/**
 * Renderiza los criterios de evaluación (para compatibilidad)
 */
const renderCriteria = () => {
  return renderCurrentPage();
};

/**
 * Renderiza el resultado de la evaluación
 */
const renderResult = (result) => {
  const { score, breakdown, recommendation } = result;
  const resultInfo = RESULT_MESSAGES[recommendation];

  return `
    <div class="evaluator-result ${resultInfo.class}">
      <div class="result-header">
        <span class="result-icon material-symbols-outlined">${resultInfo.icon}</span>
        <div class="result-score">
          <span class="score-value">${Math.round(score)}%</span>
          <span class="score-label">${resultInfo.title}</span>
        </div>
      </div>

      <p class="result-description">${resultInfo.description}</p>

      <blockquote class="result-quote">${resultInfo.quote}</blockquote>

      <div class="result-breakdown">
        <h4>Desglose por criterio</h4>
        <div class="breakdown-grid">
          ${breakdown.map(item => `
            <div class="breakdown-item ${getBreakdownClass(item.normalizedScore)}">
              <span class="breakdown-icon material-symbols-outlined">${item.icon}</span>
              <span class="breakdown-name">${item.name}</span>
              <span class="breakdown-score">${item.rawScore}/10</span>
              <div class="breakdown-bar">
                <div class="breakdown-fill" style="width: ${item.rawScore * 10}%"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="result-insights">
        ${renderInsights(breakdown)}
      </div>
    </div>
  `;
};

/**
 * Obtiene la clase CSS según el puntaje
 */
const getBreakdownClass = (score) => {
  if (score >= 7) return 'breakdown--high';
  if (score >= 4) return 'breakdown--medium';
  return 'breakdown--low';
};

/**
 * Genera insights basados en los criterios más bajos
 */
const renderInsights = (breakdown) => {
  // Encontrar los 2 criterios más bajos
  const sorted = [...breakdown].sort((a, b) => a.rawScore - b.rawScore);
  const lowest = sorted.slice(0, 2).filter(item => item.rawScore <= 5);

  if (lowest.length === 0) {
    return `
      <div class="insight insight--positive">
        <span class="material-symbols-outlined">thumb_up</span>
        <p>Todos los criterios tienen puntuaciones aceptables. ¡Buena señal!</p>
      </div>
    `;
  }

  return `
    <div class="insight insight--attention">
      <span class="material-symbols-outlined">priority_high</span>
      <div>
        <p><strong>Áreas a considerar:</strong></p>
        <ul>
          ${lowest.map(item => `
            <li><strong>${item.name}</strong>: ${getSuggestion(item.id)}</li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;
};

/**
 * Sugerencias por criterio bajo
 */
const getSuggestion = (criterionId) => {
  const suggestions = {
    relevance: '¿Realmente conecta con tus valores o es una expectativa externa?',
    intrinsic: '¿Podrías modificarlo para disfrutar más el proceso?',
    utility: '¿Qué problema específico resuelve? Sé concreto/a.',
    opportunity: 'Considera qué otras cosas importantes estás dejando de lado.',
    timeEffect: '¿Puedes dividirlo en metas más pequeñas con resultados visibles?',
    capability: '¿Qué habilidades necesitas desarrollar primero?',
    support: '¿A quién podrías pedir ayuda o compartir este objetivo?',
    timeAvailable: '¿Es realista con tu volumen fijo actual? Quizás necesita esperar.',
    resources: 'Identifica qué recursos específicos necesitas obtener.',
    strength: '¿Qué te está drenando energía? Quizás hay que resolver eso primero.'
  };

  return suggestions[criterionId] || 'Reflexiona sobre cómo mejorar este aspecto.';
};

/**
 * Calcula el resultado de la evaluación
 */
const calculateResult = (scores) => {
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const breakdown = [];

  EVALUATION_CRITERIA.forEach(criterion => {
    const rawScore = scores[criterion.id] || 5;
    const weightedScore = rawScore * criterion.weight;

    totalWeightedScore += weightedScore;
    totalWeight += criterion.weight * 10; // Máximo posible

    breakdown.push({
      id: criterion.id,
      name: criterion.name,
      icon: criterion.icon,
      rawScore,
      weightedScore,
      normalizedScore: rawScore
    });
  });

  // Calcular porcentaje final
  const score = (totalWeightedScore / totalWeight) * 100;

  // Determinar recomendación
  let recommendation;
  if (score >= THRESHOLDS.proceed) {
    recommendation = 'proceed';
  } else if (score >= THRESHOLDS.review) {
    recommendation = 'review';
  } else {
    recommendation = 'reconsider';
  }

  return { score, breakdown, recommendation };
};

/**
 * Renderiza el footer según la página actual
 */
const renderFooter = () => {
  const currentPage = evaluatorState.currentPage;
  const isFirstPage = currentPage === 0;
  const isLastPage = currentPage === TOTAL_PAGES - 1;

  if (isLastPage) {
    // Página 2: Anterior + Ver resultado
    return `
      <button class="btn btn--secondary" data-action="prev-page">
        <span class="material-symbols-outlined">arrow_back</span>
        Anterior
      </button>
      <button class="btn btn--primary" data-action="calculate-result">
        <span class="material-symbols-outlined">calculate</span>
        Ver resultado
      </button>
    `;
  } else {
    // Página 1: Cancelar + Siguiente
    return `
      <button class="btn btn--secondary" data-action="close-evaluator">
        Cancelar
      </button>
      <button class="btn btn--primary" data-action="next-page">
        Siguiente
        <span class="material-symbols-outlined">arrow_forward</span>
      </button>
    `;
  }
};

/**
 * Navega a la siguiente página
 */
const goToNextPage = () => {
  if (evaluatorState.currentPage < TOTAL_PAGES - 1) {
    evaluatorState.currentPage++;
    updateEvaluatorView();
  }
};

/**
 * Navega a la página anterior
 */
const goToPrevPage = () => {
  if (evaluatorState.currentPage > 0) {
    evaluatorState.currentPage--;
    updateEvaluatorView();
  }
};

/**
 * Actualiza la vista del evaluador (body + footer)
 */
const updateEvaluatorView = () => {
  const bodyEl = document.getElementById('evaluator-body');
  const footerEl = document.getElementById('evaluator-footer');

  if (bodyEl) {
    bodyEl.innerHTML = renderCurrentPage();
    setupSliderListeners();
  }

  if (footerEl) {
    footerEl.innerHTML = renderFooter();
  }
};

/**
 * Abre el evaluador para un proyecto
 */
export const openObjectiveEvaluator = (objective, onComplete = null) => {
  evaluatorState = {
    isOpen: true,
    objective,
    scores: {},
    onComplete,
    currentPage: 0
  };

  // Inicializar scores en 5
  EVALUATION_CRITERIA.forEach(criterion => {
    evaluatorState.scores[criterion.id] = 5;
  });

  const modal = document.getElementById('objective-evaluator-modal');
  if (!modal) return;

  // Actualizar contenido
  const nameEl = document.getElementById('evaluator-objective-name');

  if (nameEl) {
    nameEl.innerHTML = `
      <span class="material-symbols-outlined">${objective.icon || 'flag'}</span>
      <span>${objective.title || objective.text}</span>
    `;
  }

  // Renderizar vista inicial
  updateEvaluatorView();

  modal.classList.add('modal--visible');
};

/**
 * Configura listeners de los sliders
 */
const setupSliderListeners = () => {
  const sliders = document.querySelectorAll('.criterion-slider input[type="range"]');

  sliders.forEach(slider => {
    const criterionId = slider.dataset.criterionId;
    const valueDisplay = document.getElementById(`value-${criterionId}`);

    slider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value);
      evaluatorState.scores[criterionId] = value;

      if (valueDisplay) {
        valueDisplay.textContent = value;
      }

      // Actualizar color del slider según valor
      updateSliderColor(slider, value);
    });

    // Inicializar color
    updateSliderColor(slider, 5);
  });
};

/**
 * Actualiza el color del slider según el valor
 */
const updateSliderColor = (slider, value) => {
  const percentage = ((value - 1) / 9) * 100;
  let color;

  if (value >= 7) {
    color = 'var(--verde-500, #10b981)';
  } else if (value >= 4) {
    color = 'var(--amarillo-500, #eab308)';
  } else {
    color = 'var(--rosa-500, #e11d48)';
  }

  slider.style.setProperty('--slider-fill', `${percentage}%`);
  slider.style.setProperty('--slider-color', color);
};

/**
 * Muestra el resultado
 */
const showResult = () => {
  const result = calculateResult(evaluatorState.scores);

  const bodyEl = document.getElementById('evaluator-body');
  const footerEl = document.getElementById('evaluator-footer');

  if (bodyEl) {
    bodyEl.innerHTML = renderResult(result);
  }

  if (footerEl) {
    footerEl.innerHTML = `
      <button class="btn btn--secondary" data-action="reevaluate">
        <span class="material-symbols-outlined">refresh</span>
        Reevaluar
      </button>
      <button class="btn btn--primary" data-action="save-evaluation">
        <span class="material-symbols-outlined">save</span>
        Guardar evaluación
      </button>
    `;
  }

  // Guardar resultado en estado
  evaluatorState.result = result;
};

/**
 * Cierra el evaluador
 */
export const closeObjectiveEvaluator = () => {
  evaluatorState.isOpen = false;

  const modal = document.getElementById('objective-evaluator-modal');
  if (modal) {
    modal.classList.remove('modal--visible');
  }
};

/**
 * Guarda la evaluación
 */
const saveEvaluation = (data, updateData) => {
  if (!evaluatorState.objective || !evaluatorState.result) return;

  // Obtener evaluaciones existentes
  const evaluations = data.objectiveEvaluation?.evaluations || [];

  // Crear nueva evaluación
  const evaluation = {
    id: `eval-${Date.now()}`,
    objectiveId: evaluatorState.objective.id,
    objectiveTitle: evaluatorState.objective.title || evaluatorState.objective.text,
    scores: { ...evaluatorState.scores },
    result: {
      score: evaluatorState.result.score,
      recommendation: evaluatorState.result.recommendation
    },
    createdAt: new Date().toISOString()
  };

  // Actualizar datos
  updateData('objectiveEvaluation.evaluations', [...evaluations, evaluation]);

  // Callback si existe
  if (evaluatorState.onComplete) {
    evaluatorState.onComplete(evaluation);
  }

  // Cerrar
  closeObjectiveEvaluator();
};

/**
 * Inicializa el evaluador de objetivos
 */
export const initObjectiveEvaluator = (data, updateData) => {
  const modal = document.getElementById('objective-evaluator-modal');
  if (!modal) return;

  modal.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;

    switch (action) {
      case 'close-evaluator':
        closeObjectiveEvaluator();
        break;

      case 'next-page':
        goToNextPage();
        break;

      case 'prev-page':
        goToPrevPage();
        break;

      case 'calculate-result':
        showResult();
        break;

      case 'reevaluate':
        // Volver a página 1 de criterios
        evaluatorState.currentPage = 0;
        updateEvaluatorView();
        break;

      case 'save-evaluation':
        saveEvaluation(data, updateData);
        break;
    }
  });

  // Cerrar con Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && evaluatorState.isOpen) {
      closeObjectiveEvaluator();
    }
  });
};

/**
 * Obtiene el badge de resultado para mostrar en tarjetas
 */
export const getEvaluationBadge = (evaluation) => {
  if (!evaluation) return '';

  const { score, recommendation } = evaluation.result;
  const info = RESULT_MESSAGES[recommendation];

  return `
    <span class="evaluation-badge ${info.class}" title="${Math.round(score)}% - ${info.title}">
      <span class="material-symbols-outlined">${info.icon}</span>
    </span>
  `;
};

/**
 * Obtiene la última evaluación de un objetivo
 */
export const getObjectiveEvaluation = (objectiveId, evaluations = []) => {
  const objectiveEvaluations = evaluations.filter(e => e.objectiveId === objectiveId);

  if (objectiveEvaluations.length === 0) return null;

  // Devolver la más reciente
  return objectiveEvaluations.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];
};

export default {
  renderObjectiveEvaluator,
  initObjectiveEvaluator,
  openObjectiveEvaluator,
  closeObjectiveEvaluator,
  getEvaluationBadge,
  getObjectiveEvaluation
};
