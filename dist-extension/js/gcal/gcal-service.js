/**
 * Google Calendar Service - Cliente API para lectura de eventos.
 *
 * Responsabilidades:
 *   - Conectar/desconectar con Google Calendar (reutilizando infra auth de Drive).
 *   - Listar calendarios del usuario.
 *   - Obtener eventos de un rango de fechas para un set de calendarios.
 *
 * No persiste eventos en localStorage — los consulta a la API en cada render.
 * Selecciona dinamicamente el modulo de auth segun plataforma (web/ext/capacitor).
 */

import { GDRIVE_CONFIG } from '../gdrive/config.js';

const SCOPES = { scopes: GDRIVE_CONFIG.CALENDAR_SCOPE };

// ───────────────────────────────────────────────
// API publica
// ───────────────────────────────────────────────

/**
 * Inicia el flujo OAuth interactivo con scope de Calendar (solo lectura).
 * No afecta al token de Drive existente (cache separada por scope-set).
 * @returns {Promise<{ email: string }>}
 */
export async function connectCalendar() {
  const auth = await getAuthModule();
  const result = await auth.signIn(SCOPES);
  return { email: result.email };
}

/**
 * Revoca el token de Calendar. En Android, por limitación del plugin nativo,
 * esto cierra también la sesión de Drive — ver JSDoc de auth-capacitor.signOut.
 */
export async function disconnectCalendar() {
  const auth = await getAuthModule();
  await auth.signOut(SCOPES);
}

/**
 * Lista los calendarios accesibles al usuario (minAccessRole=reader).
 * Requiere que exista una sesión Calendar activa; si no, lanza NOT_AUTHENTICATED.
 *
 * @returns {Promise<Array<{
 *   id: string, summary: string, backgroundColor: string,
 *   primary: boolean, accessRole: string, selected: boolean
 * }>>}
 */
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

/**
 * Obtiene eventos de múltiples calendarios en un rango de fechas.
 * Si `calendarIds` está vacío, devuelve [] sin llamar a la API.
 * Si un calendario concreto falla, se ignora (no tumba al resto).
 *
 * @param {string} startISO - Timestamp ISO inicio (incluido)
 * @param {string} endISO - Timestamp ISO fin (excluido)
 * @param {string[]} calendarIds - IDs de calendarios a consultar
 * @returns {Promise<Array<NormalizedEvent>>}
 */
export async function getEventsInRange(startISO, endISO, calendarIds) {
  if (!Array.isArray(calendarIds) || calendarIds.length === 0) return [];

  const calsIndex = await _indexCalendarsById();

  const perCalendar = await Promise.all(
    calendarIds.map(async (calId) => {
      try {
        const url = `${GDRIVE_CONFIG.API_CALENDAR}/calendars/${encodeURIComponent(calId)}/events`
          + `?timeMin=${encodeURIComponent(startISO)}`
          + `&timeMax=${encodeURIComponent(endISO)}`
          + `&singleEvents=true&orderBy=startTime&maxResults=100`;
        const data = await _fetchWithAuth(url);
        const meta = calsIndex[calId] || { id: calId, summary: calId, backgroundColor: '#4285F4' };
        return (data.items || []).map(ev => _normalizeEvent(ev, meta));
      } catch (err) {
        console.warn(`[gcal] error en calendario ${calId}:`, err.code || err.message);
        return [];
      }
    })
  );

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

/**
 * Normaliza un evento de Google Calendar al shape interno de Oráculo.
 * - Evento todo el día: usa `start.date` (YYYY-MM-DD), allDay=true.
 * - Evento con hora: usa `start.dateTime`, calcula duration en minutos.
 */
function _normalizeEvent(ev, calMeta) {
  const allDay = !!ev.start?.date && !ev.start?.dateTime;
  let date, startTime = null, duration = null;

  if (allDay) {
    date = ev.start.date;
  } else {
    const startDT = new Date(ev.start.dateTime);
    const endDT = new Date(ev.end?.dateTime || ev.start.dateTime);
    date = startDT.toLocaleDateString('en-CA');
    startTime = startDT.toTimeString().slice(0, 5);
    duration = Math.max(1, Math.round((endDT - startDT) / 60000));
  }

  return {
    id: `gcal_${ev.id}`,
    source: 'google',
    calendarId: calMeta.id,
    calendarName: calMeta.summary,
    calendarColor: calMeta.backgroundColor,
    name: ev.summary || '(sin título)',
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

// ───────────────────────────────────────────────
// Helpers internos
// ───────────────────────────────────────────────

/**
 * Fetch autenticado contra la Calendar API.
 * - Usa getTokenSilent (sin popup); si no hay → lanza NOT_AUTHENTICATED.
 * - Si la API responde 401, hace un refresh y reintenta una vez.
 * - Otros errores HTTP se propagan con `.code` (RATE_LIMIT / FORBIDDEN / API_ERROR).
 */
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
  if (res.status === 401) {
    token = (auth.refreshToken ? await auth.refreshToken(SCOPES) : null)
      || await auth.getTokenSilent(SCOPES);
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
    err.code = res.status === 429 ? 'RATE_LIMIT'
      : res.status === 403 ? 'FORBIDDEN'
      : 'API_ERROR';
    throw err;
  }
  return res.json();
}

/**
 * Selecciona el modulo de auth apropiado segun la plataforma en ejecucion.
 * Orden de detección:
 *   1. Extension Chrome  (chrome.identity disponible)
 *   2. Capacitor nativo  (window.Capacitor.isNativePlatform)
 *   3. Web               (fallback)
 */
async function getAuthModule() {
  if (typeof chrome !== 'undefined' && chrome.identity?.getAuthToken) {
    return await import('../gdrive/auth-extension.js');
  }
  if (window.Capacitor?.isNativePlatform?.()) {
    return await import('../gdrive/auth-capacitor.js');
  }
  return await import('../gdrive/auth-web.js');
}
