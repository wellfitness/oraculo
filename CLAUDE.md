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
Almacenamiento: localStorage (offline-first, sin backend)
Iconos: Material Symbols Outlined (Google Fonts CDN)
Deploy: Vercel (hosting estático, auto-deploy en git push)
Extensión Chrome: Manifest V3, side panel
```

---

## Arquitectura

### Plataformas

| Plataforma | Punto de entrada | Storage | Detección |
|-----------|-----------------|---------|-----------|
| Web app | `app.html` | `storage-hybrid.js` (localStorage) | default |
| Extensión Chrome | `extension/sidepanel.html` | `storage-local.js` (localStorage) | `window.__ORACULO_EXTENSION__` |

El `app.js` usa **dynamic import** en `bootstrap()` para cargar el módulo de storage correcto según el contexto.

### Almacenamiento

- **Solo localStorage** — sin backend, sin cuentas, sin sincronización cloud
- `storage-hybrid.js` y `storage-local.js` son idénticos (ambos solo localStorage)
- La app no requiere registro ni autenticación
- `auth.html` y `auth-callback.html` redirigen a `app.html` (legacy de Supabase, ya eliminado)

### Extensión Chrome

```
extension/
├── manifest.json             # Manifest V3 (sidePanel + notifications)
├── sidepanel.html            # Entry point del side panel
├── background.js             # Service worker (abre side panel al clic)
├── init-extension.js         # Marca window.__ORACULO_EXTENSION__
├── icons/                    # Iconos 16, 32, 48, 128 PNG
├── css/
│   └── extension-overrides.css  # CSS para side panel (~400px)
└── store/                    # Assets para Chrome Web Store
```

- **Launcher**: Dashboard compacto con grid de iconos en extensión (en vez del dashboard estándar)
- **Muévete indicator**: Mini-indicator en el header muestra estado del timer
- **build-extension.mjs**: Genera `dist-extension/` y ZIP descargable

### Captura Inteligente

El input de captura global parsea sintaxis especial:
- `#proyecto` → asigna al proyecto que coincida
- `>semana` / `>mes` / `>trimestre` / `>hoy` → horizonte destino
- `!` al inicio → marca como importante
- Sin sintaxis → va al backlog (comportamiento original)

### Deploy

**Hosting: Vercel** — Dominio: `oraculo.movimientofuncional.app`

- Deploy automático al hacer push a GitHub
- Sirve la carpeta `dist/` como sitio estático
- CDN global con edge caching + SSL automático

> **Legacy**: El archivo `deploy.mjs` contiene el script FTP anterior (Hostinger). Ya no se usa.

### Desarrollo Local

**IMPORTANTE**: No abrir archivos HTML directamente con `file://` — causa errores CORS con ES modules.

```bash
# Servidor de desarrollo (puerto 8000)
npx http-server D:/SOFTWARE/oraculo/dist -p 8000

# Luego abrir: http://localhost:8000/app.html
```

Alternativa: Usar extensión "Live Preview" de VSCode (clic derecho → Show Preview).

### Flujo de Trabajo (src → dist)

**IMPORTANTE**: Siempre editar archivos en la **raíz** (src) y luego copiar a `dist/`.

```bash
# Después de editar archivos en la raíz, sincronizar con dist:
cp index.html app.html dist/
cp css/style.css dist/css/
cp -r js/* dist/js/
```

**NUNCA editar directamente en `dist/`** — causa desincronización entre src y dist.

Si detectas que `dist/` tiene cambios que no están en la raíz, sincroniza al revés:

```bash
# Solo si dist está más actualizado que src (emergencia)
cp dist/js/archivo.js js/
```

---

## Estructura del Proyecto

```
oraculo/
├── index.html              # Landing page
├── app.html                # App principal (SPA)
├── auth.html               # Redirect a app.html (legacy)
├── auth-callback.html      # Redirect a app.html (legacy)
├── favicon.svg             # Favicon vectorial
├── build-extension.mjs     # Genera dist-extension/ y ZIP
├── css/
│   └── style.css           # Estilos con design system (~18000 líneas)
├── js/
│   ├── app.js              # Coordinador principal (bootstrap dinámico, captura inteligente)
│   ├── storage-hybrid.js   # Solo localStorage (idéntico a storage-local.js)
│   ├── storage-local.js    # Solo localStorage (para extensión Chrome)
│   ├── storage.js          # Solo localStorage (legacy, usado por settings.js)
│   ├── modules/
│   │   ├── dashboard.js    # Dashboard web + launcher extensión
│   │   ├── today.js        # Vista "Hoy" compacta
│   │   ├── values.js       # Brújula de valores
│   │   ├── kanban.js       # Tablero por horizontes + pendientes + filtros
│   │   ├── projects.js     # Gestión de proyectos
│   │   ├── habits.js       # Laboratorio de hábitos + auditoría + wizard + atélicas
│   │   ├── muevete.js      # Breaks de movimiento (4 pantallas)
│   │   ├── calendar.js     # Calendario y eventos + sincronía + ICS recurrentes
│   │   ├── journal.js      # Diario reflexivo + tipos Burkeman
│   │   ├── achievements.js # Logros, recapitulaciones + done list
│   │   ├── settings.js     # Configuración + cuadernos + sync portapapeles
│   │   └── help.js         # Ayuda + instrucciones extensión Chrome
│   ├── components/
│   │   ├── muevete-timer.js        # Motor global del timer de breaks
│   │   ├── daily-setup-modal.js    # Modal Volumen Fijo (tiempo + energía)
│   │   ├── weekly-review-modal.js  # Revisión semanal guiada (6 pasos)
│   │   ├── spontaneous-achievement.js  # Done List
│   │   ├── calm-timer.js           # Temporizador de calma (5 min)
│   │   ├── welcome-modal.js        # Onboarding + USAGE_MODES
│   │   └── evening-check-in.js     # Check-in nocturno
│   ├── data/
│   │   └── burkeman.js     # Reflexiones y pilares filosóficos
│   └── utils/
│       ├── achievements-calculator.js
│       ├── sanitizer.js
│       ├── validator.js
│       ├── speech-handler.js
│       └── auto-backup.js
├── sounds/
│   └── alert.mp3           # Alerta de Muévete
├── extension/              # Extensión Chrome (source)
│   ├── manifest.json
│   ├── sidepanel.html
│   ├── background.js
│   ├── init-extension.js
│   ├── icons/
│   ├── css/extension-overrides.css
│   └── store/              # Assets Chrome Web Store
├── landing/                # Landing page assets
│   └── images/
├── dist/                   # Producción web (Vercel sirve esto)
├── dist-extension/         # Producción extensión (generado por build-extension.mjs)
└── CLAUDE.md               # Este archivo
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

**PENDIENTES** (Colapsable):
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

#### Auditoría de Hábitos (v1.5)

Proceso reflexivo antes de crear un hábito:

1. **Listar actividades**: Anotar actividades de 2 días representativos
2. **Evaluar cada una**: Marcar como + Mantener / - Cambiar / / Indiferente
3. **Elegir una para transformar**: De las marcadas para cambiar

#### Wizard de 7 Pasos (página completa)

1. **Área de vida**: Alimentación, Ejercicio, Descanso u Organización
2. **Identidad**: "Soy una persona que..."
3. **El hábito**: Nombre + micro-versión (regla de 2 minutos)
4. **Cuándo y dónde**: Hora específica + ubicación
5. **Habit Stack**: "Después de [hábito actual] → [nuevo hábito]"
6. **Las 4 Leyes**: Atractivo, fácil y satisfactorio
7. **Duración**: 2 semanas, 1 mes, 2 meses o 3 meses

#### Campos del Hábito

- Área de vida (4 opciones con iconos)
- Identidad ("Soy una persona que...")
- Nombre del hábito
- Micro-versión (regla de 2 minutos)
- Hora específica (HH:mm)
- Ubicación
- Habit Stack ("Después de X → Y")
- Las 4 Leyes: obvio, atractivo, fácil, satisfactorio
- Recompensa inmediata
- Duración objetivo

#### Tracking

- Racha visual (fuego)
- Calendario de cumplimiento
- Historial de fechas
- Badge de área en la tarjeta

#### Graduación

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

### 9. Muévete (Breaks de Movimiento)

**Timer de trabajo con breaks cada 2 horas.**

Arquitectura de dos capas:
- `muevete-timer.js`: Motor global (vive independiente de la vista, como calm-timer.js)
- `muevete.js`: Vista con 4 pantallas

#### Máquina de Estados
```
idle → working (2h) → break_alert → active_break (8min) → working → ...
                     → snooze (5min) → working
```

#### Características
- Timer basado en timestamps (`Date.now() - startTime`), sobrevive recargas
- Sóleo: recordatorio cada 30min para activar el sóleo sin levantarse
- Wake Lock durante breaks activos
- Notificaciones: break alert, sóleo, break completado
- Sonido de alerta (`sounds/alert.mp3`)
- Activity log con rachas en días laborables (WeekStrip)
- Mini-indicator en el header (visible desde cualquier vista)
- Tarjeta en el dashboard + widget en el launcher de extensión
- Recordatorio de hábito a la hora programada (scheduledTime)

#### Configuración
- Bloque de trabajo: 90 / 120 / 150 minutos
- Duración del break: 6 / 8 / 10 minutos
- Intervalo sóleo: 20 / 30 / 45 minutos

### 10. Vista "Hoy"

Vista compacta sin scroll (accesible via `#today`, en launcher de extensión):
- Roca del día (completar con 1 clic)
- Tareas del foco pendientes
- Widget Muévete (timer o botón iniciar)
- Widget hábito activo
- Próximo evento del día
- Cita Burkeman

### 11. Configuración

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

### localStorage (versión 1.5)

```javascript
const oraculoData = {
  version: '1.5',
  createdAt: ISO_STRING,
  updatedAt: ISO_STRING,

  // Brújula de valores
  values: [],

  // Objetivos por horizonte temporal
  objectives: {
    backlog: [],      // "Pendientes" en UI - Sin límite
    quarterly: [],    // Máx 3
    monthly: [],      // Máx 6
    weekly: [],       // Máx 10
    daily: []         // Máx 1-3 (dinámico según Volumen Fijo)
  },

  // Laboratorio de hábitos
  habits: {
    active: null,     // Solo 1 hábito activo (ver campos abajo)
    graduated: [],    // Hábitos consolidados (permanentes)
    history: [],      // Registro de cumplimiento: { habitId, date, completedAt }
    // Auditoría de hábitos (v1.5)
    audit: {
      activities: [], // { id, name, evaluation: 'maintain'|'change'|'indifferent', createdAt }
      lastAuditAt: null
    }
  },

  // Campos del hábito activo (v1.5):
  // { id, name, identity, micro, trigger, attractive, easy, reward, duration,
  //   area: 'alimentacion'|'ejercicio'|'descanso'|'organizacion',
  //   scheduledTime: 'HH:mm', location: string,
  //   fromAudit: boolean, originalActivity: string|null,
  //   startDate, status, completedDates }

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
    theme: 'light',
    usageMode: 'complete',      // 'complete' | 'habits' | 'journal' | 'complement'
    lastWeeklyReview: null,
    weeklyReviewDay: 0,         // 0=Domingo
    weeklyReviewReminder: true
  },

  // Onboarding
  onboarding: {
    completed: false,
    completedAt: null,
    selectedMode: null
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

  // Muévete - Breaks de movimiento
  muevete: {
    timerState: {
      status: 'idle',           // 'idle' | 'working' | 'break_alert' | 'active_break'
      startTime: null,          // timestamp inicio bloque trabajo
      breakStartTime: null,     // timestamp inicio break
      blocksCompleted: 0,       // vitaminas M del día
      lastResetDate: null,      // 'YYYY-MM-DD' para reset diario
      soleusEnabled: true,
      workBlockDuration: 7200000,  // 2h por defecto
      breakDuration: 480000,       // 8min por defecto
      soleusInterval: 1800000,     // 30min por defecto
      soundEnabled: true
    },
    activityLog: {
      entries: [],              // [{ date, completed, earlyEnds }]
      currentStreak: 0,
      bestStreak: 0
    }
  },

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
| Alimentación | restaurant |
| Ejercicio | fitness_center |
| Descanso | bedtime |
| Organización | event_note |
| Ubicación | location_on |
| Muévete | directions_run |
| Vista Hoy | today |
| Extensión | extension |

---

## Design System

### Arquitectura CSS Dual (Intencional)

El proyecto usa **dos sistemas de diseño separados**:

| Archivo | Contexto | Sistema de Espaciado | Razón |
|---------|----------|---------------------|-------|
| `css/style.css` | App (`app.html`) | Grid 8px (`--space-1: 8px`) | Legibilidad en uso prolongado |
| `landing.css` | Landing (`index.html`) | Tailwind 4px (`--space-1: 0.25rem`) | Diseño web moderno, compacto |

**Esto NO es un error ni inconsistencia** — es separación de concerns:
- La **landing** es marketing, se ve una vez → sistema Tailwind compacto
- La **app** es uso diario intensivo → más espaciado para reducir fatiga visual

**IMPORTANTE**: No "unificar" los sistemas. Cada uno está optimizado para su contexto.

### Variables de la App (`style.css`)

- **Colores**: turquesa (#06b6d4), rosa (#e11d48), amarillo (#eab308), grises
- **Tipografía**: Righteous (headers), ABeeZee (body)
- **Espaciado**: grid de 8px (`--space-1` a `--space-6`)
- **Radio de bordes**: --radius-md, --radius-lg
- **Sombras**: --shadow-sm, --shadow-md (una capa, estilo sutil)

### Variables de la Landing (`landing.css`)

- **Espaciado**: Tailwind scale (`--space-1: 4px` hasta `--space-24: 96px`)
- **Sombras**: Tailwind shadows (más pronunciadas)
- Variables adicionales: `--space-8`, `--space-10`, `--space-12`, etc.

### Nota sobre DESIGN-SYSTEM.md

El archivo `design-system/docs/DESIGN-SYSTEM.md` es documentación de **referencia importada de otro proyecto** (System WOD Generator). **NO es la especificación de Oráculo**. La fuente autoritativa es este `CLAUDE.md`.

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
- Probar auditoría de hábitos (3 pasos)
- Probar wizard de hábitos (7 pasos, navegación atrás/adelante)
- Verificar que nuevos campos se guardan correctamente (área, hora, ubicación)
- Probar extensión Chrome: launcher, navegación, Muévete en side panel
- Probar captura inteligente (#proyecto >horizonte !)
- Probar notificaciones de hábito (scheduledTime)
- Probar sync portapapeles (Copiar/Pegar datos en Configuración)

---

## Fases Completadas

- [x] Fase 1-6: Core funcional (valores, kanban, hábitos, calendario, diario)
- [x] Fase 7: Material Symbols + mejoras UI/UX (accesibilidad, transiciones)
- [x] Fase 8: Módulo de Proyectos (integración con kanban)
- [x] Fase 9: Cuadernos Anuales + Módulo de Logros (heatmap, recaps)
- [x] Fase 10: Sistema Burkeman v1.3 (volumen fijo, done list, actividades atélicas, reflexiones)
- [x] Fase 11: Hábitos v1.5 (auditoría, wizard 7 pasos, área/hora/ubicación)
- [x] Fase 12: Extensión Chrome con side panel + launcher
- [x] Fase 13: Muévete integrado (migrado de React a vanilla JS)
- [x] Fase 14: Mejoras UX (captura inteligente, vista Hoy, revisión semanal 6 pasos, sync portapapeles, notificaciones hábito)
- [x] Fase 15: Auditoría completa (3 rondas, ~35 issues corregidos)

---

## No Hacer

- NO añadir frameworks ni librerías innecesarias
- NO usar `any` en comentarios de tipo
- NO crear archivos de documentación extra sin pedir
- NO implementar features no especificadas
- NO hacer la app "más productiva" - es para priorizar, no para hacer más
- NO usar emojis en código (usar Material Symbols)
- NO saltarse los límites - son parte de la filosofía

---

## Troubleshooting

### Limpiar localStorage

```javascript
localStorage.clear();
caches.keys().then(k => k.forEach(c => caches.delete(c)));
navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister()));
location.reload();
```

### La extensión Chrome no carga

1. Verificar que `dist-extension/` está actualizado: `node build-extension.mjs`
2. En `chrome://extensions/`, recargar la extensión (botón flecha circular)
3. Verificar consola del side panel (clic derecho en el panel → Inspect)

### Los datos de la web y la extensión no coinciden

Los datos son **independientes** entre web y extensión (localStorage separado). Para sincronizar: Configuración → Copiar datos (en origen) → Pegar datos (en destino).
