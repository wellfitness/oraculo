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

export async function connectCalendar() {
  throw new Error('connectCalendar: no implementado aun');
}

export async function listUserCalendars() {
  throw new Error('listUserCalendars: no implementado aun');
}

// eslint-disable-next-line no-unused-vars
export async function getEventsInRange(_start, _end, _calendarIds) {
  throw new Error('getEventsInRange: no implementado aun');
}

export async function disconnectCalendar() {
  throw new Error('disconnectCalendar: no implementado aun');
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
