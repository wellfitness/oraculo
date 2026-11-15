/**
 * Tests del modal de confirmación (js/utils/confirm-modal.js)
 *
 * El modal se pinta con innerHTML. Si el título o el mensaje traen marcado,
 * ese marcado se ejecutaría como HTML. Estos tests comprueban que el propio
 * componente escapa lo que recibe, sin depender del navegador.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const dialogosCreados = [];

const crearDialogo = () => ({
  className: '',
  innerHTML: '',
  cerrado: false,
  addEventListener() {},
  focus() {},
  showModal() {},
  close() { this.cerrado = true; },
  remove() {},
  querySelector() { return { addEventListener() {}, focus() {} }; }
});

globalThis.document = {
  createElement() {
    const dialogo = crearDialogo();
    dialogosCreados.push(dialogo);
    return dialogo;
  },
  body: { appendChild() {} }
};

const { confirmDanger, confirmDeleteData } = await import('../js/utils/confirm-modal.js');

test('el modal de confirmación escapa el marcado del título y del mensaje', () => {
  dialogosCreados.length = 0;

  confirmDanger({
    title: 'Eliminar <b>pan</b>',
    message: 'Con "comillas" y \'apóstrofes\' & símbolos'
  });

  const html = dialogosCreados[0].innerHTML;
  assert.ok(!html.includes('<b>'), 'el título no debe inyectar etiquetas');
  assert.ok(html.includes('&lt;b&gt;'), 'el título debe mostrarse escapado');
  assert.ok(html.includes('&quot;'), 'las comillas dobles deben escaparse');
  assert.ok(html.includes('&#039;'), 'el apóstrofo debe escaparse');
  assert.ok(html.includes('&amp;'), 'la ampersand debe escaparse');
});

test('el modal de confirmación escapa el texto de los botones', () => {
  dialogosCreados.length = 0;

  confirmDanger({
    title: '¿Eliminar?',
    message: 'Mensaje',
    confirmText: 'Sí <img src=x onerror=alert(1)>',
    cancelText: 'No'
  });

  const html = dialogosCreados[0].innerHTML;
  assert.ok(!html.includes('<img'), 'el botón no debe inyectar etiquetas');
  assert.ok(html.includes('&lt;img'), 'el texto del botón debe mostrarse escapado');
  assert.ok(html.includes('>No<'), 'el botón de cancelar conserva su texto');
});

test('el modal de confirmación conserva los textos por defecto', () => {
  dialogosCreados.length = 0;

  confirmDanger({});

  const html = dialogosCreados[0].innerHTML;
  assert.ok(html.includes('¿Estás segura?'), 'el título por defecto no debe alterarse');
  assert.ok(html.includes('Esta acción no se puede deshacer.'), 'el mensaje por defecto no debe alterarse');
  assert.ok(html.includes('>Eliminar<'), 'el botón de confirmar conserva su texto');
  assert.ok(html.includes('>Cancelar<'), 'el botón de cancelar conserva su texto');
});

test('confirmDeleteData escapa el nombre del dato que se va a eliminar', () => {
  dialogosCreados.length = 0;

  confirmDeleteData('Proyecto <b>Pan</b>', () => {});

  const html = dialogosCreados[0].innerHTML;
  assert.ok(!html.includes('<b>'), 'el nombre no debe inyectar etiquetas');
  assert.ok(html.includes('&lt;b&gt;'), 'el nombre debe mostrarse escapado');
});
