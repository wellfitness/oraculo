/**
 * Oráculo - Componente EmptyState Reutilizable
 *
 * Proporciona estados vacíos consistentes en toda la app.
 * Reemplaza los diferentes patrones de empty-state que existían.
 */

/**
 * Genera HTML para un estado vacío consistente
 * @param {Object} options - Opciones del estado vacío
 * @param {string} options.icon - Nombre del icono Material Symbols
 * @param {string} options.title - Título del estado vacío
 * @param {string} options.description - Descripción o mensaje explicativo
 * @param {Object} [options.action] - Acción principal (opcional)
 * @param {string} options.action.label - Texto del botón
 * @param {string} options.action.id - ID del botón para event listeners
 * @param {string} [options.action.icon] - Icono del botón (opcional)
 * @param {Object} [options.secondaryAction] - Acción secundaria (opcional)
 * @param {string} [options.variant] - Variante: 'default' | 'large' | 'inline'
 * @returns {string} HTML del estado vacío
 *
 * @example
 * // Estado vacío simple
 * EmptyState({
 *   icon: 'folder_open',
 *   title: 'Sin proyectos todavía',
 *   description: 'Crea uno para organizar tus tareas.'
 * })
 *
 * @example
 * // Con acción
 * EmptyState({
 *   icon: 'auto_stories',
 *   title: 'Tu diario está vacío',
 *   description: 'Empieza con un check-in diario.',
 *   action: {
 *     label: 'Escribir entrada',
 *     id: 'start-journal-btn',
 *     icon: 'edit'
 *   }
 * })
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action = null,
  secondaryAction = null,
  variant = 'default'
}) => {
  const variantClass = variant !== 'default' ? `empty-state--${variant}` : '';

  const actionButton = action ? `
    <button class="btn btn--primary" id="${action.id}">
      ${action.icon ? `<span class="material-symbols-outlined icon-sm">${action.icon}</span>` : ''}
      ${action.label}
    </button>
  ` : '';

  const secondaryButton = secondaryAction ? `
    <button class="btn btn--secondary" id="${secondaryAction.id}">
      ${secondaryAction.icon ? `<span class="material-symbols-outlined icon-sm">${secondaryAction.icon}</span>` : ''}
      ${secondaryAction.label}
    </button>
  ` : '';

  const hasActions = action || secondaryAction;

  return `
    <div class="empty-state ${variantClass}">
      <span class="material-symbols-outlined empty-state__icon">${icon}</span>
      <h3 class="empty-state__title">${title}</h3>
      <p class="empty-state__description">${description}</p>
      ${hasActions ? `
        <div class="empty-state__actions">
          ${secondaryButton}
          ${actionButton}
        </div>
      ` : ''}
    </div>
  `;
};

/**
 * Estados vacíos predefinidos para cada módulo
 * Facilita la consistencia sin tener que recordar los textos
 */
export const EMPTY_STATES = {
  journal: {
    icon: 'auto_stories',
    title: 'Tu diario está vacío',
    description: 'Empieza con un check-in diario. Solo toma unos minutos y te ayuda a reflexionar sobre tu día.'
  },

  projects: {
    icon: 'folder_open',
    title: 'Sin proyectos todavía',
    description: 'Los proyectos te ayudan a agrupar tareas relacionadas. Crea uno para organizar tu próximo viaje, reforma o meta importante.'
  },

  values: {
    icon: 'explore',
    title: 'Define tu brújula',
    description: 'Tus valores son tu guía. ¿Qué es realmente importante para ti? Define 3-5 valores que guíen tus decisiones.',
    variant: 'large'
  },

  calendar: {
    icon: 'calendar_month',
    title: 'Sin eventos todavía',
    description: 'Añade eventos para organizar tu tiempo. Haz doble clic en un día para crear uno.'
  },

  achievements: {
    icon: 'emoji_events',
    title: 'Aún no hay logros',
    description: 'Completa tareas, mantén tu hábito y escribe en tu diario. Tus logros aparecerán aquí.'
  },

  spontaneous: {
    icon: 'celebration',
    title: 'Sin logros espontáneos',
    description: 'Cuando logres algo que no estaba planeado, ¡regístralo! También cuenta.'
  },

  habits: {
    icon: 'psychology',
    title: 'Antes de empezar...',
    description: '¿Quieres reflexionar sobre tus hábitos actuales antes de crear uno nuevo?'
  },

  atelic: {
    icon: 'spa',
    title: 'Tiempo sin objetivos',
    description: 'Registra momentos de ocio sin propósito: leer, pasear, contemplar... El descanso también importa.'
  },

  kanbanDaily: {
    icon: 'wb_sunny',
    title: 'Sin tareas para hoy',
    description: 'Mueve tareas desde tus horizontes o añade una nueva directamente.'
  },

  kanbanBacklog: {
    icon: 'inbox',
    title: 'Bandeja vacía',
    description: 'Captura aquí todas tus ideas y tareas pendientes. Sin límite, sin presión.'
  },

  searchNoResults: {
    icon: 'search_off',
    title: 'Sin resultados',
    description: 'No se encontraron coincidencias. Prueba con otros términos.'
  }
};

/**
 * Helper para crear un estado vacío predefinido
 * @param {string} type - Tipo de estado vacío (key de EMPTY_STATES)
 * @param {Object} [overrides] - Propiedades a sobrescribir
 * @returns {string} HTML del estado vacío
 *
 * @example
 * emptyStateFor('journal')
 * emptyStateFor('projects', { action: { label: 'Crear', id: 'create-btn' } })
 */
export const emptyStateFor = (type, overrides = {}) => {
  const preset = EMPTY_STATES[type];
  if (!preset) {
    console.warn(`EmptyState: tipo "${type}" no encontrado`);
    return EmptyState({
      icon: 'help_outline',
      title: 'Estado vacío',
      description: 'No hay contenido para mostrar.',
      ...overrides
    });
  }

  return EmptyState({ ...preset, ...overrides });
};

export default {
  EmptyState,
  EMPTY_STATES,
  emptyStateFor
};
