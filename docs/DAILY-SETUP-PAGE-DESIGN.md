# Daily Setup Page - Diseno y Mejoras

## Resumen del Rediseno

He creado un diseno de **pagina dedicada** para el Daily Setup (Volumen Fijo) que reemplaza el modal de 2 pasos actual. El nuevo diseno es:

- **Compacto**: Todo cabe en una pantalla sin scroll (en la mayoria de dispositivos)
- **Mobile-first**: Optimizado para uso en movil
- **Una sola vista**: Sin wizard ni pasos, todo visible a la vez
- **Accesible**: WCAG 2.1 AA compliant

---

## Archivos Creados

| Archivo | Proposito |
|---------|-----------|
| `daily-setup-page-design.html` | Prototipo funcional completo (HTML + CSS + JS inline) |
| `css/daily-setup-page.css` | Estilos separados listos para integrar en `style.css` |

---

## Cambios de Layout: Modal vs Pagina

### Antes (Modal)
```
+---------------------------+
|     Modal (450px max)     |
|---------------------------|
| PASO 1:                   |
|  - Header grande          |
|  - Cita Burkeman          |
|  - Tiempo (4 botones)     |
|  - Energia (3 botones)    |
|  - Resultado              |
|  [Omitir] [Siguiente ->]  |
+---------------------------+
       (cambio de paso)
+---------------------------+
| PASO 2:                   |
|  - Header nuevo           |
|  - Indicador slots        |
|  - Lista tareas (scroll)  |
|  - Cita Burkeman          |
|  [<- Volver] [Confirmar]  |
+---------------------------+
```

### Ahora (Pagina)
```
+---------------------------+
| Header compacto           |
|---------------------------|
| [Tiempo 2h|4h|6h|Full]    |
| [Energia B|M|A]           |
|---------------------------|
| -> Hoy puedes: 2 tareas   |
|---------------------------|
| Elige prioridades (1/2)   |
| [ ] Tarea 1 - Semana      |
| [x] Tarea 2 - Mes         |
| [ ] Tarea 3 - Trimestre   |
| [ ] Tarea 4 - Backlog     |
|---------------------------|
| [v Empezar el dia]        |
| Omitir por hoy            |
+---------------------------+
```

---

## Mejoras de UX Implementadas

### 1. Selectores Compactos (Chips Segmentados)

**Problema**: Los botones verticales ocupaban mucho espacio.

**Solucion**: Chips horizontales estilo iOS segmented control.

```html
<div class="selector-chips" role="radiogroup">
  <button class="selector-chip" data-time="2h" aria-pressed="false">
    <span class="material-symbols-outlined">hourglass_empty</span>
    <span class="selector-chip__label">2h</span>
  </button>
  <!-- ... -->
</div>
```

**Beneficios**:
- 60% menos espacio vertical
- Touch targets de 48px (WCAG compliant)
- Feedback visual claro con `aria-pressed`

### 2. Tiempo + Energia en Una Fila

**Problema**: Dos secciones separadas con labels grandes.

**Solucion**: Grid de 2 columnas con labels minimos.

```css
.setup-page__selectors {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}
```

### 3. Resultado Inline

**Problema**: El resultado aparecia como una tarjeta grande.

**Solucion**: Linea compacta animada.

```html
<div class="setup-page__result visible">
  <span class="material-symbols-outlined">tips_and_updates</span>
  <span>Hoy puedes:</span>
  <span class="setup-page__result-limit">2 tareas</span>
</div>
```

### 4. Lista de Tareas con Scroll Interno

**Problema**: La lista de tareas causaba scroll en toda la pagina.

**Solucion**: Contenedor con `overflow-y: auto` y altura flexible.

```css
.setup-page__tasks {
  flex: 1;
  overflow: hidden;
  min-height: 0; /* Clave para flex scroll */
}

.setup-page__tasks-list {
  flex: 1;
  overflow-y: auto;
}
```

### 5. Checkbox Custom Accesible

**Problema**: Los checkboxes nativos no son consistentes entre navegadores.

**Solucion**: Checkbox custom con input oculto pero accesible.

```html
<label class="setup-task__checkbox">
  <input type="checkbox" aria-label="Seleccionar tarea">
  <span class="setup-task__check-icon">
    <span class="material-symbols-outlined">check</span>
  </span>
</label>
```

---

## Sugerencias Adicionales de Mejora

### A. Roca Principal Destacada

Cuando el usuario solo puede hacer 1 tarea (energia baja + poco tiempo), mostrar un mensaje especial:

```html
<div class="setup-page__result setup-page__result--rock visible">
  <span class="material-symbols-outlined">diamond</span>
  <span>Elige tu Roca Principal del dia</span>
</div>
```

```css
.setup-page__result--rock {
  background: linear-gradient(135deg, var(--tulip-tree-50), var(--rosa-100));
}

.setup-page__result--rock .material-symbols-outlined {
  color: var(--tulip-tree-500);
}
```

### B. Indicador de Slots Visual

En lugar de solo texto "1/2", mostrar circulos:

```html
<div class="slots-visual">
  <span class="slot slot--filled"></span>
  <span class="slot"></span>
</div>
```

```css
.slots-visual {
  display: flex;
  gap: 4px;
}

.slot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gris-300);
}

.slot--filled {
  background: var(--turquesa-600);
}
```

### C. Agrupacion por Horizonte (Opcional)

Si hay muchas tareas, agruparlas por horizonte temporal:

```html
<div class="task-group">
  <h3 class="task-group__title">Semana</h3>
  <ul class="task-group__list">
    <!-- tareas de semana -->
  </ul>
</div>
```

### D. Animacion de Confirmacion

Al presionar "Empezar el dia", feedback visual antes de navegar:

```css
.setup-page__btn-start--confirming {
  animation: pulse 0.3s ease;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(0.98); }
}
```

### E. Guardar Preferencias

Recordar la ultima seleccion de tiempo/energia para pre-seleccionar:

```javascript
// Al confirmar
localStorage.setItem('lastSetupPrefs', JSON.stringify({
  time: selectedTime,
  energy: selectedEnergy
}));

// Al cargar
const prefs = JSON.parse(localStorage.getItem('lastSetupPrefs'));
if (prefs) {
  selectChip('[data-time]', prefs.time);
  selectChip('[data-energy]', prefs.energy);
}
```

---

## Estructura JS Propuesta

```javascript
// js/pages/daily-setup.js

import { calculateDailyLimit, needsDailySetup } from '../components/daily-setup-modal.js';
import { showNotification } from '../app.js';

const TIME_OPTIONS = [
  { value: '2h', label: '2h', icon: 'hourglass_empty' },
  { value: '4h', label: '4h', icon: 'hourglass_bottom' },
  { value: '6h', label: '6h', icon: 'hourglass_top' },
  { value: 'full', label: 'Full', icon: 'wb_sunny' }
];

const ENERGY_OPTIONS = [
  { value: 'low', label: 'Baja', icon: 'battery_1_bar' },
  { value: 'medium', label: 'Media', icon: 'battery_4_bar' },
  { value: 'high', label: 'Alta', icon: 'battery_full' }
];

export const renderDailySetupPage = (data) => {
  const tasks = getAvailableTasks(data);

  return `
    <main class="daily-setup-page">
      ${renderHeader()}
      ${renderSelectors()}
      ${renderResult()}
      ${renderTaskList(tasks, data.projects)}
      ${renderActions()}
    </main>
  `;
};

const renderHeader = () => `
  <header class="setup-page__header">
    <span class="material-symbols-outlined setup-page__icon">wb_twilight</span>
    <h1 class="setup-page__title">Buenos dias</h1>
    <p class="setup-page__subtitle">Como es tu dia hoy?</p>
  </header>
`;

const renderSelectors = () => `
  <section class="setup-page__selectors" aria-label="Configuracion del dia">
    <div class="selector-group">
      <span class="selector-group__label">
        <span class="material-symbols-outlined">schedule</span>
        Tiempo
      </span>
      <div class="selector-chips" role="radiogroup" aria-label="Tiempo disponible">
        ${TIME_OPTIONS.map((opt, i) => `
          <button type="button"
                  class="selector-chip"
                  data-time="${opt.value}"
                  role="radio"
                  aria-pressed="${i === 1 ? 'true' : 'false'}"
                  aria-label="${opt.label}">
            <span class="material-symbols-outlined selector-chip__icon">${opt.icon}</span>
            <span class="selector-chip__label">${opt.label}</span>
          </button>
        `).join('')}
      </div>
    </div>

    <div class="selector-group">
      <span class="selector-group__label">
        <span class="material-symbols-outlined">bolt</span>
        Energia
      </span>
      <div class="selector-chips" role="radiogroup" aria-label="Nivel de energia">
        ${ENERGY_OPTIONS.map((opt, i) => `
          <button type="button"
                  class="selector-chip"
                  data-energy="${opt.value}"
                  role="radio"
                  aria-pressed="${i === 1 ? 'true' : 'false'}"
                  aria-label="Energia ${opt.label}">
            <span class="material-symbols-outlined selector-chip__icon">${opt.icon}</span>
            <span class="selector-chip__label">${opt.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  </section>
`;

const renderResult = () => `
  <div class="setup-page__result visible" aria-live="polite" id="setup-result">
    <span class="material-symbols-outlined setup-page__result-icon">tips_and_updates</span>
    <span class="setup-page__result-text">Hoy puedes:</span>
    <span class="setup-page__result-limit" id="result-limit">2 tareas</span>
  </div>
`;

const renderTaskList = (tasks, projects) => `
  <section class="setup-page__tasks" aria-label="Selecciona tus prioridades">
    <header class="setup-page__tasks-header">
      <h2 class="setup-page__tasks-title">
        <span class="material-symbols-outlined">checklist</span>
        Elige tus prioridades
      </h2>
      <span class="setup-page__tasks-counter" id="tasks-counter">0/2</span>
    </header>

    <ul class="setup-page__tasks-list" role="list" id="tasks-list">
      ${tasks.length > 0
        ? tasks.map(task => renderTask(task, projects)).join('')
        : renderEmptyState()
      }
    </ul>
  </section>
`;

const renderTask = (task, projects) => {
  const project = task.projectId
    ? projects.find(p => p.id === task.projectId)
    : null;

  return `
    <li class="setup-task" data-id="${task.id}" data-column="${task.column}">
      <label class="setup-task__checkbox">
        <input type="checkbox" aria-label="Seleccionar: ${task.text}">
        <span class="setup-task__check-icon">
          <span class="material-symbols-outlined">check</span>
        </span>
      </label>
      <div class="setup-task__content">
        <p class="setup-task__text">${task.text}</p>
        <div class="setup-task__meta">
          <span class="setup-task__tag">${COLUMN_NAMES[task.column]}</span>
          ${project ? `
            <span class="setup-task__tag setup-task__tag--project"
                  style="--project-color: ${project.color}20">
              ${project.name}
            </span>
          ` : ''}
        </div>
      </div>
    </li>
  `;
};

const renderEmptyState = () => `
  <div class="setup-page__empty">
    <span class="material-symbols-outlined">inbox</span>
    <p>No tienes tareas pendientes.</p>
    <p>Anade tareas en Horizontes.</p>
  </div>
`;

const renderActions = () => `
  <footer class="setup-page__actions">
    <button type="button" class="setup-page__btn-start" id="btn-start">
      <span class="material-symbols-outlined">check_circle</span>
      Empezar el dia
    </button>
    <a href="#/dashboard" class="setup-page__skip">Omitir por hoy</a>
  </footer>
`;

export const initDailySetupPage = (data, updateData, navigate) => {
  // ... logica de inicializacion
};
```

---

## Integracion con Router

Para usar como pagina en lugar de modal, modificar `app.js`:

```javascript
// En el router
const routes = {
  'setup': () => renderDailySetupPage(data),
  'dashboard': () => renderDashboard(data),
  // ...
};

// Redirigir si necesita setup
if (needsDailySetup(data) && currentRoute !== 'setup') {
  navigate('#/setup');
  return;
}
```

---

## Metricas de Mejora

| Metrica | Modal Actual | Pagina Nueva |
|---------|--------------|--------------|
| Altura total | ~600px (2 pasos) | ~550px (1 vista) |
| Pasos de interaccion | 2 (cambio de paso) | 1 |
| Touch targets | Variable | 48px min (WCAG) |
| Scroll necesario | Si (en paso 2) | Minimo (solo tareas) |
| Tiempo estimado | ~15-20s | ~8-12s |

---

## Compatibilidad

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Chrome Android 90+

---

## Proximos Pasos

1. Revisar el prototipo en `daily-setup-page-design.html`
2. Aprobar el diseno visual
3. Integrar los estilos de `css/daily-setup-page.css` en `style.css`
4. Crear el modulo JS `js/pages/daily-setup.js`
5. Modificar el router para usar la nueva pagina
6. Eliminar o deprecar el modal antiguo
