/**
 * Oráculo - Componente Gráfico de Evolución
 * Renderiza un gráfico de líneas temporal con SVG puro
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
 * Renderiza el gráfico de evolución temporal
 *
 * @param {Array} evaluations - Historial de evaluaciones
 * @param {Array} areas - Definición de áreas
 * @param {Object} options - Opciones de configuración
 * @returns {string} SVG como string
 */
export const renderEvolutionChart = (evaluations = [], areas = [], options = {}) => {
  const {
    width = 700,
    height = 350,
    padding = { top: 30, right: 30, bottom: 50, left: 50 },
    showPoints = true,
    showGrid = true,
    colors = DEFAULT_COLORS,
    gridColor = 'var(--gris-200, #e5e7eb)',
    labelColor = 'var(--gris-600, #4b5563)',
    selectedAreas = null // null = todas, array = filtradas
  } = options;

  // Validar datos
  if (!evaluations || evaluations.length === 0) {
    return renderEmptyChart(width, height);
  }

  // Ordenar evaluaciones por fecha
  const sortedEvals = [...evaluations].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  // Filtrar áreas si se especifica
  const displayAreas = selectedAreas
    ? areas.filter(a => selectedAreas.includes(a.id))
    : areas;

  // Calcular dimensiones del área de gráfico
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Escala X (evaluaciones/trimestres)
  const xStep = sortedEvals.length > 1
    ? chartWidth / (sortedEvals.length - 1)
    : chartWidth;

  // Escala Y (1-10)
  const yScale = (value) => chartHeight - ((value - 1) / 9) * chartHeight;

  // Generar líneas de grid horizontal
  const gridLines = showGrid ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => {
    const y = padding.top + yScale(value);
    const showLabel = value % 2 === 0 || value === 1 || value === 10;

    return `
      <line
        x1="${padding.left}"
        y1="${y.toFixed(2)}"
        x2="${width - padding.right}"
        y2="${y.toFixed(2)}"
        stroke="${gridColor}"
        stroke-width="${value === 5 ? 1.5 : 0.5}"
        ${value === 5 ? '' : 'stroke-dasharray="4,4"'}
        class="evolution-grid-line"
      />
      ${showLabel ? `
        <text
          x="${padding.left - 10}"
          y="${y.toFixed(2)}"
          text-anchor="end"
          dominant-baseline="middle"
          fill="${labelColor}"
          font-size="11"
          class="evolution-y-label"
        >${value}</text>
      ` : ''}
    `;
  }).join('') : '';

  // Generar etiquetas X (trimestres)
  const xLabels = sortedEvals.map((ev, i) => {
    const x = padding.left + i * xStep;
    const y = height - padding.bottom + 20;

    return `
      <text
        x="${x.toFixed(2)}"
        y="${y}"
        text-anchor="middle"
        fill="${labelColor}"
        font-size="11"
        font-weight="500"
        class="evolution-x-label"
      >${ev.quarter}</text>
      <line
        x1="${x.toFixed(2)}"
        y1="${padding.top}"
        x2="${x.toFixed(2)}"
        y2="${height - padding.bottom}"
        stroke="${gridColor}"
        stroke-width="0.5"
        stroke-dasharray="2,4"
        class="evolution-x-grid"
      />
    `;
  }).join('');

  // Generar líneas por área
  const areaLines = displayAreas.map(area => {
    const color = colors[area.id] || '#6b7280';

    // Generar puntos de la polyline
    const points = sortedEvals.map((ev, i) => {
      const x = padding.left + i * xStep;
      const score = ev.scores?.[area.id]?.current || 5;
      const y = padding.top + yScale(score);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    // Puntos individuales con hover
    const pointCircles = showPoints ? sortedEvals.map((ev, i) => {
      const x = padding.left + i * xStep;
      const score = ev.scores?.[area.id]?.current || 5;
      const y = padding.top + yScale(score);

      return `
        <circle
          cx="${x.toFixed(2)}"
          cy="${y.toFixed(2)}"
          r="5"
          fill="${color}"
          stroke="white"
          stroke-width="2"
          class="evolution-point"
          data-area="${area.id}"
          data-eval="${ev.id}"
          data-score="${score}"
        >
          <title>${area.name}: ${score}/10 (${ev.quarter})</title>
        </circle>
      `;
    }).join('') : '';

    return `
      <g class="evolution-area-group" data-area="${area.id}">
        <!-- Línea de tendencia -->
        <polyline
          points="${points}"
          fill="none"
          stroke="${color}"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="evolution-line"
        />

        <!-- Puntos de datos -->
        ${pointCircles}
      </g>
    `;
  }).join('');

  // Leyenda
  const legend = `
    <g class="evolution-legend" transform="translate(${padding.left}, ${height - 15})">
      ${displayAreas.map((area, i) => {
        const xOffset = i * 90;
        const color = colors[area.id] || '#6b7280';

        return `
          <g transform="translate(${xOffset}, 0)">
            <line
              x1="0" y1="0"
              x2="20" y2="0"
              stroke="${color}"
              stroke-width="3"
            />
            <circle cx="10" cy="0" r="4" fill="${color}" />
            <text
              x="25" y="0"
              dominant-baseline="middle"
              fill="${labelColor}"
              font-size="10"
            >${area.name.substring(0, 10)}${area.name.length > 10 ? '...' : ''}</text>
          </g>
        `;
      }).join('')}
    </g>
  `;

  // Construir SVG completo
  return `
    <svg
      viewBox="0 0 ${width} ${height}"
      class="evolution-chart"
      role="img"
      aria-label="Gráfico de evolución de áreas de vida"
    >
      <defs>
        <!-- Filtro de sombra para puntos -->
        <filter id="pointShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="2" flood-opacity="0.2"/>
        </filter>
      </defs>

      <!-- Fondo -->
      <rect
        x="${padding.left}"
        y="${padding.top}"
        width="${chartWidth}"
        height="${chartHeight}"
        fill="var(--gris-50, #f9fafb)"
        rx="4"
        class="evolution-background"
      />

      <!-- Grid horizontal -->
      ${gridLines}

      <!-- Grid vertical y etiquetas X -->
      ${xLabels}

      <!-- Líneas de áreas -->
      ${areaLines}

      <!-- Título del eje Y -->
      <text
        transform="rotate(-90)"
        x="${-(height / 2)}"
        y="15"
        text-anchor="middle"
        fill="${labelColor}"
        font-size="12"
        class="evolution-axis-title"
      >Puntuación</text>

      <!-- Título del eje X -->
      <text
        x="${width / 2}"
        y="${height - 5}"
        text-anchor="middle"
        fill="${labelColor}"
        font-size="12"
        class="evolution-axis-title"
      >Trimestre</text>
    </svg>
  `;
};

/**
 * Renderiza un gráfico vacío con mensaje
 */
const renderEmptyChart = (width, height) => `
  <svg
    viewBox="0 0 ${width} ${height}"
    class="evolution-chart evolution-chart--empty"
  >
    <rect
      x="0" y="0"
      width="${width}" height="${height}"
      fill="var(--gris-50, #f9fafb)"
      rx="8"
    />
    <text
      x="${width / 2}"
      y="${height / 2 - 10}"
      text-anchor="middle"
      fill="var(--gris-400, #9ca3af)"
      font-size="14"
    >Sin datos suficientes</text>
    <text
      x="${width / 2}"
      y="${height / 2 + 15}"
      text-anchor="middle"
      fill="var(--gris-400, #9ca3af)"
      font-size="12"
    >Completa al menos 2 evaluaciones</text>
  </svg>
`;

/**
 * Calcula tendencias entre evaluaciones
 */
export const calculateTrends = (evaluations, areas) => {
  if (evaluations.length < 2) {
    return {};
  }

  const trends = {};
  const lastTwo = evaluations.slice(-2);
  const [prev, current] = lastTwo;

  areas.forEach(area => {
    const prevScore = prev.scores?.[area.id]?.current || 0;
    const currentScore = current.scores?.[area.id]?.current || 0;
    const diff = currentScore - prevScore;

    trends[area.id] = {
      previous: prevScore,
      current: currentScore,
      diff,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
      percentChange: prevScore > 0
        ? ((diff / prevScore) * 100).toFixed(1)
        : 0
    };
  });

  return trends;
};

/**
 * Genera un mini gráfico sparkline para un área
 */
export const renderSparkline = (evaluations, areaId, options = {}) => {
  const {
    width = 100,
    height = 30,
    color = '#06b6d4',
    strokeWidth = 2
  } = options;

  if (evaluations.length < 2) {
    return `<svg width="${width}" height="${height}"></svg>`;
  }

  const sortedEvals = [...evaluations].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const xStep = width / (sortedEvals.length - 1);
  const yScale = (value) => height - ((value - 1) / 9) * (height - 4) - 2;

  const points = sortedEvals.map((ev, i) => {
    const score = ev.scores?.[areaId]?.current || 5;
    return `${(i * xStep).toFixed(2)},${yScale(score).toFixed(2)}`;
  }).join(' ');

  const lastScore = sortedEvals[sortedEvals.length - 1].scores?.[areaId]?.current || 5;
  const lastY = yScale(lastScore);

  return `
    <svg
      viewBox="0 0 ${width} ${height}"
      class="sparkline"
      aria-label="Tendencia"
    >
      <polyline
        points="${points}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        cx="${width}"
        cy="${lastY.toFixed(2)}"
        r="3"
        fill="${color}"
      />
    </svg>
  `;
};

export default renderEvolutionChart;
