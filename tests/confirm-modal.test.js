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

// Oyentes del "documento" de mentira: simulan a quien escucha los cierres
// desde el documento (la app lo hace para aplicar lo que quedó pendiente).
const oyentesDocumento = [];

const crearBoton = () => {
  const oyentes = {};
  return {
    oyentes,
    addEventListener(tipo, fn) {
      (oyentes[tipo] ||= []).push(fn);
    },
    disparar(tipo) {
      for (const fn of oyentes[tipo] || []) fn({ type: tipo });
    },
    focus() {}
  };
};

const crearDialogo = () => {
  const oyentes = {};
  const botones = {
    '[data-action="cancel"]': crearBoton(),
    '[data-action="confirm"]': crearBoton()
  };

  return {
    className: '',
    innerHTML: '',
    cerrado: false,
    quitado: false,
    oyentes,
    botones,
    addEventListener(tipo, fn) {
      (oyentes[tipo] ||= []).push(fn);
    },
    /**
     * En el navegador el evento 'close' se despacha de forma asíncrona y
     * cuando el elemento todavía está en el documento. El "documento" recibe
     * el evento antes que el propio diálogo, como en la fase de captura.
     */
    close() {
      this.cerrado = true;
      setTimeout(() => {
        for (const fn of oyentesDocumento) {
          fn({ type: 'close', target: this });
        }
        for (const fn of oyentes.close || []) fn({ type: 'close', target: this });
      }, 0);
    },
    remove() { this.quitado = true; },
    focus() {},
    showModal() {},
    querySelector(selector) { return botones[selector]; }
  };
};

globalThis.document = {
  createElement() {
    const dialogo = crearDialogo();
    dialogosCreados.push(dialogo);
    return dialogo;
  },
  body: { appendChild() {} },
  addEventListener(tipo, fn) {
    if (tipo === 'close') oyentesDocumento.push(fn);
  }
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

test('el cierre del modal llega al documento antes de quitarlo', async () => {
  dialogosCreados.length = 0;
  oyentesDocumento.length = 0;

  const recibido = [];
  oyentesDocumento.push((evento) => {
    recibido.push({ enDocumento: !evento.target.quitado });
  });

  confirmDanger({ title: '¿Eliminar?' }, () => {});
  const modal = dialogosCreados[0];

  modal.botones['[data-action="confirm"]'].disparar('click');
  await new Promise((resolver) => setTimeout(resolver, 5));

  assert.strictEqual(recibido.length, 1, 'el documento debe recibir el evento de cierre');
  assert.strictEqual(recibido[0].enDocumento, true, 'el modal debe seguir en el documento cuando se avisa del cierre');
  assert.strictEqual(modal.quitado, true, 'el modal debe quitarse del documento al terminar');
});

test('el cierre por cancelación también llega al documento', async () => {
  dialogosCreados.length = 0;
  oyentesDocumento.length = 0;

  let recibido = false;
  oyentesDocumento.push(() => { recibido = true; });

  confirmDanger({ title: '¿Eliminar?' }, () => {});
  const modal = dialogosCreados[0];

  modal.botones['[data-action="cancel"]'].disparar('click');
  await new Promise((resolver) => setTimeout(resolver, 5));

  assert.strictEqual(recibido, true, 'el documento debe recibir el evento de cierre');
  assert.strictEqual(modal.quitado, true, 'el modal debe quitarse del documento al terminar');
});
