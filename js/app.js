/**
 * Oráculo - Aplicación Principal
 * Sistema de gestión personal consciente
 */

// Storage: se resuelve dinámicamente en bootstrap() según el contexto (web vs extensión)
let _storage = {};
const loadData = (...args) => _storage.loadData(...args);
const saveData = (...args) => _storage.saveData(...args);
const getStorageUsage = (...args) => _storage.getStorageUsage(...args);
const shouldPersistOnUnload = (...args) => _storage.shouldPersistOnUnload(...args);
const consumeLoadIssue = (...args) => _storage.consumeLoadIssue(...args);
// `ensureDataShape` deja los datos en la forma que espera la app. Se usa en el
// guardado de salida, que escribe en localStorage sin pasar por el storage.
const ensureDataShape = (...args) => (
  typeof _storage.ensureDataShape === 'function' ? _storage.ensureDataShape(...args) : null
);
import { confirmDanger } from './utils/confirm-modal.js';
import { getHorizonLimit, countActive, IMPORTANT_TASK_TYPE } from './utils/objectives.js';
import { parseCapture } from './utils/captura.js';
import { escapeHTML } from './utils/sanitizer.js';
import { sanearIdentificadores } from './utils/validator.js';
import {
  AVISO_DATOS_OTRA_PESTAÑA,
  DECISION_APLICAR,
  DECISION_APLAZAR,
  DECISION_IGNORAR,
  avisoDeDatosDePestana,
  decidirCambioDePestana
} from './utils/sincronia-pestanas.js';
import {
  draftIdFor,
  esEditorDeDiarioAbierto,
  loadDraft,
  parseRutaDiario,
  tieneBorradorPendiente
} from './utils/journal-draft.js';
import { fusionarDatos, copiarDatos } from './utils/fusionar-datos.js';
import { elegirHashDeNavegacion, getBaseView } from './utils/ruta-hash.js';
import { fusionarPendiente } from './utils/pendiente-sync.js';
import { capturarTextoDeCampo, restaurarTextoEnCampo } from './utils/campos.js';
import { haSalidoDelBloqueDeEdicion } from './utils/foco.js';
import { needsDailySetup } from './components/daily-setup-modal.js';
import {
  renderCalmTimerModal,
  initCalmTimer,
  openCalmTimer
} from './components/calm-timer.js';
import {
  renderSpontaneousModal,
  initSpontaneousModal,
  openSpontaneousModal
} from './components/spontaneous-achievement.js';
import {
  renderEveningCheckInModal,
  initEveningCheckInModal,
  openEveningCheckIn
} from './components/evening-check-in.js';
import {
  renderVoiceCaptureModal,
  initVoiceCaptureModal,
  openVoiceCapture
} from './components/voice-capture-modal.js';
import {
  renderWeeklyReviewModal,
  initWeeklyReviewModal,
  openWeeklyReview
} from './components/weekly-review-modal.js';
import {
  renderWelcomeModal,
  initWelcomeModal,
  shouldShowWelcome,
  getVisibleViews,
  USAGE_MODES
} from './components/welcome-modal.js';
import { getSpeechHandler, isSpeechSupported } from './utils/speech-handler.js';
import * as autoBackup from './utils/auto-backup.js';
import { initMueveteTimer } from './components/muevete-timer.js';
import { initMcpBridge, mcpBridge } from './utils/mcp-bridge.js';

// Exportar módulo de auto-backup para uso en settings
export { autoBackup };

// Exportar funciones para uso en otros módulos
export { openCalmTimer, openSpontaneousModal, openEveningCheckIn, openVoiceCapture, openWeeklyReview };

// Exportar funciones de modos de uso
export { getVisibleViews, USAGE_MODES };

// Estado global de la aplicación
const state = {
  currentView: 'dashboard',
  data: null,
  initialized: false,
  pendingSync: null, // Datos pendientes de aplicar (cuando hay modal abierto)
  pendingSyncOrigen: null, // De dónde vienen los datos pendientes: 'nube' o 'pestana'
  pendingSyncBase: null // Copia de los datos como estaban cuando llegó lo pendiente
};

// Variable para rastrear último campo de texto activo (para dictado por voz)
let lastActiveTextField = null;

// Variable para rastrear el último elemento pulsado. Sirve para saber si el
// clic va a un botón del mismo bloque de edición: algunos navegadores no
// enfocan el botón al pulsarlo, y sin este dato el clic se perdería al
// repintar la vista.
let ultimoElementoPulsado = null;

// Vistas disponibles
const VIEWS = {
  'daily-setup': 'Configurar Día',
  dashboard: 'Dashboard',
  values: 'Brújula de Valores',
  'life-wheel': 'Rueda de la Vida',
  kanban: 'Agenda',
  projects: 'Proyectos',
  habits: 'Laboratorio de Hábitos',
  calendar: 'Calendario',
  journal: 'Diario',
  achievements: 'Logros',
  today: 'Hoy',
  muevete: 'Muévete',
  settings: 'Configuración',
  help: 'Ayuda',
  changelog: 'Novedades'
};

// La lista de vistas se exporta para que otros módulos puedan comprobar si una
// dirección corresponde a una vista que existe.
export { VIEWS };

// ============================================================
// DATOS QUE LLEGAN DE FUERA DE ESTA PESTAÑA
// ============================================================

/**
 * Dice si hay un modal abierto en pantalla.
 */
const hayModalAbierto = () => !!document.querySelector('dialog[open]');

/**
 * Dice si la usuaria está escribiendo en un campo de la vista actual.
 *
 * Se mira el elemento que tiene el foco dentro del contenido principal: si
 * es un campo de texto, lo que hay en pantalla todavía no está guardado y
 * aplicarle datos de fuera perdería lo escrito.
 */
const hayCampoConFoco = () => {
  const main = document.getElementById('app-content');
  const activo = document.activeElement;
  if (!main || !activo || !main.contains(activo)) return false;
  return activo.matches('input, textarea, [contenteditable]');
};

/**
 * Dice si el diario tiene algo escrito sin guardar.
 *
 * El editor del diario guarda un borrador aparte de los datos. Solo cuenta si
 * el editor está abierto de verdad (una entrada nueva o una entrada que se
 * está editando) y si el borrador es el de ese editor. Un borrador viejo
 * guardado en el listado del diario no significa que la usuaria esté
 * escribiendo ahora mismo: si contara, lo que llega de otra pestaña o de la
 * nube no se aplicaría nunca.
 */
const hayBorradorDelDiario = () => {
  if (state.currentView !== 'journal') return false;
  if (!esEditorDeDiarioAbierto(window.location.hash)) return false;
  if (!tieneBorradorPendiente()) return false;

  const ruta = parseRutaDiario(window.location.hash);
  return loadDraft(draftIdFor(ruta)) !== null;
};

/**
 * Dice si la usuaria está en mitad de algo: con un modal abierto o
 * escribiendo en un campo.
 */
const estaEditando = () => hayCampoConFoco() || hayBorradorDelDiario();

/**
 * Muestra un aviso, salvo que ya haya uno igual en pantalla.
 *
 * Los datos de otra pestaña llegan en ráfaga: cada guardado en la otra
 * pestaña dispara un aviso. Si se apilaran, la usuaria vería el mismo aviso
 * repetido varias veces seguidas.
 *
 * @param {string} message - El texto del aviso.
 * @param {string} [type='info'] - El tipo de aviso.
 * @returns {boolean} true si se ha mostrado el aviso.
 */
const mostrarAvisoSinRepetir = (message, type = 'info') => {
  const repetido = Array.from(document.querySelectorAll('.notification'))
    .some((aviso) => aviso.textContent === message);
  if (repetido) return false;

  showNotification(message, type);
  return true;
};

/**
 * Aplica lo que quedó pendiente de fuera, si ya se puede.
 *
 * Lo que llega de la nube se funde con lo que hay en memoria: así no se
 * pierde lo que la usuaria haya guardado mientras esperaba. Lo que llega de
 * otra pestaña depende de la decisión: si ya no es más nuevo que lo que hay
 * en memoria, se descarta; si la usuaria sigue escribiendo, espera.
 *
 * En los dos casos la fusión se hace sobre el mismo objeto de datos, sin
 * sustituir sus secciones: los módulos guardan referencias a ellas, y si se
 * sustituyeran, el guardado de un módulo escribiría encima de lo que acaba
 * de llegar.
 *
 * @returns {boolean} true si se han aplicado datos nuevos.
 */
const aplicarPendingSync = () => {
  if (!state.pendingSync) return false;

  const origen = state.pendingSyncOrigen;

  if (origen === 'pestana') {
    const decision = decidirCambioDePestana({
      updatedAtEnMemoria: state.data?.updatedAt,
      updatedAtRecibido: state.pendingSync?.updatedAt,
      hayModalAbierto: hayModalAbierto(),
      estaEditando: estaEditando()
    });

    if (decision === DECISION_IGNORAR) {
      state.pendingSync = null;
      state.pendingSyncOrigen = null;
      state.pendingSyncBase = null;
      return false;
    }

    if (decision === DECISION_APLAZAR) return false;
  } else if (hayModalAbierto() || estaEditando()) {
    // Lo que llega de la nube se funde con lo que hay, pero no mientras la
    // usuaria tenga algo a medias: reaplicar los datos repinta la vista, y
    // con ella se va el modal abierto y lo que la usuaria había escrito.
    return false;
  }

  // La fusión deja lo que la usuaria haya guardado durante la espera y trae
  // lo que vino de fuera en lo que no se haya tocado. Al fusionar, lo
  // pendiente queda vacío: si se quedara, la siguiente aplicación volvería a
  // fusionarlo y lo que la usuaria acaba de borrar reaparecería.
  fusionarPendiente(state);

  // Los datos de otra pestaña ya están dentro: la usuaria tiene que saberlo,
  // porque lo que ve en pantalla acaba de cambiar.
  if (origen === 'pestana') {
    mostrarAvisoSinRepetir(AVISO_DATOS_OTRA_PESTAÑA, 'info');
  }

  return true;
};

/**
 * Deja los datos listos para guardar sin pisar lo más nuevo de otra pestaña.
 *
 * Si quedó algo pendiente de otra pestaña y es más nuevo que lo que hay en
 * memoria, se funde con lo que hay: así este guardado deja dentro tanto lo
 * que venía de la otra pestaña como lo que la usuaria acaba de escribir.
 *
 * Si lo pendiente viene de la nube, se funde también: el guardado no puede
 * dejar fuera ni lo que venía de la nube ni lo que la usuaria acaba de
 * guardar.
 */
const prepararGuardado = () => {
  if (!state.data || !state.pendingSync) return;

  if (state.pendingSyncOrigen === 'nube') {
    // Lo que viene de la nube se funde con lo que hay y lo pendiente queda
    // vacío: si se quedara, al aplicar lo pendiente otra vez se volvería a
    // fusionar y lo que la usuaria acaba de borrar reaparecería.
    fusionarPendiente(state);
    return;
  }

  if (state.pendingSyncOrigen !== 'pestana') return;

  const decision = decidirCambioDePestana({
    updatedAtEnMemoria: state.data?.updatedAt,
    updatedAtRecibido: state.pendingSync?.updatedAt,
    hayModalAbierto: false,
    estaEditando: false
  });

  if (decision === DECISION_IGNORAR) {
    // Lo pendiente ya no es más nuevo que lo que hay aquí.
    state.pendingSync = null;
    state.pendingSyncOrigen = null;
    state.pendingSyncBase = null;
    return;
  }

  // Lo pendiente es más nuevo: se funde con lo que hay en memoria. La fusión
  // respeta lo que la usuaria haya cambiado y deja dentro lo que vino de la
  // otra pestaña, sin sustituir las secciones que los módulos tienen
  // guardadas.
  state.data = fusionarDatos(state.pendingSyncBase, state.data, state.pendingSync);
  state.pendingSync = null;
  state.pendingSyncOrigen = null;
  state.pendingSyncBase = null;

  // Lo de la otra pestaña acaba de entrar en el cuaderno: la usuaria tiene
  // que saberlo, porque lo que ve en pantalla va a cambiar.
  mostrarAvisoSinRepetir(AVISO_DATOS_OTRA_PESTAÑA, 'info');
};

/**
 * Aplica lo pendiente y avisa de que se han aplicado datos nuevos.
 *
 * Si la usuaria estaba escribiendo en un campo, el texto se le devuelve
 * después del repintado: la vista se repinta entera y con ella se iría lo
 * que estaba escrito. Solo se devuelve si sigue en la misma vista.
 *
 * @param {{id: string, valor: string, vista: string}|null} [campo] - Texto del
 *   campo que tenía el foco.
 */
const aplicarPendingSyncYAvisar = async (campo = null) => {
  const origen = state.pendingSyncOrigen;
  if (!aplicarPendingSync()) return;

  await renderView(state.currentView);
  if (campo && campo.vista === state.currentView) {
    restaurarTextoEnCampo(campo, document);
  }

  if (origen === 'nube') {
    showNotification('✓ Datos sincronizados desde la nube', 'success');
  }
};

/**
 * Avisa de lo que pasó al cargar los datos.
 *
 * Hay dos incidencias posibles: que no se pudiera leer lo que había
 * ('corrupt') o que se leyeran datos sueltos y tuvieran que quitarse
 * ('repaired'). La segunda también puede aparecer al sincronizar con la
 * nube, no solo al arrancar, así que la función se usa en los dos caminos.
 *
 * @param {string|null} issue - Incidencia pendiente.
 * @param {boolean} [enSincronizacion] - true si los datos vienen de la nube.
 */
const mostrarAvisoDeCarga = (issue, enSincronizacion = false) => {
  if (issue === 'corrupt') {
    if (enSincronizacion) {
      showNotification(
        'No se han podido leer los datos sincronizados. Oráculo ha conservado una copia de lo que había.',
        'warning'
      );
      return;
    }
    confirmDanger({
      title: 'No se han podido leer tus datos guardados',
      message: 'Oráculo ha conservado una copia de lo que había y ha empezado un cuaderno vacío. En Configuración puedes descargar esa copia o importar un backup si lo tienes.',
      confirmText: 'Ir a Configuración',
      cancelText: 'Cerrar',
      type: 'warning'
    }, () => navigateTo('settings'));
    return;
  }

  if (issue === 'repaired') {
    showNotification(
      'Algunos elementos de tus datos no eran válidos y se han quitado. El resto se ha conservado.',
      'warning'
    );
  }
};

/**
 * Inicializa la aplicación
 */
export const init = () => {
  if (state.initialized) return;

  // Cargar datos
  state.data = loadData();

  // Configurar navegación
  setupNavigation();

  // Configurar eventos globales
  setupGlobalEvents();

  // Inyectar temporizador de calma
  injectCalmTimerModal();

  // Inyectar modal de logros espontáneos
  injectSpontaneousModal();

  // Inyectar modal de evening check-in
  injectEveningCheckInModal();

  // Inyectar modal de captura por voz
  injectVoiceCaptureModal();

  // Inyectar modal de bienvenida (onboarding)
  injectWelcomeModal();

  // Inyectar modal de revisión semanal GTD
  injectWeeklyReviewModal();

  // Inicializar Muévete timer (motor global, persiste entre vistas)
  initMueveteTimer(state.data, updateData, () => state.data);

  // Actualizar menú según modo de uso
  updateMenuVisibility();

  // Configurar botón de voz en header
  setupVoiceButton();

  // Configurar botón de guardar backup en header
  setupSaveButton();

  // Configurar captura rápida GTD
  setupGlobalCapture();

  // Inicializar recordatorio de hábito
  setupHabitReminder();

  // Inicializar auto-backup
  initAutoBackup();

  // Mostrar indicador de novedades en el footer
  initChangelogDot();

  // Verificar si necesita Daily Setup (página en lugar de modal)
  const setupEnabled = state.data.burkemanSettings?.dailySetupEnabled !== false;
  const needsSetup = setupEnabled && needsDailySetup(state.data);

  // Determinar vista inicial respetando el hash de la URL
  const fullHash = window.location.hash.slice(1);
  const baseView = getBaseView(fullHash);

  // IMPORTANTE: Daily setup tiene prioridad sobre URL hash (filosofía Burkeman)
  // El usuario debe configurar su día ANTES de ir a cualquier otra vista
  if (needsSetup) {
    // Guardar destino original para después del setup (si hay uno válido)
    if (fullHash && VIEWS[baseView] && baseView !== 'daily-setup') {
      sessionStorage.setItem('oraculo_postSetupView', fullHash);
    }
    navigateTo('daily-setup');
  } else if (fullHash && VIEWS[baseView]) {
    navigateTo(baseView, fullHash);
  } else {
    navigateTo('dashboard');
  }

  state.initialized = true;

  mostrarAvisoDeCarga(consumeLoadIssue());

  console.log('Oráculo inicializado');
};

/**
 * Configura la navegación entre vistas
 */
const setupNavigation = () => {
  // Manejar clicks en navegación
  document.addEventListener('click', (e) => {
    const navLink = e.target.closest('[data-view]');
    if (navLink) {
      e.preventDefault();
      const view = navLink.dataset.view;
      navigateTo(view);
    }
  });

  // Manejar navegación del navegador (back/forward)
  window.addEventListener('popstate', (e) => {
    // Manejar navegación atrás/adelante del navegador
    // e.state puede ser null si el usuario navegó a un estado sin history.pushState
    const candidate = e.state?.view || getBaseView(location.hash.slice(1));
    const view = VIEWS[candidate] ? candidate : 'dashboard';
    renderView(view);
    updateActiveNav(view);
  });

  // Manejar cambios de hash (para subrutas como #journal/new/gratitude)
  window.addEventListener('hashchange', () => {
    const fullHash = window.location.hash.slice(1);
    const baseView = getBaseView(fullHash);

    // Solo re-renderizar si es una vista válida
    if (VIEWS[baseView]) {
      state.currentView = baseView;
      renderView(baseView);
      updateActiveNav(baseView);
    } else {
      // Una dirección desconocida lleva al inicio
      navigateTo('dashboard');
    }
  });
};

/**
 * Configura eventos globales
 */
const setupGlobalEvents = () => {
  // Advertencia de almacenamiento
  window.addEventListener('storage-warning', (e) => {
    showNotification(
      `Almacenamiento casi lleno (${e.detail.percentage}%). Considera exportar tus datos.`,
      'warning'
    );
  });

  // Escuchar cuando llegan datos sincronizados desde fuente externa
  window.addEventListener('data-synced-from-cloud', (e) => {
    console.log('[App] Datos sincronizados desde fuente externa');

    // Los datos de la nube se releen del almacenamiento en vez de usar los que
    // trae el evento. Así pasan por la misma normalización que el resto de
    // caminos (forma garantizada e identificadores seguros), que es lo que
    // evita que un dato externo rompa el marcado al pintarse.
    const fresh = loadData();

    // La carga puede haber tenido que quitar elementos sueltos. El aviso sale
    // también aquí, no solo al arrancar: si no, la usuaria ve que faltan
    // datos después de sincronizar y no sabe por qué.
    const loadIssue = consumeLoadIssue();

    // Copia de los datos como están ahora. Sirve de base para saber qué ha
    // cambiado en local mientras lo de la nube espera.
    const base = copiarDatos(state.data);

    if (hayModalAbierto() || estaEditando()) {
      // Hay un modal abierto o la usuaria escribiendo: los datos se guardan
      // para aplicar después, sin pisar lo que tiene a medias.
      console.log('[App] Editando o con modal abierto, difiriendo actualización');
      state.pendingSync = fresh;
      state.pendingSyncOrigen = 'nube';
      state.pendingSyncBase = base;
      if (hayModalAbierto()) {
        showNotification('Datos actualizados. Se aplicarán al cerrar el modal.', 'info');
      }
    } else {
      // No hay nada a medias: se funde y se aplica. La fusión deja lo que la
      // usuaria hubiera guardado justo antes y trae lo de la nube.
      state.data = fusionarDatos(base, state.data, fresh);
      renderView(state.currentView);
      showNotification('✓ Datos sincronizados desde la nube', 'success');
    }

    mostrarAvisoDeCarga(loadIssue, true);
  });

  // Aplicar sync pendiente cuando se cierra un modal
  document.addEventListener('close', (e) => {
    if (e.target.tagName !== 'DIALOG') return;
    console.log('[App] Modal cerrado, aplicando sync pendiente');
    aplicarPendingSyncYAvisar();
  }, true);

  // Al salir de un campo de edición se intenta aplicar lo pendiente, pero
  // solo si el foco ha salido del bloque de edición: si la usuaria pasa de un
  // campo a otro del mismo formulario, aplicar lo pendiente repinta la vista
  // y con ella se va lo que había escrito en el resto de campos, además de
  // perder el clic del botón.
  document.addEventListener('focusout', (e) => {
    const destino = e.target;
    if (!destino || typeof destino.matches !== 'function') return;
    if (!destino.matches('input, textarea, [contenteditable]')) return;

    // Si el foco sigue dentro del bloque de edición, no se hace nada: la
    // usuaria sigue escribiendo.
    if (!haSalidoDelBloqueDeEdicion({
      destino,
      nuevoFoco: e.relatedTarget,
      elementoPulsado: ultimoElementoPulsado
    })) return;

    // Se guarda lo que había escrito: al aplicar lo pendiente se repinta la
    // vista, y con ella se iría el texto del campo.
    const capturado = capturarTextoDeCampo(destino);
    const campo = capturado ? { ...capturado, vista: state.currentView } : null;

    // El elemento pulsado solo sirve para esta decisión: se suelta para que
    // no se confunda con el siguiente cambio de foco.
    ultimoElementoPulsado = null;

    setTimeout(() => aplicarPendingSyncYAvisar(campo), 0);
  });

  // Se anota lo último que se ha pulsado: al decidir si el foco ha salido
  // del bloque de edición, el clic en un botón del mismo bloque tiene que
  // llegar, y hay navegadores que no enfocan ese botón.
  document.addEventListener('mousedown', (e) => {
    ultimoElementoPulsado = e.target;
  }, true);

  // Guardar en localStorage antes de cerrar (sin diálogo)
  window.addEventListener('beforeunload', () => {
    if (state.data && shouldPersistOnUnload(state.data, localStorage.getItem('oraculo_data'))) {
      // Guardar directamente en localStorage
      try {
        state.data.updatedAt = new Date().toISOString();
        // Los datos se dejan en forma antes de escribirlos. Este camino no
        // pasa por el storage, así que es el único sitio donde se puede
        // colar un dato suelto que reviente la vista al cargarlo.
        ensureDataShape(state.data);
        // Los identificadores también se normalizan aquí: este camino
        // escribe en el almacenamiento sin pasar por la carga, y un
        // identificador con comillas o ángulos rompería el marcado al
        // pintarse.
        sanearIdentificadores(state.data);
        localStorage.setItem('oraculo_data', JSON.stringify(state.data));
      } catch (e) {
        console.warn('[App] Error guardando en beforeunload:', e);
      }
    }
  });

  // Otra pestaña ha guardado: esta deja de tener la última versión
  window.addEventListener('storage', (e) => {
    if (e.key !== 'oraculo_data') return;

    // Otra pestaña ha borrado todos los datos. Esta tampoco debe guardarlos
    // otra vez desde memoria, así que se queda con lo que haya ahora.
    const fresh = loadData();

    const conModal = hayModalAbierto();
    const decision = decidirCambioDePestana({
      updatedAtEnMemoria: state.data?.updatedAt,
      updatedAtRecibido: fresh?.updatedAt,
      hayModalAbierto: conModal,
      estaEditando: estaEditando()
    });

    if (decision === DECISION_IGNORAR) return;

    if (decision === DECISION_APLAZAR) {
      // La usuaria está escribiendo o con un modal abierto: los datos esperan
      // a que termine, para no perder lo que tiene a medias.
      console.log('[App] Editando o con modal abierto, difiriendo datos de otra pestaña');
      state.pendingSync = fresh;
      state.pendingSyncOrigen = 'pestana';
      // Copia de los datos como están ahora: sirve de base para saber qué ha
      // cambiado en local mientras lo de la otra pestaña espera.
      state.pendingSyncBase = copiarDatos(state.data);

      // Si lo que lo aplaza es un modal, se avisa de que los datos se aplicarán
      // al cerrarlo. Si lo único que hay es la usuaria escribiendo, no se avisa:
      // no se le interrumpe mientras escribe.
      const aviso = avisoDeDatosDePestana({ decision, hayModalAbierto: conModal });
      if (aviso) mostrarAvisoSinRepetir(aviso, 'info');
      return;
    }

    if (decision === DECISION_APLICAR) {
      // No hay nada a medias: se funde lo de la otra pestaña con lo que hay.
      // La fusión no sustituye las secciones, así que los módulos que
      // guardan una referencia a ellas siguen viendo los mismos objetos.
      state.data = fusionarDatos(copiarDatos(state.data), state.data, fresh);
      renderView(state.currentView);

      // La usuaria tiene que saber que lo que ve en pantalla acaba de cambiar.
      const aviso = avisoDeDatosDePestana({ decision, hayModalAbierto: conModal });
      if (aviso) mostrarAvisoSinRepetir(aviso, 'info');
    }
  });

  // Escuchar cambios en el modo de uso para actualizar el menú
  window.addEventListener('usage-mode-changed', () => {
    updateMenuVisibility();
  });

  // Menú hamburguesa para tablets/móviles
  const navToggle = document.querySelector('.nav-toggle');
  const appNav = document.querySelector('.app-nav');

  // El enlace de salto enfoca el contenido sin cambiar la dirección
  document.querySelector('.skip-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const main = document.getElementById('app-content');
    main.setAttribute('tabindex', '-1');
    main.focus();
  });

  if (navToggle && appNav) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = appNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen);
    });

    // Cerrar al hacer click en un link
    appNav.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        appNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });

    // Cerrar al hacer click fuera (ignorar clicks en modales)
    document.addEventListener('click', (e) => {
      // Ignorar clicks dentro de modales
      if (e.target.closest('dialog')) return;

      if (!e.target.closest('.app-header')) {
        appNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Escape cierra el menú móvil
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && appNav.classList.contains('is-open')) {
        appNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }
};

/**
 * Inyecta e inicializa el temporizador de calma
 */
const injectCalmTimerModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'calm-timer-container';
  modalContainer.innerHTML = renderCalmTimerModal();

  document.body.appendChild(modalContainer);
  initCalmTimer(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de logros espontáneos
 */
const injectSpontaneousModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'spontaneous-container';
  modalContainer.innerHTML = renderSpontaneousModal();

  document.body.appendChild(modalContainer);
  initSpontaneousModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de evening check-in
 */
const injectEveningCheckInModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'evening-check-in-container';
  modalContainer.innerHTML = renderEveningCheckInModal();

  document.body.appendChild(modalContainer);
  initEveningCheckInModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de captura por voz
 */
const injectVoiceCaptureModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'voice-capture-container';
  modalContainer.innerHTML = renderVoiceCaptureModal();

  document.body.appendChild(modalContainer);
  initVoiceCaptureModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de bienvenida (onboarding)
 */
const injectWelcomeModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'welcome-container';
  modalContainer.innerHTML = renderWelcomeModal();

  document.body.appendChild(modalContainer);
  initWelcomeModal(state.data, updateData);
};

/**
 * Inyecta e inicializa el modal de revisión semanal GTD
 */
const injectWeeklyReviewModal = () => {
  const modalContainer = document.createElement('div');
  modalContainer.id = 'weekly-review-container';
  modalContainer.innerHTML = renderWeeklyReviewModal();

  document.body.appendChild(modalContainer);
  initWeeklyReviewModal(state.data, updateData);
};

/**
 * Actualiza la visibilidad de las vistas en el menú según el modo de uso
 */
const updateMenuVisibility = () => {
  const usageMode = state.data.settings?.usageMode || 'complete';
  const visibleViews = getVisibleViews(usageMode);

  // Actualizar cada link de navegación
  document.querySelectorAll('[data-view]').forEach(link => {
    const view = link.dataset.view;

    // settings, help y changelog siempre visibles
    if (view === 'settings' || view === 'help' || view === 'changelog') {
      link.style.display = '';
      return;
    }

    // Mostrar u ocultar según el modo
    if (visibleViews.includes(view)) {
      link.style.display = '';
    } else {
      link.style.display = 'none';
    }
  });
};

/**
 * Configura el botón de voz en el header
 * Comportamiento:
 * - Si hay campo de texto activo → dicta ahí
 * - Si no hay campo → abre modal de captura rápida
 *
 * Nota: Usamos lastActiveTextField porque al hacer clic en el botón,
 * el campo de texto pierde el foco ANTES del evento click.
 */
const setupVoiceButton = () => {
  const voiceBtn = document.getElementById('global-voice-btn');
  if (!voiceBtn) return;

  // Verificar soporte
  if (!isSpeechSupported()) {
    voiceBtn.classList.add('btn--disabled');
    voiceBtn.title = 'Dictado no disponible en este navegador';
    voiceBtn.addEventListener('click', () => {
      showNotification('Dictado por voz no disponible en este navegador', 'warning');
    });
    return;
  }

  const speechHandler = getSpeechHandler();

  // Rastrear campos de texto cuando reciben foco
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (
      (el.tagName === 'INPUT' && ['text', 'search', 'url', 'tel', 'email'].includes(el.type)) ||
      el.tagName === 'TEXTAREA' ||
      el.isContentEditable
    ) {
      lastActiveTextField = el;
    }
  });

  // Limpiar referencia cuando el foco va a otro lugar que no sea el botón de voz
  document.addEventListener('focusout', (e) => {
    // Pequeño delay para que el nuevo foco se establezca
    setTimeout(() => {
      const newFocus = document.activeElement;
      // Solo limpiar si el nuevo foco no es el botón de voz ni el campo anterior
      if (newFocus !== voiceBtn && newFocus !== lastActiveTextField) {
        lastActiveTextField = null;
      }
    }, 10);
  });

  // Click en botón de voz - usar lastActiveTextField
  voiceBtn.addEventListener('click', () => {
    if (lastActiveTextField && document.body.contains(lastActiveTextField)) {
      // Hay campo guardado → dictar directamente ahí
      startInlineDictation(lastActiveTextField, voiceBtn, speechHandler);
    } else {
      // No hay campo → abrir modal de captura
      lastActiveTextField = null;
      openVoiceCapture();
    }
  });
};

/**
 * Inicia dictado directo en un campo de texto
 */
const startInlineDictation = (field, voiceBtn, speechHandler) => {
  // Actualizar estado visual del botón
  voiceBtn.classList.add('btn--listening');

  // Listeners temporales para esta sesión
  const onResult = ({ final }) => {
    if (final) {
      speechHandler.insertAtCursor(field, final);
    }
  };

  const onEnd = () => {
    voiceBtn.classList.remove('btn--listening');
    cleanup();
  };

  const onError = ({ message }) => {
    voiceBtn.classList.remove('btn--listening');
    showNotification(message, 'warning');
    cleanup();
  };

  const cleanup = () => {
    speechHandler.off('result', onResult);
    speechHandler.off('end', onEnd);
    speechHandler.off('error', onError);
  };

  // Registrar listeners
  speechHandler.on('result', onResult);
  speechHandler.on('end', onEnd);
  speechHandler.on('error', onError);

  // Iniciar
  speechHandler.start();
};

/**
 * Configura el botón de guardar backup en el header
 */
const setupSaveButton = () => {
  const saveBtn = document.getElementById('global-save-btn');
  if (!saveBtn) return;

  // Verificar soporte de File System Access API
  if (!autoBackup.isSupported()) {
    // Fallback: el botón descargará el archivo
    saveBtn.title = 'Descargar copia de seguridad';
  }

  // Actualizar estado visual inicial
  updateSaveButtonState(saveBtn);

  // Click en botón de guardar
  saveBtn.addEventListener('click', async () => {
    // Evitar doble click
    if (saveBtn.classList.contains('saving')) return;

    try {
      // Estado: guardando
      saveBtn.classList.add('saving');
      saveBtn.classList.remove('saved', 'error', 'unlinked');

      // Guardar datos actuales
      const result = await autoBackup.smartSave(state.data);

      saveBtn.classList.remove('saving');

      if (result.success) {
        // Estado: guardado exitoso
        saveBtn.classList.add('saved');

        const message = result.method === 'download'
          ? `Backup descargado: ${result.filename}`
          : `Backup guardado en ${result.folder}`;
        showNotification(message, 'success');

        // Volver al estado normal después de 2 segundos
        setTimeout(() => {
          saveBtn.classList.remove('saved');
          updateSaveButtonState(saveBtn);
        }, 2000);
      } else if (result.error === 'CANCELLED') {
        // Usuario canceló
        updateSaveButtonState(saveBtn);
      } else {
        // Error
        saveBtn.classList.add('error');
        showNotification('No se pudo guardar el backup', 'warning');

        setTimeout(() => {
          saveBtn.classList.remove('error');
          updateSaveButtonState(saveBtn);
        }, 2000);
      }
    } catch (error) {
      console.error('[SaveButton] Error:', error);
      saveBtn.classList.remove('saving');
      saveBtn.classList.add('error');
      showNotification('Error al guardar: ' + error.message, 'warning');

      setTimeout(() => {
        saveBtn.classList.remove('error');
        updateSaveButtonState(saveBtn);
      }, 2000);
    }
  });

  // Escuchar eventos de backup automático
  window.addEventListener('backup-saved', (e) => {
    const { filename, folder } = e.detail;
    console.log(`[AutoBackup] Guardado automático: ${filename} en ${folder}`);
    // Pequeño feedback visual
    saveBtn.classList.add('saved');
    setTimeout(() => {
      saveBtn.classList.remove('saved');
    }, 1000);
  });
};

/**
 * Configura la captura rápida GTD en el header
 * Captura "cosas" sin procesarlas (sin decidir horizonte)
 */
/**
 * Recordatorio de hábito a la hora programada
 * Verifica cada minuto si es la hora del hábito y envía notificación
 */
const initChangelogDot = () => {
  const dot = document.getElementById('changelog-dot');
  if (!dot) return;
  try {
    const { LATEST_VERSION } = window.__changelogCache || {};
    // Lazy import — no bloquea el arranque
    import('./data/changelog.js').then(mod => {
      window.__changelogCache = mod;
      const seen = localStorage.getItem('oraculo_changelog_seen');
      dot.hidden = seen === mod.LATEST_VERSION;
    }).catch(() => {});
  } catch (e) { /* no crítico */ }
};

const setupHabitReminder = () => {
  // En Capacitor: usar notificacion nativa programada (funciona en background)
  if (window.__ORACULO_CAPACITOR__) {
    scheduleNativeHabitReminder();
    return;
  }

  let lastNotifiedMinute = null;

  const checkHabitTime = () => {
    const habit = state.data?.habits?.active;
    if (!habit || !habit.scheduledTime) return;

    // Verificar si ya se completó hoy
    const today = new Date().toISOString().split('T')[0];
    const history = state.data.habits?.history || [];
    const completedToday = history.some(h => h.habitId === habit.id && h.date === today);
    if (completedToday) return;

    // Comparar hora actual con la programada
    const now = new Date();
    const currentMinute = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (currentMinute === habit.scheduledTime && lastNotifiedMinute !== currentMinute) {
      lastNotifiedMinute = currentMinute;

      // Enviar notificación
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(`Hora de: ${habit.name}`, {
            body: habit.micro ? `Empieza con: ${habit.micro}` : 'Tu hábito te espera',
            tag: 'habit-reminder'
          });
        } catch (e) {
          showNotification(`Hora de: ${habit.name}`, 'info');
        }
      } else {
        showNotification(`Hora de: ${habit.name}`, 'info');
      }
    }
  };

  // Verificar cada 30 segundos
  setInterval(checkHabitTime, 30000);
  // Verificar inmediatamente
  checkHabitTime();
};

/**
 * Programa recordatorio nativo diario para el habito activo (Capacitor)
 */
const scheduleNativeHabitReminder = async () => {
  const habit = state.data?.habits?.active;
  if (!habit || !habit.scheduledTime) return;

  try {
    const { scheduleHabitNotification } = await import('./capacitor-bridge.js');
    const [hour, minute] = habit.scheduledTime.split(':').map(Number);
    await scheduleHabitNotification({
      title: `Hora de: ${habit.name}`,
      body: habit.micro ? `Empieza con: ${habit.micro}` : 'Tu hábito te espera',
      hour,
      minute
    });
  } catch (e) {
    console.warn('[Capacitor] Error programando recordatorio habito:', e);
  }
};

const setupGlobalCapture = () => {
  const input = document.getElementById('global-capture-input');
  const btn = document.getElementById('global-capture-btn');
  const counter = document.getElementById('capture-counter');

  if (!input || !btn) return;

  /**
   * Captura una idea con parsing inteligente.
   *
   * La sintaxis la lee `parseCapture` (utils/captura.js), que es lógica pura
   * y está cubierta por pruebas.
   */
  const capture = () => {
    const rawText = input.value.trim();
    if (!rawText) {
      input.focus();
      return;
    }

    const parsed = parseCapture(rawText, state.data.projects || []);

    if (!/[\p{L}\p{N}]/u.test(parsed.text)) {
      showNotification('Falta el texto de la idea. Escribe algo además de los símbolos.', 'warning');
      input.focus();
      return;
    }

    // Verificar límites del horizonte destino
    const limit = getHorizonLimit(state.data, parsed.horizon);
    if (limit !== null) {
      const current = countActive(state.data.objectives?.[parsed.horizon]);
      if (current >= limit) {
        showNotification(`${parsed.horizon === 'daily' ? 'Prioridades' : parsed.horizon} está lleno (${current}/${limit}). Va a Pendientes.`, 'warning');
        parsed.horizon = 'backlog';
      }
    }

    // Crear tarea
    // Si hay algo más nuevo guardado en otra pestaña, se adopta como base
    // antes de guardar: así esta captura no lo deja fuera.
    prepararGuardado();

    const newTask = {
      id: generateId(),
      text: parsed.text,
      notes: null,
      projectId: parsed.projectId,
      taskType: parsed.isImportant ? IMPORTANT_TASK_TYPE : null,
      completed: false,
      createdAt: new Date().toISOString()
    };

    // Asegurar que existen los objetivos
    if (!state.data.objectives) state.data.objectives = {};
    if (!state.data.objectives[parsed.horizon]) state.data.objectives[parsed.horizon] = [];

    // Añadir al inicio del horizonte
    state.data.objectives[parsed.horizon].unshift(newTask);

    // Stamp para merge inteligente cross-device
    if (!state.data._sectionMeta) state.data._sectionMeta = {};
    state.data._sectionMeta[`objectives.${parsed.horizon}`] = { updatedAt: new Date().toISOString() };

    saveData(state.data);

    // Limpiar input
    input.value = '';
    input.focus();

    // Feedback visual con contexto
    const project = parsed.projectId ? (state.data.projects || []).find(p => p.id === parsed.projectId) : null;
    const horizonNames = { backlog: 'Pendientes', weekly: 'Semana', monthly: 'Mes', quarterly: 'Trimestre', daily: 'Prioridades' };
    let msg = `Capturado en ${horizonNames[parsed.horizon] || 'Pendientes'}`;
    if (project) msg += ` (${project.name})`;
    if (parsed.isImportant) msg += ' !';
    if (parsed.unknownTag) msg += `. No hay ningún proyecto «${parsed.unknownTag}»`;
    showNotification(msg, 'success');

    // Actualizar contador
    updateCaptureCounter();

    // Re-renderizar si estamos en kanban o dashboard
    if (state.currentView === 'kanban' || state.currentView === 'dashboard') {
      renderView(state.currentView);
    }
  };

  /**
   * Actualiza el badge contador de ideas sin procesar
   */
  const updateCaptureCounter = () => {
    const backlogCount = state.data.objectives?.backlog?.length || 0;
    if (counter) {
      const numEl = counter.querySelector('.capture-banner__counter-num');
      if (numEl) {
        numEl.textContent = backlogCount;
      }
      counter.hidden = backlogCount === 0;
    }
  };

  // Event listeners
  btn.addEventListener('click', capture);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      capture();
    }
  });

  // Mostrar hint al enfocar (solo la primera vez)
  let hintShown = localStorage.getItem('oraculo_captureHintShown');
  if (!hintShown) {
    input.addEventListener('focus', () => {
      if (!hintShown) {
        showNotification('Anota "la cosa", no la acción. Ej: "Ana", no "Llamar a Ana"', 'info');
        localStorage.setItem('oraculo_captureHintShown', 'true');
        hintShown = true;
      }
    }, { once: true });
  }

  // Actualizar contador inicial
  updateCaptureCounter();

  // Actualizar contador cuando cambian los datos
  window.addEventListener('data-updated', (e) => {
    if (e.detail.section === 'objectives' || e.detail.section === 'objectives.backlog') {
      updateCaptureCounter();
    }
  });
};

/**
 * Actualiza el estado visual del botón de guardar
 */
const updateSaveButtonState = (btn) => {
  btn.classList.remove('saving', 'saved', 'error');

  if (autoBackup.hasLinkedFolder()) {
    btn.classList.remove('unlinked');
    btn.title = `Guardar backup (${autoBackup.getFolderName()})`;
  } else if (autoBackup.isSupported()) {
    btn.classList.add('unlinked');
    btn.title = 'Vincular carpeta para backups';
  } else {
    btn.classList.remove('unlinked');
    btn.title = 'Descargar copia de seguridad';
  }
};

/**
 * Inicializa el sistema de auto-backup
 */
const initAutoBackup = async () => {
  const hasFolder = await autoBackup.init(() => state.data);

  if (hasFolder) {
    console.log('[AutoBackup] Sistema inicializado con carpeta:', autoBackup.getFolderName());

    // Programar auto-guardado cuando los datos cambien
    window.addEventListener('data-updated', () => {
      autoBackup.scheduleAutoSave();
    });
  } else if (autoBackup.isSupported()) {
    console.log('[AutoBackup] Sistema listo, sin carpeta vinculada');
  } else {
    console.log('[AutoBackup] File System API no soportada, usando fallback');
  }

  // Actualizar botón
  const saveBtn = document.getElementById('global-save-btn');
  if (saveBtn) {
    updateSaveButtonState(saveBtn);
  }
};

/**
 * Navega a una vista específica
 *
 * @param {string} viewName - La vista a la que se navega.
 * @param {string} [hashCompleto] - La dirección de partida. Si su subruta
 *   pertenece a esta vista, se conserva: `#journal/new/free` abre el editor
 *   de escritura libre en lugar del listado del diario.
 */
export const navigateTo = (viewName, hashCompleto) => {
  if (!VIEWS[viewName]) {
    console.error('Vista no encontrada:', viewName);
    return;
  }

  // Limpiar referencia a campo de texto de la vista anterior
  // para evitar que el dictado por voz apunte a elementos obsoletos
  lastActiveTextField = null;

  state.currentView = viewName;

  // Actualizar URL sin recargar. La subruta solo se conserva si es de esta
  // vista: si no, se va a la vista a secas.
  const hash = elegirHashDeNavegacion(viewName, hashCompleto);
  history.pushState({ view: viewName }, '', `#${hash}`);

  // Renderizar
  renderView(viewName);

  // Actualizar navegación activa
  updateActiveNav(viewName);
};

/**
 * Renderiza una vista en el contenedor principal
 */
const renderView = async (viewName) => {
  const container = document.getElementById('app-content');
  if (!container) return;

  // Al cambiar de vista se aplica lo pendiente de otra pestaña: la usuaria
  // ya no está escribiendo en la vista que se cierra.
  aplicarPendingSync();

  // Mostrar loading
  container.innerHTML = '<div class="loading">Cargando...</div>';

  // El nombre de la vista decide el módulo que se carga. Solo se acepta un
  // nombre que está en la lista de vistas: si no, se trata como una vista
  // desconocida en vez de construir una ruta a partir de lo que venga.
  if (!Object.hasOwn(VIEWS, viewName)) {
    console.error('[App] Vista no conocida:', viewName);
    renderViewError(container, viewName);
    return;
  }

  try {
    // Importar y renderizar el módulo correspondiente
    const module = await import(`./modules/${viewName === 'dashboard' ? 'dashboard' : viewName}.js`);

    if (module.render) {
      container.innerHTML = '';
      const content = module.render(state.data);

      if (typeof content === 'string') {
        container.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        container.appendChild(content);
      }

      // Inicializar eventos del módulo
      if (module.init) {
        module.init(state.data, updateData);
      }
    }
  } catch (error) {
    console.error(`[App] No se ha podido cargar la vista "${viewName}":`, error);
    renderViewError(container, viewName);
  }
};

/**
 * Pinta el aviso de que una vista no se ha podido cargar.
 *
 * @param {HTMLElement} container - Contenedor donde se pinta.
 * @param {string} viewName - Nombre de la vista que no se pudo cargar.
 */
const renderViewError = (container, viewName) => {
  container.innerHTML = `
    <div class="empty-state empty-state--large">
      <span class="material-symbols-outlined icon-xl">error_outline</span>
      <h3>No se pudo cargar "${escapeHTML(VIEWS[viewName] || viewName)}"</h3>
      <p>Puede que haya un problema temporal. Intenta volver al inicio.</p>
      <button class="btn btn--primary" onclick="window.location.hash='dashboard'">
        <span class="material-symbols-outlined icon-sm">home</span>
        Volver al inicio
      </button>
    </div>
  `;
};

/**
 * Actualiza la navegación activa
 *
 * Solo se marca el enlace de la barra lateral: el logo, los botones de la
 * cabecera y el enlace del pie también llevan `data-view`, pero no son
 * elementos de navegación y no deben llevar el estado de "página actual".
 */
const updateActiveNav = (viewName) => {
  document.querySelectorAll('.app-nav [data-view]').forEach(link => {
    const active = link.dataset.view === viewName;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
};

/**
 * Actualiza los datos y persiste
 */
export const updateData = (section, newData) => {
  // Si hay algo más nuevo guardado en otra pestaña, se adopta como base
  // antes de guardar: así este guardado no lo deja fuera.
  prepararGuardado();

  if (section.includes('.')) {
    const parts = section.split('.');
    let target = state.data;
    for (let i = 0; i < parts.length - 1; i++) {
      target = target[parts[i]];
    }
    target[parts[parts.length - 1]] = newData;
  } else {
    state.data[section] = newData;
  }

  // Stamp para merge inteligente cross-device (Google Drive sync)
  if (!state.data._sectionMeta) state.data._sectionMeta = {};
  state.data._sectionMeta[section] = { updatedAt: new Date().toISOString() };

  saveData(state.data);

  // Emitir evento para que los módulos puedan reaccionar
  window.dispatchEvent(new CustomEvent('data-updated', {
    detail: { section, data: newData }
  }));
};

/**
 * Obtiene los datos actuales
 */
export const getData = () => state.data;

/**
 * Recarga el estado desde localStorage
 * Útil después de importar datos para sincronizar state.data
 */
export const reloadStateFromStorage = () => {
  state.data = loadData();
  return state.data;
};

/**
 * Muestra una notificación
 */
export const showNotification = (message, type = 'info') => {
  const notification = document.createElement('div');
  notification.className = `notification notification--${type}`;
  notification.textContent = message;

  // Atributos de accesibilidad
  notification.setAttribute('role', 'alert');
  notification.setAttribute('aria-live', type === 'warning' || type === 'danger' ? 'assertive' : 'polite');

  document.body.appendChild(notification);

  // Animar entrada
  requestAnimationFrame(() => {
    notification.classList.add('notification--visible');
  });

  // Remover después de 4 segundos
  setTimeout(() => {
    notification.classList.remove('notification--visible');
    setTimeout(() => notification.remove(), 300);
  }, 4000);
};

/**
 * Formatea una fecha para mostrar
 */
export const formatDate = (date, options = {}) => {
  const d = new Date(date);
  const defaultOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  };
  return d.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
};

/**
 * Genera un ID único
 */
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Registra un tombstone de eliminacion para sync cross-device.
 * Llamar ANTES de hacer filter/splice para borrar un item de un array.
 * Exportado aqui para que los modulos puedan importarlo junto a generateId, etc.
 */
export const recordDeletion = (data, section, itemId) => {
  if (!data._deletions) data._deletions = [];
  const exists = data._deletions.some(d => d.section === section && d.itemId === itemId);
  if (!exists) {
    data._deletions.push({
      section,
      itemId,
      deletedAt: new Date().toISOString()
    });
  }
};

// Bootstrap: cargar storage dinámicamente según contexto e iniciar app
const bootstrap = async () => {
  const isExtension = !!(window.__ORACULO_EXTENSION__ || (typeof chrome !== 'undefined' && chrome.runtime?.id));
  const isCapacitor = !!window.__ORACULO_CAPACITOR__;

  const mod = isExtension
    ? await import('./storage-local.js')
    : await import('./storage-hybrid.js');
  _storage = mod;

  // Inicializar plugins nativos en Capacitor
  if (isCapacitor) {
    try {
      const { initCapacitorPlugins } = await import('./capacitor-bridge.js');
      await initCapacitorPlugins();
    } catch (e) {
      console.warn('[Capacitor] Error inicializando plugins:', e);
    }
  }

  init();

  // Inicializar Google Drive Sync (no bloquea el arranque)
  try {
    const gdriveSync = await import('./gdrive/sync.js');
    const platform = isExtension ? 'extension' : isCapacitor ? 'capacitor' : 'web';
    gdriveSync.init(platform);
    initSyncButton(gdriveSync);
  } catch (e) {
    console.warn('[GDrive] Sync no disponible:', e.message);
  }

  // Inicializar MCP Bridge (solo web, solo si el usuario lo activó)
  // Se inicializa DESPUÉS de GDrive para que ambos escuchen data-saved sin conflicto.
  // El bridge escribe al archivo externo; nunca emite data-saved ni toca localStorage.
  if (!isExtension && !isCapacitor) {
    try {
      initMcpBridge(loadData);
      // NO emitimos notificaciones en bootstrap. Si enabled=true pero no hay handle
      // (caso normal tras recarga), la UI de Configuración mostrará el banner
      // "Reconectar" cuando la usuaria entre. No spameamos notificaciones globales.
    } catch (e) {
      console.warn('[McpBridge] No disponible:', e.message);
    }
  }
};

function initSyncButton(gdriveSync) {
  const btn = document.getElementById('global-sync-btn');
  const icon = document.getElementById('global-sync-icon');
  if (!btn || !icon) return;

  let _tokenExpiredNotified = false;

  function updateIcon() {
    const connected = gdriveSync.isConnected();
    btn.style.display = 'flex';
    btn.classList.toggle('sync-connected', connected);

    const info = gdriveSync.getSyncInfo();
    if (connected && info.syncHealth === 'token_expired') {
      icon.textContent = 'sync_problem';
      btn.title = 'Sesion de Drive expirada - clic para reconectar';
      btn.classList.add('sync-error');
    } else if (connected && info.syncHealth === 'error') {
      icon.textContent = 'cloud_off';
      btn.title = 'Error de sincronizacion - clic para reintentar';
      btn.classList.add('sync-error');
    } else if (connected) {
      icon.textContent = 'cloud_done';
      btn.title = 'Sincronizar con Google Drive';
      btn.classList.remove('sync-error');
    } else {
      icon.textContent = 'cloud_off';
      btn.title = 'Conectar Google Drive';
      btn.classList.remove('sync-error');
    }
  }

  updateIcon();

  btn.addEventListener('click', async () => {
    const info = gdriveSync.getSyncInfo();

    // Si el token expiro, reconectar directamente
    if (info.syncHealth === 'token_expired' && gdriveSync.isConnected()) {
      icon.textContent = 'sync';
      btn.disabled = true;
      try {
        await gdriveSync.connect();
        _tokenExpiredNotified = false;
        showNotification('Google Drive reconectado', 'success');
      } catch (err) {
        if (err.message !== 'popup_closed_by_user') {
          showNotification('Error al reconectar: ' + err.message, 'error');
        }
      } finally {
        btn.disabled = false;
        updateIcon();
      }
      return;
    }

    if (gdriveSync.isConnected()) {
      icon.textContent = 'sync';
      btn.disabled = true;
      try {
        await gdriveSync.syncNow();
        showNotification('Datos sincronizados', 'success');
      } catch (err) {
        showNotification('Error al sincronizar', 'error');
      } finally {
        btn.disabled = false;
        updateIcon();
      }
    } else {
      // Conectar directamente
      icon.textContent = 'sync';
      btn.disabled = true;
      try {
        await gdriveSync.connect();
        showNotification('Google Drive conectado', 'success');
      } catch (err) {
        if (err.message !== 'popup_closed_by_user') {
          showNotification('Error al conectar: ' + err.message, 'error');
        }
      } finally {
        btn.disabled = false;
        updateIcon();
      }
    }
  });

  window.addEventListener('gdrive-sync-status', (e) => {
    updateIcon();

    const { status, syncHealth } = e.detail;

    if (syncHealth === 'token_expired' && !_tokenExpiredNotified) {
      _tokenExpiredNotified = true;
      showNotification('Sesion de Google Drive expirada. Pulsa el icono de nube para reconectar.', 'error');
    } else if (status === 'synced' || status === 'connected') {
      _tokenExpiredNotified = false;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
