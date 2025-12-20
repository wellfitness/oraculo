/**
 * Oráculo - Componente Gráfico Radial (Rueda de la Vida)
 * Renderiza un gráfico polar/radial con SVG puro
 */

// Colores por defecto para áreas
const DEFAULT_COLORS = {
  health: '#10b981',
  emotional: '#8b5cf6',
  growth: '#3b82f6',
  family: '#e11d48',
  social: '#f97316',
  career: '#06b6d4',
  finances: '#eab308',
  leisure: '#6b7280'
};

/**
 * Genera las coordenadas de un punto en el gráfico radial
 */
const getPointCoordinates = (angle, radius, center) => {
  const x = center + Math.cos(angle) * radius;
  const y = center + Math.sin(angle) * radius;
  return { x, y };
};

/**
 * Genera el path SVG para un polígono de puntuaciones
 */
const createRadialPath = (scores, areas, maxRadius, center, startAngle) => {
  const numAreas = areas.length;
  const angleStep = (2 * Math.PI) / numAreas;

  let pathD = '';

  areas.forEach((area, i) => {
    const score = scores[area.id]?.current || 0;
    const radius = (score / 10) * maxRadius;
    const angle = startAngle + i * angleStep;
    const { x, y } = getPointCoordinates(angle, radius, center);

    if (i === 0) {
      pathD += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  });

  pathD += ' Z';
  return pathD;
};

/**
 * Genera el path SVG para puntuaciones deseadas
 */
const createDesiredPath = (scores, areas, maxRadius, center, startAngle) => {
  const numAreas = areas.length;
  const angleStep = (2 * Math.PI) / numAreas;

  let pathD = '';

  areas.forEach((area, i) => {
    const score = scores[area.id]?.desired || 0;
    const radius = (score / 10) * maxRadius;
    const angle = startAngle + i * angleStep;
    const { x, y } = getPointCoordinates(angle, radius, center);

    if (i === 0) {
      pathD += `M ${x.toFixed(2)} ${y.toFixed(2)}`;
    } else {
      pathD += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  });

  pathD += ' Z';
  return pathD;
};

/**
 * Renderiza el gráfico radial de la Rueda de la Vida
 *
 * @param {Object} scores - Puntuaciones por área: {areaId: {current: number, desired: number}}
 * @param {Array} areas - Definición de áreas: [{id, name, icon}]
 * @param {Object} options - Opciones de configuración
 * @returns {string} SVG como string
 */
export const renderWheelChart = (scores = {}, areas = [], options = {}) => {
  const {
    size = 400,
    padding = 60,
    showDesired = true,
    showLabels = true,
    interactive = true,
    colors = DEFAULT_COLORS,
    currentColor = 'var(--turquesa-500, #06b6d4)',
    desiredColor = 'var(--turquesa-300, #67e8f9)',
    gridColor = 'var(--gris-200, #e5e7eb)',
    labelColor = 'var(--gris-700, #374151)'
  } = options;

  const center = size / 2;
  const maxRadius = (size - padding * 2) / 2;
  const numAreas = areas.length || 8;
  const angleStep = (2 * Math.PI) / numAreas;
  const startAngle = -Math.PI / 2; // Empezar desde arriba

  // Niveles de la cuadrícula (2, 4, 6, 8, 10)
  const gridLevels = [2, 4, 6, 8, 10];

  // Generar círculos de la cuadrícula
  const gridCircles = gridLevels.map(level => {
    const r = (level / 10) * maxRadius;
    return `
      <circle
        cx="${center}"
        cy="${center}"
        r="${r.toFixed(2)}"
        fill="none"
        stroke="${gridColor}"
        stroke-width="1"
        class="wheel-grid-circle"
      />
      ${level % 2 === 0 ? `
        <text
          x="${center + 5}"
          y="${center - r - 2}"
          fill="${gridColor}"
          font-size="10"
          class="wheel-grid-label"
        >${level}</text>
      ` : ''}
    `;
  }).join('');

  // Generar líneas radiales (ejes)
  const radialLines = areas.map((_, i) => {
    const angle = startAngle + i * angleStep;
    const { x: x2, y: y2 } = getPointCoordinates(angle, maxRadius, center);

    return `
      <line
        x1="${center}"
        y1="${center}"
        x2="${x2.toFixed(2)}"
        y2="${y2.toFixed(2)}"
        stroke="${gridColor}"
        stroke-width="1"
        class="wheel-axis"
      />
    `;
  }).join('');

  // Path de puntuaciones actuales
  const hasScores = Object.keys(scores).length > 0;
  const currentPath = hasScores ? createRadialPath(scores, areas, maxRadius, center, startAngle) : '';

  // Path de puntuaciones deseadas
  const desiredPath = hasScores && showDesired
    ? createDesiredPath(scores, areas, maxRadius, center, startAngle)
    : '';

  // Puntos interactivos (vértices del polígono actual)
  const interactivePoints = hasScores ? areas.map((area, i) => {
    const score = scores[area.id]?.current || 0;
    const radius = (score / 10) * maxRadius;
    const angle = startAngle + i * angleStep;
    const { x, y } = getPointCoordinates(angle, radius, center);
    const color = colors[area.id] || '#6b7280';

    return interactive ? `
      <circle
        cx="${x.toFixed(2)}"
        cy="${y.toFixed(2)}"
        r="8"
        fill="${color}"
        stroke="white"
        stroke-width="2"
        class="wheel-point"
        data-area="${area.id}"
        data-score="${score}"
      >
        <title>${area.name}: ${score}/10</title>
      </circle>
    ` : `
      <circle
        cx="${x.toFixed(2)}"
        cy="${y.toFixed(2)}"
        r="6"
        fill="${color}"
        stroke="white"
        stroke-width="2"
        class="wheel-point"
      />
    `;
  }).join('') : '';

  // Etiquetas de áreas
  const areaLabels = showLabels ? areas.map((area, i) => {
    const angle = startAngle + i * angleStep;
    const labelRadius = maxRadius + 25;
    const { x, y } = getPointCoordinates(angle, labelRadius, center);

    // Ajustar alineación del texto según posición
    let textAnchor = 'middle';
    let dx = 0;

    if (Math.abs(x - center) > 10) {
      textAnchor = x > center ? 'start' : 'end';
      dx = x > center ? 5 : -5;
    }

    const color = colors[area.id] || '#6b7280';

    return `
      <text
        x="${x.toFixed(2)}"
        y="${y.toFixed(2)}"
        text-anchor="${textAnchor}"
        dominant-baseline="middle"
        fill="${labelColor}"
        font-size="12"
        font-weight="500"
        class="wheel-label"
        data-area="${area.id}"
      >
        <tspan dx="${dx}">${area.name}</tspan>
      </text>
    `;
  }).join('') : '';

  // Íconos de Material Symbols (opcionales, en el perímetro)
  const areaIcons = showLabels ? areas.map((area, i) => {
    const angle = startAngle + i * angleStep;
    const iconRadius = maxRadius + 45;
    const { x, y } = getPointCoordinates(angle, iconRadius, center);
    const color = colors[area.id] || '#6b7280';

    return `
      <foreignObject
        x="${(x - 12).toFixed(2)}"
        y="${(y - 12).toFixed(2)}"
        width="24"
        height="24"
        class="wheel-icon-container"
      >
        <span
          xmlns="http://www.w3.org/1999/xhtml"
          class="material-symbols-outlined wheel-area-icon"
          style="color: ${color}; font-size: 20px;"
        >${area.icon || 'circle'}</span>
      </foreignObject>
    `;
  }).join('') : '';

  // Construir SVG completo
  return `
    <svg
      viewBox="0 0 ${size} ${size}"
      class="wheel-chart"
      role="img"
      aria-label="Rueda de la Vida - Gráfico de evaluación de áreas"
    >
      <defs>
        <!-- Gradiente para el área actual -->
        <linearGradient id="currentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color: ${currentColor}; stop-opacity: 0.4" />
          <stop offset="100%" style="stop-color: ${currentColor}; stop-opacity: 0.2" />
        </linearGradient>

        <!-- Filtro de sombra suave -->
        <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15"/>
        </filter>
      </defs>

      <!-- Fondo del gráfico -->
      <circle
        cx="${center}"
        cy="${center}"
        r="${maxRadius}"
        fill="var(--gris-50, #f9fafb)"
        class="wheel-background"
      />

      <!-- Cuadrícula circular -->
      ${gridCircles}

      <!-- Líneas radiales (ejes) -->
      ${radialLines}

      ${hasScores ? `
        <!-- Polígono de puntuaciones deseadas (si está activo) -->
        ${desiredPath ? `
          <path
            d="${desiredPath}"
            fill="none"
            stroke="${desiredColor}"
            stroke-width="2"
            stroke-dasharray="8,4"
            opacity="0.7"
            class="wheel-desired-path"
          />
        ` : ''}

        <!-- Polígono de puntuaciones actuales -->
        <path
          d="${currentPath}"
          fill="url(#currentGradient)"
          stroke="${currentColor}"
          stroke-width="3"
          filter="url(#wheelShadow)"
          class="wheel-current-path"
        />

        <!-- Puntos interactivos -->
        ${interactivePoints}
      ` : `
        <!-- Estado vacío: mostrar guía -->
        <text
          x="${center}"
          y="${center}"
          text-anchor="middle"
          fill="${gridColor}"
          font-size="14"
        >Completa tu primera evaluación</text>
      `}

      <!-- Etiquetas de áreas -->
      ${areaLabels}

      <!-- Íconos de áreas -->
      ${areaIcons}
    </svg>
  `;
};

/**
 * Calcula estadísticas de una evaluación
 */
export const calculateWheelStats = (scores, areas) => {
  if (!scores || Object.keys(scores).length === 0) {
    return {
      averageCurrent: 0,
      averageDesired: 0,
      lowestArea: null,
      highestArea: null,
      biggestGap: null
    };
  }

  let totalCurrent = 0;
  let totalDesired = 0;
  let lowestScore = 11;
  let highestScore = -1;
  let biggestGapValue = 0;
  let lowestArea = null;
  let highestArea = null;
  let biggestGap = null;

  areas.forEach(area => {
    const score = scores[area.id] || { current: 0, desired: 0 };
    const current = score.current || 0;
    const desired = score.desired || 0;
    const gap = desired - current;

    totalCurrent += current;
    totalDesired += desired;

    if (current < lowestScore) {
      lowestScore = current;
      lowestArea = area;
    }

    if (current > highestScore) {
      highestScore = current;
      highestArea = area;
    }

    if (gap > biggestGapValue) {
      biggestGapValue = gap;
      biggestGap = { area, gap };
    }
  });

  const numAreas = areas.length;

  return {
    averageCurrent: (totalCurrent / numAreas).toFixed(1),
    averageDesired: (totalDesired / numAreas).toFixed(1),
    lowestArea: lowestArea ? { ...lowestArea, score: lowestScore } : null,
    highestArea: highestArea ? { ...highestArea, score: highestScore } : null,
    biggestGap
  };
};

/**
 * Genera colores automáticos para áreas personalizadas
 */
export const generateAreaColor = (index) => {
  const colors = [
    '#10b981', '#8b5cf6', '#3b82f6', '#e11d48',
    '#f97316', '#06b6d4', '#eab308', '#6b7280',
    '#84cc16', '#ec4899', '#14b8a6', '#f59e0b'
  ];
  return colors[index % colors.length];
};

export default renderWheelChart;
