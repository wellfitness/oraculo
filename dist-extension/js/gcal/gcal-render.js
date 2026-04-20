/**
 * Render de eventos Google Calendar en la vista semanal de Oraculo.
 *
 * Los eventos de Google se muestran visualmente diferenciados de los eventos
 * Oraculo: borde punteado, franja lateral del color del calendario origen,
 * icono calendar_month, nombre del calendario debajo.
 *
 * Click → abre el evento en Google Calendar (nueva pestaña).
 */

import { escapeHTML } from '../utils/sanitizer.js';

/**
 * Devuelve el HTML de un evento Google para inyectar en .day-events.
 * @param {NormalizedEvent} event - Salida de gcal-service._normalizeEvent
 */
export function renderGcalEventItem(event) {
  const timeLabel = event.allDay ? 'Todo el día' : (event.startTime || '');
  const calName = event.calendarName || '';
  const calColor = event.calendarColor || '#4285F4';

  const tooltip = calName
    ? `${calName} · click abre Google Calendar`
    : 'Click abre Google Calendar';

  return `
    <div class="event-item event--google"
         data-id="${escapeHTML(event.id)}"
         data-htmllink="${escapeHTML(event.htmlLink || '')}"
         style="--gcal-color: ${escapeHTML(calColor)}"
         title="${escapeHTML(tooltip)}">
      <div class="event-item__content">
        <span class="material-symbols-outlined event--google__source" aria-hidden="true">calendar_month</span>
        ${timeLabel ? `<span class="event-time">${escapeHTML(timeLabel)}</span>` : ''}
        <span class="event-name">${escapeHTML(event.name)}</span>
      </div>
    </div>
  `;
}

/**
 * Agrupa eventos Google por fecha (YYYY-MM-DD).
 * @param {Array<NormalizedEvent>} events
 * @returns {Map<string, Array<NormalizedEvent>>}
 */
export function groupByDate(events) {
  const map = new Map();
  for (const ev of events) {
    if (!map.has(ev.date)) map.set(ev.date, []);
    map.get(ev.date).push(ev);
  }
  return map;
}
