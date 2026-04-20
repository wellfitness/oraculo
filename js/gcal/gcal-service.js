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

export async function listUserCalendars() {
  throw new Error('listUserCalendars: no implementado aun');
}

// eslint-disable-next-line no-unused-vars
export async function getEventsInRange(_start, _end, _calendarIds) {
  throw new Error('getEventsInRange: no implementado aun');
}

// ───────────────────────────────────────────────
// Helpers internos
// ───────────────────────────────────────────────

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
