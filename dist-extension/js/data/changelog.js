/**
 * Oráculo - Datos del Changelog
 * Historial de versiones y cambios relevantes.
 *
 * Tipos de cambio:
 *   'new'     → Funcionalidad nueva
 *   'improve' → Mejora de algo existente
 *   'fix'     → Corrección de error
 *
 * Para añadir una nueva versión, insertar al INICIO del array.
 */

export const CHANGELOG = [
  {
    version: '1.6.0',
    date: '2026-03-29',
    title: 'Sincronización y bienestar',
    changes: [
      { type: 'new', text: 'Sincronización con Google Drive entre dispositivos' },
      { type: 'new', text: 'Check-in de bienestar en el cierre del día' },
      { type: 'new', text: 'App Android nativa con Capacitor (Google Play)' },
      { type: 'improve', text: 'Merge inteligente de 3 capas para proteger tus datos al sincronizar' },
      { type: 'improve', text: 'Nuevos iconos y favicons de Oráculo (owl-logo)' },
      { type: 'fix', text: 'Mejoras en la experiencia móvil: overflow, calendario y cabecera' }
    ]
  },
  {
    version: '1.5.0',
    date: '2026-03-22',
    title: 'Captura inteligente y vista Hoy',
    changes: [
      { type: 'new', text: 'Captura inteligente: usa #proyecto, >horizonte y ! para capturar rápido' },
      { type: 'new', text: 'Vista "Hoy" compacta para ver lo esencial de un vistazo' },
      { type: 'new', text: 'Revisión semanal mejorada con celebración de logros (6 pasos)' },
      { type: 'new', text: 'Sincronización web-extensión por portapapeles' },
      { type: 'new', text: 'Notificaciones de hábito a la hora programada' },
      { type: 'improve', text: 'Launcher de extensión Chrome con grid de acceso rápido' },
      { type: 'fix', text: 'Service Worker con auto-update para recibir cambios más rápido' }
    ]
  },
  {
    version: '1.4.0',
    date: '2026-03-15',
    title: 'Extensión Chrome y Muévete',
    changes: [
      { type: 'new', text: 'Extensión Chrome con side panel para usar Oráculo sin abrir otra pestaña' },
      { type: 'new', text: 'Muévete: breaks de movimiento cada 2 horas con timer inteligente' },
      { type: 'new', text: 'Recordatorio de sóleo cada 30 minutos (sin levantarte)' },
      { type: 'new', text: 'Mini-indicador de Muévete visible desde cualquier vista' },
      { type: 'improve', text: 'Deploy migrado a Vercel con CDN global y SSL automático' },
      { type: 'fix', text: 'Auditoría completa: ~35 issues corregidos en 3 rondas' }
    ]
  },
  {
    version: '1.3.0',
    date: '2026-03-08',
    title: 'Hábitos Atómicos v2',
    changes: [
      { type: 'new', text: 'Auditoría de hábitos: evalúa tus actividades antes de crear un hábito' },
      { type: 'new', text: 'Wizard de 7 pasos para diseñar hábitos científicamente' },
      { type: 'new', text: 'Área de vida, hora, ubicación y habit stack en cada hábito' },
      { type: 'new', text: 'Rueda de la Vida: evalúa 8 áreas con gráfico interactivo' },
      { type: 'improve', text: 'Guía expandida de obstáculos y "nunca falles dos veces"' },
      { type: 'improve', text: 'Reactivar y auto-completar proyectos con estadísticas' }
    ]
  },
  {
    version: '1.2.0',
    date: '2026-02-28',
    title: 'Productividad consciente',
    changes: [
      { type: 'new', text: 'Sistema GTD simplificado: captura, próxima acción y revisión semanal' },
      { type: 'new', text: 'Dictado por voz universal en todos los campos de texto' },
      { type: 'new', text: 'Buscador en el diario y heatmap de consistencia en hábitos' },
      { type: 'new', text: 'Sistema de auto-backup con File System Access API' },
      { type: 'improve', text: 'Kanban con nuevo layout grid y secciones independientes' },
      { type: 'fix', text: 'Auditoría UX/UI completa: 8 críticos, 14 altos, 15 medios corregidos' }
    ]
  },
  {
    version: '1.1.0',
    date: '2026-02-15',
    title: 'Sistema Burkeman',
    changes: [
      { type: 'new', text: 'Volumen Fijo: configura tu día según tiempo y energía (1-3 tareas)' },
      { type: 'new', text: 'Roca Principal: elige UNA prioridad con icono de diamante' },
      { type: 'new', text: 'Done List: registra logros espontáneos con estado emocional' },
      { type: 'new', text: 'Actividades atélicas: 12 categorías de ocio sin objetivo' },
      { type: 'new', text: 'Temporizador de Calma: 5 minutos de "no hacer nada"' },
      { type: 'new', text: 'Reflexiones rotativas de Burkeman en toda la app' },
      { type: 'improve', text: 'Landing page con filosofía y características' }
    ]
  },
  {
    version: '1.0.0',
    date: '2026-02-01',
    title: 'Oráculo nace',
    changes: [
      { type: 'new', text: 'Brújula de valores: define 3-5 valores que guían tus decisiones' },
      { type: 'new', text: 'Kanban por horizontes: trimestre, mes, semana con límites' },
      { type: 'new', text: 'Laboratorio de hábitos: un hábito activo con racha visual' },
      { type: 'new', text: 'Calendario semanal con eventos y sincronía' },
      { type: 'new', text: 'Diario reflexivo con 6 tipos de entrada' },
      { type: 'new', text: 'Logros y recapitulaciones con heatmap estilo GitHub' },
      { type: 'new', text: 'Gestión de proyectos (máx 4 activos) con progreso automático' },
      { type: 'new', text: 'Cuadernos anuales: archiva y empieza limpio cada año' }
    ]
  }
];

/** Versión más reciente del changelog */
export const LATEST_VERSION = CHANGELOG[0].version;
