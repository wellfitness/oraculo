# Google Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar lectura de Google Calendar dentro de Oráculo para visualizar eventos externos (compromisos con otros) en la vista semanal, como capa de contexto sin escritura.

**Architecture:** Reutilizar la infraestructura OAuth ya existente de Google Drive (3 módulos `auth-*.js` para web/extension/capacitor) extendiéndola con scopes opcionales. Añadir un nuevo módulo `gcal-service.js` que consulta `events.list` de Google Calendar API por render. Sin persistencia en localStorage salvo settings. Render de eventos Google como "chips" visualmente diferenciados (borde punteado, color del calendario origen), click → abre Google Calendar.

**Tech Stack:** Vanilla JS ES6 modules, Google Calendar API v3, `calendar.readonly` scope, Google Identity Services (web), `chrome.identity` (extension), `@codetrix-studio/capacitor-google-auth` (Android). Sin librerías nuevas — solo fetch nativo.

**Spec de referencia:** [docs/superpowers/specs/2026-04-20-google-calendar-sync-design.md](../specs/2026-04-20-google-calendar-sync-design.md)

**Política de ramas:** Trabajar directamente en `master`. Cada task termina con un commit. Sin feature branches (preferencia usuaria).

**Testing:** Sin framework automático. Cada task incluye **verificaciones manuales concretas**: checks desde consola del navegador, inspección DOM, checklist de smoke test. La verificación es obligatoria antes del commit.

---

## File Structure

**Archivos nuevos:**

| Ruta | Responsabilidad |
|------|-----------------|
| `js/gcal/gcal-service.js` | API client: auth + `listUserCalendars()` + `getEventsInRange()` |
| `js/gcal/gcal-render.js` | Normaliza evento Google → shape Oráculo + HTML del chip |
| `js/gcal/gcal-settings.js` | UI del panel "Google Calendar" en Configuración |

**Archivos modificados:**

| Ruta | Cambio |
|------|--------|
| `js/gdrive/config.js` | Añadir `CALENDAR_SCOPE` |
| `js/gdrive/auth-web.js` | Aceptar parámetro `scopes` en `signIn()`/`getTokenSilent()` |
| `js/gdrive/auth-extension.js` | Igual: pasar `scopes` a `chrome.identity.getAuthToken` |
| `js/gdrive/auth-capacitor.js` | Ambos scopes siempre (limitación del plugin — scope fijo en `capacitor.config.ts`) |
| `capacitor.config.ts` | Añadir `calendar.readonly` a `GoogleAuth.scopes` |
| `js/modules/calendar.js` | Fetch async de eventos Google tras render, inyectar al DOM |
| `js/modules/settings.js` | Integrar la sección `gcal-settings` |
| `css/style.css` | Clases `.event--google`, `.gcal-chip-status`, panel settings |
| `app.html` / `dist/app.html` | Verificar que GIS se carga (ya está para Drive) |

**Archivos espejo:** Cada vez que se modifica algo en la raíz, al final se sincroniza a `dist/` y `dist-extension/` según el flujo del CLAUDE.md.

---

## Tanda 1 — Auth extendida con scopes

### Task 1: Añadir `CALENDAR_SCOPE` a config.js

**Files:**
- Modify: `js/gdrive/config.js`

- [ ] **Step 1: Criterio de aceptación**

El objeto `GDRIVE_CONFIG` exporta una nueva constante `CALENDAR_SCOPE` que apunta al scope de solo lectura de Google Calendar. No se renombra `SCOPE` (Drive) para no romper callsites.

- [ ] **Step 2: Modificar config.js**

Reemplazar el objeto entero por:

```js
export const GDRIVE_CONFIG = {
  // Scope minimo: solo carpeta oculta de la app
  SCOPE: 'https://www.googleapis.com/auth/drive.appdata',

  // Scope para lectura de Google Calendar
  CALENDAR_SCOPE: 'https://www.googleapis.com/auth/calendar.readonly',

  // Nombre del archivo en appDataFolder
  FILE_NAME: 'oraculo_data.json',

  // Client IDs por plataforma
  CLIENT_ID_WEB: '113523103085-jdtnfi537aa6contu7h5142h2mbchnqa.apps.googleusercontent.com',
  CLIENT_ID_CHROME: '113523103085-t0sj57s11kqo5r28r9e7s7b8llv1rttp.apps.googleusercontent.com',
  CLIENT_ID_ANDROID: '113523103085-kqqo1mg6im9docphob0jtj73t2hf14gc.apps.googleusercontent.com',

  // API endpoints
  API_BASE: 'https://www.googleapis.com',
  API_UPLOAD: 'https://www.googleapis.com/upload/drive/v3',
  API_FILES: 'https://www.googleapis.com/drive/v3/files',
  API_CALENDAR: 'https://www.googleapis.com/calendar/v3',

  // Sync settings
  DEBOUNCE_MS: 2000,
  SYNC_COOLDOWN_MS: 5000,
  POLL_INTERVAL_MS: 30000,
};
```

- [ ] **Step 3: Verificación**

En consola del navegador (tras cargar la app):
```js
const { GDRIVE_CONFIG } = await import('/js/gdrive/config.js');
console.log(GDRIVE_CONFIG.CALENDAR_SCOPE);
// Expected: "https://www.googleapis.com/auth/calendar.readonly"
console.log(GDRIVE_CONFIG.API_CALENDAR);
// Expected: "https://www.googleapis.com/calendar/v3"
```

- [ ] **Step 4: Commit**

```bash
git add js/gdrive/config.js
git commit -m "feat(gcal): añadir CALENDAR_SCOPE y API_CALENDAR a config OAuth"
```

---

### Task 2: Extender `auth-web.js` para aceptar scopes opcionales

**Files:**
- Modify: `js/gdrive/auth-web.js`

- [ ] **Step 1: Criterio de aceptación**

`signIn({ scopes })`, `getTokenSilent({ scopes })`, `refreshToken({ scopes })` y `signOut({ scopes })` aceptan un parámetro opcional que es un array de URLs de scope (espacio-separados al pasar a GIS). Sin parámetro, se comportan como antes (scope Drive). Se usan **claves de cache distintas** según el scope-set, de modo que el token de Drive y el de Calendar coexistan.

- [ ] **Step 2: Reescribir `auth-web.js`**

Reemplazar el fichero entero por:

```js
/**
 * Google Auth - Web App (Google Identity Services).
 * Acepta scopes opcionales para reutilizar con multiples APIs (Drive, Calendar).
 * Tokens de distinto scope-set se cachean por separado.
 */

import { GDRIVE_CONFIG } from './config.js';

const TOKEN_KEY_BASE = 'oraculo_gauth_token';
const TOKEN_EXPIRY_KEY_BASE = 'oraculo_gauth_token_expiry';

/**
 * Calcula las keys de localStorage segun el scope-set.
 * Legacy: si scopes == solo drive.appdata, usamos las keys antiguas
 * para no invalidar sesiones existentes.
 */
function cacheKeys(scopes) {
  const scopeList = normalizeScopes(scopes);
  const isDriveOnly = scopeList.length === 1 && scopeList[0] === GDRIVE_CONFIG.SCOPE;
  if (isDriveOnly) {
    return {
      token: 'oraculo_gdrive_token',
      expiry: 'oraculo_gdrive_token_expiry',
    };
  }
  const hash = scopeList.join(',').replace(/[^a-z0-9]+/gi, '_');
  return {
    token: `${TOKEN_KEY_BASE}_${hash}`,
    expiry: `${TOKEN_EXPIRY_KEY_BASE}_${hash}`,
  };
}

function normalizeScopes(scopes) {
  if (!scopes) return [GDRIVE_CONFIG.SCOPE];
  if (typeof scopes === 'string') return [scopes];
  return scopes;
}

export function signIn({ scopes } = {}) {
  return new Promise((resolve, reject) => {
    ensureGisLoaded();
    const scopeList = normalizeScopes(scopes);
    const keys = cacheKeys(scopeList);

    const client = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CONFIG.CLIENT_ID_WEB,
      scope: scopeList.join(' '),
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;
        localStorage.setItem(keys.token, token);
        localStorage.setItem(keys.expiry, String(Date.now() + expiresIn * 1000));
        const email = await fetchUserEmail(token);
        resolve({ token, email });
      },
      error_callback: (err) => {
        reject(new Error(err.message || 'Error en autenticacion'));
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}

export async function getTokenSilent({ scopes } = {}) {
  const keys = cacheKeys(scopes);
  const token = localStorage.getItem(keys.token);
  const expiry = parseInt(localStorage.getItem(keys.expiry) || '0', 10);
  if (token && Date.now() < expiry - 300000) {
    return token;
  }
  try {
    return await silentRefresh(scopes);
  } catch {
    return null;
  }
}

export async function refreshToken({ scopes } = {}) {
  const keys = cacheKeys(scopes);
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.expiry);
  try {
    return await silentRefresh(scopes);
  } catch {
    return null;
  }
}

export async function signOut({ scopes } = {}) {
  const keys = cacheKeys(scopes);
  const token = localStorage.getItem(keys.token);
  if (token) {
    try { google.accounts.oauth2.revoke(token); } catch { /* noop */ }
  }
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.expiry);
}

function silentRefresh(scopes) {
  return new Promise((resolve, reject) => {
    ensureGisLoaded();
    const scopeList = normalizeScopes(scopes);
    const keys = cacheKeys(scopeList);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CONFIG.CLIENT_ID_WEB,
      scope: scopeList.join(' '),
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;
        localStorage.setItem(keys.token, token);
        localStorage.setItem(keys.expiry, String(Date.now() + expiresIn * 1000));
        resolve(token);
      },
      error_callback: () => reject(new Error('Silent refresh failed')),
    });
    client.requestAccessToken({ prompt: '' });
  });
}

function ensureGisLoaded() {
  if (typeof google === 'undefined' || !google.accounts?.oauth2) {
    throw new Error('Google Identity Services no cargado.');
  }
}

async function fetchUserEmail(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const info = await res.json();
      return info.email || '';
    }
  } catch { /* no critico */ }
  return '';
}
```

- [ ] **Step 3: Verificación de retrocompatibilidad**

Abrir la app web, ir a Configuración → "Google Drive" → si estaba conectado antes, sigue aparentando estarlo (las keys legacy `oraculo_gdrive_token` se siguen usando cuando el scope es solo Drive). Si estaba desconectado, conectar y verificar que el push inicial funciona. **Si rompe Drive, no avanzar.**

Desde consola:
```js
const m = await import('/js/gdrive/auth-web.js');
const t = await m.getTokenSilent();   // sin args → scope Drive
console.log('Drive token:', !!t);
```

- [ ] **Step 4: Commit**

```bash
git add js/gdrive/auth-web.js
git commit -m "feat(gcal): auth-web.js acepta scopes opcionales con cache separado"
```

---

### Task 3: Extender `auth-extension.js`

**Files:**
- Modify: `js/gdrive/auth-extension.js`

- [ ] **Step 1: Criterio de aceptación**

Misma firma pública que `auth-web.js`: todas las funciones aceptan `{ scopes }` opcional. `chrome.identity.getAuthToken` recibe el array de scopes. Chrome gestiona la caché internamente según `(clientId, scopes)`, así que no necesitamos keys manuales — pero sí debemos llamar a `removeCachedAuthToken` con el mismo token que obtuvimos al desconectar.

- [ ] **Step 2: Reescribir `auth-extension.js`**

Reemplazar entero por:

```js
/**
 * Google Auth - Extension Chrome (chrome.identity).
 * Acepta scopes opcionales para multiples APIs. Chrome cachea por (clientId, scopes).
 */

import { GDRIVE_CONFIG } from './config.js';

function normalizeScopes(scopes) {
  if (!scopes) return [GDRIVE_CONFIG.SCOPE];
  if (typeof scopes === 'string') return [scopes];
  return scopes;
}

export async function signIn({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  const token = await getAuthToken(true, scopeList);
  const email = await fetchUserEmail(token);
  return { token, email };
}

export async function getTokenSilent({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  try {
    return await getAuthToken(false, scopeList);
  } catch {
    return null;
  }
}

export async function refreshToken({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  try {
    const old = await getAuthToken(false, scopeList);
    if (old) await removeCachedToken(old);
  } catch { /* ignore */ }
  try {
    return await getAuthToken(false, scopeList);
  } catch {
    return null;
  }
}

export async function signOut({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  try {
    const token = await getAuthToken(false, scopeList);
    if (token) {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
      await removeCachedToken(token);
    }
  } catch { /* ignore */ }
}

function getAuthToken(interactive, scopes) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive, scopes },
      (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error('No se obtuvo token'));
        } else {
          resolve(token);
        }
      }
    );
  });
}

function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
}

async function fetchUserEmail(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const info = await res.json();
      return info.email || '';
    }
  } catch { /* no critico */ }
  return '';
}
```

- [ ] **Step 3: Verificación en extensión Chrome**

Copiar `js/gdrive/auth-extension.js` a `dist-extension/js/gdrive/auth-extension.js`. Recargar la extensión en `chrome://extensions/`. Abrir side panel. Si estaba conectado Drive, sigue funcionando (pull/push). **Si rompe Drive en extensión, no avanzar.**

- [ ] **Step 4: Commit**

```bash
git add js/gdrive/auth-extension.js dist-extension/js/gdrive/auth-extension.js
git commit -m "feat(gcal): auth-extension.js acepta scopes opcionales"
```

---

### Task 4: Actualizar Capacitor para incluir ambos scopes

**Files:**
- Modify: `capacitor.config.ts`
- Modify: `js/gdrive/auth-capacitor.js`

- [ ] **Step 1: Criterio de aceptación**

`capacitor.config.ts` lista ambos scopes (drive.appdata y calendar.readonly) en la config del plugin `GoogleAuth`. El módulo `auth-capacitor.js` mantiene su API pública pero acepta y **ignora** el parámetro `{ scopes }` — en Android el token se emite siempre con ambos scopes concedidos durante el sign-in inicial. Documentar esta limitación como comentario en el archivo.

- [ ] **Step 2: Modificar `capacitor.config.ts`**

Buscar el bloque `GoogleAuth` y asegurar que `scopes` incluye ambos:

```ts
GoogleAuth: {
  scopes: [
    'https://www.googleapis.com/auth/drive.appdata',
    'https://www.googleapis.com/auth/calendar.readonly',
  ],
  serverClientId: '113523103085-jdtnfi537aa6contu7h5142h2mbchnqa.apps.googleusercontent.com',
  forceCodeForRefreshToken: false,
},
```

Si no existe el bloque, añadirlo dentro de `plugins`. Si ya está, añadir solo la segunda línea del array `scopes`.

- [ ] **Step 3: Modificar `auth-capacitor.js`** (solo firmas)

En cada función exportada, aceptar `{ scopes } = {}` e ignorarlo (con comentario). Ejemplo para `signIn`:

```js
/**
 * Sign-in interactivo.
 * NOTA: En Android el plugin GoogleAuth usa los scopes de capacitor.config.ts.
 * El parametro `scopes` se acepta por compatibilidad de firma pero se ignora.
 */
export async function signIn({ scopes } = {}) {  // scopes ignorado intencionalmente
  await ensureInitialized();
  const GoogleAuth = getPlugin();
  const user = await GoogleAuth.signIn();
  const refreshResult = await GoogleAuth.refresh();
  const token = refreshResult.accessToken;
  if (!token) throw new Error('No se obtuvo access token del sign-in nativo');
  cacheToken(token);
  return { token, email: user.email || '' };
}
```

Aplicar el mismo tratamiento a `getTokenSilent`, `signOut`. (No hay `refreshToken` exportado en este archivo — omitir.)

- [ ] **Step 4: Rebuild + verificación Android**

```bash
pnpm build       # si hay script; si no, copiar dist/ manualmente
npx cap sync android
```

Abrir proyecto en Android Studio → Run en dispositivo físico → Settings → Drive → Reconectar → verificar que el token obtenido incluye ambos scopes (opcional, desde logcat).

- [ ] **Step 5: Commit**

```bash
git add capacitor.config.ts js/gdrive/auth-capacitor.js
git commit -m "feat(gcal): añadir scope calendar.readonly en Android Capacitor"
```

---

### Task 5: Verificación de regresión completa de Drive

- [ ] **Step 1: Criterio de aceptación**

Después de los cambios en auth, Drive sync sigue funcionando exactamente igual en las 3 plataformas.

- [ ] **Step 2: Checklist manual**

- [ ] Web: conectar/desconectar Drive funciona; push inicial funciona; al recargar la app el token se sigue recuperando silencioso.
- [ ] Extensión: conectar/desconectar Drive; sync bidireccional funciona.
- [ ] Android: conectar Drive; push/pull funciona.

- [ ] **Step 3: Si hay regresión**

Revertir el commit problemático (`git revert <sha>`) y diagnosticar con systematic-debugging. No avanzar a la Tanda 2 hasta que Drive vuelva a funcionar 100%.

---

## Tanda 2 — Módulo `gcal-service.js`

### Task 6: Crear estructura de carpeta `js/gcal/`

**Files:**
- Create: `js/gcal/` (carpeta)
- Create: `js/gcal/gcal-service.js` (vacío con esqueleto)

- [ ] **Step 1: Criterio de aceptación**

Existe la carpeta `js/gcal/` con un archivo `gcal-service.js` que exporta las 3 funciones públicas como placeholders que lanzan error si se llaman. Este scaffolding permite importarlas sin romper, antes de implementarlas.

- [ ] **Step 2: Crear `js/gcal/gcal-service.js`**

```js
/**
 * Google Calendar Service - Cliente API para lectura de eventos.
 * Selecciona dinamicamente el modulo de auth segun plataforma.
 */

import { GDRIVE_CONFIG } from '../gdrive/config.js';

const SCOPES = { scopes: GDRIVE_CONFIG.CALENDAR_SCOPE };

// ───────────────────────────────────────────────
// API publica
// ───────────────────────────────────────────────

export async function connectCalendar() {
  throw new Error('connectCalendar: no implementado aun');
}

export async function listUserCalendars() {
  throw new Error('listUserCalendars: no implementado aun');
}

export async function getEventsInRange(_start, _end, _calendarIds) {
  throw new Error('getEventsInRange: no implementado aun');
}

export async function disconnectCalendar() {
  throw new Error('disconnectCalendar: no implementado aun');
}

// ───────────────────────────────────────────────
// Helpers internos (a implementar en tasks siguientes)
// ───────────────────────────────────────────────

async function getAuthModule() {
  // En extension Chrome
  if (typeof chrome !== 'undefined' && chrome.identity?.getAuthToken) {
    return await import('../gdrive/auth-extension.js');
  }
  // En Capacitor nativo (Android)
  if (window.Capacitor?.isNativePlatform?.()) {
    return await import('../gdrive/auth-capacitor.js');
  }
  // Web por defecto
  return await import('../gdrive/auth-web.js');
}
```

- [ ] **Step 3: Verificación**

```js
const s = await import('/js/gcal/gcal-service.js');
try { await s.connectCalendar(); } catch (e) { console.log('OK:', e.message); }
// Expected: "OK: connectCalendar: no implementado aun"
```

- [ ] **Step 4: Commit**

```bash
git add js/gcal/gcal-service.js
git commit -m "feat(gcal): scaffold gcal-service con selector de plataforma"
```

---

### Task 7: Implementar `connectCalendar()` y `disconnectCalendar()`

**Files:**
- Modify: `js/gcal/gcal-service.js`

- [ ] **Step 1: Criterio de aceptación**

`connectCalendar()` dispara el flujo interactivo OAuth con scope Calendar, devuelve `{ email }` o lanza error si el usuario cancela.
`disconnectCalendar()` revoca el token Calendar sin afectar a Drive.

- [ ] **Step 2: Reemplazar los placeholders**

Dentro de `gcal-service.js`, sustituir los dos placeholders correspondientes:

```js
export async function connectCalendar() {
  const auth = await getAuthModule();
  const result = await auth.signIn(SCOPES);
  return { email: result.email };
}

export async function disconnectCalendar() {
  const auth = await getAuthModule();
  await auth.signOut(SCOPES);
}
```

- [ ] **Step 3: Verificación en web**

Con la app servida en localhost:8000:

```js
const s = await import('/js/gcal/gcal-service.js');
const r = await s.connectCalendar();
console.log(r);  // Expected: { email: "tuemail@gmail.com" }
// Verificar en Application → Local Storage → aparece una nueva key
// oraculo_gauth_token_... con un hash de calendar scope
```

Luego desconectar:

```js
await s.disconnectCalendar();
// Expected: la key anterior desaparece
```

- [ ] **Step 4: Commit**

```bash
git add js/gcal/gcal-service.js
git commit -m "feat(gcal): connect / disconnect Calendar con scope independiente"
```

---

### Task 8: Implementar `listUserCalendars()`

**Files:**
- Modify: `js/gcal/gcal-service.js`

- [ ] **Step 1: Criterio de aceptación**

`listUserCalendars()` devuelve un array de calendarios accesibles al usuario con shape `{ id, summary, backgroundColor, primary, accessRole, selected }`. Si no hay token, intenta `getTokenSilent` una sola vez; si sigue sin haberlo, lanza `NOT_AUTHENTICATED`.

- [ ] **Step 2: Añadir helper `_fetchWithAuth`**

Dentro de `gcal-service.js`, antes de las funciones públicas, añadir:

```js
async function _fetchWithAuth(url) {
  const auth = await getAuthModule();
  let token = await auth.getTokenSilent(SCOPES);
  if (!token) {
    const err = new Error('NOT_AUTHENTICATED');
    err.code = 'NOT_AUTHENTICATED';
    throw err;
  }
  let res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
  });
  // Un retry con refresh si 401
  if (res.status === 401) {
    token = await auth.refreshToken?.(SCOPES) || await auth.getTokenSilent(SCOPES);
    if (!token) {
      const err = new Error('NOT_AUTHENTICATED');
      err.code = 'NOT_AUTHENTICATED';
      throw err;
    }
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' },
    });
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    err.code = res.status === 429 ? 'RATE_LIMIT' : res.status === 403 ? 'FORBIDDEN' : 'API_ERROR';
    throw err;
  }
  return res.json();
}
```

- [ ] **Step 3: Reemplazar el placeholder de `listUserCalendars`**

```js
export async function listUserCalendars() {
  const url = `${GDRIVE_CONFIG.API_CALENDAR}/users/me/calendarList?minAccessRole=reader`;
  const data = await _fetchWithAuth(url);
  return (data.items || []).map(c => ({
    id: c.id,
    summary: c.summaryOverride || c.summary || c.id,
    backgroundColor: c.backgroundColor || '#4285F4',
    primary: !!c.primary,
    accessRole: c.accessRole,
    selected: !!c.selected,
  }));
}
```

- [ ] **Step 4: Verificación desde consola**

(Previamente haber hecho `connectCalendar()`.)

```js
const s = await import('/js/gcal/gcal-service.js');
const cals = await s.listUserCalendars();
console.table(cals);
// Expected: tabla con tus calendarios (Personal, Trabajo, etc.),
// al menos uno con primary=true
```

- [ ] **Step 5: Commit**

```bash
git add js/gcal/gcal-service.js
git commit -m "feat(gcal): listUserCalendars() usando API calendarList"
```

---

### Task 9: Implementar `getEventsInRange()`

**Files:**
- Modify: `js/gcal/gcal-service.js`

- [ ] **Step 1: Criterio de aceptación**

`getEventsInRange(startISO, endISO, calendarIds)` recibe dos timestamps ISO y un array de calendar IDs habilitados. Devuelve array plano de eventos ya **normalizados** con la shape del spec, fusionados de todos los calendarios y ordenados por fecha/hora. Si `calendarIds` está vacío, devuelve `[]` sin llamar a la API.

- [ ] **Step 2: Añadir import de normalizador (aún no existe, crear inline fallback)**

Por ahora, implementar la normalización dentro de `gcal-service.js`. En la Task 12 la extraeremos a `gcal-render.js`.

- [ ] **Step 3: Reemplazar el placeholder de `getEventsInRange`**

```js
export async function getEventsInRange(startISO, endISO, calendarIds) {
  if (!Array.isArray(calendarIds) || calendarIds.length === 0) return [];

  // Metadatos de calendarios para pintar color / nombre por evento
  const calsIndex = await _indexCalendarsById();

  // Fetch en paralelo por cada calendar habilitado
  const perCalendar = await Promise.all(
    calendarIds.map(async (calId) => {
      try {
        const url = `${GDRIVE_CONFIG.API_CALENDAR}/calendars/${encodeURIComponent(calId)}/events`
          + `?timeMin=${encodeURIComponent(startISO)}`
          + `&timeMax=${encodeURIComponent(endISO)}`
          + `&singleEvents=true&orderBy=startTime&maxResults=100`;
        const data = await _fetchWithAuth(url);
        const meta = calsIndex[calId] || { summary: calId, backgroundColor: '#4285F4' };
        return (data.items || []).map(ev => _normalizeEvent(ev, meta));
      } catch (err) {
        console.warn(`[gcal] error en calendario ${calId}:`, err.code || err.message);
        return [];  // Un calendario caido no tira los demas
      }
    })
  );

  // Flatten + orden global por inicio
  const flat = perCalendar.flat();
  flat.sort((a, b) => {
    const aKey = `${a.date} ${a.startTime || '99:99'}`;
    const bKey = `${b.date} ${b.startTime || '99:99'}`;
    return aKey.localeCompare(bKey);
  });
  return flat;
}

async function _indexCalendarsById() {
  try {
    const cals = await listUserCalendars();
    return Object.fromEntries(cals.map(c => [c.id, c]));
  } catch {
    return {};
  }
}

function _normalizeEvent(ev, calMeta) {
  // Evento "todo el dia": start.date. Evento con hora: start.dateTime.
  const allDay = !!ev.start?.date && !ev.start?.dateTime;
  let date, startTime = null, duration = null;

  if (allDay) {
    date = ev.start.date;  // YYYY-MM-DD
  } else {
    const startDT = new Date(ev.start.dateTime);
    const endDT = new Date(ev.end?.dateTime || ev.start.dateTime);
    date = startDT.toLocaleDateString('en-CA');  // local YYYY-MM-DD
    startTime = startDT.toTimeString().slice(0, 5);  // HH:mm local
    duration = Math.max(1, Math.round((endDT - startDT) / 60000));
  }

  return {
    id: `gcal_${ev.id}`,
    source: 'google',
    calendarId: calMeta.id,
    calendarName: calMeta.summary,
    calendarColor: calMeta.backgroundColor,
    name: ev.summary || '(sin titulo)',
    date,
    startTime,
    duration,
    allDay,
    location: ev.location || '',
    notes: ev.description || '',
    htmlLink: ev.htmlLink,
    readOnly: true,
  };
}
```

- [ ] **Step 4: Verificación desde consola**

```js
const s = await import('/js/gcal/gcal-service.js');
const cals = await s.listUserCalendars();
const primary = cals.find(c => c.primary).id;
const now = new Date();
const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
const events = await s.getEventsInRange(weekStart.toISOString(), weekEnd.toISOString(), [primary]);
console.table(events);
// Expected: eventos de la semana actual con shape normalizada,
// date en formato YYYY-MM-DD, startTime en HH:mm (o null si allDay)
```

- [ ] **Step 5: Commit**

```bash
git add js/gcal/gcal-service.js
git commit -m "feat(gcal): getEventsInRange() con normalizacion de eventos"
```

---

## Tanda 3 — UI en Configuración

### Task 10: Añadir bloque `settings.gcal` al shape de datos

**Files:**
- Modify: `js/storage-hybrid.js`
- Modify: `js/storage-local.js`
- Modify: `js/storage.js`

- [ ] **Step 1: Criterio de aceptación**

Cuando una instalación nueva o existente abre la app, el objeto en `localStorage` incluye un subobjeto `settings.gcal` con defaults. Si ya existía data previa sin `gcal`, el "migrator" lo añade sin borrar nada. Las 3 copias de storage se mantienen idénticas.

- [ ] **Step 2: Identificar el migrator**

Abrir `js/storage-hybrid.js` y localizar la función de inicialización del shape (típicamente una constante `DEFAULT_DATA` o `getInitialData`). Localizar también el merger que añade campos faltantes al cargar data existente.

- [ ] **Step 3: Añadir defaults**

Dentro de `settings: { ... }`, añadir:

```js
gcal: {
  enabled: false,
  account: null,
  enabledCalendars: [],
  lastSyncAt: null,
  lastSyncError: null,
},
```

En el migrator (o donde se hace el merge), asegurar que si `data.settings.gcal` es undefined, se inyecte el bloque completo con esos defaults.

- [ ] **Step 4: Replicar en las 3 storage**

Hacer el mismo cambio en `js/storage-local.js` y `js/storage.js`. Mantienen el mismo shape.

- [ ] **Step 5: Verificación**

```js
const data = JSON.parse(localStorage.getItem('oraculoData'));
console.log(data.settings.gcal);
// Expected: { enabled: false, account: null, enabledCalendars: [], lastSyncAt: null, lastSyncError: null }
```

(Si muestra `undefined`, el migrator no aplicó — revisar y recargar.)

- [ ] **Step 6: Commit**

```bash
git add js/storage-hybrid.js js/storage-local.js js/storage.js
git commit -m "feat(gcal): settings.gcal en el shape de datos con migracion"
```

---

### Task 11: Crear `gcal-settings.js` — render del panel

**Files:**
- Create: `js/gcal/gcal-settings.js`

- [ ] **Step 1: Criterio de aceptación**

Función `render(data)` devuelve HTML del bloque "Google Calendar" para inyectar dentro de la página Configuración. Dos estados:
1. No conectado → card con descripción y botón `[Conectar Google Calendar]`.
2. Conectado → card con email, lista de checkboxes de calendarios, botón `[Desconectar]`.

La segunda lista se rellena async tras el render (marca "Cargando..." inicialmente). El módulo expone también `init(data, updateData)` que vincula los listeners.

- [ ] **Step 2: Crear `js/gcal/gcal-settings.js`**

```js
/**
 * UI de la seccion "Google Calendar" en Configuracion.
 */

import { escapeHTML } from '../utils/sanitizer.js';
import * as gcalService from './gcal-service.js';

let _updateData = null;
let _currentData = null;

export function render(data) {
  _currentData = data;
  const cfg = data.settings?.gcal || { enabled: false };

  if (!cfg.enabled) {
    return `
      <div class="settings-card" id="gcal-settings-card">
        <h3 class="settings-card__title">
          <span class="material-symbols-outlined">calendar_month</span>
          Google Calendar
        </h3>
        <p class="settings-card__description">
          Visualiza tus citas de Google en Oráculo para evitar planificar tareas
          cuando ya tienes algo con otros.
        </p>
        <button class="btn btn--primary" id="gcal-connect-btn">
          Conectar Google Calendar
        </button>
      </div>
    `;
  }

  return `
    <div class="settings-card" id="gcal-settings-card">
      <h3 class="settings-card__title">
        <span class="material-symbols-outlined">calendar_month</span>
        Google Calendar
        <span class="settings-card__badge settings-card__badge--ok">
          Conectado como ${escapeHTML(cfg.account || '…')}
        </span>
      </h3>
      <p class="settings-card__label">Calendarios a mostrar:</p>
      <div class="gcal-calendar-list" id="gcal-calendar-list">
        <p class="text-muted">Cargando calendarios…</p>
      </div>
      <button class="btn btn--danger-outline" id="gcal-disconnect-btn">
        Desconectar
      </button>
    </div>
  `;
}

export function init(data, updateData) {
  _updateData = updateData;
  _currentData = data;

  document.getElementById('gcal-connect-btn')?.addEventListener('click', onConnect);
  document.getElementById('gcal-disconnect-btn')?.addEventListener('click', onDisconnect);

  // Si esta conectado, cargar lista de calendarios
  if (data.settings?.gcal?.enabled) {
    loadCalendarList();
  }
}

async function onConnect() {
  const btn = document.getElementById('gcal-connect-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Conectando…'; }
  try {
    const { email } = await gcalService.connectCalendar();
    const data = _currentData;
    data.settings.gcal.enabled = true;
    data.settings.gcal.account = email;
    data.settings.gcal.enabledCalendars = [];
    await _updateData(data);
    reRenderPanel();
  } catch (err) {
    alert(`No se pudo conectar: ${err.message || err}`);
    if (btn) { btn.disabled = false; btn.textContent = 'Conectar Google Calendar'; }
  }
}

async function onDisconnect() {
  if (!confirm('¿Seguro que quieres desconectar Google Calendar?')) return;
  try {
    await gcalService.disconnectCalendar();
  } catch { /* mejor esfuerzo */ }
  const data = _currentData;
  data.settings.gcal = { enabled: false, account: null, enabledCalendars: [], lastSyncAt: null, lastSyncError: null };
  await _updateData(data);
  reRenderPanel();
}

async function loadCalendarList() {
  const container = document.getElementById('gcal-calendar-list');
  if (!container) return;
  try {
    const cals = await gcalService.listUserCalendars();
    const enabled = new Set(_currentData.settings?.gcal?.enabledCalendars || []);
    container.innerHTML = cals.map(c => `
      <label class="gcal-checkbox-row">
        <input type="checkbox" class="gcal-cal-toggle"
               data-cal-id="${escapeHTML(c.id)}"
               ${enabled.has(c.id) ? 'checked' : ''}>
        <span class="gcal-checkbox-dot" style="background: ${escapeHTML(c.backgroundColor)}"></span>
        <span class="gcal-checkbox-label">${escapeHTML(c.summary)}</span>
        ${c.primary ? '<span class="gcal-checkbox-primary">primario</span>' : ''}
      </label>
    `).join('');

    container.querySelectorAll('.gcal-cal-toggle').forEach(input => {
      input.addEventListener('change', onToggleCalendar);
    });
  } catch (err) {
    container.innerHTML = `<p class="text-error">Error cargando calendarios: ${escapeHTML(err.message || String(err))}</p>`;
  }
}

async function onToggleCalendar(e) {
  const calId = e.target.dataset.calId;
  const data = _currentData;
  const set = new Set(data.settings.gcal.enabledCalendars);
  if (e.target.checked) set.add(calId); else set.delete(calId);
  data.settings.gcal.enabledCalendars = Array.from(set);
  await _updateData(data);
}

function reRenderPanel() {
  const card = document.getElementById('gcal-settings-card');
  if (!card) return;
  card.outerHTML = render(_currentData);
  init(_currentData, _updateData);
}
```

- [ ] **Step 3: Integrar en `js/modules/settings.js`**

Localizar dentro de `settings.js` el método `render(data)` y añadir `import * as gcalSettings from '../gcal/gcal-settings.js';` al inicio. Luego, en el HTML de settings, insertar `${gcalSettings.render(data)}` en el lugar donde se vea el bloque de Google Drive (idealmente justo debajo). En la función `init` del settings, añadir `gcalSettings.init(data, updateData);` al final.

- [ ] **Step 4: Verificación en web**

Ir a Configuración → aparece el bloque "Google Calendar" sin conectar. Click "Conectar" → popup Google → conceder → bloque cambia a estado conectado, aparece email y lista "Cargando calendarios…" que se rellena con checkboxes. Marcar/desmarcar funciona. Click "Desconectar" → vuelve al estado inicial.

- [ ] **Step 5: Commit**

```bash
git add js/gcal/gcal-settings.js js/modules/settings.js
git commit -m "feat(gcal): panel de Configuracion para conectar/gestionar Calendar"
```

---

### Task 12: Estilos CSS para panel settings + checkboxes

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Criterio de aceptación**

Los selectores del panel tienen estilos coherentes con el resto de settings (card similar a la de Google Drive). Los checkboxes muestran un círculo del color del calendario.

- [ ] **Step 2: Añadir al final de `css/style.css`**

```css
/* ─── Google Calendar Settings ────────────────── */

.gcal-calendar-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: var(--space-2) 0;
  max-height: 240px;
  overflow-y: auto;
  padding: var(--space-1) 0;
}

.gcal-checkbox-row {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.12s ease;
}

.gcal-checkbox-row:hover {
  background: var(--color-surface-2);
}

.gcal-checkbox-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.gcal-checkbox-label {
  flex: 1;
  color: var(--color-text);
}

.gcal-checkbox-primary {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.settings-card__badge--ok {
  background: var(--color-success-bg, #d1fae5);
  color: var(--color-success-text, #065f46);
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  margin-left: var(--space-1);
}
```

- [ ] **Step 3: Verificación**

Recargar la app, ir a Configuración. El bloque de Calendar se ve similar al de Drive. Los checkboxes tienen puntos de color a la izquierda. El badge "Conectado como..." aparece a la derecha del título cuando está conectado.

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "feat(gcal): estilos panel settings y checkboxes de calendarios"
```

---

## Tanda 4 — Render en `calendar.js`

### Task 13: Crear `gcal-render.js` con helper de HTML del chip

**Files:**
- Create: `js/gcal/gcal-render.js`

- [ ] **Step 1: Criterio de aceptación**

Módulo exporta `renderGcalEventItem(event)` que devuelve el HTML de un evento Google tipado como chip diferenciado. El shape del evento esperado es el que produce `gcal-service._normalizeEvent` (ver Task 9).

- [ ] **Step 2: Crear `js/gcal/gcal-render.js`**

```js
/**
 * Render de eventos Google en la vista calendario de Oraculo.
 */

import { escapeHTML } from '../utils/sanitizer.js';

export function renderGcalEventItem(event) {
  const timeLabel = event.allDay ? 'Todo el día' : (event.startTime || '');
  return `
    <div class="event-item event--google"
         data-id="${escapeHTML(event.id)}"
         data-htmllink="${escapeHTML(event.htmlLink || '')}"
         style="--gcal-color: ${escapeHTML(event.calendarColor)}"
         title="${escapeHTML(event.calendarName)} — click abre Google Calendar">
      <div class="event-item__content">
        <span class="material-symbols-outlined event--google__source" aria-hidden="true">calendar_month</span>
        ${timeLabel ? `<span class="event-time">${escapeHTML(timeLabel)}</span>` : ''}
        <span class="event-name">${escapeHTML(event.name)}</span>
      </div>
      <span class="event--google__calname">${escapeHTML(event.calendarName)}</span>
    </div>
  `;
}

/**
 * Agrupa eventos Google por fecha (YYYY-MM-DD).
 * Devuelve Map<dateStr, Array<event>>
 */
export function groupByDate(events) {
  const map = new Map();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  }
  return map;
}
```

- [ ] **Step 3: Verificación**

```js
const r = await import('/js/gcal/gcal-render.js');
console.log(r.renderGcalEventItem({
  id: 'gcal_abc', calendarName: 'Trabajo', calendarColor: '#4285F4',
  name: 'Reunión', date: '2026-04-22', startTime: '10:00', allDay: false,
  htmlLink: 'https://calendar.google.com/x'
}));
// Expected: string HTML con las clases correctas
```

- [ ] **Step 4: Commit**

```bash
git add js/gcal/gcal-render.js
git commit -m "feat(gcal): helper renderGcalEventItem"
```

---

### Task 14: Integrar fetch de Google en `calendar.js`

**Files:**
- Modify: `js/modules/calendar.js`

- [ ] **Step 1: Criterio de aceptación**

Cuando se carga la vista calendario, tras el render sincrónico se dispara un fetch async de eventos Google para el rango de la semana visible. Al terminar, se inyectan los chips en cada `.day-events` correspondiente sin re-renderizar toda la vista. Si el usuario navega de semana antes de que termine el fetch, el resultado tardío se descarta.

- [ ] **Step 2: Añadir import y state al top de `calendar.js`**

Después del import existente `import { getReflexionDelDia } from '../data/burkeman.js';`, añadir:

```js
import * as gcalService from '../gcal/gcal-service.js';
import { renderGcalEventItem, groupByDate } from '../gcal/gcal-render.js';

let _gcalFetchToken = 0;  // contador para descartar fetches obsoletos
```

- [ ] **Step 3: Añadir función `loadGcalEventsForVisibleWeek`**

Pegar al final de `calendar.js` (antes del último `export` si lo hay):

```js
async function loadGcalEventsForVisibleWeek() {
  const data = currentData;
  const cfg = data?.settings?.gcal;
  if (!cfg?.enabled || !cfg.enabledCalendars?.length) return;

  const myToken = ++_gcalFetchToken;

  // Rango: lunes 00:00 a domingo 23:59 de la semana visible
  const start = new Date(currentWeekStart);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  try {
    const events = await gcalService.getEventsInRange(
      start.toISOString(), end.toISOString(), cfg.enabledCalendars
    );
    if (myToken !== _gcalFetchToken) return;  // hubo navegacion, descartar
    _injectGcalEvents(events);
    _updateChipStatus('ok', new Date());
  } catch (err) {
    if (myToken !== _gcalFetchToken) return;
    console.warn('[gcal] fetch failed', err);
    _updateChipStatus('error', null, err);
  }
}

function _injectGcalEvents(events) {
  const byDate = groupByDate(events);
  document.querySelectorAll('.day-column').forEach(col => {
    const dateStr = col.dataset.date;
    const container = col.querySelector('.day-events');
    if (!container) return;
    // Limpiar inyecciones previas (por si hay reintento)
    container.querySelectorAll('.event--google').forEach(el => el.remove());
    const list = byDate.get(dateStr) || [];
    for (const ev of list) {
      container.insertAdjacentHTML('beforeend', renderGcalEventItem(ev));
    }
  });
  _bindGcalClicks();
}

function _bindGcalClicks() {
  document.querySelectorAll('.event--google').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const href = el.dataset.htmllink;
      if (href) window.open(href, '_blank', 'noopener');
    });
  });
}

function _updateChipStatus(state, at, err) {
  const chip = document.getElementById('gcal-chip-status');
  if (!chip) return;
  chip.classList.remove('gcal-chip-status--ok', 'gcal-chip-status--error', 'gcal-chip-status--loading');
  if (state === 'ok') {
    chip.classList.add('gcal-chip-status--ok');
    chip.innerHTML = `<span class="material-symbols-outlined icon-xs">sync</span> Sincronizado`;
  } else if (state === 'error') {
    chip.classList.add('gcal-chip-status--error');
    chip.innerHTML = `<span class="material-symbols-outlined icon-xs">sync_problem</span> Error <button class="btn btn--link" id="gcal-retry-btn">Reintentar</button>`;
    document.getElementById('gcal-retry-btn')?.addEventListener('click', () => {
      _updateChipStatus('loading');
      loadGcalEventsForVisibleWeek();
    });
  } else if (state === 'loading') {
    chip.classList.add('gcal-chip-status--loading');
    chip.innerHTML = `<span class="material-symbols-outlined icon-xs">sync</span> Sincronizando…`;
  }
}
```

- [ ] **Step 4: Insertar chip en el HTML de render y disparar fetch**

En el `render()` de calendar.js, dentro del bloque `.calendar-actions`, añadir justo antes del `</div>` de cierre de `calendar-actions`:

```html
<span class="gcal-chip-status" id="gcal-chip-status" hidden></span>
```

Luego hacerlo visible en init si gcal está enabled. Al final de la función `init`, añadir:

```js
if (data.settings?.gcal?.enabled && data.settings?.gcal?.enabledCalendars?.length) {
  document.getElementById('gcal-chip-status')?.removeAttribute('hidden');
  _updateChipStatus('loading');
  loadGcalEventsForVisibleWeek();
}
```

Y en los handlers de `prev-week`, `next-week`, `today-btn`, después de `reRender()`, añadir:

```js
if (data.settings?.gcal?.enabled && data.settings?.gcal?.enabledCalendars?.length) {
  _updateChipStatus('loading');
  loadGcalEventsForVisibleWeek();
}
```

- [ ] **Step 5: Verificación**

Conectar Calendar en Settings, marcar el calendario primario, crear un evento de prueba en Google Calendar para hoy (ej. "Prueba 15:00"). Ir a la vista Calendario en Oráculo. Debe aparecer el chip "Sincronizado" y el evento con borde punteado en su día. Click en el evento abre pestaña nueva con Google Calendar.

Navegar a la semana siguiente: nueva petición, chip muestra "Sincronizando…" luego "Sincronizado". Si no hay eventos en esa semana, solo se ven los de Oráculo.

- [ ] **Step 6: Commit**

```bash
git add js/modules/calendar.js
git commit -m "feat(gcal): cargar e inyectar eventos Google en vista semanal"
```

---

### Task 15: Estilos CSS para eventos Google y chip

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Criterio de aceptación**

Los `.event--google` se distinguen de los eventos Oráculo: borde punteado, opacidad reducida, franja lateral del color del calendario origen, icono calendar_month en la esquina, nombre del calendario abajo en texto tenue. El chip de estado se ve en la cabecera del calendario.

- [ ] **Step 2: Añadir al final de `css/style.css`**

```css
/* ─── Google Calendar — Eventos ───────────────── */

.event--google {
  border: 1px dashed var(--gcal-color, #4285F4) !important;
  background: color-mix(in srgb, var(--gcal-color, #4285F4) 8%, transparent);
  opacity: 0.88;
  position: relative;
  padding-left: calc(var(--space-1) + 4px);
  cursor: pointer;
}

.event--google::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--gcal-color, #4285F4);
  border-radius: 2px 0 0 2px;
}

.event--google__source {
  font-size: 14px !important;
  color: var(--gcal-color, #4285F4);
  opacity: 0.9;
}

.event--google__calname {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  font-style: italic;
}

.event--google:hover {
  opacity: 1;
}

/* ─── Chip de estado en cabecera ──────────────── */

.gcal-chip-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: var(--space-1);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  background: var(--color-surface-2);
  color: var(--color-text-muted);
}

.gcal-chip-status--ok { color: var(--color-success-text, #065f46); }
.gcal-chip-status--error { color: var(--color-danger-text, #991b1b); }
.gcal-chip-status--loading { color: var(--color-text-muted); }

.gcal-chip-status .btn--link {
  background: none;
  border: none;
  color: inherit;
  text-decoration: underline;
  cursor: pointer;
  padding: 0 2px;
  font: inherit;
}
```

- [ ] **Step 3: Verificación visual**

Recargar la app, ir a Calendario. Los eventos de Google se distinguen a simple vista de los de Oráculo. Probar en móvil (DevTools device mode) que siguen legibles.

- [ ] **Step 4: Commit**

```bash
git add css/style.css
git commit -m "feat(gcal): estilos para chips de eventos Google y chip de estado"
```

---

## Tanda 5 — Pulido, sincronización y rollout

### Task 16: Verificar `host_permissions` en manifest de extensión

**Files:**
- Modify (si hace falta): `extension/manifest.json`

- [ ] **Step 1: Criterio de aceptación**

`extension/manifest.json` contiene `"https://www.googleapis.com/*"` en `host_permissions`. Si ya está (debería, por Drive), no se toca. Si falta, se añade.

- [ ] **Step 2: Leer y comparar**

Abrir `extension/manifest.json`. Localizar `host_permissions`. Verificar que incluye la URL. Si ya está: saltar al Step 4. Si no: añadirla.

- [ ] **Step 3: Añadir si falta**

```json
"host_permissions": [
  "https://www.googleapis.com/*",
  "https://accounts.google.com/*"
]
```

- [ ] **Step 4: Commit (solo si hubo cambio)**

```bash
git add extension/manifest.json
git commit -m "chore(gcal): verificar host_permissions de googleapis en extension"
```

---

### Task 17: Sincronizar a `dist/` y `dist-extension/`

- [ ] **Step 1: Criterio de aceptación**

Todo lo modificado/creado en raíz queda replicado en `dist/` y `dist-extension/`, siguiendo el flujo documentado en CLAUDE.md.

- [ ] **Step 2: Copiar archivos nuevos y modificados**

```bash
# Archivos nuevos
mkdir -p dist/js/gcal dist-extension/js/gcal
cp js/gcal/*.js dist/js/gcal/
cp js/gcal/*.js dist-extension/js/gcal/

# Archivos modificados
cp js/gdrive/config.js dist/js/gdrive/
cp js/gdrive/config.js dist-extension/js/gdrive/
cp js/gdrive/auth-web.js dist/js/gdrive/
cp js/gdrive/auth-web.js dist-extension/js/gdrive/
cp js/gdrive/auth-extension.js dist/js/gdrive/
cp js/gdrive/auth-extension.js dist-extension/js/gdrive/
cp js/gdrive/auth-capacitor.js dist/js/gdrive/
cp js/gdrive/auth-capacitor.js dist-extension/js/gdrive/
cp js/storage-hybrid.js dist/js/
cp js/storage-hybrid.js dist-extension/js/
cp js/storage-local.js dist/js/
cp js/storage-local.js dist-extension/js/
cp js/storage.js dist/js/
cp js/storage.js dist-extension/js/
cp js/modules/calendar.js dist/js/modules/
cp js/modules/calendar.js dist-extension/js/modules/
cp js/modules/settings.js dist/js/modules/
cp js/modules/settings.js dist-extension/js/modules/
cp css/style.css dist/css/
cp css/style.css dist-extension/css/
```

- [ ] **Step 3: Rebuild extension (incluye ZIP)**

```bash
node build-extension.mjs
```

- [ ] **Step 4: Verificación**

```bash
git status
# Expected: archivos en dist/ y dist-extension/ modificados, oraculo-extension.zip actualizado
```

Cargar la extensión en `chrome://extensions` (recargar) y repetir el smoke test en side panel.

- [ ] **Step 5: Commit**

```bash
git add dist/ dist-extension/
git commit -m "chore(gcal): sincronizar dist/ y dist-extension/ con raiz"
```

---

### Task 18: Bump de versión + rebuild Android AAB

**Files:**
- Modify: `manifest.json`
- Modify: `dist/manifest.json`
- Modify: `android/app/build.gradle`
- Modify: `extension/manifest.json` y `dist-extension/manifest.json`

- [ ] **Step 1: Criterio de aceptación**

Versión bumpeada de `2.2.0` a `2.3.0` en todos los lugares, `versionCode` Android a 8 (siguiente incremento). AAB generado y disponible para upload a Play Console (pero NO subido hasta validación manual del usuario).

- [ ] **Step 2: Bumps**

- `manifest.json`: `"version": "2.3.0"` (PWA)
- `dist/manifest.json`: idem
- `extension/manifest.json`: `"version": "2.3.0"`
- `dist-extension/manifest.json`: idem
- `android/app/build.gradle`: `versionCode 8`, `versionName "2.3.0"`

- [ ] **Step 3: Rebuild AAB**

```bash
npx cap sync android
cd android
./gradlew bundleRelease
```

(Si falla el build, diagnosticar antes de continuar.)

- [ ] **Step 4: Commit**

```bash
git add manifest.json dist/manifest.json extension/manifest.json dist-extension/manifest.json android/app/build.gradle
git commit -m "chore: bump 2.2.0 → 2.3.0 tras integrar Google Calendar sync"
```

---

### Task 19: Checklist de testing manual final

- [ ] **Step 1: Criterio de aceptación**

Todos los items del checklist del spec pasan en las 3 plataformas antes de dar por terminada la feature.

- [ ] **Step 2: Ejecutar checklist (del spec §10)**

Plataforma web (localhost:8000):
- [ ] Conectar Google Calendar desde Settings.
- [ ] Ver lista de calendarios poblada.
- [ ] Marcar/desmarcar calendarios se persiste al toggle.
- [ ] Volver a Calendario: los eventos Google aparecen diferenciados.
- [ ] Navegar ±1 semana: nueva petición, chip muestra progreso.
- [ ] Click en evento Google: abre Google Calendar en nueva pestaña.
- [ ] Desconectar: eventos Google desaparecen, Drive sigue conectado.

Extensión Chrome:
- [ ] Mismo flujo en side panel.

Android (AAB instalado en dispositivo físico):
- [ ] Conectar Calendar.
- [ ] Ver eventos en vista semanal.
- [ ] Click abre Google Calendar (app nativa o navegador).

Regresión Drive:
- [ ] Drive sync sigue funcionando en las 3 plataformas tras los cambios.

Edge cases:
- [ ] Día con 0 eventos Google: render normal.
- [ ] Día con 5+ eventos (Oráculo + Google): legible.
- [ ] Evento "todo el día" en Google: aparece como banner/primero del día.
- [ ] Sin internet (DevTools offline): chip "error", app sigue funcionando.
- [ ] Revocar permiso en `myaccount.google.com/permissions` → chip "error", botón "Reintentar" guía reconexión.

- [ ] **Step 3: Si algo falla**

Registrar el fallo, diagnosticar con systematic-debugging, corregir, re-ejecutar el bloque afectado del checklist. No avanzar hasta que todo pase.

- [ ] **Step 4: Cuando todo pasa, commit final**

(No hay cambios de código nuevos; solo confirmación.) Proceder a informar al usuario de que la feature está lista.

---

## Self-Review realizada

Se revisaron los puntos del checklist del skill:

1. **Cobertura del spec**: todas las secciones del spec están cubiertas por alguna task. §5 (archivos) → Tasks 1-15. §6 (localStorage) → Task 10. §7 (UX) → Tasks 11-15. §8 (errores) → Task 14. §9 (seguridad) → scopes definidos en Task 1. §10 (testing) → Task 19. §11 (plan alto nivel) → mapeo 1-a-1 con las 5 tandas.

2. **Placeholders**: revisado, sin "TBD" / "TODO" / "añadir validación apropiada". Cada step tiene código concreto o checklist específico.

3. **Consistencia de tipos**: la shape del evento Google se define en Task 9 (`_normalizeEvent`) y se consume idénticamente en Task 13 (`renderGcalEventItem`). El nombre `settings.gcal` se usa consistentemente en Tasks 10, 11, 14.

4. **Limitación conocida declarada**: Capacitor pide ambos scopes juntos (no incremental). Documentado en Task 4.

---

## Out of scope (para futuras iteraciones)

Ver spec §12. Nada se escapa de ahí.
