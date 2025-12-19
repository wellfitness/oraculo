# CLAUDE.md - Oráculo

Sistema de gestión personal consciente para mujeres +40 que quieren organizarse para cuidarse.

---

## Visión del Producto

**Oráculo** combina:

- **Filosofía Burkeman**: Aceptar la finitud, priorizar lo esencial (4000 semanas)
- **Psicología conductista**: Crear hábitos de forma científica (Hábitos Atómicos)
- **Bullet Journal**: Sistema flexible de organización + cuadernos anuales
- **GTD humanizado**: Sin la presión de productividad tóxica

**Principio central**: No puedes hacerlo todo, y está bien. La herramienta ayuda a priorizar, no a hacer más.

---

## Stack Técnico

```
HTML5 + CSS3 + JavaScript (vanilla ES6 modules)
Almacenamiento: localStorage (versión 1.3)
Iconos: Material Symbols Outlined (Google Fonts CDN)
Sin backend, sin dependencias externas
Ejecutable directamente en navegador
```

---

## Estructura del Proyecto

```
oraculo/
├── index.html              # App principal (SPA)
├── favicon.svg             # Favicon vectorial
├── css/
│   └── style.css           # Estilos con design system (~3100 líneas)
├── js/
│   ├── app.js              # Coordinador principal y router
│   ├── storage.js          # Gestión de localStorage + archivado anual
│   ├── modules/
│   │   ├── dashboard.js    # Vista inicial + logros de hoy + Burkeman
│   │   ├── values.js       # Brújula de valores
│   │   ├── kanban.js       # Tablero por horizontes + backlog + filtros
│   │   ├── projects.js     # Gestión de proyectos
│   │   ├── habits.js       # Laboratorio de hábitos + actividades atélicas
│   │   ├── calendar.js     # Calendario y eventos + sincronía
│   │   ├── journal.js      # Diario reflexivo + tipos Burkeman
│   │   ├── achievements.js # Logros, recapitulaciones + done list
│   │   └── settings.js     # Configuración + cuadernos + Burkeman settings
│   ├── components/
│   │   ├── daily-setup-modal.js    # Modal Volumen Fijo (tiempo + energía)
│   │   ├── spontaneous-achievement.js  # Done List (logros no planificados)
│   │   └── calm-timer.js           # Temporizador de calma (5 min)
│   ├── data/
│   │   └── burkeman.js     # Reflexiones y pilares filosóficos
│   └── utils/
│       ├── dates.js        # Utilidades de fechas
│       ├── ics.js          # Generador de archivos .ics
│       └── achievements-calculator.js  # Cálculos de estadísticas
├── landing/                # Landing page (próximamente)
│   ├── index.html
│   └── style.css
├── CLAUDE.md               # Este archivo
└── design-system/          # Sistema de diseño (existente)
```

---

## Sistema Burkeman (v1.3)

Filosofía de Oliver Burkeman integrada en toda la app.

### Los 4 Pilares

1. **Finitud**: Solo tienes ~4000 semanas de vida. No puedes hacerlo todo.
2. **Incomodidad**: El crecimiento se siente incómodo. Es señal de avance.
3. **Cuestionamiento**: Vivir las preguntas, no buscar respuestas rápidas.
4. **Insignificancia Cósmica**: Soltar la presión de "dejar huella".

### Componentes Burkeman

#### Volumen Fijo (Daily Setup)
Modal al iniciar el día:
- **Tiempo disponible**: 2h, 4h, 6h, día completo
- **Nivel de energía**: baja (-1 tarea), media (0), alta (+1 tarea)
- **Límite dinámico calculado**: 1-3 tareas máximo

#### Roca Principal (The Big Rock)
- Una sola tarea puede ser la "roca" del día
- Se hace PRIMERO, antes que nada
- Icono de diamante en el dashboard

#### Done List (Logros Espontáneos)
- Registro de lo que se logró sin planearlo
- 5 estados emocionales: orgullosa, aliviada, sorprendida, agradecida, energizada
- Se suma a los logros del período

#### Actividades Atélicas
Ocio sin objetivo (la actividad es el fin):
- 12 categorías: arte, música, lectura, naturaleza, movimiento, cocinar, jardinería, manualidades, juegos, socializar, contemplar, descansar
- Recordatorio: "También está permitido simplemente ser"

#### Sincronía
- Eventos de calendario marcados como "tiempo con otros"
- Reconoce la necesidad de conexión humana

#### Reflexiones Rotativas
- Citas de Burkeman que cambian según el día del año
- Aparecen en: dashboard, modales, páginas específicas

#### Temporizador de Calma
- 5 minutos de "no hacer nada"
- Instrucción: "Siéntate. No hagas nada."
- Opción de reflexión post-práctica guardada en diario

---

## Módulos Funcionales

### 1. Dashboard (vista inicial)

- **Foco del día**: Máx 1-3 tareas (límite dinámico según Volumen Fijo)
- **Roca Principal**: Tarea prioritaria con icono de diamante
- **Hábito activo**: Con racha de fuego + botón marcar hoy
- **Próximos eventos**: Del calendario de hoy
- **Logros de hoy**: Tareas, hábito, reflexiones, logros espontáneos
- **Cita de Burkeman**: Rotativa según día del año
- **FAB "+Logro"**: Añadir logros espontáneos
- **Botón Calma**: Temporizador de 5 minutos

### 2. Brújula de Valores

- 3-5 valores personales
- Nombre, descripción, emoji/icono
- Reflexión final con preguntas para priorizar
- Ejemplos predefinidos en estado vacío

### 3. Kanban por Horizontes

Tres secciones diferenciadas:

**EN FOCO** (Lista cerrada):
- Tareas activas del día (límite dinámico 1-3)
- Indicador de "slots disponibles"
- Roca Principal destacada

**HORIZONTES** (Grid 3 columnas):
- Trimestre (máx 3)
- Mes (máx 6)
- Semana (máx 10)
- Contadores "X/Límite"
- Drag & drop respetando límites

**BACKLOG** (Colapsable):
- Sin límite, captura de ideas
- Expandible/colapsable

Características:
- Etiquetas de proyecto con color
- Iconos Material Symbols por tarea
- Filtro por proyecto

### 4. Proyectos

- Máximo 4 proyectos activos
- Estados: active, paused, completed, archived
- 8 colores personalizables
- Barra de progreso automática
- Vinculación opcional a valores
- Vista de detalle con tareas

### 5. Laboratorio de Hábitos

**Un solo hábito activo a la vez.**

Configuración:
- Identidad ("Soy una persona que...")
- Nombre del hábito
- Micro-versión (regla de 2 minutos)
- Habit Stack ("Después de X → Y")
- Las 4 Leyes: obvio, atractivo, fácil, satisfactorio
- Recompensa inmediata

Tracking:
- Racha visual (fuego)
- Calendario de cumplimiento
- Historial de fechas

Graduación:
- Cuando está consolidado
- Se mantiene permanentemente

**Actividades Atélicas**:
- 12 categorías de ocio sin objetivo
- Registro con fecha
- Recordatorio de tomar descansos

### 6. Calendario

- Vista semanal navegable
- Eventos puntuales con hora, duración, notas
- Eventos recurrentes (días de la semana)
- **Sincronía**: Checkbox "tiempo con otros"
- Exportación .ics (Google Calendar)
- Navegación: anterior/siguiente + "Hoy"

### 7. Diario Reflexivo

6 tipos de entrada:
1. **Check-in diario**: 4 prompts rápidos
2. **Revisión semanal**: 5 prompts sobre lo aprendido
3. **Revisión trimestral**: 5 prompts sobre alineación de valores
4. **Registro de incomodidad**: Prompts Burkeman sobre crecimiento
5. **Meditación**: 4 prompts post-práctica
6. **Escritura libre**: Sin restricciones

Características:
- Listado cronológico (reciente primero)
- Búsqueda/filtrado por tipo
- Prompts guiados opcionales

### 8. Logros y Recapitulaciones

**Selector de período**: Semana / Mes / Trimestre / Año

**Stat Cards**:
- Tareas completadas
- Días de hábito (racha)
- Proyectos completados
- Entradas de diario
- Logros espontáneos

**Heatmap estilo GitHub**: Actividad del año

**Recapitulación Narrativa**: Texto automático motivacional

**Badges**: Hábitos graduados como logros permanentes

**Done List**: Histórico de logros no planificados

### 9. Configuración

**Cuadernos Anuales**:
- Cuaderno actual con fecha de inicio
- Resumen: tareas, hábitos, proyectos, diario
- Archivar año → Descargar JSON → Empezar limpio
- Lista de años archivados

**Gestión de Datos**:
- Indicador de espacio usado
- Exportar/Importar JSON
- Borrar datos (con confirmación)

**Preferencias Burkeman**:
- Toggle: Mostrar reflexiones rotativas
- Toggle: Kanban en modo menú por defecto
- Toggle: Mostrar modal de setup diario
- Toggle: Recordar descansos atélicos

---

## Sistema de Cuadernos Anuales

Como Bullet Journal: al terminar el año, archivas y empiezas un cuaderno nuevo.

**Al archivar**:
- Descarga JSON con todos los datos del año
- Registra metadatos en `archivedNotebooks`

**Se mantiene**:
- Valores
- Hábitos graduados
- Configuración
- Preferencias Burkeman

**Se limpia**:
- Objetivos (todos los horizontes)
- Historial de hábitos
- Diario
- Eventos del calendario
- Daily setup
- Logros espontáneos
- Actividades atélicas

**Importar año anterior**: Solo para consultar (modo lectura).

---

## Convenciones de Código

### JavaScript

- Vanilla JS, sin frameworks
- Módulos ES6 con import/export
- Nombres descriptivos en español para variables de dominio
- Funciones puras cuando sea posible
- Manejo de errores con try/catch

### CSS

- Variables CSS del design system
- Mobile-first responsive
- BEM para nomenclatura de clases
- Sin !important
- Iconos: Material Symbols Outlined

### HTML

- Semántico (header, main, section, article, nav)
- Accesible (WCAG 2.1 AA)
- Skip link para navegación por teclado
- Sin divitis

---

## Sistema de Almacenamiento

### localStorage (versión 1.3)

```javascript
const oraculoData = {
  version: '1.3',
  createdAt: ISO_STRING,
  updatedAt: ISO_STRING,

  // Brújula de valores
  values: [],

  // Objetivos por horizonte temporal
  objectives: {
    backlog: [],      // Sin límite (nuevo en v1.3)
    quarterly: [],    // Máx 3
    monthly: [],      // Máx 6
    weekly: [],       // Máx 10
    daily: []         // Máx 1-3 (dinámico según Volumen Fijo)
  },

  // Laboratorio de hábitos
  habits: {
    active: null,     // Solo 1 hábito activo
    graduated: [],    // Hábitos consolidados (permanentes)
    history: []       // Registro de cumplimiento: { habitId, date, completedAt }
  },

  // Calendario
  calendar: {
    events: [],       // Eventos puntuales (con campo sincronia)
    recurring: []     // Eventos recurrentes
  },

  // Diario
  journal: [],        // { id, type, content, createdAt }

  // Proyectos (máx 4 activos)
  projects: [],       // { id, name, description, color, valueId, status, deadline, createdAt, completedAt }

  // Configuración general
  settings: {
    storageType: 'localStorage',
    notificationsEnabled: false,
    theme: 'light'
  },

  // === SISTEMA BURKEMAN (v1.3) ===

  // Setup diario (Volumen Fijo)
  dailySetup: {
    date: ISO_STRING,           // Fecha del setup
    availableTime: 'half',      // '2h', '4h', '6h', 'full'
    energyLevel: 'medium',      // 'low', 'medium', 'high'
    dailyLimit: 3,              // Límite calculado (1-3)
    rocaPrincipal: null,        // ID de la tarea roca
    setupAt: ISO_STRING         // Timestamp del setup
  },

  // Logros espontáneos (Done List)
  spontaneousAchievements: [],  // { id, text, mood, createdAt }

  // Actividades atélicas
  atelicActivities: [],         // { id, category, note, createdAt }

  // Preferencias Burkeman
  burkemanSettings: {
    showReflexiones: true,      // Mostrar citas rotativas
    menuModeDefault: false,     // Kanban en modo menú
    dailySetupEnabled: true,    // Mostrar modal de setup
    atelicReminder: true,       // Recordar descansos
    askValueOnPriority: false   // Preguntar valor al priorizar
  },

  // === FIN SISTEMA BURKEMAN ===

  // Cuaderno actual
  notebook: {
    year: 2025,
    startedAt: ISO_STRING,
    name: 'Cuaderno 2025'
  },

  // Metadatos de años archivados
  archivedNotebooks: []   // { year, name, archivedAt, filename, summary }
};
```

---

## Iconos (Material Symbols)

```html
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" rel="stylesheet">
```

Mapeo principal:
| Uso | Icono |
|-----|-------|
| Logo | auto_awesome |
| Dashboard | home |
| Valores | explore |
| Horizontes | view_kanban |
| Proyectos | folder_open |
| Hábitos | science |
| Calendario | calendar_month |
| Diario | auto_stories |
| Logros | emoji_events |
| Configuración | settings |
| Racha/Fuego | local_fire_department |
| Roca Principal | diamond |
| Editar | edit |
| Eliminar | close / delete |
| Añadir | add |
| Check | check / task_alt |
| Calma | self_improvement |
| Sincronía | group |
| Atélico | spa |
| Tiempo | schedule |
| Energía | bolt |

---

## Design System

Usar variables existentes:

- **Colores**: turquesa (#06b6d4), rosa (#e11d48), amarillo (#eab308), grises
- **Tipografía**: Righteous (headers), ABeeZee (body)
- **Espaciado**: grid de 8px
- **Radio de bordes**: --radius-md, --radius-lg
- **Sombras**: --shadow-sm, --shadow-md

---

## Mensajes de la App

Tono: empático, cercano, sin presión.

Ejemplos:
- "Para añadir algo nuevo, primero completa o suelta algo"
- "No existe el '21 días mágicos'. Cada hábito tiene su tiempo"
- "¿A qué estás diciendo NO para poder decir SÍ a esto?"
- "Tu día está empezando. ¡Cada pequeño paso cuenta!"
- "Celebra lo que has conseguido. Cada pequeño paso cuenta."
- "Solo tienes unas 4000 semanas. Elige bien."
- "También está permitido simplemente ser."
- "El crecimiento se siente incómodo. Es señal de avance."

---

## Testing

- Probar en Chrome, Firefox, Safari, Edge
- Verificar responsive (móvil, tablet, desktop)
- Probar importar/exportar datos
- Verificar persistencia de datos
- Probar archivado anual
- Probar Volumen Fijo (límites dinámicos)
- Probar logros espontáneos

---

## Fases Completadas

- [x] Fase 1-6: Core funcional (valores, kanban, hábitos, calendario, diario)
- [x] Fase 7: Material Symbols + mejoras UI/UX (accesibilidad, transiciones)
- [x] Fase 8: Módulo de Proyectos (integración con kanban)
- [x] Fase 9: Cuadernos Anuales + Módulo de Logros (heatmap, recaps)
- [x] Fase 10: Sistema Burkeman v1.3 (volumen fijo, done list, actividades atélicas, reflexiones)

---

## No Hacer

- NO añadir frameworks ni librerías innecesarias
- NO usar `any` en comentarios de tipo
- NO crear archivos de documentación extra sin pedir
- NO implementar features no especificadas
- NO hacer la app "más productiva" - es para priorizar, no para hacer más
- NO usar emojis en código (usar Material Symbols)
- NO saltarse los límites - son parte de la filosofía
