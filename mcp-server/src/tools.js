/**
 * Oráculo MCP Server — Tools
 *
 * Define todas las tools MCP disponibles para agentes LLM.
 * Cada tool tiene schema de input y handler de ejecución.
 *
 * Clientes soportados: Claude Desktop, Claude Code, OpenAI,
 * Gemini, Hermes, OpenCode y cualquier cliente MCP compatible.
 */

import { enqueueAgentAction, getOraculoData, getBridgeInfo } from './store.js';

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────

function formatTask(task) {
  return {
    id: task.id,
    text: task.text,
    completed: task.completed || false,
    isRocaPrincipal: task.isRocaPrincipal || false,
    projectId: task.projectId || null,
    important: task.important || false,
    createdAt: task.createdAt,
    completedAt: task.completedAt || null,
  };
}

function formatProject(project) {
  return {
    id: project.id,
    name: project.name,
    description: project.description || '',
    status: project.status,
    color: project.color,
    deadline: project.deadline || null,
    createdAt: project.createdAt,
  };
}

function formatJournalEntry(entry) {
  return {
    id: entry.id,
    type: entry.type,
    content: entry.content,
    createdAt: entry.createdAt,
  };
}

function toText(obj) {
  return JSON.stringify(obj, null, 2);
}

// ─────────────────────────────────────────────────
// DEFINICIONES DE TOOLS
// ─────────────────────────────────────────────────

export const TOOL_DEFINITIONS = [
  // ── LECTURA ─────────────────────────────────────

  {
    name: 'get_daily_overview',
    description:
      'Obtiene un resumen completo del día actual: setup de Volumen Fijo (tiempo y energía disponibles), ' +
      'roca principal, tareas diarias activas, hábito activo con racha, próximos eventos del calendario y ' +
      'logros de hoy. Úsala como primera llamada para entender el contexto del día antes de hacer sugerencias.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_tasks',
    description:
      'Lista las tareas de un horizonte temporal específico. ' +
      'Horizontes disponibles: daily (tareas del día, máx 3), weekly (semana, máx 10), ' +
      'monthly (mes, máx 6), quarterly (trimestre, máx 3), backlog (sin límite, ideas pendientes), ' +
      'completed (tareas completadas recientes). Si no se especifica horizonte, devuelve todos los horizontes activos.',
    inputSchema: {
      type: 'object',
      properties: {
        horizon: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'backlog', 'completed', 'all'],
          description: 'Horizonte temporal. Por defecto: "all" (todos los activos)',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_projects',
    description:
      'Lista los proyectos del usuario con su estado y progreso. ' +
      'Oráculo limita a 4 proyectos activos según la filosofía Burkeman (foco, no más).',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'paused', 'completed', 'archived', 'all'],
          description: 'Filtrar por estado. Por defecto: "active"',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_active_habit',
    description:
      'Obtiene el hábito activo actual con su racha, historial de cumplimiento reciente, ' +
      'área de vida, identidad asociada y configuración del wizard de 7 pasos. ' +
      'Oráculo solo permite un hábito activo a la vez.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_journal_entries',
    description:
      'Obtiene entradas del diario reflexivo. Tipos disponibles: ' +
      'daily_checkin (check-in diario), weekly_review (revisión semanal), ' +
      'quarterly_review (revisión trimestral), discomfort (registro de incomodidad Burkeman), ' +
      'meditation (post-meditación), free (escritura libre).',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['daily_checkin', 'weekly_review', 'quarterly_review', 'discomfort', 'meditation', 'free', 'all'],
          description: 'Tipo de entrada. Por defecto: "all"',
        },
        limit: {
          type: 'number',
          description: 'Número máximo de entradas. Por defecto: 10',
        },
        since: {
          type: 'string',
          description: 'ISO date string. Solo entradas desde esta fecha.',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_values',
    description:
      'Obtiene la brújula de valores personal del usuario (3-5 valores con nombre, ' +
      'descripción e icono). Útil para contextualizar sugerencias de priorización ' +
      'y alinear tareas con lo que realmente importa.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_achievements',
    description:
      'Obtiene estadísticas de logros para un período: tareas completadas, ' +
      'días de hábito, proyectos completados, entradas de diario y logros espontáneos (done list). ' +
      'Útil para recapitulaciones y motivación.',
    inputSchema: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['week', 'month', 'quarter', 'year'],
          description: 'Período de análisis. Por defecto: "week"',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_life_wheel',
    description:
      'Obtiene la última evaluación de la rueda de la vida (8 áreas: salud física, ' +
      'estado emocional, desarrollo personal, familia/pareja, relaciones sociales, ' +
      'profesión, finanzas, ocio). Cada área tiene puntuación actual y deseada.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_burkeman_context',
    description:
      'Obtiene el contexto filosófico Burkeman del día: tiempo disponible, ' +
      'nivel de energía, límite dinámico de tareas, roca principal y preferencias. ' +
      'Úsala para hacer sugerencias alineadas con la filosofía de finitud de la app.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_bridge_status',
    description:
      'Verifica el estado de la conexión entre el agente y la app Oráculo: ' +
      'versión del bridge, fecha del último sync, acciones pendientes en la queue.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // ── ESCRITURA (via agentQueue) ───────────────────

  {
    name: 'add_journal_entry',
    description:
      'Encola una nueva entrada en el diario reflexivo de Oráculo. ' +
      'La entrada NO se aplica inmediatamente — queda en la queue hasta que el usuario ' +
      'la apruebe en la app. Ideal para guardar reflexiones surgidas en la conversación.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['daily_checkin', 'weekly_review', 'quarterly_review', 'discomfort', 'meditation', 'free'],
          description: 'Tipo de entrada de diario',
        },
        content: {
          type: 'string',
          description: 'Contenido de la entrada. Puede incluir saltos de línea.',
        },
      },
      required: ['type', 'content'],
    },
  },

  {
    name: 'add_task',
    description:
      'Encola la creación de una nueva tarea en un horizonte temporal. ' +
      'La tarea NO se aplica inmediatamente — queda en la queue hasta que el usuario la apruebe. ' +
      'Recuerda los límites Burkeman: daily máx 3, weekly máx 10, monthly máx 6, quarterly máx 3.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Texto de la tarea',
        },
        horizon: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'backlog'],
          description: 'Horizonte temporal donde añadir la tarea',
        },
        projectId: {
          type: 'string',
          description: 'ID del proyecto al que vincular (opcional)',
        },
        important: {
          type: 'boolean',
          description: 'Marcar como importante (añade ! en la captura inteligente)',
        },
      },
      required: ['text', 'horizon'],
    },
  },

  {
    name: 'complete_task',
    description:
      'Encola la finalización de una tarea existente. ' +
      'Requiere el ID de la tarea y el horizonte donde vive. ' +
      'La acción queda en la queue hasta que el usuario la apruebe.',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tarea a completar',
        },
        horizon: {
          type: 'string',
          enum: ['daily', 'weekly', 'monthly', 'quarterly', 'backlog'],
          description: 'Horizonte donde vive la tarea',
        },
      },
      required: ['taskId', 'horizon'],
    },
  },

  {
    name: 'add_spontaneous_achievement',
    description:
      'Encola un logro espontáneo en la Done List de Oráculo. ' +
      'Úsala cuando el usuario mencione algo que hizo y que merece ser celebrado, ' +
      'aunque no estuviera planificado. Encaja con la filosofía Burkeman de celebrar lo hecho.',
    inputSchema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description: 'Descripción del logro',
        },
        mood: {
          type: 'string',
          enum: ['orgullosa', 'aliviada', 'sorprendida', 'agradecida', 'energizada'],
          description: 'Estado emocional asociado al logro',
        },
      },
      required: ['text', 'mood'],
    },
  },

  {
    name: 'set_roca_principal',
    description:
      'Encola el establecimiento de la roca principal del día (la tarea más importante). ' +
      'Solo puede haber una roca a la vez. La tarea debe existir en el horizonte "daily".',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID de la tarea a marcar como roca principal',
        },
      },
      required: ['taskId'],
    },
  },
];

// ─────────────────────────────────────────────────
// HANDLERS DE TOOLS
// ─────────────────────────────────────────────────

export async function handleTool(toolName, args, bridgePath) {
  switch (toolName) {

    // ── get_bridge_status ──────────────────────────
    case 'get_bridge_status': {
      const info = await getBridgeInfo(bridgePath);
      if (!info) {
        return {
          content: [{
            type: 'text',
            text: '❌ Bridge file no encontrado.\n\nPara conectar:\n1. Abre Oráculo en Chrome/Edge\n2. Ve a Configuración → Agente IA\n3. Activa la sincronización MCP'
          }]
        };
      }
      return {
        content: [{
          type: 'text',
          text: `✅ Oráculo conectado\n\n` +
                `• App versión: ${info.appVersion}\n` +
                `• Bridge versión: ${info.bridgeVersion}\n` +
                `• Último sync: ${info.exportedAt}\n` +
                `• Acciones pendientes: ${info.agentQueueCount}`
        }]
      };
    }

    // ── get_daily_overview ─────────────────────────
    case 'get_daily_overview': {
      const data = await getOraculoData(bridgePath);
      const today = new Date().toISOString().split('T')[0];

      const dailySetup = data.dailySetup;
      const isSetupToday = dailySetup?.date === today;

      const dailyTasks = (data.objectives?.daily || []).filter(t => !t.completed);
      const roca = dailyTasks.find(t => t.isRocaPrincipal);

      const habit = data.habits?.active;
      const habitStreak = habit ? (data.habits?.history || [])
        .filter(h => h.habitId === habit.id).length : 0;

      const todayEvents = (data.calendar?.events || []).filter(e => {
        const eventDate = (e.date || '').split('T')[0];
        return eventDate === today;
      });

      const todayAchievements = (data.spontaneousAchievements || []).filter(a => {
        return (a.createdAt || '').startsWith(today);
      });

      const result = {
        fecha: today,
        setupDiario: isSetupToday ? {
          tiempoDisponible: dailySetup.availableTime,
          nivelEnergia: dailySetup.energyLevel,
          limiteTareas: dailySetup.dailyLimit,
        } : null,
        rocaPrincipal: roca ? { id: roca.id, text: roca.text } : null,
        tareasDiarias: dailyTasks.map(formatTask),
        habitoActivo: habit ? {
          nombre: habit.name,
          area: habit.area,
          racha: habitStreak,
          horaProgramada: habit.scheduledTime || null,
        } : null,
        eventosHoy: todayEvents.map(e => ({
          id: e.id,
          title: e.title,
          time: e.time,
          duration: e.duration,
          isSincronia: e.isSincronia || false,
        })),
        logrosEspontaneosHoy: todayAchievements.length,
      };

      return { content: [{ type: 'text', text: toText(result) }] };
    }

    // ── get_tasks ──────────────────────────────────
    case 'get_tasks': {
      const data = await getOraculoData(bridgePath);
      const horizon = args.horizon || 'all';
      const objectives = data.objectives || {};

      const horizons = horizon === 'all'
        ? ['daily', 'weekly', 'monthly', 'quarterly', 'backlog']
        : [horizon];

      const result = {};
      for (const h of horizons) {
        const tasks = objectives[h] || [];
        result[h] = {
          tareas: tasks.map(formatTask),
          total: tasks.length,
          completadas: tasks.filter(t => t.completed).length,
          pendientes: tasks.filter(t => !t.completed).length,
        };
      }

      // Límites Burkeman para contexto
      const limits = { daily: 3, weekly: 10, monthly: 6, quarterly: 3 };
      if (horizon === 'all' || limits[horizon]) {
        result._limitesBurkeman = horizon === 'all' ? limits : { [horizon]: limits[horizon] };
      }

      return { content: [{ type: 'text', text: toText(result) }] };
    }

    // ── get_projects ───────────────────────────────
    case 'get_projects': {
      const data = await getOraculoData(bridgePath);
      const statusFilter = args.status || 'active';

      let projects = data.projects || [];
      if (statusFilter !== 'all') {
        projects = projects.filter(p => p.status === statusFilter);
      }

      // Calcular progreso de cada proyecto
      const allTasks = [
        ...(data.objectives?.daily || []),
        ...(data.objectives?.weekly || []),
        ...(data.objectives?.monthly || []),
        ...(data.objectives?.quarterly || []),
        ...(data.objectives?.backlog || []),
        ...(data.objectives?.completed || []),
      ];

      const result = projects.map(p => {
        const projectTasks = allTasks.filter(t => t.projectId === p.id);
        const completed = projectTasks.filter(t => t.completed).length;
        return {
          ...formatProject(p),
          progreso: projectTasks.length > 0
            ? Math.round((completed / projectTasks.length) * 100)
            : 0,
          totalTareas: projectTasks.length,
          tareasCompletadas: completed,
        };
      });

      return { content: [{ type: 'text', text: toText({ proyectos: result, total: result.length }) }] };
    }

    // ── get_active_habit ───────────────────────────
    case 'get_active_habit': {
      const data = await getOraculoData(bridgePath);
      const habit = data.habits?.active;

      if (!habit) {
        return { content: [{ type: 'text', text: 'No hay hábito activo actualmente.' }] };
      }

      const history = data.habits?.history || [];
      const habitHistory = history.filter(h => h.habitId === habit.id);
      const racha = habitHistory.length;

      // Últimas 7 entradas
      const last7 = habitHistory.slice(-7).map(h => h.date);

      const result = {
        id: habit.id,
        nombre: habit.name,
        identidad: habit.identity,
        microVersion: habit.micro,
        area: habit.area,
        horaProgramada: habit.scheduledTime || null,
        ubicacion: habit.location || null,
        habitStack: habit.trigger || null,
        duracionObjetivo: habit.duration,
        fechaInicio: habit.startDate,
        racha,
        ultimosCumplimientos: last7,
        graduado: habit.status === 'graduated',
      };

      return { content: [{ type: 'text', text: toText(result) }] };
    }

    // ── get_journal_entries ────────────────────────
    case 'get_journal_entries': {
      const data = await getOraculoData(bridgePath);
      const typeFilter = args.type || 'all';
      const limit = args.limit || 10;
      const since = args.since ? new Date(args.since) : null;

      let entries = data.journal || [];

      if (typeFilter !== 'all') {
        entries = entries.filter(e => e.type === typeFilter);
      }
      if (since) {
        entries = entries.filter(e => new Date(e.createdAt) >= since);
      }

      // Más recientes primero
      entries = entries
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit)
        .map(formatJournalEntry);

      return { content: [{ type: 'text', text: toText({ entradas: entries, total: entries.length }) }] };
    }

    // ── get_values ─────────────────────────────────
    case 'get_values': {
      const data = await getOraculoData(bridgePath);
      const values = (data.values || []).map(v => ({
        id: v.id,
        nombre: v.name,
        descripcion: v.description || '',
        icono: v.icon || v.emoji || '',
      }));

      return { content: [{ type: 'text', text: toText({ valores: values }) }] };
    }

    // ── get_achievements ───────────────────────────
    case 'get_achievements': {
      const data = await getOraculoData(bridgePath);
      const period = args.period || 'week';

      const now = new Date();
      let since;
      switch (period) {
        case 'week': since = new Date(now - 7 * 86400000); break;
        case 'month': since = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'quarter': since = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break;
        case 'year': since = new Date(now.getFullYear(), 0, 1); break;
      }

      const allCompleted = (data.objectives?.completed || []).filter(t => {
        return t.completedAt && new Date(t.completedAt) >= since;
      });

      const habitDays = (data.habits?.history || []).filter(h => {
        return new Date(h.date) >= since;
      }).length;

      const journalEntries = (data.journal || []).filter(e => {
        return new Date(e.createdAt) >= since;
      }).length;

      const spontaneous = (data.spontaneousAchievements || []).filter(a => {
        return new Date(a.createdAt) >= since;
      });

      const completedProjects = (data.projects || []).filter(p => {
        return p.status === 'completed' && p.completedAt && new Date(p.completedAt) >= since;
      });

      const result = {
        periodo: period,
        desde: since.toISOString().split('T')[0],
        tareasCompletadas: allCompleted.length,
        diasDeHabito: habitDays,
        entradasDiario: journalEntries,
        logrosEspontaneos: spontaneous.length,
        proyectosCompletados: completedProjects.length,
        ultimosLogros: spontaneous.slice(-5).map(a => ({
          texto: a.text,
          estado: a.mood,
          fecha: a.createdAt,
        })),
      };

      return { content: [{ type: 'text', text: toText(result) }] };
    }

    // ── get_life_wheel ─────────────────────────────
    case 'get_life_wheel': {
      const data = await getOraculoData(bridgePath);
      const lifeWheel = data.lifeWheel;

      if (!lifeWheel || !lifeWheel.evaluations?.length) {
        return { content: [{ type: 'text', text: 'No hay evaluaciones de la rueda de la vida todavía.' }] };
      }

      const latest = lifeWheel.evaluations[lifeWheel.evaluations.length - 1];
      const areas = lifeWheel.areas || [];

      const result = {
        fecha: latest.date,
        areas: areas.map(area => ({
          nombre: area.name,
          icono: area.icon,
          actual: latest.scores?.[area.id]?.current || 0,
          deseado: latest.scores?.[area.id]?.desired || 0,
          brecha: (latest.scores?.[area.id]?.desired || 0) - (latest.scores?.[area.id]?.current || 0),
          reflexion: latest.scores?.[area.id]?.reflection?.why || null,
        })).sort((a, b) => b.brecha - a.brecha),
      };

      return { content: [{ type: 'text', text: toText(result) }] };
    }

    // ── get_burkeman_context ───────────────────────
    case 'get_burkeman_context': {
      const data = await getOraculoData(bridgePath);
      const today = new Date().toISOString().split('T')[0];
      const setup = data.dailySetup;
      const isToday = setup?.date === today;

      const result = {
        filosofia: 'Oráculo sigue la filosofía de Oliver Burkeman: aceptar la finitud, priorizar lo esencial. No puedes hacerlo todo, y está bien.',
        principios: [
          'Finitud: Solo ~4000 semanas de vida. Elegir es renunciar.',
          'Incomodidad: El crecimiento se siente incómodo. Es señal de avance.',
          'Cuestionamiento: Vivir las preguntas, no buscar respuestas rápidas.',
          'Insignificancia Cósmica: Soltar la presión de dejar huella.',
        ],
        setupHoy: isToday ? {
          tiempoDisponible: setup.availableTime,
          nivelEnergia: setup.energyLevel,
          limiteDinamicoTareas: setup.dailyLimit,
          obstaculoPotencial: setup.potentialObstacle || null,
          planContingencia: setup.contingencyPlan || null,
        } : null,
        limitesHorizontes: {
          daily: 3,
          weekly: 10,
          monthly: 6,
          quarterly: 3,
          backlog: 'sin límite',
        },
        preferencias: data.burkemanSettings || {},
      };

      return { content: [{ type: 'text', text: toText(result) }] };
    }

    // ── ESCRITURAS (enqueue) ───────────────────────

    case 'add_journal_entry': {
      if (!args.type || !args.content) {
        throw new Error('Se requieren los campos "type" y "content"');
      }
      const actionId = await enqueueAgentAction(bridgePath, 'add_journal_entry', {
        type: args.type,
        content: args.content,
        createdAt: new Date().toISOString(),
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Entrada de diario encolada (ID: ${actionId})\n\n` +
                `Tipo: ${args.type}\n` +
                `La entrada aparecerá en la app Oráculo para que la apruebes.\n` +
                `Ve a Configuración → Agente IA → "Aplicar cambios pendientes"`
        }]
      };
    }

    case 'add_task': {
      if (!args.text || !args.horizon) {
        throw new Error('Se requieren los campos "text" y "horizon"');
      }
      const actionId = await enqueueAgentAction(bridgePath, 'add_task', {
        text: args.text,
        horizon: args.horizon,
        projectId: args.projectId || null,
        important: args.important || false,
        createdAt: new Date().toISOString(),
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Tarea encolada (ID: ${actionId})\n\n` +
                `"${args.text}" → horizonte: ${args.horizon}\n` +
                `La tarea aparecerá en Oráculo cuando apruebes los cambios pendientes.`
        }]
      };
    }

    case 'complete_task': {
      if (!args.taskId || !args.horizon) {
        throw new Error('Se requieren los campos "taskId" y "horizon"');
      }
      const actionId = await enqueueAgentAction(bridgePath, 'complete_task', {
        taskId: args.taskId,
        horizon: args.horizon,
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Completar tarea encolado (ID: ${actionId})\n` +
                `Pendiente de aprobación en la app.`
        }]
      };
    }

    case 'add_spontaneous_achievement': {
      if (!args.text || !args.mood) {
        throw new Error('Se requieren los campos "text" y "mood"');
      }
      const actionId = await enqueueAgentAction(bridgePath, 'add_spontaneous_achievement', {
        text: args.text,
        mood: args.mood,
        createdAt: new Date().toISOString(),
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Logro espontáneo encolado (ID: ${actionId})\n\n` +
                `"${args.text}" (${args.mood})\n` +
                `¡Se añadirá a tu Done List cuando apruebes los cambios!`
        }]
      };
    }

    case 'set_roca_principal': {
      if (!args.taskId) {
        throw new Error('Se requiere el campo "taskId"');
      }
      const actionId = await enqueueAgentAction(bridgePath, 'set_roca_principal', {
        taskId: args.taskId,
      });
      return {
        content: [{
          type: 'text',
          text: `✅ Roca principal encolada (ID: ${actionId})\n` +
                `Pendiente de aprobación en la app.`
        }]
      };
    }

    default:
      throw new Error(`Tool desconocida: ${toolName}`);
  }
}
