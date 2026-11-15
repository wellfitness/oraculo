/**
 * Tests de la exportación a iCalendar (.ics)
 *
 * El `.ics` se importa en otra aplicación (Google Calendar, Outlook). Un salto
 * de línea en el nombre del evento abre una línea nueva dentro del fichero y
 * permite inyectar propiedades nuevas en el calendario de quien lo importa.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { escaparTextoICS, formatearFechaICS, construirICS } from '../js/utils/ics.js';

describe('escaparTextoICS', () => {
  it('convierte los saltos de línea en la secuencia literal \\n', () => {
    assert.strictEqual(escaparTextoICS('Cena\ncon Ana'), 'Cena\\ncon Ana');
    assert.strictEqual(escaparTextoICS('Cena\r\ncon Ana'), 'Cena\\ncon Ana');
    assert.strictEqual(escaparTextoICS('Cena\rcon Ana'), 'Cena\\ncon Ana');
  });

  it('escapa la barra invertida antes que nada', () => {
    assert.strictEqual(escaparTextoICS('a\\b'), 'a\\\\b');
    assert.strictEqual(escaparTextoICS('a\\;b'), 'a\\\\\\;b');
  });

  it('escapa el punto y coma y la coma, que separan parámetros', () => {
    assert.strictEqual(escaparTextoICS('a;b'), 'a\\;b');
    assert.strictEqual(escaparTextoICS('a,b'), 'a\\,b');
  });

  it('devuelve cadena vacía para valores ausentes', () => {
    assert.strictEqual(escaparTextoICS(null), '');
    assert.strictEqual(escaparTextoICS(undefined), '');
  });
});

describe('formatearFechaICS', () => {
  it('devuelve la fecha en formato UTC compacto', () => {
    // La hora del evento es local: 09:00 en casa son las 08:00Z en Madrid.
    const instante = new Date('2026-11-14T09:00');
    const esperado = instante.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    assert.strictEqual(formatearFechaICS('2026-11-14', '09:00'), esperado);
    assert.match(esperado, /^\d{8}T\d{6}Z$/);
  });

  it('devuelve null si la fecha no es válida', () => {
    assert.strictEqual(formatearFechaICS('no-es-una-fecha', '09:00'), null);
    assert.strictEqual(formatearFechaICS(undefined, undefined), null);
  });

  it('ignora una duración que no es un número razonable', () => {
    const base = formatearFechaICS('2026-11-14', '10:00');
    for (const duracion of ['abc', null, undefined, NaN, -30, 1e9, {}]) {
      assert.strictEqual(formatearFechaICS('2026-11-14', '10:00', duracion), base, String(duracion));
    }
  });

  it('no rompe la exportación con una duración hostil', () => {
    const lineas = construirICS(
      [{ id: 'e1', name: 'Evento', date: '2026-11-14', time: '10:00', duration: 'abc' }],
      [],
      '2026-11-14'
    );
    assert.ok(lineas.includes('END:VCALENDAR'));
    assert.ok(lineas.some(l => l.startsWith('DTEND:')));
  });
});

describe('construirICS', () => {
  it('arma un calendario con los eventos puntuales', () => {
    const lineas = construirICS(
      [{ id: 'ev1', name: 'Cena', date: '2026-11-14', time: '21:00', duration: 60, notes: 'Traer postre' }],
      [],
      '2026-11-14'
    );
    const texto = lineas.join('\r\n');
    const inicio = new Date('2026-11-14T21:00').toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    assert.ok(texto.startsWith('BEGIN:VCALENDAR'));
    assert.ok(texto.endsWith('END:VCALENDAR'));
    assert.ok(texto.includes('SUMMARY:Cena'));
    assert.ok(texto.includes('DESCRIPTION:Traer postre'));
    assert.ok(texto.includes(`DTSTART:${inicio}`));
    assert.ok(texto.includes('END:VEVENT'));
  });

  it('no deja que un salto de línea en el nombre inyecte propiedades', () => {
    const lineas = construirICS(
      [{ id: 'ev1', name: 'Cena\nATTENDEE;RSVP=TRUE:mailto:atacante@example.com', date: '2026-11-14', time: '21:00' }],
      [],
      '2026-11-14'
    );

    assert.ok(!lineas.includes('ATTENDEE;RSVP=TRUE:mailto:atacante@example.com'));
    assert.ok(lineas.some(l => l.startsWith('SUMMARY:')));
    // Cada línea del fichero sigue siendo una propiedad del VEVENT.
    assert.strictEqual(lineas.filter(l => l.startsWith('BEGIN:')).length, 2);
  });

  it('omite un evento con fecha inválida en vez de romper la exportación', () => {
    const lineas = construirICS(
      [{ id: 'malo', name: 'Sin fecha', date: 'no-es-una-fecha', time: '21:00' }],
      [],
      '2026-11-14'
    );
    assert.ok(!lineas.some(l => l.includes('BEGIN:VEVENT')));
    assert.ok(lineas.includes('END:VCALENDAR'));
  });

  it('arma los eventos recurrentes con su regla semanal', () => {
    const lineas = construirICS([], [{ id: 'ev2', name: 'Yoga', time: '08:00', days: [1, 3] }], '2026-11-14');
    const texto = lineas.join('\r\n');

    assert.ok(texto.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE'));
    assert.ok(texto.includes('SUMMARY:Yoga'));
  });

  it('no rompe con un evento recurrente sin días válidos', () => {
    for (const days of [[], [99], 'no-es-una-lista', undefined]) {
      const lineas = construirICS([], [{ id: 'ev2', name: 'Yoga', time: '08:00', days }], '2026-11-14');
      assert.ok(!lineas.some(l => l.startsWith('RRULE')), JSON.stringify(days));
    }
  });
});
