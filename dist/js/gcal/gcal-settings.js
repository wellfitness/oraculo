/**
 * UI de la seccion "Google Calendar" en Configuracion.
 *
 * Expone dos funciones:
 *   - render(data) → HTML de la section (conectado/no conectado)
 *   - init(data, updateData) → vincula listeners y carga lista de calendarios
 *
 * Estructurada como `<section class="settings-section">` para coherencia
 * con el resto de secciones de settings.js (Drive, Sincronización Manual, etc.).
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
      <section class="settings-section" id="gcal-settings-section">
        <h2>
          <span class="material-symbols-outlined">calendar_month</span>
          Google Calendar
        </h2>
        <p class="section-description">
          Visualiza tus citas de Google en Oráculo para evitar planificar tareas
          cuando ya tienes algo con otros. Los eventos son de solo lectura — se
          gestionan desde Google Calendar.
        </p>
        <button class="btn btn--primary" id="gcal-connect-btn">
          <span class="material-symbols-outlined">link</span>
          Conectar Google Calendar
        </button>
        <p class="sync-privacy-note">
          <span class="material-symbols-outlined">shield</span>
          Solo pedimos permiso de lectura (<code>calendar.readonly</code>). No podemos modificar ni borrar nada.
        </p>
      </section>
    `;
  }

  return `
    <section class="settings-section" id="gcal-settings-section">
      <h2>
        <span class="material-symbols-outlined">calendar_month</span>
        Google Calendar
      </h2>
      <div class="gdrive-status">
        <span class="material-symbols-outlined gdrive-status-icon">event_available</span>
        <div>
          <p class="gdrive-email">${escapeHTML(cfg.account || 'Conectado')}</p>
          <p class="gdrive-last-sync">Permiso: solo lectura</p>
        </div>
      </div>
      <p class="section-description" style="margin-top: var(--space-2);">
        Marca los calendarios cuyos eventos quieres ver dentro de Oráculo:
      </p>
      <div class="gcal-calendar-list" id="gcal-calendar-list">
        <p class="text-muted">Cargando calendarios…</p>
      </div>
      <div class="gdrive-actions">
        <button class="btn btn--secondary btn--danger-text" id="gcal-disconnect-btn">
          <span class="material-symbols-outlined">link_off</span>
          Desconectar
        </button>
      </div>
    </section>
  `;
}

export function init(data, updateData) {
  _updateData = updateData;
  _currentData = data;

  document.getElementById('gcal-connect-btn')?.addEventListener('click', onConnect);
  document.getElementById('gcal-disconnect-btn')?.addEventListener('click', onDisconnect);

  if (data.settings?.gcal?.enabled) {
    loadCalendarList();
  }
}

async function onConnect() {
  const btn = document.getElementById('gcal-connect-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Conectando…'; }
  try {
    const { email } = await gcalService.connectCalendar();
    const data = _currentData;
    data.settings.gcal = {
      enabled: true,
      account: email,
      enabledCalendars: [],
      lastSyncAt: null,
      lastSyncError: null,
    };
    await _updateData(data);
    reRenderPanel();
  } catch (err) {
    console.error('[gcal] connect failed', err);
    alert(`No se pudo conectar con Google Calendar:\n\n${err.message || err}`);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">link</span> Conectar Google Calendar';
    }
  }
}

async function onDisconnect() {
  if (!confirm('¿Seguro que quieres desconectar Google Calendar?\n\nPodrás volver a conectarlo cuando quieras.')) return;
  try {
    await gcalService.disconnectCalendar();
  } catch (e) {
    console.warn('[gcal] disconnect (ignored)', e);
  }
  const data = _currentData;
  data.settings.gcal = {
    enabled: false,
    account: null,
    enabledCalendars: [],
    lastSyncAt: null,
    lastSyncError: null,
  };
  await _updateData(data);
  reRenderPanel();
}

async function loadCalendarList() {
  const container = document.getElementById('gcal-calendar-list');
  if (!container) return;
  try {
    const cals = await gcalService.listUserCalendars();
    const enabled = new Set(_currentData.settings?.gcal?.enabledCalendars || []);
    if (!cals.length) {
      container.innerHTML = '<p class="text-muted">No hay calendarios accesibles.</p>';
      return;
    }
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
    console.warn('[gcal] list calendars failed', err);
    if (err.code === 'NOT_AUTHENTICATED') {
      container.innerHTML = `
        <p class="text-error">Tu sesión ha caducado.</p>
        <button class="btn btn--tertiary" id="gcal-reauth-btn">Reconectar</button>
      `;
      document.getElementById('gcal-reauth-btn')?.addEventListener('click', onConnect);
    } else {
      container.innerHTML = `<p class="text-error">Error cargando calendarios: ${escapeHTML(err.message || String(err))}</p>`;
    }
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
  const section = document.getElementById('gcal-settings-section');
  if (!section) return;
  section.outerHTML = render(_currentData);
  init(_currentData, _updateData);
}
