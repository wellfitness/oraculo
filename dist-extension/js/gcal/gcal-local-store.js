/**
 * Google Calendar — Local Store (por dispositivo).
 *
 * Mantiene la configuración de Google Calendar en una key separada de
 * localStorage (`oraculo_gcal_settings`), FUERA del objeto `oraculo_data`
 * que Google Drive sincroniza. Razón: al hacer pull de Drive, no queremos
 * que se pise la selección de calendarios de este dispositivo por datos de
 * otro dispositivo — cada uno elige qué calendarios ver.
 *
 * Esto está documentado como decisión de diseño en el spec:
 * docs/superpowers/specs/2026-04-20-google-calendar-sync-design.md §6
 */

const KEY = 'oraculo_gcal_settings';

const DEFAULTS = {
  enabled: false,
  account: null,
  enabledCalendars: [],
  lastSyncAt: null,
  lastSyncError: null,
};

/**
 * Devuelve la config actual de gcal. Si no existe en localStorage,
 * devuelve defaults (no persiste hasta que hay un set real).
 */
export function getGcalSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

/**
 * Guarda (reemplaza completamente) la config de gcal.
 */
export function setGcalSettings(cfg) {
  try {
    const full = { ...DEFAULTS, ...cfg };
    localStorage.setItem(KEY, JSON.stringify(full));
  } catch (err) {
    console.error('[gcal-local-store] Error al guardar', err);
  }
}

/**
 * Actualiza parcialmente (merge) la config de gcal.
 */
export function patchGcalSettings(partial) {
  const current = getGcalSettings();
  setGcalSettings({ ...current, ...partial });
}

/**
 * Migra config legacy de data.settings.gcal (si existe) al storage local
 * y la elimina del objeto sincronizado. Idempotente — seguro llamar varias veces.
 * Devuelve true si hizo migración, false si no.
 */
export function migrateFromLegacyIfNeeded(data) {
  if (!data?.settings?.gcal) return false;
  const legacy = data.settings.gcal;
  const existingLocal = localStorage.getItem(KEY);

  // Si no hay storage local aún, o el legacy es "más útil" (tiene enabled=true), adoptarlo
  if (!existingLocal || legacy.enabled) {
    setGcalSettings(legacy);
  }
  delete data.settings.gcal;
  return true;
}
