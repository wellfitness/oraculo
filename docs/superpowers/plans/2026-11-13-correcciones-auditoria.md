# Plan de correcciones de la auditoría de Oráculo (13-nov-2026)

> **Para quien lo ejecute.** Usa `superpowers:executing-plans` y avanza tarea a tarea, en orden. Los pasos llevan casillas (`- [ ]`) para marcar el avance. Lee primero «Normas de ejecución», «Restricciones globales» y «Decisiones tomadas por defecto». Si algo no encaja con lo que dice el plan, no improvises. Anótalo en el Libro de Escalado (sección final) y sigue con la alternativa mínima y reversible.

**Objetivo.** Corregir los 27 fallos que encontró la auditoría de calidad y experiencia de uso, empezando por los que hacen perder datos.

**Arquitectura.** Los fallos de datos se corrigen en un único módulo de almacenamiento (`js/storage-hybrid.js`) con funciones puras y probadas, y `app.js` deja de volcar su memoria sobre datos más nuevos. Las reglas sobre tareas (límites, «importante», vínculo con proyecto) pasan a un módulo puro nuevo, `js/utils/objectives.js`. Los arreglos de interfaz tocan cada módulo en su sitio y todo el CSS nuevo va en una sección final de `css/style.css`.

**Stack.** HTML, CSS y JavaScript sin frameworks (módulos ES), localStorage, pruebas con `node:test` (`pnpm test`).

**Especificación.** El Anexo A de este mismo documento. Cada tarea cita los hallazgos que cierra con su código (G1 a G7 graves, I8 a I18 importantes, M19 a M27 menores).

---

## Normas de ejecución

1. **Rama.** Se trabaja en `master`, en esta misma carpeta. Nada de ramas nuevas, worktrees ni carpetas paralelas.
2. **Sin subir.** Commits locales sí. `git push`, `pnpm run deploy` y `pnpm run deploy:all` están prohibidos en este plan.
3. **Sin `--no-verify`.** El pre-commit solo pasa `gitleaks`. Por eso cada tarea ejecuta `pnpm test` a mano antes de su commit.
4. **Editar en la raíz, nunca en `dist/`.** Antes de comprobar en el navegador y antes de cada commit se ejecuta `pnpm run sync`, que copia la raíz a `dist/`. `dist/` está versionado y se incluye en el commit.
5. **Un agente que escribe a la vez.** Nada de repartir tareas en paralelo.
6. **Pausas.** Al terminar cada tarea, una línea con lo hecho y el hash del commit, y se sigue. Se para solo si falla algo que no se resuelve o si hay que decidir algo que el plan no decide.
7. **Radio de impacto.** Antes de cerrar cada tarea se buscan los archivos que importan lo modificado (`grep -rn "nombreDeLaFunción" js`) y se comprueba que siguen funcionando.
8. **Al terminar todo.** Se presenta a Elena el Libro de Escalado. El `revisor` y `seguridad` se pasan una sola vez, sobre el trabajo entero, antes de subir, y los lanza quien tenga la conversación con Elena.

## Restricciones globales

- JavaScript sin dependencias nuevas. No se instala nada.
- Gestor de paquetes `pnpm`. Nunca `npm`.
- Textos visibles en español con tildes y eñes. Sin emojis en textos nuevos. Los textos nuevos de este plan se copian tal cual, entre comillas angulares aquí y sin ellas en el código.
- CSS sin `!important`, nomenclatura BEM y variables del sistema de diseño. Todo el CSS nuevo va al final de `css/style.css`, bajo el comentario `/* === Correcciones auditoría 2026-11 === */`. Si la sección aún no existe, la crea la primera tarea que la necesite. La única excepción es el token nuevo de la Tarea 14, que va en `:root`.
- Todo texto de la usuaria que se pinte con plantillas pasa por `escapeHTML` (de `js/utils/sanitizer.js`), también dentro de atributos como `aria-label` o `value`.
- No se tocan `js/gdrive/`, `js/gcal/`, `mcp-server/`, `android/`, `landing/`, `landing.css`, `index.html` ni `js/storage.js` (módulo heredado, lo siguen usando sus pruebas).
- Línea base de pruebas. `pnpm test` da hoy 81 pruebas, 81 correctas. Ninguna tarea puede dejar una en rojo.
- Los números de línea de este plan son los del commit `8fc4cc2`. Tras las primeras ediciones se desplazan, así que cada cambio se localiza por el texto citado, no solo por el número.

## Cómo comprobar en el navegador

Las comprobaciones de interfaz se hacen siempre en un puerto aparte, para no mezclar datos de prueba con datos reales.

```bash
pnpm run sync
```

```bash
pnpm dlx http-server dist -p 8766 -c-1
```

Abrir `http://localhost:8766/app.html`. La app registra un service worker que guarda copias de los archivos, así que antes de cada comprobación se ejecuta esto en la consola y se recarga. No borra los datos.

```js
navigator.serviceWorker.getRegistrations().then(r => r.forEach(sw => sw.unregister()));
caches.keys().then(k => k.forEach(c => caches.delete(c)));
```

Anchos de referencia. Móvil a 360 px y escritorio a 1280 px. La Tarea 10 añade 1024, 1366, 1536, 1799, 1800 y 1920 px.

## Puntos de riesgo que las pruebas no cubren

Cada línea tiene su comprobación en la tarea que se indica.

1. **Datos reales antiguos.** Una usuaria con un backup de versión 1.2 o con datos 1.5 sin la sección `muevete` debe cargar la app sin perder nada. Prueba en la Tarea 1.
2. **Sincronización con Drive activa.** `js/gdrive/sync.js` escribe en localStorage por su cuenta. La guarda de cierre no debe pisar esos datos. Prueba en la Tarea 2 (caso «lo guardado es más nuevo»).
3. **Textos con comillas, apóstrofos, `<` y `>`.** El marcado nuevo mete texto de la usuaria en `aria-label` y en botones. Comprobación en las Tareas 6, 8 y 13 con el texto `Comprar "pan" <b>y</b> leche's`.
4. **Extensión de Chrome.** `storage-local.js` pasa a reexportar. Comprobación en la Tarea 17.
5. **App de Android.** En la WebView el evento `beforeunload` puede no dispararse. Borrar y archivar no deben depender de él. Lo cubre la Tarea 3, que actualiza la memoria de forma explícita.

## Mapa de archivos

| Archivo | Qué cambia | Tareas |
|---|---|---|
| `js/storage-hybrid.js` | Forma de datos garantizada, guarda de cierre, borrado sin `confirm`, año nuevo, importación, aviso de datos corruptos, resumen del año | 1, 2, 3, 4, 5, 12 |
| `js/storage-local.js` | Se queda en una línea que reexporta `storage-hybrid.js` | 1 |
| `js/utils/validator.js` | Rechaza listas y tipos equivocados | 1 |
| `js/utils/objectives.js` (nuevo) | Límites, «importante», desvincular proyecto | 7 |
| `js/utils/journal-draft.js` (nuevo) | Borrador del diario | 11 |
| `js/app.js` | Guarda de cierre, evento `storage`, aviso de datos corruptos, enlace de salto, `popstate`, menú móvil, captura, `aria-current` | 2, 5, 7, 9, 10, 15 |
| `js/modules/settings.js` | Importa del módulo único, borrar, archivar, importar, pegar | 3, 4, 16 |
| `js/modules/calendar.js` | Selector de `reRender`, botón de Google Calendar, nombres accesibles | 6, 16 |
| `js/modules/kanban.js` | Usa `objectives.js`, pinta «importante» y notas, tareas con foco | 7, 8 |
| `js/components/weekly-review-modal.js` | Respeta límites, contador de la semana | 7, 12 |
| `js/modules/projects.js` | Desvincular, tarjeta con botón, topes de longitud | 7, 9, 16 |
| `js/modules/dashboard.js`, `today.js`, `life-wheel.js` | Nombres accesibles | 9, 16 |
| `js/modules/habits.js` | Tildes, atributos escapados | 13, 16 |
| `js/modules/journal.js` | Borrador | 11 |
| `js/modules/values.js`, `js/components/welcome-modal.js` | Duplicados, cierre con Escape | 15 |
| `js/utils/mcp-bridge.js`, `js/modules/muevete.js` | Valor «importante», `confirm` | 7, 16 |
| `app.html` | Iconos con `aria-hidden`, etiqueta de la captura | 9 |
| `css/style.css` | Token `--turquesa-800` y sección final | 8, 9, 10, 13, 14 |
| `tests/storage-hybrid.test.js` (nuevo) | Pruebas del módulo único | 1, 2, 3, 4, 5, 12 |
| `tests/validator.test.js` | Sustituye la prueba que daba por buenas las listas | 1 |
| `tests/objectives.test.js`, `tests/journal-draft.test.js` (nuevos) | Pruebas de los módulos nuevos | 7, 11 |
| `CLAUDE.md` | Dos líneas sobre los módulos de almacenamiento | 1 |

## Decisiones tomadas por defecto

El plan necesita estas decisiones para no dejar dudas. Son la alternativa conservadora y reversible. Elena puede cambiarlas antes de ejecutar.

| # | Decisión | Por defecto en este plan | Alternativa |
|---|---|---|---|
| D1 | Cabecera entre 901 y 1799 px | Dos filas. Arriba logo y acciones, debajo el menú con icono y texto | Menú hamburguesa hasta 1799 px |
| D2 | Texto sobre el turquesa claro (menú activo, números de paso) | Texto oscuro `--gris-900`, como pide `DESIGN.md` | Oscurecer el fondo |
| D3 | Qué conserva el año nuevo | Además de valores, hábitos graduados y configuración, se conservan preferencias Burkeman, bienvenida ya hecha, Rueda de la Vida, evaluación de objetivos y Muévete | Limpiar Rueda, evaluación o Muévete |
| D4 | Año del cuaderno nuevo | El mayor entre «año del cuaderno + 1» y el año en curso | Siempre el año en curso |
| D5 | Diario sin guardar | Borrador automático que se recupera al volver | Preguntar al salir |
| D6 | Cerrar la bienvenida con Escape | Cuenta como «Empezar» con el modo marcado, sin llevar a la Rueda | Impedir el cierre con Escape |
| D7 | Importante y notas en la Agenda | Icono `priority_high` en rosa delante del texto y la nota debajo, en pequeño | Otro distintivo |
| D8 | Textos nuevos | Los que figuran en las Tareas 3, 4, 5, 7, 11 y 15 | Los que Elena prefiera |

Quedan **sin tocar** porque son decisiones de producto que el plan no puede tomar. Van al Libro de Escalado al final.

- Qué hacer cuando el límite del día baja (por ejemplo a 1) y ya hay 3 prioridades. Hoy se muestra «3/1».
- Si el campo de icono de un valor debe seguir aceptando emojis o pasar a iconos Material.
- Si se añade un botón «Deshacer última importación» que use la copia `oraculo_data_backup`.
- Si se conecta la copia automática de IndexedDB para recuperar datos corruptos.
- Si se elimina `js/storage.js` y se reorientan sus pruebas.

---

## Fase 1. Datos

### Tarea 1. Un solo módulo de almacenamiento y datos con forma garantizada

Cierra parte de G3 y G5. Lleva TDD.

**Archivos**
- Modificar: `js/storage-hybrid.js` (función `loadData`, líneas 203-216)
- Sustituir entero: `js/storage-local.js`
- Modificar: `js/utils/validator.js:13-63`
- Modificar: `tests/validator.test.js:39-46`
- Crear: `tests/storage-hybrid.test.js`
- Modificar: `CLAUDE.md` (líneas 46 y 132-133)

**Interfaces**
- Produce: `ensureDataShape(data: object): object` exportada desde `storage-hybrid.js`. Muta y devuelve el mismo objeto.
- Produce: `validateDataStructure` rechaza listas y tipos equivocados. Su firma no cambia: `{ valid: boolean, error?: string, warnings?: string[] }`.

- [x] **Paso 1. Crear `tests/storage-hybrid.test.js` con la cabecera de simulación y las pruebas que fallan**

La cabecera es la misma que usa `tests/storage.test.js` (líneas 14-44), con tres cambios. Importa `../js/storage-hybrid.js`, `confirm` lanza un error y se define `CustomEvent` si falta.

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};
globalThis.window = { dispatchEvent: () => {} };
globalThis.CustomEvent ??= class { constructor(type, init) { this.type = type; this.detail = init?.detail; } };
globalThis.document = {
  createElement: () => ({ click: () => {}, href: '', download: '' }),
  body: { appendChild: () => {}, removeChild: () => {} }
};
globalThis.URL = { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} };
globalThis.Blob = class { constructor(d) { this.data = d; } };
globalThis.confirm = () => { throw new Error('confirm no debe llamarse desde el almacenamiento'); };

const storage = await import('../js/storage-hybrid.js');
const KEY = 'oraculo_data';
beforeEach(() => localStorage.clear());

describe('ensureDataShape', () => {
  it('rellena las secciones que faltan sin tocar las que existen', () => {
    const tarea = { id: 't1', text: 'Comprar pan', completed: false };
    const d = storage.ensureDataShape({ version: '1.5', objectives: { daily: [tarea] }, _sectionMeta: { x: 1 } });
    assert.deepStrictEqual(d.objectives.daily, [tarea]);
    for (const h of ['backlog', 'quarterly', 'monthly', 'weekly', 'completed']) assert.ok(Array.isArray(d.objectives[h]), h);
    assert.ok(Array.isArray(d.values));
    assert.ok(Array.isArray(d.journal));
    assert.ok(Array.isArray(d.projects));
    assert.ok(Array.isArray(d.habits.history));
    assert.ok(Array.isArray(d.habits.audit.activities));
    assert.ok(Array.isArray(d.calendar.events));
    assert.strictEqual(typeof d.muevete.timerState, 'object');
    assert.deepStrictEqual(d._sectionMeta, { x: 1 });
  });
  it('sustituye por su valor por defecto lo que tiene un tipo equivocado', () => {
    const d = storage.ensureDataShape({ version: '1.5', values: () => {}, journal: 'x', objectives: [], lifeWheel: null, dailySetup: null });
    assert.deepStrictEqual(d.values, []);
    assert.deepStrictEqual(d.journal, []);
    assert.ok(Array.isArray(d.objectives.weekly));
    assert.ok(Array.isArray(d.lifeWheel.evaluations));
    assert.strictEqual(d.dailySetup.dailyLimit, 3);
  });
  it('respeta un valor nulo donde el valor por defecto también es nulo', () => {
    const d = storage.ensureDataShape({ version: '1.5', habits: { active: null } });
    assert.strictEqual(d.habits.active, null);
  });
  it('es idempotente', () => {
    const una = storage.ensureDataShape({ version: '1.5' });
    const copia = JSON.stringify(una);
    assert.strictEqual(JSON.stringify(storage.ensureDataShape(una)), copia);
  });
});

describe('loadData con datos incompletos', () => {
  it('datos 1.5 sin muevete ni values se cargan completos', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', objectives: { backlog: [{ id: 'a', text: 'Idea' }] } }));
    const d = storage.loadData();
    assert.strictEqual(d.objectives.backlog[0].text, 'Idea');
    assert.ok(Array.isArray(d.values));
    assert.strictEqual(d.muevete.timerState.status, 'idle');
  });
  it('datos de la versión 1.2 conservan sus tareas tras cargar', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.2', values: [{ id: 'v', name: 'Salud' }], objectives: { daily: [{ id: 'd', text: 'Caminar' }] } }));
    const d = storage.loadData();
    assert.strictEqual(d.version, '1.5');
    assert.strictEqual(d.values[0].name, 'Salud');
    assert.strictEqual(d.objectives.daily[0].text, 'Caminar');
  });
});
```

- [x] **Paso 2. En `tests/validator.test.js`, sustituir la prueba «arrays son aceptados de forma permisiva (edge case)» (líneas 39-46) y añadir las de tipos**

```js
  it('debe rechazar arrays', () => {
    const result = validateDataStructure([1, 2, 3]);
    assert.strictEqual(result.valid, false);
  });

  it('debe rechazar secciones con un tipo equivocado', () => {
    for (const malo of [{ values: 1 }, { journal: {} }, { projects: 'x' }, { objectives: [] }, { habits: 'x' }, { settings: [] }, { calendar: 3 }]) {
      assert.strictEqual(validateDataStructure(malo).valid, false, JSON.stringify(malo));
    }
  });
```

- [x] **Paso 3. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: fallan las cuatro de `ensureDataShape` (`storage.ensureDataShape is not a function`), la de datos 1.5 incompletos y las dos del validador. La de la versión 1.2 ya pasa. Es una red de seguridad para que la migración no se rompa con los cambios. Las 80 anteriores que no se han tocado siguen correctas.

- [x] **Paso 4. Endurecer `validateDataStructure` en `js/utils/validator.js`**

Tres cambios, sin alterar el resto de la función.

1. La primera comprobación rechaza también las listas: `if (!data || typeof data !== 'object' || Array.isArray(data))`.
2. `hasAnyField` y `missingFields` usan `Object.hasOwn(data, field)` en lugar de `field in data`. El operador `in` da verdadero para `values` en cualquier lista, porque `values` es un método de las listas.
3. Tras la comprobación de `hasAnyField`, se devuelve `{ valid: false, error }` si una sección presente tiene un tipo equivocado. Deben ser lista `values`, `journal` y `projects`. Deben ser objeto y no lista `objectives`, `habits`, `settings` y `calendar`. Texto del error: «El archivo tiene la sección "NOMBRE" con un formato que Oráculo no reconoce.», con el nombre de la sección.

- [x] **Paso 5. Añadir `ensureDataShape` a `js/storage-hybrid.js`, justo antes de `loadData`**

```js
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const fillFromDefaults = (target, defaults) => {
  for (const key of Object.keys(defaults)) {
    const def = defaults[key];
    const cur = target[key];
    if (Array.isArray(def)) {
      if (!Array.isArray(cur)) target[key] = def;
    } else if (isPlainObject(def)) {
      if (!isPlainObject(cur)) target[key] = def;
      else fillFromDefaults(cur, def);
    } else if (cur === undefined) {
      target[key] = def;
    }
  }
  return target;
};

export const ensureDataShape = (data) => fillFromDefaults(data, getDefaultData());
```

- [x] **Paso 6. Llamarla en `loadData`**

En `loadData`, sustituir `cleanupLegacyGcalSettings(localData);` por estas dos líneas, en este orden.

```js
  ensureDataShape(localData);
  cleanupLegacyGcalSettings(localData);
```

- [x] **Paso 7. Sustituir el contenido completo de `js/storage-local.js`**

```js
/**
 * Oráculo - Almacenamiento para la extensión de Chrome.
 * Reexporta storage-hybrid.js. Así hay una sola implementación.
 */
export * from './storage-hybrid.js';
```

- [x] **Paso 8. Actualizar `CLAUDE.md`**

Línea 46: «`storage-local.js` reexporta `storage-hybrid.js` (una sola implementación, solo localStorage)».
Líneas 132-133: los comentarios pasan a «# Implementación única (solo localStorage)» y «# Reexporta storage-hybrid.js (extensión Chrome)».

- [x] **Paso 9. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas, 0 fallos.

- [ ] **Paso 10. Commit**

```bash
pnpm run sync
git add js/storage-hybrid.js js/storage-local.js js/utils/validator.js tests/storage-hybrid.test.js tests/validator.test.js CLAUDE.md dist
git commit -m "fix(storage): validar tipos al importar y garantizar la forma de los datos al cargar"
```

---

### Tarea 2. El guardado al cerrar no pisa datos más nuevos

Cierra la causa común de G1, G2 y G4. Lleva TDD.

**Archivos**
- Modificar: `js/storage-hybrid.js` (función nueva junto a `saveData`, línea 244)
- Modificar: `js/app.js:7-10` (indirecciones) y `js/app.js:260-271` (`beforeunload`)
- Prueba: `tests/storage-hybrid.test.js`

**Interfaces**
- Produce: `shouldPersistOnUnload(memoryData: object, storedRaw: string | null): boolean`, exportada desde `storage-hybrid.js`.

- [x] **Paso 1. Añadir las pruebas que fallan a `tests/storage-hybrid.test.js`**

```js
describe('shouldPersistOnUnload', () => {
  const mem = { updatedAt: '2026-11-13T10:00:00.000Z' };
  const raw = (updatedAt) => JSON.stringify(updatedAt ? { updatedAt } : {});
  it('no guarda si la clave ya no existe', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, null), false));
  it('no guarda si lo guardado no se puede leer', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, 'no es json'), false));
  it('no guarda si lo guardado es más nuevo que la memoria', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw('2026-11-13T10:00:01.000Z')), false));
  it('guarda si coinciden', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw('2026-11-13T10:00:00.000Z')), true));
  it('guarda si la memoria es más nueva', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw('2026-11-13T09:00:00.000Z')), true));
  it('guarda si lo guardado no tiene fecha', () => assert.strictEqual(storage.shouldPersistOnUnload(mem, raw(null)), true));
  it('no guarda si la memoria no tiene fecha y lo guardado sí', () => assert.strictEqual(storage.shouldPersistOnUnload({}, raw('2026-11-13T09:00:00.000Z')), false));
});
```

- [x] **Paso 2. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: fallan las siete con `storage.shouldPersistOnUnload is not a function`.

- [x] **Paso 3. Implementar `shouldPersistOnUnload` en `js/storage-hybrid.js`, después de `saveData`**

Devuelve `false` si `storedRaw` es `null`, si no se puede leer como JSON o si su `updatedAt` es posterior al de `memoryData`. En los demás casos devuelve `true`. Las fechas `updatedAt` se comparan como texto, porque las fechas ISO se ordenan igual como texto que como fecha. Una fecha ausente, en cualquiera de los dos lados, cuenta como cadena vacía.

- [x] **Paso 4. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 5. Usar la guarda en `js/app.js`**

Añadir tras la línea 10 (`const getStorageUsage = ...`):

```js
const shouldPersistOnUnload = (...args) => _storage.shouldPersistOnUnload(...args);
```

En el `beforeunload` (líneas 261-271), sustituir la condición `if (state.data) {` por:

```js
    if (state.data && shouldPersistOnUnload(state.data, localStorage.getItem('oraculo_data'))) {
```

- [x] **Paso 6. Refrescar la memoria cuando otra pestaña guarda**

Justo después del bloque `beforeunload`, añadir:

```js
  // Otra pestaña ha guardado: esta deja de tener la última versión
  window.addEventListener('storage', (e) => {
    if (e.key !== 'oraculo_data' || e.newValue === null) return;
    const fresh = loadData();
    if (document.querySelector('dialog[open]')) {
      state.pendingSync = fresh;
      return;
    }
    state.data = fresh;
    renderView(state.currentView);
  });
```

`state.pendingSync` ya lo aplica el listener de `close` que hay en las líneas 250-258.

- [x] **Paso 7. Comprobar en el navegador**

1. Abrir la app en dos pestañas del mismo puerto. En la pestaña A, capturar «Tarea de la pestaña A».
2. En la pestaña B, ir a Agenda. Esperado: «Tarea de la pestaña A» aparece en Pendientes sin recargar.
3. Recargar la pestaña B. En la consola de A: `localStorage.getItem('oraculo_data').includes('Tarea de la pestaña A')`. Esperado: `true`.

- [ ] **Paso 8. Commit**

```bash
pnpm run sync
git add js/storage-hybrid.js js/app.js tests/storage-hybrid.test.js dist
git commit -m "fix(storage): no volcar la memoria sobre datos más nuevos al cerrar y refrescar entre pestañas"
```

---

### Tarea 3. Borrar y archivar de verdad

Cierra G1 y G2. Lleva TDD.

**Archivos**
- Modificar: `js/storage-hybrid.js:481-527` (las cuatro funciones de borrado) y `:581-611` (`startNewYear`)
- Modificar: `js/modules/settings.js:6-22` (importaciones), `:53-54`, `:480-513`, `:695-710`
- Prueba: `tests/storage-hybrid.test.js`

**Interfaces**
- Produce: `clearAllData(): void`, `clearIdentityData(): void`, `clearProductivityData(): void`, `clearJournalData(): void`. Ya no preguntan ni devuelven nada.
- Produce: `getNextNotebookYear(data: object, now?: Date): number`.
- Consume: `reloadStateFromStorage()` de `js/app.js:1023` y `confirmDangerAsync(options)` de `js/utils/confirm-modal.js:96`.

- [x] **Paso 1. Añadir las pruebas que fallan**

```js
describe('borrado sin confirm', () => {
  const sembrar = () => localStorage.setItem(KEY, JSON.stringify(storage.ensureDataShape({
    version: '1.5', values: [{ id: 'v' }], journal: [{ id: 'j' }], projects: [{ id: 'p' }],
    objectives: { weekly: [{ id: 't' }] }, habits: { graduated: [{ id: 'g' }] }
  })));
  it('clearProductivityData vacía tareas y proyectos y deja el resto', () => {
    sembrar(); storage.clearProductivityData();
    const d = storage.loadData();
    assert.strictEqual(d.objectives.weekly.length, 0);
    assert.strictEqual(d.projects.length, 0);
    assert.strictEqual(d.journal.length, 1);
    assert.strictEqual(d.values.length, 1);
  });
  it('clearJournalData vacía solo el diario', () => {
    sembrar(); storage.clearJournalData();
    const d = storage.loadData();
    assert.strictEqual(d.journal.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 1);
  });
  it('clearIdentityData vacía valores y hábitos y deja las tareas', () => {
    sembrar(); storage.clearIdentityData();
    const d = storage.loadData();
    assert.strictEqual(d.values.length, 0);
    assert.strictEqual(d.habits.graduated.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 1);
  });
  it('clearAllData elimina la clave', () => {
    sembrar(); storage.clearAllData();
    assert.strictEqual(localStorage.getItem(KEY), null);
  });
});

describe('año nuevo', () => {
  it('getNextNotebookYear', () => {
    assert.strictEqual(storage.getNextNotebookYear({ notebook: { year: 2026 } }, new Date('2026-11-13')), 2027);
    assert.strictEqual(storage.getNextNotebookYear({ notebook: { year: 2026 } }, new Date('2028-01-05')), 2028);
    assert.strictEqual(storage.getNextNotebookYear({}, new Date('2026-06-01')), 2027);
  });
  it('startNewYear conserva identidad y preferencias y limpia el año', () => {
    localStorage.setItem(KEY, JSON.stringify(storage.ensureDataShape({
      version: '1.5', notebook: { year: 2026 }, values: [{ id: 'v' }], journal: [{ id: 'j' }],
      objectives: { weekly: [{ id: 't' }] }, habits: { graduated: [{ id: 'g' }], history: [{ habitId: 'g' }] },
      burkemanSettings: { showReflexiones: false }, onboarding: { completed: true },
      lifeWheel: { evaluations: [{ id: 'e' }] }
    })));
    const esperado = storage.getNextNotebookYear(storage.loadData());
    const d = storage.startNewYear([{ year: 2026 }]);
    assert.strictEqual(d.notebook.year, esperado);
    assert.strictEqual(d.notebook.name, `Cuaderno ${esperado}`);
    assert.strictEqual(d.values.length, 1);
    assert.strictEqual(d.habits.graduated.length, 1);
    assert.strictEqual(d.habits.history.length, 0);
    assert.strictEqual(d.journal.length, 0);
    assert.strictEqual(d.objectives.weekly.length, 0);
    assert.strictEqual(d.burkemanSettings.showReflexiones, false);
    assert.strictEqual(d.onboarding.completed, true);
    assert.strictEqual(d.lifeWheel.evaluations.length, 1);
    assert.deepStrictEqual(d.archivedNotebooks, [{ year: 2026 }]);
    assert.strictEqual(storage.loadData().notebook.year, esperado);
  });
});
```

- [x] **Paso 2. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: las de borrado fallan con «confirm no debe llamarse desde el almacenamiento» y las de año nuevo con `getNextNotebookYear is not a function`.

- [x] **Paso 3. Quitar `confirm` de las cuatro funciones de borrado en `js/storage-hybrid.js:481-527`**

Cada función conserva exactamente lo que hace dentro del `if`, sin el `if`, sin `return true` y sin `return false`.

- [x] **Paso 4. Añadir `getNextNotebookYear` y corregir `startNewYear`**

`getNextNotebookYear(data, now = new Date())` devuelve el mayor entre `(data.notebook?.year ?? now.getFullYear()) + 1` y `now.getFullYear()`, tratando como ausente un año que no sea entero.

En `startNewYear`, `newYear` pasa a ser `getNextNotebookYear(data)` y el objeto `newData` añade estas cinco líneas tras `settings`:

```js
    burkemanSettings: data.burkemanSettings || getDefaultData().burkemanSettings,
    onboarding: data.onboarding || getDefaultData().onboarding,
    lifeWheel: data.lifeWheel || getDefaultData().lifeWheel,
    objectiveEvaluation: data.objectiveEvaluation || getDefaultData().objectiveEvaluation,
    muevete: data.muevete || getDefaultData().muevete,
```

- [x] **Paso 5. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 6. `js/modules/settings.js`. Importar del módulo único**

En la línea 20, `'../storage.js'` pasa a `'../storage-hybrid.js'`, y a la lista de nombres importados se añade `getNextNotebookYear`. Añadir además:

```js
import { confirmDangerAsync } from '../utils/confirm-modal.js';
```

- [x] **Paso 7. `js/modules/settings.js:53-54`. El botón promete el mismo año que se crea**

```js
  const currentYear = notebook.year;
  const nextYear = getNextNotebookYear(data);
```

- [x] **Paso 8. `js/modules/settings.js:480-513`. Sustituir los cuatro manejadores de borrado**

```js
  const wireClear = (btnId, title, message, clearFn, doneMsg) => {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      const ok = await confirmDangerAsync({ title, message, confirmText: 'Sí, borrar', cancelText: 'No, mantener' });
      if (!ok) return;
      clearFn();
      reloadStateFromStorage();
      showNotification(doneMsg, 'info');
      location.reload();
    });
  };

  wireClear('clear-identity-btn', '¿Borrar valores, hábitos y rueda de la vida?',
    'Las tareas, proyectos y diario se mantienen.', clearIdentityData, 'Identidad borrada (valores, hábitos, rueda)');
  wireClear('clear-productivity-btn', '¿Borrar tareas, proyectos y logros?',
    'Valores, hábitos y diario se mantienen.', clearProductivityData, 'Productividad borrada (tareas, proyectos, logros)');
  wireClear('clear-journal-btn', '¿Borrar todas las entradas del diario?',
    'Todo lo demás se mantiene.', clearJournalData, 'Diario borrado');
  wireClear('clear-data-btn', '¿Estás segura de que quieres borrar TODOS los datos?',
    'Esta acción no se puede deshacer.', clearAllData, 'Todos los datos borrados');
```

Borrar también la asignación `window.oraculoSkipUnloadWarning = true;` que queda hacia la línea 1660. Nadie la lee.

- [x] **Paso 9. `handleArchiveYear` (`js/modules/settings.js:695-710`)**

Añadir `reloadStateFromStorage();` en la línea siguiente a `startNewYear(archivedNotebooks);`.

- [x] **Paso 10. Comprobar en el navegador**

Con datos de prueba (al menos 2 tareas, 1 proyecto, 1 entrada de diario y 1 valor):
1. Configuración, «Borrar Productividad», confirmar. Tras la recarga, en la consola: `JSON.parse(localStorage.getItem('oraculo_data')).projects.length`. Esperado: `0`. El diario y los valores siguen.
2. Crear una tarea. Configuración, «Archivar…», confirmar. Tras la recarga: `JSON.parse(localStorage.getItem('oraculo_data')).notebook.year` da el año que prometía el botón, `objectives.backlog.length` da `0` y `archivedNotebooks.length` da `1`. La bienvenida no vuelve a salir.
3. «Borrar TODO», confirmar. Tras la recarga sale la bienvenida y no queda ningún dato.

- [ ] **Paso 11. Commit**

```bash
pnpm run sync
git add js/storage-hybrid.js js/modules/settings.js tests/storage-hybrid.test.js dist
git commit -m "fix(settings): borrar y archivar persisten tras recargar y el año nuevo conserva las preferencias"
```

---

### Tarea 4. Importar y pegar con validación, confirmación y copia previa

Cierra G3. Lleva TDD.

**Archivos**
- Modificar: `js/storage-hybrid.js:322-353` (`importData`)
- Modificar: `js/modules/settings.js:394-411`, `:422-439`, `:457-477`
- Prueba: `tests/storage-hybrid.test.js`

**Interfaces**
- Produce: `parseImportText(text: string): object`. Lanza `Error` con mensaje para la usuaria. Devuelve los datos validados, sin transformar.
- Produce: `parseImportFile(file: File): Promise<object>`. Lee el archivo y delega en `parseImportText`.
- Produce: `summarizeBackup(data: object): { tasks: number, journalEntries: number }`.
- Produce: `applyImportedData(data: object): boolean`. Guarda antes lo que había en `oraculo_data_backup`.
- `importData(file)` se mantiene y pasa a ser `parseImportFile` seguido de `applyImportedData`.

- [x] **Paso 1. Añadir las pruebas que fallan**

```js
describe('importación', () => {
  it('rechaza texto que no es JSON', () => {
    assert.throws(() => storage.parseImportText('esto no es json {{{'), /no es un archivo JSON válido/);
  });
  it('rechaza una lista', () => {
    assert.throws(() => storage.parseImportText('[1,2,3]'), /Archivo no válido/);
  });
  it('rechaza un objeto ajeno a Oráculo', () => {
    assert.throws(() => storage.parseImportText('{"foo":1}'), /Archivo no válido/);
  });
  it('acepta un backup y lo devuelve sin transformar', () => {
    const d = storage.parseImportText('{"version":"1.5","objectives":{"daily":[]}}');
    assert.deepStrictEqual(d, { version: '1.5', objectives: { daily: [] } });
  });
  it('summarizeBackup cuenta tareas pendientes y entradas de diario', () => {
    const s = storage.summarizeBackup({ objectives: { backlog: [{}, {}], weekly: [{}], completed: [{}] }, journal: [{}, {}, {}] });
    assert.deepStrictEqual(s, { tasks: 3, journalEntries: 3 });
    assert.deepStrictEqual(storage.summarizeBackup({}), { tasks: 0, journalEntries: 0 });
  });
  it('applyImportedData guarda copia de lo anterior y deja datos completos', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5', objectives: { backlog: [{ id: 'viejo' }] } }));
    const ok = storage.applyImportedData({ version: '1.5', objectives: { backlog: [{ id: 'nuevo' }] } });
    assert.strictEqual(ok, true);
    assert.ok(localStorage.getItem('oraculo_data_backup').includes('viejo'));
    const d = storage.loadData();
    assert.strictEqual(d.objectives.backlog[0].id, 'nuevo');
    assert.ok(Array.isArray(d.values));
  });
});
```

- [x] **Paso 2. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: fallan con `storage.parseImportText is not a function`.

- [x] **Paso 3. Implementar las cuatro funciones en `js/storage-hybrid.js` y reducir `importData`**

- `parseImportText`: si `JSON.parse` falla, lanza `new Error('No es un archivo JSON válido.')`. Si `validateDataStructure` no lo da por bueno, lanza `new Error('Archivo no válido: ' + validation.error)`.
- `summarizeBackup`: `tasks` suma las longitudes de `backlog`, `quarterly`, `monthly`, `weekly` y `daily` (no `completed`). Las secciones ausentes cuentan 0.
- `applyImportedData`: copia el valor actual de `oraculo_data` (el texto tal cual, si existe) a `oraculo_data_backup` y devuelve `saveData(data)`.
- `importData(file)`: `const data = await parseImportFile(file); if (!applyImportedData(data)) throw new Error('No se pudieron guardar los datos'); return data;`

- [x] **Paso 4. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 5. `js/modules/settings.js`. Un solo manejador para los dos botones de importar**

Añadir `parseImportFile`, `parseImportText`, `summarizeBackup` y `applyImportedData` a la importación de `'../storage-hybrid.js'`. Sustituir los cuerpos de los dos listeners (`import-sync-input` e `import-data-input`) por una llamada a esta función, definida una vez antes de ellos. El primero pasa `'¡Datos sincronizados correctamente!'` y el segundo `'Datos importados correctamente'`.

```js
  const replaceWithBackup = async (data, origin, successMsg) => {
    const s = summarizeBackup(data);
    const ok = await confirmDangerAsync({
      title: `¿Reemplazar tus datos por los ${origin}?`,
      message: `Contiene ${s.tasks} tareas y ${s.journalEntries} entradas de diario. Antes se guardará una copia de tus datos actuales.`,
      confirmText: 'Sí, reemplazar',
      cancelText: 'No, cancelar',
      type: 'warning'
    });
    if (!ok) return;
    if (!applyImportedData(data)) throw new Error('No se pudieron guardar los datos');
    reloadStateFromStorage();
    showNotification(successMsg, 'success');
    location.reload();
  };
```

Cada listener queda así, dentro de su `try` actual: `await replaceWithBackup(await parseImportFile(file), 'de este archivo', MENSAJE);`

- [x] **Paso 6. «Pegar datos» (`js/modules/settings.js:457-477`)**

Sustituir desde `const parsed = JSON.parse(text);` hasta el cierre del `if (confirm(...))` por:

```js
      await replaceWithBackup(parseImportText(text), 'del portapapeles', 'Datos pegados correctamente');
```

- [x] **Paso 7. Comprobar en el navegador**

1. Crear un archivo `lista.json` con `[1,2,3]` e importarlo. Esperado: aviso de error, los datos siguen intactos.
2. Exportar un backup, crear una tarea más e importar el backup. Esperado: sale el diálogo con el número de tareas y de entradas. Con «No, cancelar» no cambia nada. Con «Sí, reemplazar» se cargan los datos del archivo.
3. Tras importar, ir a Valores y añadir uno. Esperado: se guarda sin errores en la consola.

- [ ] **Paso 8. Commit**

```bash
pnpm run sync
git add js/storage-hybrid.js js/modules/settings.js tests/storage-hybrid.test.js dist
git commit -m "fix(settings): confirmar y validar antes de reemplazar datos al importar o pegar"
```

---

### Tarea 5. Datos corruptos: conservar copia y avisar

Cierra G5. Lleva TDD.

**Archivos**
- Modificar: `js/storage-hybrid.js:159-170` (`loadFromLocalStorage`)
- Modificar: `js/app.js` (indirecciones tras la línea 10, importaciones y final de `init`, línea 177)
- Prueba: `tests/storage-hybrid.test.js`

**Interfaces**
- Produce: `consumeLoadIssue(): 'corrupt' | null`. Devuelve la incidencia de la última carga y la borra.
- Clave nueva de localStorage: `oraculo_data_corrupt`.

- [x] **Paso 1. Añadir las pruebas que fallan**

```js
describe('datos corruptos', () => {
  it('conserva el original, arranca con datos por defecto y lo comunica una vez', () => {
    localStorage.setItem(KEY, '{"version":"1.5","objectives":{"backlog":[{"id":"a"');
    const d = storage.loadData();
    assert.ok(Array.isArray(d.objectives.backlog));
    assert.strictEqual(localStorage.getItem('oraculo_data_corrupt'), '{"version":"1.5","objectives":{"backlog":[{"id":"a"');
    assert.strictEqual(storage.consumeLoadIssue(), 'corrupt');
    assert.strictEqual(storage.consumeLoadIssue(), null);
  });
  it('una carga normal no deja incidencia', () => {
    localStorage.setItem(KEY, JSON.stringify({ version: '1.5' }));
    storage.loadData();
    assert.strictEqual(storage.consumeLoadIssue(), null);
  });
});
```

- [x] **Paso 2. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: fallan con `storage.consumeLoadIssue is not a function`.

- [x] **Paso 3. Implementar**

En `loadFromLocalStorage`, dentro del `catch`, antes de `return null`, se copia `stored` a `oraculo_data_corrupt` y se pone a `'corrupt'` una variable del módulo, `let loadIssue = null;`. Para que `stored` esté al alcance del `catch`, su declaración sube fuera del `try`. `consumeLoadIssue` devuelve esa variable y la deja en `null`.

- [x] **Paso 4. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 5. Avisar en `js/app.js`**

Añadir la indirección `const consumeLoadIssue = (...args) => _storage.consumeLoadIssue(...args);` junto a las demás y la importación `import { confirmDanger } from './utils/confirm-modal.js';`. En `init`, justo después de `state.initialized = true;`:

```js
  if (consumeLoadIssue() === 'corrupt') {
    confirmDanger({
      title: 'No se han podido leer tus datos guardados',
      message: 'Oráculo ha conservado una copia de lo que había y ha empezado un cuaderno vacío. Si tienes un backup, impórtalo desde Configuración.',
      confirmText: 'Ir a Configuración',
      cancelText: 'Cerrar',
      type: 'warning'
    }, () => navigateTo('settings'));
  }
```

- [x] **Paso 6. Comprobar en el navegador**

En la consola: `localStorage.setItem('oraculo_data', localStorage.getItem('oraculo_data').slice(0, 200))` y recargar sin tocar nada más. Esperado: sale el aviso por encima de la bienvenida y `localStorage.getItem('oraculo_data_corrupt').length` da `200`. La guarda de la Tarea 2 es la que impide que la recarga repare el dato antes de leerlo.

- [ ] **Paso 7. Commit**

```bash
pnpm run sync
git add js/storage-hybrid.js js/app.js tests/storage-hybrid.test.js dist
git commit -m "fix(storage): conservar copia y avisar cuando los datos guardados no se pueden leer"
```

---

## Fase 2. Funcionamiento

### Tarea 6. Calendario: cambiar de semana, ver eventos nuevos y botón de Google

Cierra G6, I15 y la parte de calendario de I9 y M19. Sin TDD (interfaz).

**Archivos**
- Modificar: `js/modules/calendar.js:39-45`, `:176`, `:206-232`, `:266-299`, `:331-342`

- [x] **Paso 1. Corregir el selector de `reRender` (línea 176)**

`document.querySelector('.calendar-section')` pasa a `document.querySelector('.calendar-page')`. Esa clase es la que envuelve la navegación y la semana desde la línea 27.

- [x] **Paso 2. El botón de Google Calendar deja de llevar JSON en un atributo (líneas 336-342)**

En `renderDayColumn`, el nombre del evento pasa a ser un botón y el botón de Google lleva solo la fecha.

```js
              <button type="button" class="event-name event-item__open">${escapeHTML(event.name)}</button>
            </div>
            <button type="button" class="event-item__gcal btn--icon"
                    data-date="${event.recurring ? day.dateStr : event.date}"
                    title="Añadir a Google Calendar" aria-label="Añadir a Google Calendar: ${escapeHTML(event.name)}">
              <span class="material-symbols-outlined icon-xs" aria-hidden="true">open_in_new</span>
            </button>
```

- [x] **Paso 3. Un solo sitio enlaza los eventos de la semana**

En `init`, borrar los tres bloques de las líneas 266-299 (doble clic en `.day-column`, clic en `.event-item` y clic en `.event-item__gcal`) y poner en su lugar una llamada a `bindWeekViewEvents();`. Al final de `bindWeekViewEvents` (tras la línea 231), añadir:

```js
  // Añadir a Google Calendar
  document.querySelectorAll('.event-item__gcal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.event-item');
      const list = item.dataset.recurring === 'true' ? currentData.calendar.recurring : currentData.calendar.events;
      const source = list.find(ev => ev.id === item.dataset.id);
      if (!source) return;
      openGoogleCalendar({ name: source.name, date: btn.dataset.date, time: source.time, duration: source.duration, notes: source.notes });
    });
  });
```

- [x] **Paso 4. Nombre accesible para las flechas (líneas 39-45)**

`#prev-week` lleva `aria-label="Semana anterior"` y `#next-week` lleva `aria-label="Semana siguiente"`. Sus iconos llevan `aria-hidden="true"`.

- [x] **Paso 5. CSS del botón del nombre (sección final de `css/style.css`)**

```css
.event-item__open {
  background: none;
  border: 0;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
}
```

- [x] **Paso 6. Comprobar en el navegador**

1. Calendario. Pulsar la flecha derecha. Esperado: el título cambia a la semana siguiente. «Hoy» vuelve a la actual.
2. «Nuevo evento» con nombre `Cena de Ana's "prueba" <b>x</b>`, fecha de hoy y hora 21:00. Esperado: aparece en el día de hoy sin recargar, con el texto literal.
3. Pulsar su botón de Google Calendar. Esperado: se abre una pestaña de Google Calendar y la consola no muestra errores.
4. Con el tabulador, llegar al nombre del evento y pulsar Enter. Esperado: se abre el modal de edición. «Eliminar» lo quita de la vista sin recargar.
5. Crear un evento para la semana siguiente, pasar a esa semana. Esperado: se ve.

- [ ] **Paso 7. Commit**

```bash
pnpm run sync
git add js/modules/calendar.js css/style.css dist
git commit -m "fix(calendar): la semana se repinta al navegar y al guardar, y el botón de Google no depende de un atributo JSON"
```

---

### Tarea 7. Reglas de tareas en un solo módulo

Cierra I11, la parte de datos de I10 y M23. Lleva TDD.

**Archivos**
- Crear: `js/utils/objectives.js`
- Crear: `tests/objectives.test.js`
- Modificar: `js/modules/kanban.js:28-61` y `:1642`
- Modificar: `js/app.js:696`, `:762-770`, `:778`
- Modificar: `js/utils/mcp-bridge.js:532`
- Modificar: `js/components/weekly-review-modal.js:562-602` y `:639-652`
- Modificar: `js/modules/projects.js:1089-1097`

**Interfaces**
- Produce, todo exportado desde `js/utils/objectives.js`:
  - `LIMITS = { backlog: null, quarterly: 3, monthly: 6, weekly: 10, daily: 3 }`
  - `IMPORTANT_TASK_TYPE = 'importante'`
  - `getLocalDateString(date?: Date): string` (formato `AAAA-MM-DD` en hora local, con `toLocaleDateString('en-CA')`)
  - `getDailyLimit(data: object, today?: string): number`
  - `getHorizonLimit(data: object, horizon: string): number | null`
  - `countActive(items?: object[]): number`
  - `isHorizonFull(data: object, horizon: string): boolean`
  - `isImportantTask(task?: object): boolean`
  - `unlinkProjectTasks(objectives: object, projectId: string): number`

- [x] **Paso 1. Escribir `tests/objectives.test.js`**

```js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  LIMITS, IMPORTANT_TASK_TYPE, getDailyLimit, getHorizonLimit, countActive,
  isHorizonFull, isImportantTask, unlinkProjectTasks
} from '../js/utils/objectives.js';

const tareas = (n) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, completed: false }));

describe('límites', () => {
  it('el límite diario sale del setup de hoy y si no hay setup vale 3', () => {
    assert.strictEqual(getDailyLimit({ dailySetup: { date: '2026-11-13', dailyLimit: 1 } }, '2026-11-13'), 1);
    assert.strictEqual(getDailyLimit({ dailySetup: { date: '2026-11-12', dailyLimit: 1 } }, '2026-11-13'), 3);
    assert.strictEqual(getDailyLimit({}, '2026-11-13'), 3);
    assert.strictEqual(getDailyLimit({ dailySetup: null }, '2026-11-13'), 3);
  });
  it('getHorizonLimit', () => {
    assert.strictEqual(getHorizonLimit({}, 'quarterly'), 3);
    assert.strictEqual(getHorizonLimit({}, 'monthly'), 6);
    assert.strictEqual(getHorizonLimit({}, 'weekly'), 10);
    assert.strictEqual(getHorizonLimit({}, 'backlog'), null);
    assert.strictEqual(LIMITS.daily, 3);
  });
  it('countActive ignora las completadas y admite listas ausentes', () => {
    assert.strictEqual(countActive([{ completed: true }, { completed: false }, {}]), 2);
    assert.strictEqual(countActive(undefined), 0);
  });
  it('isHorizonFull', () => {
    assert.strictEqual(isHorizonFull({ objectives: { quarterly: tareas(3) } }, 'quarterly'), true);
    assert.strictEqual(isHorizonFull({ objectives: { quarterly: tareas(2) } }, 'quarterly'), false);
    assert.strictEqual(isHorizonFull({ objectives: { backlog: tareas(50) } }, 'backlog'), false);
    assert.strictEqual(isHorizonFull({ objectives: {} }, 'weekly'), false);
    const hoy = new Date().toLocaleDateString('en-CA');
    assert.strictEqual(isHorizonFull({ dailySetup: { date: hoy, dailyLimit: 1 }, objectives: { daily: tareas(1) } }, 'daily'), true);
  });
});

describe('importante', () => {
  it('reconoce el valor actual y el heredado de la captura', () => {
    assert.strictEqual(IMPORTANT_TASK_TYPE, 'importante');
    assert.strictEqual(isImportantTask({ taskType: 'importante' }), true);
    assert.strictEqual(isImportantTask({ taskType: 'important' }), true);
    assert.strictEqual(isImportantTask({ taskType: null }), false);
    assert.strictEqual(isImportantTask(undefined), false);
  });
});

describe('unlinkProjectTasks', () => {
  it('desvincula en las seis listas y cuenta', () => {
    const o = {
      backlog: [{ projectId: 'p1' }], quarterly: [{ projectId: 'p2' }], monthly: [],
      weekly: [{ projectId: 'p1' }], daily: [], completed: [{ projectId: 'p1' }]
    };
    assert.strictEqual(unlinkProjectTasks(o, 'p1'), 3);
    assert.strictEqual(o.backlog[0].projectId, null);
    assert.strictEqual(o.weekly[0].projectId, null);
    assert.strictEqual(o.completed[0].projectId, null);
    assert.strictEqual(o.quarterly[0].projectId, 'p2');
  });
  it('admite listas ausentes', () => assert.strictEqual(unlinkProjectTasks({}, 'p1'), 0));
});
```

- [x] **Paso 2. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: `tests/objectives.test.js` falla porque no existe `js/utils/objectives.js`.

- [x] **Paso 3. Crear `js/utils/objectives.js` con las nueve exportaciones**

`getDailyLimit` copia la lógica de `js/modules/kanban.js:47-53` con `today` como parámetro. `getHorizonLimit` devuelve `getDailyLimit(data)` para `'daily'` y `LIMITS[horizon]` para el resto. `isHorizonFull` compara `countActive(data.objectives?.[horizon])` con `getHorizonLimit` y devuelve `false` si el límite es `null`. El módulo no importa nada.

- [x] **Paso 4. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 5. `js/modules/kanban.js` usa el módulo**

Borrar las definiciones locales de `LIMITS` (28-34), `getLocalDateString` (39-41), `getDailyLimit` (47-53) y `getActiveTasksCount` (59-61), con sus comentarios. Añadir tras la línea 12:

```js
import {
  LIMITS, IMPORTANT_TASK_TYPE, getLocalDateString, getDailyLimit,
  countActive as getActiveTasksCount, isImportantTask
} from '../utils/objectives.js';
```

En la línea 1642, `item?.taskType === 'importante'` pasa a `isImportantTask(item)`. En la 1664, `'importante'` pasa a `IMPORTANT_TASK_TYPE`. Si `TASK_TYPES` (línea 23) no se usa en ningún otro sitio tras la Tarea 8, se borra en esa tarea.

- [x] **Paso 6. La captura respeta el límite real y guarda el valor correcto (`js/app.js`)**

Importar `getHorizonLimit`, `countActive` e `IMPORTANT_TASK_TYPE` de `'./utils/objectives.js'`. Sustituir las líneas 762-765 por:

```js
    const limit = getHorizonLimit(state.data, parsed.horizon);
    if (limit !== null) {
      const current = countActive(state.data.objectives?.[parsed.horizon]);
```

El resto del bloque (el `if (current >= limit)` y sus dos líneas) se queda como está. En la línea 778, `'important'` pasa a `IMPORTANT_TASK_TYPE`, y el comentario de la 696 dice `(taskType: 'importante')`.

- [x] **Paso 7. `js/utils/mcp-bridge.js:532`**

Importar `IMPORTANT_TASK_TYPE` de `'./objectives.js'` y usarlo en lugar de `'important'`.

- [x] **Paso 8. La revisión semanal respeta los límites (`js/components/weekly-review-modal.js`)**

Importar `isHorizonFull`, `getHorizonLimit` y `countActive` de `'../utils/objectives.js'`. En `applyBacklogChanges`, al principio de la rama `else if (['weekly', 'monthly', 'quarterly'].includes(action))`, antes de `backlog.splice`:

```js
      if (isHorizonFull(currentData, action)) {
        const nombres = { weekly: 'Semana', monthly: 'Mes', quarterly: 'Trimestre' };
        showNotification(`${nombres[action]} ya está al completo (${countActive(currentData.objectives[action])}/${getHorizonLimit(currentData, action)}). La idea se queda en Pendientes.`, 'warning');
        return;
      }
```

En `moveTask`, antes de `const task = fromTasks.splice(...)`:

```js
    if (isHorizonFull(currentData, toHorizon)) {
      showNotification('Ese horizonte ya está al completo. La tarea se queda donde estaba.', 'warning');
      renderCurrentStep();
      return;
    }
```

- [x] **Paso 9. Borrar un proyecto desvincula todas sus tareas (`js/modules/projects.js:1089-1097`)**

Importar `unlinkProjectTasks` de `'../utils/objectives.js'`. Sustituir el bucle `['quarterly', 'monthly', 'weekly', 'daily'].forEach(...)` por `unlinkProjectTasks(currentData.objectives, projectId);`. Comprobar que la función llama después a `updateDataCallback('objectives', currentData.objectives)`. Si no lo hace, añadir esa llamada en la línea siguiente.

- [x] **Paso 10. Comprobar en el navegador**

1. Con el trimestre en 3/3, abrir la revisión semanal y mover una idea a «→ Trimestre». Esperado: aviso de que está al completo y el trimestre sigue en 3/3.
2. Configurar el día con 2 h y energía baja (límite 1) y una prioridad ya puesta. Capturar `Otra >hoy`. Esperado: aviso de que Prioridades está lleno y la tarea va a Pendientes.
3. Capturar `!Renovar DNI`, abrir su edición en la Agenda. Esperado: la casilla «Marcar como importante» sale marcada.
4. Crear un proyecto, añadirle una tarea (va a Pendientes) y borrar el proyecto. En la consola: `JSON.parse(localStorage.getItem('oraculo_data')).objectives.backlog.some(t => t.projectId)`. Esperado: `false`.

- [ ] **Paso 11. Commit**

```bash
pnpm run sync
git add js/utils/objectives.js tests/objectives.test.js js/modules/kanban.js js/app.js js/utils/mcp-bridge.js js/components/weekly-review-modal.js js/modules/projects.js dist
git commit -m "fix(tareas): una sola fuente para límites, importante y vínculo con proyecto"
```

---

### Tarea 8. Agenda: se ve lo importante, se ven las notas y se maneja con teclado

Cierra I10 (parte visual), la parte de Agenda de I9 y M19. Sin TDD (interfaz).

**Archivos**
- Modificar: `js/modules/kanban.js` (`renderFocusItem` 219-250, `renderHorizonItem` 453-474, `renderBacklogItem` 594-614, `renderCompletedItem` 661-674, selección 904-925, 955-976, 1004-1022 y `clearAllSelections` 1044-1062)
- Modificar: `css/style.css` (sección final)

**Interfaces**
- Consume: `isImportantTask` de la Tarea 7.

- [x] **Paso 1. Añadir dos ayudas de pintado en `js/modules/kanban.js`, antes de `renderFocusItem`**

```js
const renderImportantMark = (item) => isImportantTask(item)
  ? '<span class="material-symbols-outlined kanban-item__important" role="img" aria-label="Importante" title="Importante">priority_high</span>'
  : '';

const renderItemNotes = (item) => item.notes
  ? `<p class="kanban-item__notes">${escapeHTML(item.notes)}</p>`
  : '';
```

- [x] **Paso 2. `renderHorizonItem`. Sustituir el `<label>` y el `<span class="horizon-item__text">` por**

```js
      <label class="horizon-item__checkbox" title="Marcar como completada">
        <input type="checkbox" ${item.completed ? 'checked' : ''} data-id="${item.id}" aria-label="Completar: ${escapeHTML(item.text)}">
      </label>
      <div class="horizon-item__body">
        ${renderImportantMark(item)}
        <span class="horizon-item__text kanban-item__select" role="button" tabindex="0" aria-pressed="false">${escapeHTML(item.text)}</span>
        ${renderItemNotes(item)}
      </div>
```

El texto sigue siendo un `<span>` y no un `<button>` a propósito. En Firefox, un botón dentro de un elemento arrastrable impide iniciar el arrastre desde él.

- [x] **Paso 3. `renderBacklogItem`. Sustituir el `<span class="backlog-item__text">` por**

```js
        <div class="backlog-item__body">
          ${renderImportantMark(item)}
          <span class="backlog-item__text kanban-item__select" role="button" tabindex="0" aria-pressed="false">${escapeHTML(item.text)}</span>
          ${renderItemNotes(item)}
        </div>
```

- [x] **Paso 4. `renderFocusItem`. Tres cambios**

1. El `<input type="checkbox">` gana `aria-label="Completar: ${escapeHTML(item.text)}"` y el icono interior gana `aria-hidden="true"`.
2. Dentro de `.focus-item__title-row`, el `<span class="focus-item__text ...">` pasa a `${renderImportantMark(item)}` seguido de `<span class="focus-item__text kanban-item__select ${item.completed ? 'text--completed' : ''}" role="button" tabindex="0" aria-pressed="false">${escapeHTML(item.text)}</span>`.
3. La línea de notas existente (240) se queda como está.

- [x] **Paso 5. `renderCompletedItem`**

El `<input>` gana `aria-label="Restaurar: ${escapeHTML(item.text)}"` y el icono `aria-hidden="true"`.

- [x] **Paso 6. El estado de selección se anuncia**

Añadir antes de la primera función de selección:

```js
const setItemSelected = (item, block, selected) => {
  item.classList.toggle(`${block}--selected`, selected);
  item.querySelector('.kanban-item__select')?.setAttribute('aria-pressed', String(selected));
};
```

En los tres manejadores de clic (horizonte, prioridades y pendientes), cada `item.classList.add('X--selected')` pasa a `setItemSelected(item, 'X', true)` y cada `item.classList.remove('X--selected')` a `setItemSelected(item, 'X', false)`, con `X` igual a `horizon-item`, `focus-item` o `backlog-item`. En `clearAllSelections`, cada `i.classList.remove('X--selected')` pasa a `setItemSelected(i, 'X', false)`.

- [x] **Paso 6b. Enter y Espacio seleccionan la tarea**

El clic ya burbujea hasta el `<li>`, que es quien selecciona. Falta que el teclado dispare ese clic. Se registra una sola vez, aunque la vista se abra muchas veces. Añadir a nivel de módulo, junto a las variables `selectedHorizonItemId`:

```js
let selectKeysBound = false;
const bindSelectKeys = () => {
  if (selectKeysBound) return;
  selectKeysBound = true;
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList?.contains('kanban-item__select')) {
      e.preventDefault();
      e.target.click();
    }
  });
};
```

Llamar a `bindSelectKeys();` en la primera línea de la función `init` exportada por el módulo.

- [x] **Paso 7. CSS (sección final)**

```css
.kanban-item__select {
  cursor: pointer;
  overflow-wrap: anywhere;
}

.horizon-item__body,
.backlog-item__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px;
}

.horizon-item__body .kanban-item__select,
.backlog-item__body .kanban-item__select {
  flex: 1;
  min-width: 0;
}

.horizon-item__body .kanban-item__notes,
.backlog-item__body .kanban-item__notes {
  flex-basis: 100%;
  margin: 0;
  overflow-wrap: anywhere;
}

.kanban-item__important {
  color: var(--rosa-600);
  font-size: 18px;
  flex-shrink: 0;
}
```

- [x] **Paso 8. Limpieza**

Si `TASK_TYPES` (línea 23) ya no se usa (`grep -n "TASK_TYPES" js/modules/kanban.js` solo da su definición), borrarla.

- [x] **Paso 9. Comprobar en el navegador, a 1280 y a 360 px**

1. Editar una tarea de la semana, marcar «importante» y escribir la nota `Comprar "pan" <b>y</b> leche's`. Esperado: el icono rosa aparece delante del texto y la nota debajo, literal.
2. Con el tabulador, llegar a una tarea de Pendientes y pulsar Enter. Esperado: aparece la barra de acciones y, siguiendo con el tabulador, se llega a «Mover», «Editar» y «Eliminar». Repetir con la barra espaciadora sobre una tarea de la semana.
3. Arrastrar una tarea de la semana al mes con el ratón, agarrándola por el texto. Esperado: sigue funcionando.
4. En la consola, `document.querySelectorAll('.kanban-item input[type=checkbox]:not([aria-label])').length`. Esperado: `0`.

- [ ] **Paso 10. Commit**

```bash
pnpm run sync
git add js/modules/kanban.js css/style.css dist
git commit -m "fix(agenda): mostrar importante y notas y permitir manejar las tareas con teclado"
```

---

### Tarea 9. Nombres accesibles, foco y semántica en el resto de la app

Cierra la parte restante de I9, M19 y M27. Sin TDD (interfaz).

**Archivos**
- Modificar: `app.html` (cabecera, banner de captura y pie)
- Modificar: `js/app.js:981-985` (`updateActiveNav`)
- Modificar: `js/modules/projects.js:228-234` y `:315`
- Modificar: `js/modules/dashboard.js:194-203`
- Modificar: `js/modules/today.js:93-105`
- Modificar: `js/modules/life-wheel.js:459-466`, `:509`, `:522`
- Modificar: `js/modules/habits.js`, `journal.js`, `life-wheel.js`, `values.js` (etiquetas `<main>` internas)
- Modificar: `css/style.css` (sección final)

- [x] **Paso 1. `app.html`. Los iconos dejan de leerse como texto**

Todos los `<span>` con la clase `material-symbols-outlined` de `app.html` ganan `aria-hidden="true"`. El campo `#global-capture-input` gana `aria-label="Captura rápida"`. Así el nombre de cada botón de la cabecera pasa a ser su `title` y el de cada enlace del menú, su texto.

- [x] **Paso 2. El menú marca la página actual (`js/app.js`, `updateActiveNav`)**

```js
const updateActiveNav = (viewName) => {
  document.querySelectorAll('[data-view]').forEach(link => {
    const active = link.dataset.view === viewName;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
};
```

- [x] **Paso 3. Proyectos**

En `js/modules/projects.js:315`, el nombre pasa a `<h3 class="project-card__name"><button type="button" class="project-card__open">${escapeHTML(project.name)}</button></h3>`. El icono del botón `.project-card__menu` gana `aria-hidden="true"` y el botón, `aria-label="Evaluar proyecto: ${escapeHTML(project.name)}"`. En el formulario, `#project-name` gana `maxlength="100"` y `#project-description`, `maxlength="500"`.

- [x] **Paso 4. Inicio (`js/modules/dashboard.js:194-203`)**

`#new-focus-input` gana `aria-label="Nueva prioridad"`. El botón de envío gana `aria-label="Añadir prioridad"` y su icono, `aria-hidden="true"`. En `renderFocusItem` (hacia 455-482), los iconos de `.focus-rock` y `.focus-delete` ganan `aria-hidden="true"`.

- [x] **Paso 5. Hoy (`js/modules/today.js`)**

El botón `.today__task-check` gana `aria-label="Completar: ${escapeHTML(t.text)}"`. Su icono y el de `.today__roca-done` ganan `aria-hidden="true"`.

- [x] **Paso 6. Rueda de la Vida (`js/modules/life-wheel.js`)**

`#eval-prev` gana `aria-label="Área anterior"`. `#eval-next` gana `aria-label="${step >= areas.length ? 'Guardar evaluación' : 'Área siguiente'}"`. Sus iconos, `aria-hidden="true"`. `#score-current` gana `aria-label="¿Cómo te sientes actualmente?"` y `#score-desired`, `aria-label="¿Qué puntuación te gustaría tener?"`.

- [x] **Paso 7. Un solo `<main>` por página**

`app.html` ya tiene `<main id="app-content">`. En `js/modules/habits.js`, `journal.js`, `life-wheel.js` y `values.js`, cada `<main class="...">` pasa a `<div class="...">` y cada `</main>` a `</div>`. Son 15 parejas (`grep -rn "<main" js --include=*.js` las lista). Antes, comprobar que el CSS no depende de la etiqueta.

Ejecutar: `grep -nE "main\.(habits-main|wizard-content|editor-main|life-wheel-main|values-main)|main\s*>" css/style.css`
Esperado: sin resultados. Si sale alguno, cambiar en esa regla `main.clase` por `.clase`.

- [x] **Paso 8. CSS (sección final)**

```css
.project-card__open {
  background: none;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.focus-delete:focus-visible,
.project-card__menu:focus-visible {
  opacity: 1;
}

#app-content:focus {
  outline: none;
}
```

- [x] **Paso 9. Comprobar en el navegador**

1. Proyectos. Con el tabulador, llegar al nombre de un proyecto y pulsar Enter. Esperado: se abre el detalle.
2. En la consola de cualquier vista:

```js
[...document.querySelectorAll('header button, header a, #app-content button')]
  .filter(b => b.getBoundingClientRect().width > 0)
  .filter(b => !(b.getAttribute('aria-label') || b.title || [...b.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) || b.querySelector(':scope > :not(.material-symbols-outlined)')))
  .map(b => b.outerHTML.slice(0, 120))
```

Esperado en Inicio, Hoy, Calendario, Rueda (durante una evaluación) y Proyectos: lista vacía.
3. `document.querySelectorAll('main').length`. Esperado: `1` en todas las vistas.
4. `document.querySelector('.nav-link[aria-current="page"]').textContent.trim()`. Esperado: el nombre de la vista abierta.

- [ ] **Paso 10. Commit**

```bash
pnpm run sync
git add app.html js/app.js js/modules/projects.js js/modules/dashboard.js js/modules/today.js js/modules/life-wheel.js js/modules/habits.js js/modules/journal.js js/modules/values.js css/style.css dist
git commit -m "fix(a11y): nombres accesibles, tarjetas de proyecto con foco y un solo main por página"
```

---

### Tarea 10. Cabecera que cabe, enlace de salto y menú móvil

Cierra G7, I8 y M25. Sin TDD (interfaz).

**Archivos**
- Modificar: `js/app.js:195-201` (`popstate`) y `:279-307` (menú móvil)
- Modificar: `css/style.css` (sección final)

- [x] **Paso 1. CSS de la cabecera en dos filas (sección final)**

El menú completo con texto necesita unos 1.725 px. Por debajo de 1.800 px pasa a una segunda fila y, si aún no cabe, sus enlaces saltan de línea.

```css
@media (min-width: 901px) and (max-width: 1799px) {
  .app-header {
    flex-wrap: wrap;
    row-gap: var(--space-1);
  }

  .app-nav {
    order: 3;
    flex: 1 0 100%;
    flex-wrap: wrap;
    justify-content: center;
  }
}

@media (max-width: 900px) {
  .app-nav {
    max-height: calc(100dvh - 80px);
    overflow-y: auto;
  }
}
```

- [x] **Paso 2. El enlace de salto enfoca el contenido sin cambiar la dirección (`js/app.js`)**

Justo antes de `const navToggle = document.querySelector('.nav-toggle');` (línea 279):

```js
  document.querySelector('.skip-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('app-content');
    main.setAttribute('tabindex', '-1');
    main.focus();
  });
```

- [x] **Paso 3. Una dirección desconocida lleva al inicio (`js/app.js:195-201`)**

En el listener de `popstate`, la línea que calcula `view` pasa a:

```js
    const candidate = e.state?.view || getBaseView(location.hash.slice(1));
    const view = VIEWS[candidate] ? candidate : 'dashboard';
```

- [x] **Paso 4. Escape cierra el menú móvil (`js/app.js`, dentro del `if (navToggle && appNav)`)**

```js
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && appNav.classList.contains('is-open')) {
        appNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
```

- [x] **Paso 5. Comprobar en el navegador**

1. Con un bloque de Muévete en marcha (su indicador ensancha la cabecera), ejecutar este script a 1024, 1280, 1366, 1536, 1799, 1800 y 1920 px de ancho.

```js
(() => { const vw = document.documentElement.clientWidth;
  return [...document.querySelectorAll('header a, header button')]
    .filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > vw + 1)
    .map(e => e.title || e.innerText.trim()); })()
```

Esperado: lista vacía en los siete anchos. A 1800 y 1920 px la cabecera ocupa una sola fila. Si a 1800 px algo queda fuera, subir el `max-width` del `@media` de 50 en 50 px (y probar en ese ancho más uno) hasta que la lista salga vacía, y anotar el valor final en el Libro de Escalado.
2. A 360 x 640 px, abrir el menú. Esperado: se puede desplazar dentro del menú hasta «Logros». Escape lo cierra.
3. A 1280 px, recargar, pulsar el tabulador una vez y Enter sobre «Saltar al contenido principal». Esperado: la vista no cambia, la dirección no cambia y `document.activeElement.id` da `app-content`.
4. Abrir `http://localhost:8766/app.html#noexiste`. Esperado: se ve el Inicio.

- [ ] **Paso 6. Commit**

```bash
pnpm run sync
git add js/app.js css/style.css dist
git commit -m "fix(cabecera): nada queda fuera de pantalla en portátil y el enlace de salto ya no rompe la vista"
```

---

### Tarea 11. Diario: no se pierde lo que no se guardó

Cierra I13. Lleva TDD.

**Archivos**
- Crear: `js/utils/journal-draft.js`
- Crear: `tests/journal-draft.test.js`
- Modificar: `js/modules/journal.js` (editor, línea 289, `setupEditor` 350-411 y `saveEntry` 416-445)

**Interfaces**
- Produce, desde `js/utils/journal-draft.js`:
  - `draftIdFor(route: { mode: string, type?: string, id?: string }): string | null`. Devuelve `new:TIPO`, `edit:ID` o `null` si el modo es otro.
  - `saveDraft(draftId: string, content: string): void`. Un contenido vacío o solo con espacios borra el borrador.
  - `loadDraft(draftId: string): string | null`. Devuelve el texto solo si el borrador guardado es de ese `draftId`.
  - `clearDraft(): void`.
- Clave de localStorage: `oraculo_journal_draft`, con la forma `{ id, content, savedAt }`. No forma parte de `oraculo_data`, así que no se sincroniza ni se exporta.

- [x] **Paso 1. Escribir `tests/journal-draft.test.js`**

```js
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

const store = {};
globalThis.localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const { draftIdFor, saveDraft, loadDraft, clearDraft } = await import('../js/utils/journal-draft.js');
beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

describe('borrador del diario', () => {
  it('draftIdFor', () => {
    assert.strictEqual(draftIdFor({ mode: 'new', type: 'daily' }), 'new:daily');
    assert.strictEqual(draftIdFor({ mode: 'edit', id: 'abc' }), 'edit:abc');
    assert.strictEqual(draftIdFor({ mode: 'list' }), null);
  });
  it('guarda y recupera solo para la misma entrada', () => {
    saveDraft('new:daily', 'Hoy me siento bien');
    assert.strictEqual(loadDraft('new:daily'), 'Hoy me siento bien');
    assert.strictEqual(loadDraft('new:free'), null);
    assert.strictEqual(loadDraft('edit:abc'), null);
  });
  it('un texto vacío borra el borrador', () => {
    saveDraft('new:daily', 'algo');
    saveDraft('new:daily', '   ');
    assert.strictEqual(loadDraft('new:daily'), null);
  });
  it('clearDraft lo elimina', () => {
    saveDraft('new:daily', 'algo');
    clearDraft();
    assert.strictEqual(loadDraft('new:daily'), null);
  });
  it('un borrador ilegible cuenta como ausente', () => {
    localStorage.setItem('oraculo_journal_draft', 'no es json');
    assert.strictEqual(loadDraft('new:daily'), null);
  });
});
```

- [x] **Paso 2. Ejecutar y ver que fallan**

Ejecutar: `pnpm test`
Esperado: falla porque no existe `js/utils/journal-draft.js`.

- [x] **Paso 3. Crear `js/utils/journal-draft.js` con las cuatro exportaciones**

- [x] **Paso 4. Ejecutar y ver que pasan**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 5. Conectar el editor (`js/modules/journal.js`)**

Importar las cuatro funciones de `'../utils/journal-draft.js'`.

1. En el render del editor, antes de la plantilla: `const draft = loadDraft(draftIdFor(parseJournalRoute()));`. El contenido del `<textarea>` (línea 289) pasa a `${escapeHTML(draft ?? entry?.content ?? '')}`.
2. En `setupEditor`, tras obtener `textarea`:

```js
  const draftId = draftIdFor(parseJournalRoute());
  if (loadDraft(draftId) !== null) {
    showNotification('Hemos recuperado el texto que no llegaste a guardar.', 'info');
  }
  let draftTimer = null;
  textarea?.addEventListener('input', () => {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => saveDraft(draftId, textarea.value), 400);
  });
  document.querySelector('.editor-actions-right a[href="#journal"]')?.addEventListener('click', () => {
    clearTimeout(draftTimer);
    clearDraft();
  });
```

3. En el clic sobre un prompt, tras `textarea.value = ...`, añadir `textarea.dispatchEvent(new Event('input'));`.
4. En `saveEntry`, justo después de `updateDataCallback('journal', data.journal);` (línea 442), añadir `clearDraft();`. En el borrado de la entrada (dentro del `confirmDanger` de `#delete-journal`), añadir también `clearDraft();`.

- [x] **Paso 6. Comprobar en el navegador**

1. Diario, «Escritura libre», escribir `Borrador importante`, esperar un segundo y pulsar «Inicio» en el menú. Volver a Diario, «Escritura libre». Esperado: el texto está ahí y sale el aviso de recuperación.
2. Pulsar «Cancelar» y volver a entrar. Esperado: el campo está vacío.
3. Escribir y guardar. Volver a «Escritura libre». Esperado: campo vacío y la entrada guardada en la lista.

- [ ] **Paso 7. Commit**

```bash
pnpm run sync
git add js/utils/journal-draft.js tests/journal-draft.test.js js/modules/journal.js dist
git commit -m "feat(diario): borrador automático para no perder lo escrito al salir del editor"
```

---

### Tarea 12. Contadores que coinciden

Cierra I18. Lleva TDD.

**Archivos**
- Modificar: `js/storage-hybrid.js:529-545` (`generateYearSummary`)
- Modificar: `js/components/weekly-review-modal.js:350-360`
- Prueba: `tests/storage-hybrid.test.js`

**Interfaces**
- Consume: `getCompletedTasksInPeriod(objectives, 'week')` de `js/utils/achievements-calculator.js:74`. Es la misma función que usa la vista Logros, con la semana de lunes a domingo.

- [x] **Paso 1. Añadir la prueba que falla**

```js
describe('generateYearSummary', () => {
  it('cuenta las tareas movidas a completadas', () => {
    const s = storage.generateYearSummary(storage.ensureDataShape({
      version: '1.5',
      objectives: { weekly: [{ completed: true }, { completed: false }], completed: [{ completed: true }, { completed: true }] }
    }));
    assert.strictEqual(s.totalTasksCompleted, 3);
  });
});
```

- [x] **Paso 2. Ejecutar y ver que falla**

Ejecutar: `pnpm test`
Esperado: falla con `1 !== 3`.

- [x] **Paso 3. En `generateYearSummary`, sumar `(data.objectives.completed || []).length` a `totalTasksCompleted`**

- [x] **Paso 4. Ejecutar y ver que pasa**

Ejecutar: `pnpm test`
Esperado: todas correctas.

- [x] **Paso 5. La revisión semanal usa el mismo cálculo que Logros**

En `js/components/weekly-review-modal.js`, importar `getCompletedTasksInPeriod` de `'../utils/achievements-calculator.js'` y sustituir el cálculo de `completedThisWeek` (líneas 352-360) por:

```js
  const completedThisWeek = getCompletedTasksInPeriod(objectives, 'week').length;
```

- [x] **Paso 6. Comprobar en el navegador**

Completar dos tareas. Esperado: Logros (pestaña Semana), el último paso de la revisión semanal y el resumen del cuaderno en Configuración muestran el mismo número, 2.

- [ ] **Paso 7. Commit**

```bash
pnpm run sync
git add js/storage-hybrid.js js/components/weekly-review-modal.js tests/storage-hybrid.test.js dist
git commit -m "fix(logros): la revisión semanal y el resumen del cuaderno cuentan igual que Logros"
```

---

## Fase 3. Aspecto y textos

### Tarea 13. Hábitos: calendario del mes en el móvil, tildes y atributos

Cierra I14 e I17. Sin TDD (interfaz y copy).

**Archivos**
- Modificar: `js/modules/habits.js` (líneas de la tabla y atributos indicados)
- Modificar: `css/style.css` (sección final)

- [x] **Paso 1. CSS del calendario mensual (sección final)**

```css
.habit-calendar .calendar-grid {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.habit-calendar .calendar-day {
  min-width: 0;
}
```

- [x] **Paso 2. Corregir los textos sin tilde de `js/modules/habits.js`**

| Línea | Ahora | Debe decir |
|---|---|---|
| 949 | `Selecciona una duracion para el experimento` | `Selecciona una duración para el experimento` |
| 1329 | `Una semana mas. Tu constancia es inspiradora.` | `Una semana más. Tu constancia es inspiradora.` |
| 1998 | `Acumulacion de Habitos` | `Acumulación de hábitos` |
| 2001 | `Despues de [HABITO ACTUAL], hare [NUEVO HABITO].` | `Después de [HÁBITO ACTUAL], haré [NUEVO HÁBITO].` |
| 2005 | `Despues de...` | `Después de...` |
| 2010 | `servir mi cafe de la manana, hare 2 minutos de estiramientos` | `servir mi café de la mañana, haré 2 minutos de estiramientos` |
| 2022 | `Tecnicas para hacerlo obvio` | `Técnicas para hacerlo obvio` |
| 2025 | `Disena tu entorno` … `Coloca senales visuales donde las veas (las senales visuales son las mas poderosas)` | `Diseña tu entorno` … `Coloca señales visuales donde las veas (las señales visuales son las más poderosas)` |
| 2063 | `Disena tu entorno` | `Diseña tu entorno` |
| 2071 | `¿Con que lo emparejas?` | `¿Con qué lo emparejas?` |
| 2094 | `Ley 3: Hacerlo Facil` | `Ley 3: Hacerlo Fácil` |
| 2095 | `Centrate en la version factible, no en la ideal. Empezar es mas importante que ser perfecta.` | `Céntrate en la versión factible, no en la ideal. Empezar es más importante que ser perfecta.` |
| 2127 | `Me preparo mi te favorito como celebracion` | `Me preparo mi té favorito como celebración` |
| 2178 | `Preparacion` | `Preparación` |
| 2179 | `Preparate para los contratiempos` | `Prepárate para los contratiempos` |
| 2192 | `Estoy muy cansada por la manana` | `Estoy muy cansada por la mañana` |
| 2204 | `Hago solo la micro-version de 2 minutos` y `Hago la version indoor en casa` | `Hago solo la microversión de 2 minutos` y `Hago la versión de interior en casa` |
| 2218 | `Anadir otro contratiempo` | `Añadir otro contratiempo` |
| 2230 | `Atras` | `Atrás` |

Las líneas 2083, 2108 y 2134 son los títulos de los otros tres desplegables de técnicas. Si dicen `Tecnicas`, pasan a `Técnicas`. En todo el rango 1994-2232, cualquier `Atras` de un botón pasa a `Atrás`.

- [x] **Paso 3. Comprobar que no queda ninguno**

Ejecutar:

```bash
sed -n '940,960p;1320,1335p;1990,2235p' js/modules/habits.js | grep -nE "Acumulacion|Habitos|HABITO|Despues|hare |cafe |manana|Tecnicas|Disena|senales| mas |Facil|Centrate|version|celebracion|Preparacion|Preparate|Anadir|Atras|duracion|¿Con que| te favorito"
```

Esperado: sin resultados.

- [x] **Paso 4. Escapar los valores que vuelven a los campos del asistente**

En estas diez líneas, el valor interpolado pasa por `escapeHTML`. Un nombre con comillas dobles se cortaba al volver atrás en el asistente.

| Línea | Ahora | Debe quedar |
|---|---|---|
| 1716 | `data-name="${a.name}"` | `data-name="${escapeHTML(a.name)}"` |
| 1832 | `value="${wizardData.identity \|\| ''}"` | `value="${escapeHTML(wizardData.identity \|\| '')}"` |
| 1881 | `value="${wizardData.name \|\| ''}"` | `value="${escapeHTML(wizardData.name \|\| '')}"` |
| 1894 | `value="${wizardData.micro \|\| ''}"` | `value="${escapeHTML(wizardData.micro \|\| '')}"` |
| 1946 | `value="${wizardData.scheduledTime \|\| '07:30'}"` | `value="${escapeHTML(wizardData.scheduledTime \|\| '07:30')}"` |
| 1960 | `value="${wizardData.location \|\| ''}"` | `value="${escapeHTML(wizardData.location \|\| '')}"` |
| 2011 | `value="${wizardData.trigger \|\| ''}"` | `value="${escapeHTML(wizardData.trigger \|\| '')}"` |
| 2077 | `value="${wizardData.attractive \|\| ''}"` | `value="${escapeHTML(wizardData.attractive \|\| '')}"` |
| 2102 | `value="${wizardData.easy \|\| ''}"` | `value="${escapeHTML(wizardData.easy \|\| '')}"` |
| 2128 | `value="${wizardData.reward \|\| ''}"` | `value="${escapeHTML(wizardData.reward \|\| '')}"` |

En la tabla, `\|\|` representa el operador `||` del código.

- [x] **Paso 5. Comprobar en el navegador**

1. A 360 px, con un hábito activo, en Hábitos:

```js
(() => { const vw = document.documentElement.clientWidth;
  const d = [...document.querySelectorAll('.habit-calendar .day-number')];
  return { total: d.length, visibles: d.filter(x => x.getBoundingClientRect().right <= vw).length }; })()
```

Esperado: `visibles` igual a `total`. Si no lo es, abrir DevTools sobre `.calendar-day`, ver qué regla le impone un ancho mínimo y anularla con el mismo prefijo `.habit-calendar`, dentro de la sección final.
2. Crear un hábito con el nombre `Leer "poesía" 10 min`, avanzar dos pasos y volver atrás. Esperado: el campo conserva el nombre completo.
3. Recorrer los pasos 5, 6 y 7. Esperado: todos los textos con tilde.

- [ ] **Paso 6. Commit**

```bash
pnpm run sync
git add js/modules/habits.js css/style.css dist
git commit -m "fix(habitos): calendario del mes completo en móvil, tildes del asistente y atributos escapados"
```

---

### Tarea 14. Texto largo, contraste y zonas táctiles

Cierra I12, I16 y M24. Sin TDD (CSS).

**Archivos**
- Modificar: `css/style.css` (`:root`, línea 18, y sección final)

- [x] **Paso 1. Añadir el token que pide `DESIGN.md` (tras la línea 18 de `css/style.css`)**

```css
  --turquesa-800: #006369;
```

- [x] **Paso 2. Texto de la usuaria que nunca desborda (sección final)**

```css
.focus-text,
.focus-item__text,
.focus-item__notes,
.horizon-item__text,
.backlog-item__text,
.completed-item__text,
.project-card__name,
.project-card__description,
.today__task-text,
.today__roca-text,
.entry-preview,
.event-name,
.value-name,
.value-description,
.habit-identity {
  overflow-wrap: anywhere;
}

.focus-label,
.project-card__name,
.today__task-text {
  min-width: 0;
}
```

- [x] **Paso 3. Contraste (sección final)**

```css
.capture-banner__btn,
.app-footer a,
.stat-value,
.habit-identity {
  color: var(--turquesa-800);
}

.nav-link.active,
.step-number {
  color: var(--gris-900);
}

.capture-banner__counter {
  background: var(--rosa-600);
}
```

Quedan cinco casos cuyo selector exacto hay que copiar de DevTools (pestaña Styles, la regla que hoy gana). Para cada uno se añade en la sección final una regla con ese mismo selector y solo la propiedad `color`.

| Dónde se ve | Texto de ejemplo | Color nuevo |
|---|---|---|
| Hábitos, números de «Las 4 Leyes» (`.law-item__number`) | `1` | `var(--turquesa-800)` |
| Agenda, contador de «Completadas» (`.completed-toggle__count`) | `1` | `var(--turquesa-800)` |
| Configuración, aviso «Tus datos viven en este dispositivo» (el `strong`) | ese texto | `var(--turquesa-800)` |
| Agenda, contadores en rojo (`.horizon-count` y `.slots-indicator` cuando están llenos) | `3/3 activas` | `var(--rosa-700)` |
| Agenda, contador de Pendientes (`.kanban-sidebar__count`) y Hábitos, `.habit-heatmap__stats` | `7`, `1/90 días (1%)` | `var(--gris-600)` |

- [x] **Paso 4. Zonas táctiles en móvil (sección final)**

```css
@media (max-width: 768px) {
  .link-subtle,
  .dashboard__reconfigure,
  #journal-search-input,
  #review-day-select {
    min-height: 44px;
  }

  .link-subtle {
    display: inline-flex;
    align-items: center;
  }

  .today__task-check,
  #clear-search {
    min-width: 44px;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
}
```

- [x] **Paso 5. Comprobar desbordes**

Crear una prioridad, una tarea semanal y un proyecto con este texto de 100 caracteres sin espacios: `https://ejemplo.com/` seguido de 80 letras `a`. A 1280 y a 360 px, en Inicio, Agenda, Proyectos y Hoy:

```js
(() => { const m = document.querySelector('#app-content');
  return { ancho: m.clientWidth, contenido: m.scrollWidth,
    botonesFuera: [...m.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().right > document.documentElement.clientWidth + 1).length }; })()
```

Esperado: `contenido` igual a `ancho` y `botonesFuera` igual a `0`.

- [x] **Paso 6. Comprobar contraste**

Ejecutar el script del Anexo B en Inicio, Agenda, Hábitos, Configuración y Diario. Esperado: objeto vacío en las cinco vistas.

- [ ] **Paso 7. Commit**

```bash
pnpm run sync
git add css/style.css dist
git commit -m "fix(ui): textos largos sin desbordes, contraste AA y zonas táctiles de 44 px"
```

---

## Fase 4. Menores

### Tarea 15. Bienvenida, captura y valores

Cierra M21, M22 y M26. Sin TDD (interfaz).

**Archivos**
- Modificar: `js/components/welcome-modal.js:182-215`
- Modificar: `js/app.js:698-760` y `:800-806`
- Modificar: `js/modules/values.js:548-552`

- [x] **Paso 1. Cerrar la bienvenida con Escape cuenta como empezar**

En `js/components/welcome-modal.js`, el cuerpo del manejador de `#welcome-start` se convierte en una función `completeOnboarding({ redirect })`, declarada justo antes, que hace lo mismo y solo ejecuta `window.location.hash = 'life-wheel';` si `redirect` es verdadero. Lleva una variable `let done = false;` que pasa a `true` al entrar y hace que una segunda llamada no haga nada. La llamada a `modal.close()` queda dentro de la función, después de poner `done = true`.

```js
  startBtn?.addEventListener('click', () => completeOnboarding({ redirect: true }));
  modal.addEventListener('close', () => completeOnboarding({ redirect: false }));
```

- [x] **Paso 2. La captura avisa cuando solo hay símbolos (`js/app.js`)**

En `capture`, la comprobación `if (!parsed.text) {` pasa a:

```js
    if (!/[\p{L}\p{N}]/u.test(parsed.text)) {
      showNotification('Falta el texto de la idea. Escribe algo además de los símbolos.', 'warning');
      input.focus();
      return;
    }
```

- [x] **Paso 3. La captura dice cuándo no encuentra el proyecto**

En `parseCapture`, declarar `let unknownTag = null;` junto a las demás variables. En el bloque de `#proyecto`, añadir la rama `else { unknownTag = hashMatch[1]; }` al `if (match)`. Devolver `unknownTag` en el objeto final. En el mensaje de confirmación (líneas 800-806), antes de `showNotification(msg, 'success');`:

```js
    if (parsed.unknownTag) msg += `. No hay ningún proyecto «${parsed.unknownTag}»`;
```

- [x] **Paso 4. Valores sin nombres repetidos (`js/modules/values.js`)**

Tras la comprobación de nombre vacío (línea 551):

```js
  const repetido = data.values.some(v => v.id !== id && v.name.trim().toLowerCase() === name.toLowerCase());
  if (repetido) {
    showNotification('Ya tienes un valor con ese nombre.', 'warning');
    return;
  }
```

- [x] **Paso 5. Comprobar en el navegador**

1. Con el almacenamiento vacío, cerrar la bienvenida con Escape y recargar. Esperado: no vuelve a salir y `JSON.parse(localStorage.getItem('oraculo_data')).onboarding.completed` da `true`.
2. Capturar `>semana`, `!` y `#`. Esperado: aviso en los tres casos y ninguna tarea nueva.
3. Capturar `Comprar pintura #noexiste`. Esperado: se guarda en Pendientes y el aviso menciona que no hay ningún proyecto «noexiste».
4. Crear el valor «Salud» dos veces. Esperado: la segunda vez sale el aviso y no se crea.

- [ ] **Paso 6. Commit**

```bash
pnpm run sync
git add js/components/welcome-modal.js js/app.js js/modules/values.js dist
git commit -m "fix(ux): bienvenida que no reaparece, avisos en la captura y valores sin duplicados"
```

---

### Tarea 16. Un solo estilo de confirmación

Cierra M20. Sin TDD (interfaz).

**Archivos**
- Modificar: `js/modules/settings.js`, `projects.js`, `muevete.js`, `dashboard.js`, `habits.js`, `calendar.js`

- [x] **Paso 1. Localizar los `confirm()` nativos que quedan**

Ejecutar: `grep -rnE "\bconfirm\(" js/modules`
Esperado (los números pueden haberse movido): `settings.js` (hacia 684, 1371, 1499 y 1532), `projects.js` (823), `muevete.js` (366), `dashboard.js` (865), `habits.js` (542, 722, 741, 764, 774, 1343 y 1364) y `calendar.js` (479 y 568).

- [x] **Paso 2. Sustituir cada uno con esta receta**

1. El archivo importa `confirmDangerAsync` de `'../utils/confirm-modal.js'` si no lo hace ya.
2. La función que contiene el `confirm` pasa a ser `async` (si es un listener, `async (e) => { ... }`).
3. `confirm(TEXTO)` pasa a `await confirmDangerAsync({ title, message, confirmText, cancelText: 'Cancelar', type })`, con estas reglas:
   - `title` es el texto hasta el primer `?`, incluido.
   - `message` es el resto del texto sin saltos de línea iniciales. Si no hay resto, cadena vacía.
   - Si el título empieza por «¿Eliminar», «¿Borrar» o «¿Segura», `type` es `'danger'` y `confirmText` es `'Sí, eliminar'`. En los demás casos, `type` es `'warning'` y `confirmText` es `'Sí, continuar'`.
   - Si el texto interpola datos de la usuaria (un nombre, por ejemplo), esa parte pasa por `escapeHTML`, porque el modal pinta con `innerHTML`.
4. Ejemplo. `if (!confirm('¿Eliminar esta prioridad?')) return;` pasa a:

```js
  if (!(await confirmDangerAsync({ title: '¿Eliminar esta prioridad?', message: '', confirmText: 'Sí, eliminar', cancelText: 'Cancelar', type: 'danger' }))) return;
```

- [x] **Paso 3. Comprobar**

Ejecutar: `grep -rnE "\bconfirm\(" js/modules`
Esperado: sin resultados.

En el navegador, probar una acción de cada archivo (eliminar una prioridad en Inicio, eliminar un evento, abandonar un hábito, eliminar un proyecto, parar un bloque de Muévete). Esperado: sale el modal propio, «Cancelar» no hace nada y confirmar ejecuta la acción. Escape cancela.

- [ ] **Paso 4. Commit**

```bash
pnpm run sync
git add js/modules dist
git commit -m "refactor(ui): todas las confirmaciones usan el modal propio"
```

---

### Tarea 17. Cierre

- [x] **Paso 1. Pruebas completas**

Ejecutar: `pnpm test`
Esperado: 0 fallos y más de 81 pruebas.

- [x] **Paso 2. Construir la extensión y comprobar que su almacenamiento carga**

```bash
pnpm run deploy:prep
```

```bash
node --input-type=module -e "const m = await import('./dist-extension/js/storage-local.js'); console.log(typeof m.loadData, typeof m.ensureDataShape)"
```

Esperado: `function function`.

- [x] **Paso 3. Retrospectiva del diff contra la base**

Ejecutar: `git diff --stat 8fc4cc2..HEAD`
Esperado: solo aparecen los archivos del «Mapa de archivos», sus copias en `dist/` y `dist-extension/`, y este plan. No aparecen `package.json`, `pnpm-lock.yaml`, `js/gdrive/`, `js/gcal/`, `js/storage.js`, `android/` ni `landing.css`. Si aparece alguno, se revierte ese cambio y se anota en el Libro de Escalado.

- [x] **Paso 4. Repaso final en el navegador**

Con el almacenamiento vacío, a 1280 y a 360 px. Completar la bienvenida, configurar el día, crear una tarea en cada horizonte, un proyecto, un hábito, un evento, una entrada de diario y un valor. Recargar. Esperado: todo sigue ahí y la consola no muestra errores.

- [ ] **Paso 5. Commit de cierre**

```bash
git add dist dist-extension
git commit -m "chore(build): sincronizar dist y extensión tras las correcciones de la auditoría"
```

Si `git status` no muestra cambios, este paso se omite.

- [x] **Paso 6. Entregar a Elena**

Resumen de una línea por tarea con su commit, el Libro de Escalado completo y el recordatorio de que falta pasar `revisor` y `seguridad` antes de subir. No se hace `git push`.

---

## Fuera de este plan

- **Publicar.** Subir la versión, las novedades, el nombre de caché del service worker (`oraculo-v2.4.0`) y el despliegue.
- **Sospechas que la auditoría no reprodujo.** Guardado que falla en silencio con el almacenamiento lleno, fechas mal calculadas entre las 00:00 y las 02:00, formato del archivo `.ics`, y texto sin escapar en `daily-setup.js`, `daily-setup-modal.js`, `objective-evaluator.js`, `life-wheel.js`, `projects.js` y `kanban.js` (líneas 790 y 859) cuando los datos llegan por un archivo importado.
- **Sin comprobar en la auditoría.** Extensión de Chrome en uso real, sincronización con Drive y Calendar, dictado por voz, Firefox y Safari, y el aviso de fin de bloque de Muévete.

## Libro de Escalado

### Decisiones pendientes para Elena

Quien ejecute el plan añade aquí, con fecha y tarea, cada duda que no resuelva el plan y la alternativa mínima que adoptó. De partida ya constan las cinco de «Decisiones tomadas por defecto» que quedan sin tocar.

### Anotaciones de ejecución (14-nov-2026)

Ejecutado entero y en orden, sin commits (el encargo pedía no commitear). Anotación por tarea.

| # | Tarea | Duda o desvío | Alternativa mínima adoptada |
|---|---|---|---|
| E1 | 1 | La prueba de «listas» del plan (`tests/validator.test.js`) aceptaba una lista como archivo válido. El mensaje nuevo del validador («El archivo tiene la sección "NOMBRE" con un formato que Oráculo no reconoce») es para secciones con tipo equivocado, no para listas. | Se mantienen dos comprobaciones distintas: una rechaza la lista y otra rechaza la sección con tipo equivocado. Ambas con mensaje propio. |
| E2 | 3 | `clearIdentityData` deja `data.lifeWheel = null` como pide el plan, pero `ensureDataShape` vuelve a rellenarlo con la Rueda por defecto, así que la Rueda no desaparece del todo (las evaluaciones sí se borran). | Se respetó el plan al pie de la letra. Se anota por si Elena quiere que la Rueda desaparezca de verdad. |
| E3 | 4 | La prueba del plan pedía el regex `/no es un archivo JSON válido/` en minúscula, pero el mensaje que ve la usuaria es «No es un archivo JSON válido.». | Se conserva el mensaje visible y se cambia el regex del test a `/No es un archivo JSON válido/`. |
| E4 | 8 | La barra de acciones de cada sección de la Agenda (Mover/Editar/Eliminar) vive en el `<header>`, antes de la lista. Los botones son enfocables y tienen `title`, pero el tabulador hacia delante desde una tarea no llega a ellos (hay que usar Shift+Tab). El plan no pedía reordenar el DOM. | No se toca la estructura. Queda anotado por si Elena quiere que la barra vaya después de la lista. |
| E5 | 10 | El `@media (min-width: 901px) and (max-width: 1799px)` no llega a activarse con un viewport emulado de 1799 px: Chrome evalúa la media query con un ancho que incluye el scrollbar y queda en 1800. La cabecera se queda en una fila a 1799 px. | No importa nada: a los siete anchos comprobados (1024, 1280, 1366, 1536, 1799, 1800 y 1920) no queda ningún elemento fuera de pantalla y a 1800 y 1920 la cabecera es de una sola fila. El plan solo pide subir el `max-width` si a 1800 px algo se sale, y no se sale. |
| E6 | 10 | El plan solo pedía el fallback a Inicio en el listener de `popstate`. Una dirección desconocida escrita a mano en una app ya abierta no lleva a ningún sitio. | Se aplicó el mismo fallback en el listener de `hashchange`, que es la vía real de ese caso. Sin loop: `navigateTo` usa `pushState`, que no dispara `hashchange`. |
| E7 | 13 | La causa del desbordamiento del calendario del hábito no era un ancho mínimo, sino una colisión de clases: la celda de «hoy» lleva la clase `today` y la regla `.today` de la vista «Hoy» (relleno de 24x16 px, ancho máximo 480 px) se le aplicaba. | Se corrigió en el origen: la regla de la vista pasa a `#app-content > .today`, de modo que solo la vista «Hoy» recibe ese estilo. Se comprobó que la vista sigue igual y que el calendario queda con celdas de 33 px sin desbordes. |
| E8 | 13 | La tabla de escapado del plan cubre diez atributos del asistente, pero quedaban cuatro textos de la usuaria interpolados sin `escapeHTML` (el nombre en el resumen del paso 4, y el nombre, la hora y el lugar en el resumen final). | Se escaparon los cuatro, porque son el mismo tipo de dato y el mismo fallo. |
| E9 | 14 | La tabla de contraste del plan fija cinco casos; al medir con el script del Anexo B aparecieron tres más (`.slots-indicator` en estado normal, `.habit-suggestions .benefit-tag` y los enlaces del aviso legal de Configuración, que llevaban el color en línea) y el desbordamiento a 360 px venía del margen negativo del header del Dashboard, que no coincide con el relleno real del contenedor en móvil. | Se añadieron las tres reglas que faltaban, se quitó el color en línea de los enlaces legales y se emparejó el sangrado del header con el relleno lateral del contenedor mediante `--app-pad-x`. Tras los cambios, el script de contraste devuelve objeto vacío en las cinco vistas. |
| E10 | 15 | El plan convertía el botón de empezar de la bienvenida en una función con guarda `done`. Si la cerraba con Escape, el evento `close` dispara la misma función. | Se resolvió como dice el plan: una sola función `completeOnboarding({ redirect })` con `done = true` al entrar, llamada desde el botón (con redirección a la Rueda) y desde el evento `close` (sin redirección). |
| E11 | 16 | La receta del plan exige que `title` sea el texto hasta el primer `?` y `message` el resto. En «Tienes un hábito sin terminar. ¿Quieres continuar donde lo dejaste?» el primer `?` está al final, así que el título es toda la frase y el mensaje queda vacío. | Se aplicó la regla al pie de la letra. El modal lo muestra sin partir el texto en dos, que es lo más legible en este caso. |
| E12 | 16 | Quedan `confirm()` nativos en `js/gcal/gcal-settings.js` (uno) y en `js/storage.js` (cuatro, módulo heredado). | No se tocan: `js/gcal/` y `js/storage.js` están en la lista de archivos prohibidos del plan. La lista de comprobación (`grep -rnE "\bconfirm\(" js/modules`) sale vacía. |
| E13 | Todas | El service worker y la caché del navegador sirvieron módulos viejos durante varias comprobaciones (se vio la bienvenida con `onboarding.completed === true`). | Antes de cada comprobación se desregistra el service worker, se borran las cachés y se recarga de verdad. También hay que sembrar los datos con `updatedAt` en el futuro: si no, el guardado al cerrar pisa la siembra. |
| E14 | 14, 15 | Se añadió CSS fuera de la sección final en tres sitios: la regla `.today` (alcance de la vista), el relleno `--app-pad-x` de `.app-main` y sus tres variantes de media query. | Son correcciones de reglas existentes, no CSS nuevo. La sección `/* === Correcciones auditoría 2026-11 === */` sigue siendo el sitio de todo el CSS añadido. |
| E15 | 17 | La auditoría lo dejó como sospecha sin reproducir («texto sin escapar en `daily-setup.js`, `daily-setup-modal.js`, `objective-evaluator.js`, `life-wheel.js`, `projects.js` y `kanban.js` (líneas 790 y 859) cuando los datos llegan por un archivo importado»). Al comprobarlo con el texto hostil `Comprar "pan" <b>y</b> leche's` sí se reprodujo, y el barrido encontró más casos de la misma clase: tres `<option>` sin escapar (`kanban.js` 776 y 845, `projects.js` 263), el modal de confirmación sin escapar título ni mensaje, el texto de tarea y el nombre de proyecto en `daily-setup.js` y `daily-setup-modal.js`, el nombre de la actividad de auditoría y la nota atélica en `habits.js`, el nombre del valor vinculado en `life-wheel.js` y `projects.js`, el título del objetivo en `objective-evaluator.js` y la etiqueta de la acción pendiente en `settings.js`. En una segunda pasada se encontró el nombre de las áreas de la Rueda de la Vida, que la usuaria puede renombrar, sin escapar en `life-wheel.js`, `wheel-chart.js` y `evolution-chart.js` (este último dentro del SVG). Además, un identificador con comillas o ángulos rompía el marcado al pintarse dentro de un atributo. | El escapado se aplica **una sola vez**, en el punto donde se pinta el HTML: ahora lo hace el propio `confirm-modal.js` (título, mensaje y botones) y cada plantilla que interpola texto de usuaria, no sus llamadores, para no duplicar el escapado. Se añadió al validador una regla que **rechaza la importación** si un identificador trae caracteres fuera de `[A-Za-z0-9._-]`, en vez de reescribir identificadores en silencio, con un mensaje que no repite el contenido del archivo. Cobertura: `tests/confirm-modal.test.js` (4 pruebas nuevas) y 2 pruebas más en `tests/validator.test.js`. En el navegador, con el texto hostil sembrado, 0 etiquetas inyectadas en 14 vistas, `<option>` escapados y el modal de borrado mostrando el texto literal. La ronda 2 de la auditoría de seguridad encontró dos casos más de la misma clase que el primer barrido no había visto: la reflexión general de la evaluación (`overallReflection`) y las reflexiones que se pintan dentro de `<textarea>` (el contenido de un `textarea` es RCDATA, así que un `</textarea>` en el texto lo cerraba y el resto se parseaba como HTML). También se deshizo un escape mal puesto: en un `alert()`, que pinta texto plano, escapar mostraba las entidades al usuario y no protegía de nada. |
| E16 | 17 | La exportación a `.ics` (`calendar.js`) escribe `SUMMARY:` y `DESCRIPTION:` con el nombre y las notas del evento sin sanear. Un salto de línea en el nombre rompería el formato del fichero e inyectaría propiedades nuevas en el calendario. No es XSS (la usuaria solo se vería afectada a sí misma), pero es una inyección de formato. | No se cambia: corregirlo exige definir el escapado de `\r`, `\n`, `,` y `;` en el formato ICS, con riesgo de romper la importación en Google Calendar, y queda fuera del alcance de la auditoría. Se anota para que Elena decida. |
| E17 | 17 | La ronda 2 de la auditoría de calidad señaló dos casos que la primera ronda había marcado como Menores, pero que son pérdida de datos y no detalles cosméticos. (1) El borrador del diario vive en una sola clave: al vaciar el texto de una entrada se borraba el borrador que hubiera de **otra** entrada. (2) El listener de `storage` descartaba el caso en que otra pestaña borra todos los datos: esta conservaba los suyos en memoria y los resucitaba en el siguiente guardado (residuo de G4). | Se corrigieron los dos, porque son exactamente los fallos que la auditoría buscaba (perder lo escrito y que una pestaña pise a otra). `clearDraft` acepta ahora un identificador opcional y solo borra el borrador de esa entrada; el listener de `storage` carga el estado vacío cuando otra pestaña borra la clave. Dos pruebas nuevas en `tests/journal-draft.test.js` y comprobación en el navegador con dos pestañas. |
| E18 | Todas | El plan termina cada tarea con un commit (17 pasos de commit en total). El encargo recibido lo prohíbe expresamente: nada de `git commit`, `git push`, `git merge`, `git stash`, `git checkout` ni cambio de rama. | No se hizo ningún commit. Todo el trabajo queda sin commitear en `master` y el diff se lee contra la base `8fc4cc2`. Por eso las 17 casillas de «Commit» quedan sin marcar: no se ejecutaron. |
| E19 | 17 | La ronda 2 de la auditoría quality señaló que el escapado de `project.color` se había corregido solo en cuatro de los diecinueve sitios donde se interpola, y la de seguridad añadió `area.icon` y `quarter`. Al barrer con un detector que también miraba dentro de las expresiones compuestas (`${area.icon \|\| 'spa'}`) apareció un caso que ninguna de las dos auditorías había nombrado: el icono del área se pintaba dentro de un `<foreignObject>` del SVG de la Rueda, y ese HTML sí se ejecuta. | Se escaparon los 19 sumideros de `project.color`, los de `area.icon` y `quarter`, y el del `foreignObject`. El detector se reforzó para mirar dentro de `${...}` con `\|\|`, `&&` y llamadas, que era el punto ciego. Comprobado en el navegador: con `color`, `icon` y `quarter` maliciosos, el `onerror` saltaba antes y ya no salta, y el color legítimo sigue aplicándose igual. |

---

## Anexo A. Hallazgos de la auditoría

Todos reproducidos en vivo el 13-nov-2026 sobre `dist/`, salvo indicación.

| Código | Hallazgo | Cómo se reproduce | Tarea |
|---|---|---|---|
| G1 | Los botones «Borrar» de Configuración no borran | «Borrar Productividad», confirmar. Tras la recarga, todo sigue | 2, 3 |
| G2 | Archivar el año se deshace y el cuaderno nuevo sale con el año equivocado | «Archivar…», confirmar. Tras la recarga vuelven las tareas | 2, 3 |
| G3 | Importar un archivo equivocado sustituye los datos sin preguntar y deja Valores sin poder guardar | Importar un JSON con `[1,2,3]` | 1, 4 |
| G4 | Con dos pestañas, la que se recarga pisa lo guardado por la otra | Tarea en la pestaña A, recargar la B | 2 |
| G5 | Si los datos guardados se corrompen, la app arranca vacía y los pisa sin avisar | Truncar el JSON guardado y abrir la app | 1, 5 |
| G6 | El calendario no cambia de semana y los eventos nuevos no aparecen | Pulsar la flecha de semana siguiente | 6 |
| G7 | Entre 901 y unos 1.725 px la cabecera no cabe y Ayuda y Configuración quedan fuera | Abrir la app a 1.366 px | 10 |
| I8 | «Saltar al contenido principal» lleva a una pantalla de error | Tabulador y Enter al cargar | 10 |
| I9 | Tareas, tarjetas de proyecto y eventos no reciben foco | Recorrer la Agenda con el tabulador | 6, 8, 9 |
| I10 | «Importante» y las notas se guardan pero no se ven. La captura con `!` guarda un valor distinto | Marcar una tarea como importante | 7, 8 |
| I11 | La revisión semanal y la captura con `>hoy` saltan los límites | Mover una idea al trimestre lleno desde la revisión | 7 |
| I12 | Un texto largo sin espacios desborda las tarjetas y deja botones fuera | Prioridad con una URL de 100 caracteres | 9, 14 |
| I13 | Salir del editor del diario pierde lo escrito | Escribir y pulsar «Inicio» | 11 |
| I14 | A 360 px el calendario mensual del hábito se corta | Abrir Hábitos con un hábito activo | 13 |
| I15 | Un evento con apóstrofo rompe su botón de Google Calendar | Evento «Cena de Ana's» | 6 |
| I16 | Contraste por debajo de 4,5:1 en varios textos | Script del Anexo B | 14 |
| I17 | Pasos 5 a 7 del asistente de hábitos sin tildes | Recorrer el asistente | 13 |
| I18 | La revisión semanal y el resumen del cuaderno cuentan 0 tareas completadas | Completar una tarea y abrir la revisión | 12 |
| M19 | Botones de solo icono y casillas sin nombre accesible | Script de la Tarea 9 | 6, 8, 9 |
| M20 | Conviven `confirm()` nativos y el modal propio | Eliminar una prioridad en Inicio | 3, 16 |
| M21 | La bienvenida reaparece si se cierra con Escape | Escape y recargar | 15 |
| M22 | La captura no avisa con `>semana`, `!` o `#` solos | Capturar `>semana` | 15 |
| M23 | Al borrar un proyecto, las tareas de Pendientes conservan el vínculo | Borrar un proyecto con una tarea | 7 |
| M24 | Zonas táctiles de menos de 44 px en móvil | Medir a 360 px | 14 |
| M25 | En móviles bajos el menú no se puede recorrer entero y Escape no lo cierra | Menú a 360 x 640 px | 10 |
| M26 | Valores admite nombres repetidos | Crear «Salud» dos veces | 15 |
| M27 | Dos `<main>` anidados y el menú no marca la página actual | `document.querySelectorAll('main').length` | 9 |

## Anexo B. Script de contraste

Devuelve los textos cuyo contraste con su fondo no llega a 4,5:1 (3:1 en texto grande). Ignora los fondos con degradado.

```js
(() => {
  const lum = c => { const a = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
  const parse = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(parseFloat); return { rgb: p.slice(0, 3), a: p.length > 3 ? p[3] : 1 }; };
  const bgOf = e => { let p = e; while (p) { const s = getComputedStyle(p); if (s.backgroundImage !== 'none') return { grad: true }; const c = parse(s.backgroundColor); if (c && c.a > 0.95) return { rgb: c.rgb }; p = p.parentElement; } return { rgb: [255, 255, 255] }; };
  const bad = {};
  for (const e of document.querySelectorAll('header *, .capture-banner *, #app-content *, footer *')) {
    if (e.children.length || !(e.innerText || '').trim()) continue;
    const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
    if (e.className.toString().includes('material-symbols')) continue;
    const s = getComputedStyle(e); const fg = parse(s.color); const bg = bgOf(e);
    if (!fg || bg.grad || fg.a < 0.95) continue;
    const L1 = lum(fg.rgb), L2 = lum(bg.rgb);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && parseInt(s.fontWeight) >= 700);
    if (ratio < (big ? 3 : 4.5)) {
      const k = (e.className.toString().split(' ')[0] || e.tagName) + ' ' + s.color + ' sobre ' + bg.rgb.join(',');
      if (!bad[k]) bad[k] = { ratio: Math.round(ratio * 100) / 100, ejemplo: e.innerText.trim().slice(0, 24) };
    }
  }
  return bad;
})()
```
