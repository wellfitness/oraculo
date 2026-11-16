/**
 * Tests para la decisión de qué hacer con los datos que llegan de otra
 * pestaña.
 * Usa node:test (nativo de Node.js 18+)
 *
 * Ejecutar: pnpm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  AVISO_DATOS_EN_ESPERA,
  AVISO_DATOS_OTRA_PESTAÑA,
  DECISION_APLICAR,
  DECISION_APLAZAR,
  DECISION_IGNORAR,
  avisoDeDatosDePestana,
  decidirCambioDePestana
} from '../js/utils/sincronia-pestanas.js';

const ANTIGUO = '2026-11-13T10:00:00.000Z';
const NUEVO = '2026-11-13T10:00:05.000Z';

describe('decidirCambioDePestana', () => {
  it('ignora lo que no es más reciente que lo que hay en memoria', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: NUEVO,
        updatedAtRecibido: ANTIGUO,
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_IGNORAR
    );
  });

  it('ignora lo que es igual que lo que hay en memoria', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: NUEVO,
        updatedAtRecibido: NUEVO,
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_IGNORAR
    );
  });

  it('aplica lo que es más reciente cuando no hay nada abierto ni editándose', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: ANTIGUO,
        updatedAtRecibido: NUEVO,
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_APLICAR
    );
  });

  it('aplaza lo que es más reciente si hay un modal abierto', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: ANTIGUO,
        updatedAtRecibido: NUEVO,
        hayModalAbierto: true,
        estaEditando: false
      }),
      DECISION_APLAZAR
    );
  });

  it('aplaza lo que es más reciente si la usuaria está editando', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: ANTIGUO,
        updatedAtRecibido: NUEVO,
        hayModalAbierto: false,
        estaEditando: true
      }),
      DECISION_APLAZAR
    );
  });

  it('lo que no tiene fecha no llega a ser más reciente que lo que sí la tiene', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: NUEVO,
        updatedAtRecibido: null,
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_IGNORAR
    );

    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: undefined,
        updatedAtRecibido: undefined,
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_IGNORAR
    );
  });

  it('lo que llega con fecha y la memoria no se considera más reciente', () => {
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: '',
        updatedAtRecibido: NUEVO,
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_APLICAR
    );
  });

  it('aguanta entradas que no son un objeto', () => {
    assert.strictEqual(decidirCambioDePestana(null), DECISION_IGNORAR);
    assert.strictEqual(decidirCambioDePestana(undefined), DECISION_IGNORAR);
    assert.strictEqual(decidirCambioDePestana({}), DECISION_IGNORAR);
  });

  it('compara las fechas como texto, que es como se ordenan las fechas ISO', () => {
    // Las dos fechas tienen el mismo formato: compararlas como texto da el
    // mismo orden que compararlas como fecha.
    assert.strictEqual(
      decidirCambioDePestana({
        updatedAtEnMemoria: '2026-11-13T10:00:00.000Z',
        updatedAtRecibido: '2026-11-13T09:59:59.999Z',
        hayModalAbierto: false,
        estaEditando: false
      }),
      DECISION_IGNORAR
    );
  });
});

describe('avisoDeDatosDePestana', () => {
  it('avisa cuando los datos de otra pestaña se aplican', () => {
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_APLICAR, hayModalAbierto: false }),
      'Datos actualizados desde otra pestaña.'
    );
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_APLICAR }),
      AVISO_DATOS_OTRA_PESTAÑA
    );
  });

  it('avisa de que los datos esperan al cierre del modal', () => {
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_APLAZAR, hayModalAbierto: true }),
      'Datos actualizados. Se aplicarán al cerrar el modal.'
    );
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_APLAZAR, hayModalAbierto: true }),
      AVISO_DATOS_EN_ESPERA
    );
  });

  it('no avisa si lo único que hay es la usuaria escribiendo', () => {
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_APLAZAR, hayModalAbierto: false }),
      null
    );
  });

  it('no avisa si lo que llega no es más nuevo', () => {
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_IGNORAR, hayModalAbierto: false }),
      null
    );
    assert.strictEqual(
      avisoDeDatosDePestana({ decision: DECISION_IGNORAR, hayModalAbierto: true }),
      null
    );
  });

  it('aguanta entradas que no son un objeto', () => {
    assert.strictEqual(avisoDeDatosDePestana(null), null);
    assert.strictEqual(avisoDeDatosDePestana(undefined), null);
    assert.strictEqual(avisoDeDatosDePestana({}), null);
    assert.strictEqual(avisoDeDatosDePestana({ decision: 'inventada' }), null);
  });
});
