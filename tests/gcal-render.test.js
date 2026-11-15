import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderGcalEventItem } from '../js/gcal/gcal-render.js';

const evento = (calendarColor) => ({
  id: 'ev1',
  name: 'Reunión',
  startTime: '10:00',
  calendarName: 'Trabajo',
  calendarColor
});

test('un color de calendario hostil no abre declaraciones CSS en el style', () => {
  const html = renderGcalEventItem(evento('red;background-image:url(https://x.test/a)'));
  assert.ok(!html.includes('background-image'));
  assert.ok(!html.includes('url('));
  assert.ok(html.includes('--gcal-color: #4285F4'));
});

test('un color hexadecimal válido se conserva', () => {
  const html = renderGcalEventItem(evento('#16a765'));
  assert.ok(html.includes('--gcal-color: #16a765'));
});

test('sin color se usa el azul de Google', () => {
  const html = renderGcalEventItem(evento(undefined));
  assert.ok(html.includes('--gcal-color: #4285F4'));
});
