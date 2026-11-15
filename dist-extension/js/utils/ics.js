/**
 * Oráculo - Exportación a iCalendar (.ics)
 *
 * El `.ics` que exporta la usuaria se importa en otra aplicación (Google
 * Calendar, Outlook). Cada línea del fichero es una propiedad, así que un
 * salto de línea dentro del nombre de un evento abre una línea nueva y
 * permite meter propiedades nuevas en el calendario de quien lo importa.
 *
 * Aquí vive el armado del fichero y el saneamiento de los textos según la
 * RFC 5545. Es lógica pura: no importa nada y se puede comprobar sin
 * navegador.
 */

/** Días de la semana como los nombra la RFC 5545. */
const DIAS_ICS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/**
 * Escapa un texto para usarlo como valor de propiedad ICS (RFC 5545 §3.3.11).
 *
 * Primero va la barra invertida, porque escaparla después convertiría en
 * secuencia de escape lo que se acaba de escapar. Después el punto y coma y
 * la coma, que separan parámetros, y por último los saltos de línea, que
 * pasan a la secuencia literal `\n`.
 *
 * @param {*} texto - Texto a escapar.
 * @returns {string} Texto sin saltos de línea ni separadores sueltos.
 */
export const escaparTextoICS = (texto) => {
  if (texto === null || texto === undefined) return '';
  return String(texto)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
};

/**
 * Deja un identificador limpio para usarlo dentro de un UID.
 *
 * @param {*} id - Identificador de partida.
 * @returns {string} Identificador sin caracteres de control.
 */
export const sanearIdICS = (id) => {
  const valor = id === null || id === undefined ? '' : String(id);
  return valor.replace(/[^\w.@-]/g, '');
};

/**
 * Formatea una fecha en UTC con el formato compacto de la RFC 5545.
 *
 * La duración se toma solo si es un número de minutos razonable. Un backup
 * importado puede traer cualquier cosa ahí, y una duración sin sentido
 * dejaría el evento con una fecha imposible o reventaría la exportación.
 *
 * @param {string} date - Fecha en formato AAAA-MM-DD.
 * @param {string} [time] - Hora en formato HH:mm.
 * @param {number} [durationMinutes] - Duración en minutos.
 * @returns {string|null} La fecha, o null si no es válida.
 */
export const formatearFechaICS = (date, time, durationMinutes = 0) => {
  const d = new Date(`${date}T${time || '00:00'}`);
  if (Number.isNaN(d.getTime())) return null;

  const duracion = Number(durationMinutes);
  const minutos = Number.isFinite(duracion) && duracion >= 0 && duracion <= 1440 ? duracion : 0;
  if (minutos) d.setMinutes(d.getMinutes() + minutos);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Arma las líneas del fichero `.ics`.
 *
 * Un evento con una fecha que no se puede interpretar se queda fuera en vez
 * de romper la exportación entera.
 *
 * @param {Object[]} events - Eventos puntuales.
 * @param {Object[]} recurring - Eventos recurrentes.
 * @param {string} [fechaHoy] - Fecha de referencia en formato AAAA-MM-DD.
 * @returns {string[]} Líneas del fichero.
 */
export const construirICS = (events = [], recurring = [], fechaHoy = new Date().toISOString().split('T')[0]) => {
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Oráculo//Movimiento Funcional//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  const dtstamp = formatearFechaICS(fechaHoy, '00:00');

  for (const event of Array.isArray(events) ? events : []) {
    const dtStart = formatearFechaICS(event?.date, event?.time);
    if (!dtStart) continue;

    const dtEnd = formatearFechaICS(event?.date, event?.time, event?.duration);

    lineas.push(
      'BEGIN:VEVENT',
      `UID:${sanearIdICS(event?.id)}@oraculo`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escaparTextoICS(event?.name)}`,
      event?.notes ? `DESCRIPTION:${escaparTextoICS(event.notes)}` : '',
      'END:VEVENT'
    );
  }

  for (const event of Array.isArray(recurring) ? recurring : []) {
    const dias = Array.isArray(event?.days) ? event.days : [];
    const byDay = dias.map(d => DIAS_ICS[d]).filter(Boolean).join(',');
    if (!byDay) continue;

    const dtStart = formatearFechaICS(fechaHoy, event?.time || '09:00');
    if (!dtStart) continue;

    const dtEnd = formatearFechaICS(fechaHoy, event?.time || '09:00', 60);

    lineas.push(
      'BEGIN:VEVENT',
      `UID:${sanearIdICS(event?.id)}@oraculo-recurring`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay}`,
      `SUMMARY:${escaparTextoICS(event?.name)}`,
      'END:VEVENT'
    );
  }

  lineas.push('END:VCALENDAR');

  return lineas.filter(Boolean);
};
