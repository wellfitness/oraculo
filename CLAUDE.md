# CLAUDE.md - Oráculo

Sistema de gestión personal consciente para mujeres +40 que quieren organizarse para cuidarse.

---

## Visión del Producto

**Oráculo** combina:

- **Filosofía Burkeman**: Aceptar la finitud, priorizar lo esencial
- **Psicología conductista**: Crear hábitos de forma científica (Hábitos Atómicos)
- **Bullet Journal**: Sistema flexible de organización + cuadernos anuales
- **GTD humanizado**: Sin la presión de productividad tóxica

**Principio central**: No puedes hacerlo todo, y está bien. La herramienta ayuda a priorizar, no a hacer más.

---

## Stack Técnico

```
HTML5 + CSS3 + JavaScript (vanilla ES6 modules)
Almacenamiento: localStorage (versión 1.2)
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
│   │   ├── dashboard.js    # Vista inicial + logros de hoy
│   │   ├── values.js       # Brújula de valores
│   │   ├── kanban.js       # Tablero por horizontes + filtro proyectos
│   │   ├── projects.js     # Gestión de proyectos
│   │   ├── habits.js       # Laboratorio de hábitos
│   │   ├── calendar.js     # Calendario y eventos
│   │   ├── journal.js      # Diario reflexivo
│   │   ├── achievements.js # Logros y recapitulaciones
│   │   └── settings.js     # Configuración + cuadernos anuales
│   └── utils/
│       ├── dates.js        # Utilidades de fechas
│       ├── ics.js          # Generador de archivos .ics
│       └── achievements-calculator.js  # Cálculos de estadísticas
├── CLAUDE.md               # Este archivo
└── design-system/          # Sistema de diseño (existente)
```

---

## Módulos Funcionales

### 1. Dashboard (vista inicial)

- Foco del día (máx 3 tareas)
- Hábito activo con racha
- Próximos eventos del calendario
- **Logros de hoy** (tareas completadas, hábito marcado, reflexiones)
- Cita aleatoria de Burkeman

### 2. Brújula de Valores

- 3-5 valores personales
- Descripción de cada valor
- Referencia para priorizar

### 3. Kanban por Horizontes

Columnas: TRIMESTRE (3) → MES (6) → SEMANA (10) → HOY (3)

- Límites estrictos por columna
- Drag & drop entre columnas
- Flujo de arriba a abajo
- **Filtro por proyecto** (opcional)
- **Etiquetas de proyecto** en tarjetas

### 4. Proyectos

Agrupan tareas bajo un contexto común.

- Máximo 4 proyectos activos
- Estados: active, paused, completed, archived
- Color personalizable para etiquetas
- Vinculación opcional a valores
- Barra de progreso automática
- Vista de detalle con tareas relacionadas

### 5. Laboratorio de Hábitos

**Un solo hábito activo a la vez.**

Configuración:
- Identidad ("Soy una persona que...")
- Micro-versión (regla de 2 minutos)
- Habit Stack ("Después de X → Y")
- Las 4 leyes: obvio, atractivo, fácil, satisfactorio
- Recompensa inmediata

Tracking:
- Racha visual (streak) con icono de fuego
- Calendario de cumplimiento
- Graduación cuando está consolidado

### 6. Calendario

- Vista semanal
- Eventos puntuales y recurrentes
- Exportación .ics (Google Calendar)
- Notificaciones del navegador (opcional)

### 7. Diario Reflexivo

- Check-in diario
- Revisión semanal
- Revisión trimestral
- Prompts guiados opcionales

### 8. Logros y Recapitulaciones

Inspirado en Pokémon: celebrar lo logrado, no solo ver lo pendiente.

- **Selector de período**: Semana / Mes / Trimestre / Año
- **Stat cards**: Tareas, días de hábito, proyectos, diario
- **Heatmap estilo GitHub**: Actividad del año
- **Barras de progreso** por horizonte temporal
- **Recapitulación narrativa** generada automáticamente
- **Badges** de hábitos graduados

### 9. Configuración

- **Cuadernos anuales**: Archivar año y empezar limpio
- Visor de años anteriores (solo lectura)
- Exportar/importar backup JSON
- Toggle de notificaciones
- Indicador de espacio usado
- Zona de peligro (borrar datos)

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

**Se limpia**:
- Objetivos (todos los horizontes)
- Historial de hábitos
- Diario
- Eventos del calendario

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

### localStorage (versión 1.2)

```javascript
const oraculoData = {
  version: '1.2',
  createdAt: ISO_STRING,
  updatedAt: ISO_STRING,

  // Brújula de valores
  values: [],

  // Objetivos por horizonte temporal
  objectives: {
    quarterly: [],    // Máx 3, cada uno con: id, text, notes, projectId, completed, completedAt
    monthly: [],      // Máx 6
    weekly: [],       // Máx 10
    daily: []         // Máx 3
  },

  // Laboratorio de hábitos
  habits: {
    active: null,     // Solo 1 hábito activo
    graduated: [],    // Hábitos consolidados (permanentes)
    history: []       // Registro de cumplimiento: { habitId, date, completedAt }
  },

  // Calendario
  calendar: {
    events: [],       // Eventos puntuales
    recurring: []     // Eventos recurrentes
  },

  // Diario
  journal: [],        // { id, type, content, createdAt }

  // Proyectos (máx 4 activos)
  projects: [],       // { id, name, description, color, valueId, status, deadline, createdAt, completedAt }

  // Configuración
  settings: {
    storageType: 'localStorage',
    notificationsEnabled: false,
    theme: 'light'
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
| Editar | edit |
| Eliminar | close / delete |
| Añadir | add |
| Check | check / task_alt |

---

## Design System

Usar variables existentes:

- **Colores**: turquesa (#06b6d4), rosa, grises
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

---

## Testing

- Probar en Chrome, Firefox, Safari, Edge
- Verificar responsive (móvil, tablet, desktop)
- Probar importar/exportar datos
- Verificar persistencia de datos
- Probar archivado anual

---

## Fases Completadas

- [x] Fase 1-6: Core funcional (valores, kanban, hábitos, calendario, diario)
- [x] Fase 7: Material Symbols + mejoras UI/UX (accesibilidad, transiciones)
- [x] Fase 8: Módulo de Proyectos (integración con kanban)
- [x] Fase 9: Cuadernos Anuales + Módulo de Logros (heatmap, recaps)

---

## No Hacer

- NO añadir frameworks ni librerías innecesarias
- NO usar `any` en comentarios de tipo
- NO crear archivos de documentación extra sin pedir
- NO implementar features no especificadas
- NO hacer la app "más productiva" - es para priorizar, no para hacer más
- NO usar emojis en código (usar Material Symbols)
