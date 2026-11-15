/**
 * Tests de higiene de los datos que se pintan.
 *
 * Estos ficheros no se pueden cargar en Node porque importan la aplicación
 * entera (que necesita un DOM). Lo que se comprueba aquí es que el acceso
 * protegido a los datos de usuaria siga pasando por las funciones puras de
 * js/utils/elementos.js, que sí tienen pruebas de comportamiento.
 *
 * Si alguien reintroduce un acceso directo a `.name` o a `.content` de un
 * elemento de lista, esta prueba se pone en rojo.
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const leer = (relativo) => fs.readFileSync(path.join(raiz, relativo), 'utf8');

describe('higiene de los datos pintados', () => {
  it('la captura global busca el proyecto con la función probada', () => {
    const captura = leer('js/utils/captura.js');
    const app = leer('js/app.js');

    assert.ok(captura.includes('buscarProyectoPorEtiqueta('), 'debe usar buscarProyectoPorEtiqueta');
    assert.ok(app.includes('parseCapture('), 'la app debe usar el parser probado');
    assert.ok(!app.includes("(p.name || '')"), 'no debe leer p.name sin proteger');
    assert.ok(!captura.includes('.name ||'), 'no debe leer el nombre del proyecto sin proteger');
  });

  it('el dashboard busca el proyecto con la función probada', () => {
    const codigo = leer('js/modules/dashboard.js');

    assert.ok(codigo.includes('buscarProyectoPorHashtag('), 'debe usar buscarProyectoPorHashtag');
    assert.ok(!codigo.includes("(p.name || '')"), 'no debe leer p.name sin proteger');
  });

  it('el diario filtra las entradas con la función probada', () => {
    const codigo = leer('js/modules/journal.js');

    assert.ok(codigo.includes('filtrarEntradasPorTexto('), 'debe usar filtrarEntradasPorTexto');
    assert.ok(!codigo.includes("(entry.content || '')"), 'no debe leer entry.content sin proteger');
  });

  it('el gráfico de evolución pinta el nombre con la función probada', () => {
    const codigo = leer('js/components/evolution-chart.js');

    assert.ok(codigo.includes('nombreDe(area)'), 'debe usar nombreDe');
    assert.ok(!codigo.includes("(area.name || '')"), 'no debe leer area.name sin proteger');
  });

  it('la brújula comprueba los nombres repetidos con la función probada', () => {
    const codigo = leer('js/modules/values.js');

    assert.ok(codigo.includes('hayValorConNombre('), 'debe usar hayValorConNombre');
    assert.ok(!codigo.includes('data.values.some(v =>'), 'no debe leer los valores a mano');
  });

  it('el setup diario escapa el horizonte de origen en el atributo', () => {
    const codigo = leer('js/components/daily-setup-modal.js');

    assert.ok(codigo.includes("escapeHTML(item.movedFrom || 'weekly')"), 'debe escapar movedFrom');
    assert.ok(!codigo.includes('data-moved-from="${item.movedFrom'), 'no debe escribir movedFrom sin escapar');
  });

  it('los contadores de los cuadernos archivados se pintan como números', () => {
    const codigo = leer('js/modules/settings.js');

    for (const campo of ['totalTasksCompleted', 'habitsGraduated', 'habitDaysLogged', 'projectsCompleted', 'journalEntries']) {
      assert.ok(codigo.includes(`numeroSeguro(summary.${campo})`), `debe usar numeroSeguro con ${campo}`);
      assert.ok(!codigo.includes(`\${summary.${campo}}`), `no debe pintar summary.${campo} en crudo`);
    }
  });

  it('los contadores de la lista de años anteriores se pintan como números', () => {
    const codigo = leer('js/modules/settings.js');

    for (const campo of ['totalTasksCompleted', 'habitsGraduated', 'journalEntries']) {
      assert.ok(codigo.includes(`numeroSeguro(nb.summary.${campo})`), `debe usar numeroSeguro con nb.summary.${campo}`);
      assert.ok(!codigo.includes(`\${nb.summary.${campo}}`), `no debe pintar nb.summary.${campo} en crudo`);
    }
  });

  it('el año del cuaderno se pinta como número', () => {
    const codigo = leer('js/modules/settings.js');

    assert.ok(codigo.includes('numeroSeguro(notebook.year)'), 'debe usar numeroSeguro con el año');
    assert.ok(!codigo.includes('${notebook.year} y empezar'), 'no debe pintar el año en crudo en el botón');
    assert.ok(!codigo.includes('Archivar año ${notebook.year}'), 'no debe pintar el año en crudo en el modal');
    assert.ok(!codigo.includes('datos de ${notebook.year}'), 'no debe pintar el año en crudo en los pasos');
    // El único uso que queda va dentro de escapeHTML.
    assert.ok(codigo.includes('escapeHTML(notebook.name || `Cuaderno ${notebook.year}`)'), 'el nombre del cuaderno debe ir escapado');
  });

  it('las puntuaciones de la Rueda de la Vida se pintan como números', () => {
    const rueda = leer('js/components/wheel-chart.js');
    const evolucion = leer('js/components/evolution-chart.js');

    assert.ok(rueda.includes('numeroSeguro(scores[area.id]?.current)'), 'la rueda debe usar numeroSeguro');
    assert.ok(evolucion.includes('numeroSeguro(ev.scores?.[area.id]?.current, 5)'), 'el gráfico debe usar numeroSeguro');

    // Y que el valor en crudo no se pinte por otro camino: si solo se
    // comprueba que la llamada existe, quitar la protección deja el test
    // en verde.
    assert.ok(!rueda.includes('${scores[area.id]?.current}'), 'la rueda no debe pintar la puntuación en crudo');
    assert.ok(!evolucion.includes('${ev.scores?.[area.id]?.current}'), 'el gráfico no debe pintar la puntuación en crudo');
  });

  it('los contadores de Muévete se pintan como números', () => {
    const temporizador = leer('js/components/muevete-timer.js');
    const vista = leer('js/modules/muevete.js');
    const panel = leer('js/modules/dashboard.js');

    assert.ok(temporizador.includes('numeroSeguro(entry?.completed)'), 'el temporizador debe usar numeroSeguro');
    assert.ok(temporizador.includes('numeroSeguro(saved.blocksCompleted)'), 'el temporizador debe usar numeroSeguro al restaurar');
    assert.ok(vista.includes('numeroSeguro(summary.totalCompleted)'), 'la vista debe usar numeroSeguro');
    assert.ok(vista.includes('numeroSeguro(state.blocksCompleted)'), 'la vista debe usar numeroSeguro');
    assert.ok(panel.includes('numeroSeguro(state.blocksCompleted)'), 'el panel debe usar numeroSeguro');

    assert.ok(!temporizador.includes('${entry.completed}'), 'el temporizador no debe pintar el contador en crudo');
    assert.ok(!vista.includes('${summary.totalCompleted}'), 'la vista no debe pintar el contador en crudo');
    assert.ok(!panel.includes('${state.blocksCompleted}'), 'el panel no debe pintar el contador en crudo');
  });

  it('la duración del hábito y el límite diario se pintan como números', () => {
    const habitos = leer('js/modules/habits.js');
    const panel = leer('js/modules/dashboard.js');

    assert.ok(habitos.includes('numeroSeguro(habit.duration)'), 'la duración del hábito debe usar numeroSeguro');
    assert.ok(habitos.includes('numeroSeguro(activity.duration)'), 'la duración de la actividad debe usar numeroSeguro');
    assert.ok(panel.includes('getDailyLimit(data)'), 'el panel debe usar el límite diario compartido');

    assert.ok(!habitos.includes('${habit.duration}'), 'no debe pintar la duración del hábito en crudo');
    assert.ok(!habitos.includes('${activity.duration}'), 'no debe pintar la duración de la actividad en crudo');
  });
});
