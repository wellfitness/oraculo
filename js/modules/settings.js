/**
 * Oráculo - Módulo de Configuración
 * Gestión de datos, cuadernos anuales y preferencias
 */

import { showNotification, autoBackup, reloadStateFromStorage, USAGE_MODES, openWeeklyReview } from '../app.js';
import {
  exportData,
  saveData,
  getStorageUsage,
  clearAllData,
  clearIdentityData,
  clearProductivityData,
  clearJournalData,
  archiveCurrentYear,
  startNewYear,
  loadArchivedYear,
  generateYearSummary,
  getNextNotebookYear,
  parseImportFile,
  parseImportText,
  summarizeBackup,
  applyImportedData,
  loadDataSinIncidencia,
  tieneCopiaCorrupta,
  leerCopiaCorrupta,
  borrarCopiaCorrupta
} from '../storage-hybrid.js';
import { escapeHTML, numeroSeguro } from '../utils/sanitizer.js';
import { comprobarBackupCopiable } from '../utils/validator.js';
import { confirmDangerAsync } from '../utils/confirm-modal.js';
import * as gcalSettings from '../gcal/gcal-settings.js';
import { mcpBridge, McpBridge } from '../utils/mcp-bridge.js';

let updateDataCallback = null;
let archivedYearData = null; // Para el visor de años anteriores

/**
 * Formatea la fecha de la última revisión semanal
 */
const formatReviewDate = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long'
  });
};

/**
 * Renderiza el bloque de la copia de los datos que no se pudieron leer.
 *
 * Solo se pinta cuando hay una copia guardada: si no hay nada que
 * recuperar, el bloque no ocupa sitio ni distrae de lo que sí importa.
 *
 * @returns {string} El marcado del bloque.
 */
const renderCopiaCorrupta = () => `
  <section class="corrupt-copy" id="corrupt-copy-block" aria-labelledby="corrupt-copy-title">
    <div class="corrupt-copy__cabecera">
      <span class="material-symbols-outlined">report</span>
      <h3 class="corrupt-copy__title" id="corrupt-copy-title">Copia de datos que no se pudieron leer</h3>
    </div>
    <p class="corrupt-copy__texto">
      Cuando tus datos no se pudieron leer, Oráculo guardó una copia tal como estaba. Puedes descargarla para intentar recuperarla.
    </p>
    <div class="corrupt-copy__acciones">
      <button class="btn btn--secondary" id="download-corrupt-btn">
        <span class="material-symbols-outlined">download</span>
        Descargar copia
      </button>
      <button class="btn btn--warning" id="delete-corrupt-btn">
        <span class="material-symbols-outlined">delete</span>
        Borrar copia
      </button>
    </div>
  </section>
`;

/**
 * Renderiza la página de configuración
 */
export const render = (data) => {
  const usage = getStorageUsage();
  const notebook = data.notebook || { year: new Date().getFullYear() };
  const archivedNotebooks = data.archivedNotebooks || [];
  const currentYear = notebook.year;
  const nextYear = getNextNotebookYear(data);
  const anioCuaderno = numeroSeguro(notebook.year);

  return `
    <div class="settings-page">
      <header class="page-header">
        <h1 class="page-title">
          <span class="material-symbols-outlined icon-lg">settings</span>
          Configuración
        </h1>
        <p class="page-description">
          Gestiona tus datos y personaliza tu experiencia.
        </p>
      </header>

      <!-- Cuadernos Anuales -->
      <section class="settings-section settings-section--notebooks">
        <h2>
          <span class="material-symbols-outlined">book</span>
          Cuadernos Anuales
        </h2>
        <p class="section-description">
          Como un Bullet Journal: al terminar el año, archiva y empieza limpio.
        </p>

        <div class="current-notebook">
          <div class="notebook-info">
            <span class="material-symbols-outlined notebook-icon">menu_book</span>
            <div>
              <strong>${escapeHTML(notebook.name || `Cuaderno ${notebook.year}`)}</strong>
              <span class="notebook-since">
                Desde ${formatDate(notebook.startedAt)}
              </span>
            </div>
          </div>

          <div class="notebook-summary">
            ${renderCurrentSummary(data)}
          </div>
        </div>

        <div class="notebook-actions">
          <button class="btn btn--primary" id="archive-year-btn">
            <span class="material-symbols-outlined">inventory_2</span>
            Archivar ${anioCuaderno} y empezar ${nextYear}
          </button>
          <p class="action-hint">
            Esto descargará un archivo con todos tus datos del año y empezará un cuaderno limpio.
          </p>
        </div>

        ${archivedNotebooks.length > 0 ? `
          <div class="archived-years">
            <h3>Años anteriores</h3>
            <ul class="archived-list">
              ${archivedNotebooks.map(nb => `
                <li class="archived-item">
                  <div class="archived-info">
                    <span class="material-symbols-outlined">inventory_2</span>
                    <div>
                      <strong>${escapeHTML(nb.name)}</strong>
                      <span class="archived-date">Archivado ${formatDate(nb.archivedAt)}</span>
                    </div>
                  </div>
                  ${nb.summary ? `
                    <div class="archived-summary">
                      ${numeroSeguro(nb.summary.totalTasksCompleted)} tareas,
                      ${numeroSeguro(nb.summary.habitsGraduated)} hábitos,
                      ${numeroSeguro(nb.summary.journalEntries)} entradas
                    </div>
                  ` : ''}
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="import-archived">
          <label class="btn btn--secondary">
            <span class="material-symbols-outlined">upload</span>
            Importar cuaderno anterior para consultar
            <input type="file" id="import-archived-input" accept=".json" hidden>
          </label>
        </div>
      </section>

      <!-- Sincronizar entre Dispositivos -->
      ${renderSyncSection(data)}

      <!-- Respaldo Automático (local) -->
      ${renderAutoBackupSection()}

      <!-- Agente IA (MCP) -->
      ${renderMcpSection()}

      <!-- Datos -->
      <section class="settings-section">
        <h2>
          <span class="material-symbols-outlined">database</span>
          Datos
        </h2>

        <div class="local-storage-notice">
          <span class="material-symbols-outlined">${window.__ORACULO_CAPACITOR__ ? 'phone_android' : 'smartphone'}</span>
          <div>
            <strong>Tus datos viven en este dispositivo</strong>
            <p>${window.__ORACULO_CAPACITOR__
              ? 'Oráculo guarda todo localmente en esta app. Si tienes Google Backup activo, se respaldan automáticamente. Puedes exportar un backup manual en cualquier momento.'
              : 'Oráculo guarda todo localmente en tu navegador. Usa la app siempre desde el mismo dispositivo (recomendamos tu móvil principal) para mantener tu información sincronizada.'
            }</p>
          </div>
        </div>

        <div class="storage-info">
          <p>Espacio usado: ${usage.usedMB} MB de ~${usage.maxMB} MB (${usage.percentage}%)</p>
          <div class="storage-bar">
            <div class="storage-bar__fill ${usage.percentage > 80 ? 'warning' : ''}" style="width: ${usage.percentage}%"></div>
          </div>
        </div>

        ${tieneCopiaCorrupta() ? renderCopiaCorrupta() : ''}

        <div class="settings-actions">
          <button class="btn btn--secondary" id="export-data-btn">
            <span class="material-symbols-outlined">download</span>
            Exportar backup
          </button>
          <label class="btn btn--secondary">
            <span class="material-symbols-outlined">upload</span>
            Importar backup
            <input type="file" id="import-data-input" accept=".json" hidden>
          </label>
          ${window.__ORACULO_CAPACITOR__ ? '' : `
          <button class="btn btn--secondary" id="copy-data-btn" title="Copiar datos al portapapeles para sincronizar con la extensión Chrome o viceversa">
            <span class="material-symbols-outlined">content_copy</span>
            Copiar datos
          </button>
          <button class="btn btn--secondary" id="paste-data-btn" title="Pegar datos desde el portapapeles (web ↔ extensión)">
            <span class="material-symbols-outlined">content_paste</span>
            Pegar datos
          </button>
          `}
        </div>
      </section>

      <!-- Notificaciones -->
      <section class="settings-section">
        <h2>
          <span class="material-symbols-outlined">notifications</span>
          Notificaciones
        </h2>
        <label class="toggle-label">
          <input type="checkbox" id="notifications-toggle" ${data.settings?.notificationsEnabled ? 'checked' : ''}>
          <span>${window.__ORACULO_CAPACITOR__ ? 'Activar notificaciones (breaks y hábitos)' : 'Activar notificaciones del navegador'}</span>
        </label>
      </section>

      <!-- Revisión Semanal GTD -->
      <section class="settings-section settings-section--review">
        <h2>
          <span class="material-symbols-outlined">checklist_rtl</span>
          Revisión Semanal
        </h2>

        <div class="review-status">
          ${data.settings?.lastWeeklyReview
            ? `<p class="text-muted">Última revisión: <strong>${formatReviewDate(data.settings.lastWeeklyReview)}</strong></p>`
            : `<p class="text-muted">Nunca has hecho una revisión semanal.</p>`
          }
        </div>

        <button class="btn btn--primary" id="start-weekly-review">
          <span class="material-symbols-outlined">play_arrow</span>
          Iniciar Revisión Semanal
        </button>

        <div class="form-group" style="margin-top: var(--space-4);">
          <label for="review-day-select">Recordarme los</label>
          <select id="review-day-select" class="select">
            <option value="0" ${data.settings?.weeklyReviewDay === 0 ? 'selected' : ''}>Domingos</option>
            <option value="1" ${data.settings?.weeklyReviewDay === 1 ? 'selected' : ''}>Lunes</option>
          </select>
        </div>

        <label class="toggle-label">
          <input type="checkbox" id="review-reminder-toggle" ${data.settings?.weeklyReviewReminder !== false ? 'checked' : ''}>
          <span>Mostrar recordatorio en Dashboard</span>
        </label>
      </section>

      <!-- Modo de Uso -->
      ${renderUsageModeSection(data)}

      <!-- Zona de peligro -->
      <section class="settings-section settings-section--danger">
        <h2>
          <span class="material-symbols-outlined">warning</span>
          Zona de peligro
        </h2>

        <div class="danger-zone">
          <h3>Borrado parcial</h3>
          <p class="text-muted">Elige qué datos limpiar sin perder el resto.</p>

          <div class="danger-buttons">
            <button class="btn btn--outline btn--warning" id="clear-identity-btn">
              <span class="material-symbols-outlined">person_off</span>
              Borrar Identidad
              <small>Valores, hábitos, rueda</small>
            </button>

            <button class="btn btn--outline btn--warning" id="clear-productivity-btn">
              <span class="material-symbols-outlined">task_alt</span>
              Borrar Productividad
              <small>Tareas, proyectos, logros</small>
            </button>

            <button class="btn btn--outline btn--warning" id="clear-journal-btn">
              <span class="material-symbols-outlined">auto_stories</span>
              Borrar Diario
              <small>Todas las entradas</small>
            </button>
          </div>

          <hr class="danger-divider">

          <button class="btn btn--danger" id="clear-data-btn">
            <span class="material-symbols-outlined">delete_forever</span>
            Borrar TODO
          </button>
          <p class="text-muted text-center" style="margin-top: var(--space-2);">
            Esto borra absolutamente todo y no se puede deshacer. Si tienes Oráculo conectado con Google Drive,
            la copia de la nube no se toca, así que puedes borrarla desde tu Drive.
          </p>
        </div>
      </section>

      <!-- Legal -->
      <section class="settings-section settings-section--legal">
        <p class="settings-legal">
          Oráculo es un proyecto de <strong>código abierto</strong>, gratuito y sin ánimo de lucro.
          Tus datos se almacenan en tu dispositivo y, opcionalmente, en tu Google Drive personal.
          No tenemos acceso a tus datos. No nos hacemos responsables de la pérdida, inexactitud
          o cualquier problema derivado del uso de la aplicación.
          <a href="https://oraculo.movimientofuncional.app/aviso-legal.html" target="_blank" rel="noopener">Aviso legal</a> ·
          <a href="https://oraculo.movimientofuncional.app/privacidad.html" target="_blank" rel="noopener">Privacidad</a> ·
          <a href="https://github.com/wellfitness/oraculo" target="_blank" rel="noopener">GitHub</a>
        </p>
      </section>

      <!-- Modal de confirmación de archivado -->
      <dialog id="archive-confirm-modal" class="modal">
        <div class="modal-content">
          <h2 class="modal-title">
            <span class="material-symbols-outlined icon-warning">inventory_2</span>
            Archivar año ${anioCuaderno}
          </h2>
          <div class="modal-body">
            <p>Esto hará lo siguiente:</p>
            <ul class="archive-steps">
              <li>
                <span class="material-symbols-outlined icon-success">download</span>
                Descargar un archivo con todos tus datos de ${anioCuaderno}
              </li>
              <li>
                <span class="material-symbols-outlined icon-success">check</span>
                Mantener tus valores, hábitos graduados y configuración
              </li>
              <li>
                <span class="material-symbols-outlined icon-warning">cleaning_services</span>
                Limpiar tareas, historial de hábitos y diario
              </li>
              <li>
                <span class="material-symbols-outlined icon-success">auto_awesome</span>
                Empezar un cuaderno nuevo para ${nextYear}
              </li>
            </ul>
            <p class="archive-warning">
              <strong>Guarda bien el archivo descargado.</strong>
              Es tu único respaldo del año.
            </p>
          </div>
          <div class="modal-actions">
            <button class="btn btn--tertiary" id="cancel-archive">Cancelar</button>
            <button class="btn btn--primary" id="confirm-archive">
              <span class="material-symbols-outlined">inventory_2</span>
              Archivar y empezar nuevo año
            </button>
          </div>
        </div>
      </dialog>

      <!-- Modal de visor de año archivado -->
      <dialog id="archived-viewer-modal" class="modal modal--large">
        <div class="modal-content">
          <h2 class="modal-title">
            <span class="material-symbols-outlined">history</span>
            <span id="archived-viewer-title">Visor de año archivado</span>
          </h2>
          <div class="modal-body" id="archived-viewer-content">
            <!-- Contenido dinámico -->
          </div>
          <div class="modal-actions">
            <button class="btn btn--primary" id="close-archived-viewer">Cerrar</button>
          </div>
        </div>
      </dialog>
    </div>
  `;
};

/**
 * Inicializa eventos del módulo
 */
export const init = (data, updateData) => {
  console.log('[Settings] Módulo inicializado');
  updateDataCallback = updateData;

  // Verificar que los inputs existen
  const importDataInput = document.getElementById('import-data-input');
  const importSyncInput = document.getElementById('import-sync-input');
  console.log('[Settings] import-data-input encontrado:', !!importDataInput);
  console.log('[Settings] import-sync-input encontrado:', !!importSyncInput);

  // === Google Drive Sync ===
  initGDriveSyncUI();

  // === Agente IA (MCP) ===
  initMcpUI(data);

  // === Google Calendar (solo lectura) ===
  // gcal-settings usa su propio local store (clave aparte de oraculo_data),
  // así Drive sync NO pisa la configuración al hacer pull.
  gcalSettings.init();

  // === Sincronización manual ===

  // Exportar (botón de sincronización)
  document.getElementById('export-sync-btn')?.addEventListener('click', () => {
    exportData();
    showNotification('Backup descargado. ¡Súbelo a tu nube!', 'success');
  });

  // Reemplazar los datos actuales por los de un backup, con aviso previo
  const replaceWithBackup = async (data, origin, successMsg) => {
    const s = summarizeBackup(data);
    const ok = await confirmDangerAsync({
      title: `¿Reemplazar tus datos por los ${origin}?`,
      message: `Contiene ${s.tasks} tareas y ${s.journalEntries} entradas de diario. Antes se guardará una copia de tus datos actuales.`,
      confirmText: 'Sí, reemplazar',
      cancelText: 'No, cancelar',
      type: 'warning'
    });
    if (!ok) return;
    if (!applyImportedData(data)) throw new Error('No se pudieron guardar los datos');
    reloadStateFromStorage();
    showNotification(successMsg, 'success');
    location.reload();
  };

  // Importar (botón de sincronización)
  document.getElementById('import-sync-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Resetear el input para permitir re-seleccionar el mismo archivo
    e.target.value = '';

    try {
      await replaceWithBackup(await parseImportFile(file), 'de este archivo', '¡Datos sincronizados correctamente!');
    } catch (error) {
      console.error('[Settings] Error sincronizando:', error);
      showNotification('Error: ' + error.message, 'error');
    }
  });

  // === Datos (exportar/importar tradicional) ===

  // Exportar datos
  document.getElementById('export-data-btn')?.addEventListener('click', () => {
    exportData();
    showNotification('Datos exportados', 'success');
  });

  // Importar datos
  document.getElementById('import-data-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Resetear el input para permitir re-seleccionar el mismo archivo
    e.target.value = '';

    try {
      await replaceWithBackup(await parseImportFile(file), 'de este archivo', 'Datos importados correctamente');
    } catch (error) {
      console.error('[Settings] Error importando:', error);
      showNotification('Error: ' + error.message, 'error');
    }
  });

  // Copiar datos al portapapeles (sync web ↔ extensión)
  document.getElementById('copy-data-btn')?.addEventListener('click', async () => {
    if (!navigator.clipboard) {
      showNotification('Portapapeles no disponible (requiere HTTPS)', 'error');
      return;
    }

    // Antes de copiar se comprueba lo que hay guardado. Un cuaderno vacío o
    // algo que no se puede leer se lleva a la otra parte (web ↔ extensión) y
    // sustituye a los datos que allí sí había, así que mejor no copiar nada y
    // avisar de por qué.
    //
    // Lo que se comprueba y lo que se copia es lo mismo: los datos ya
    // normalizados que devuelve `loadData()`. Si se comprobara el texto
    // sucio del almacenamiento, una carga reparada dejaría a la usuaria sin
    // poder pasar sus datos de una plataforma a otra.
    const raw = localStorage.getItem('oraculo_data');
    // La lectura no debe rearmar el aviso de reparación: si esta comprobación
    // encuentra elementos sueltos, el aviso lo ha provocado ella misma y
    // aparecería más tarde sin explicación.
    const datos = loadDataSinIncidencia();
    const backup = comprobarBackupCopiable(raw, datos);

    if (!backup.ok) {
      const motivos = {
        ilegible: 'No se han podido leer tus datos guardados. No se ha copiado nada.',
        invalido: 'Tus datos guardados no son un backup válido. No se ha copiado nada.',
        vacio: 'No hay datos guardados que copiar.'
      };
      showNotification(motivos[backup.motivo] || 'No se ha copiado nada.', 'error');
      return;
    }

    try {
      // Se copia lo que la app tiene en forma, no lo que hay escrito en el
      // almacenamiento: así lo que se pega en la otra parte (web ↔ extensión)
      // es un backup válido y no un dato a medio normalizar.
      await navigator.clipboard.writeText(JSON.stringify(backup.data));
      showNotification('Datos copiados al portapapeles', 'success');
    } catch (e) {
      showNotification('No se pudo copiar. Usa Exportar backup.', 'error');
    }
  });

  // Pegar datos desde portapapeles (sync web ↔ extensión)
  document.getElementById('paste-data-btn')?.addEventListener('click', async () => {
    if (!navigator.clipboard) {
      showNotification('Portapapeles no disponible (requiere HTTPS)', 'error');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      await replaceWithBackup(parseImportText(text), 'del portapapeles', 'Datos pegados correctamente');
    } catch (e) {
      showNotification('Error: ' + (e.message || 'Datos no válidos en el portapapeles'), 'error');
    }
  });

  // === Copia de los datos que no se pudieron leer ===

  // Descargar la copia tal cual, para que la usuaria pueda intentar
  // recuperarla por su cuenta.
  document.getElementById('download-corrupt-btn')?.addEventListener('click', () => {
    const texto = leerCopiaCorrupta();

    if (texto === null) {
      showNotification('Ya no hay ninguna copia guardada.', 'info');
      return;
    }

    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `oraculo-copia-danada-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);

    showNotification('Copia descargada', 'success');
  });

  // Borrar la copia. Pide confirmación: si se borra, no hay vuelta atrás.
  document.getElementById('delete-corrupt-btn')?.addEventListener('click', async () => {
    const ok = await confirmDangerAsync({
      title: '¿Borrar la copia dañada?',
      message: 'No se podrá recuperar.',
      confirmText: 'Sí, borrar',
      cancelText: 'No, mantener'
    });
    if (!ok) return;

    borrarCopiaCorrupta();
    document.getElementById('corrupt-copy-block')?.remove();
    showNotification('Copia borrada', 'info');
  });

  // Borrado parcial: identidad, productividad, diario y todo.
  // clearFn es asíncrono porque los respaldos automáticos (IndexedDB) se
  // borran en el mismo gesto de «borrar todo». Si se recargara antes de
  // terminar, el contenido seguiría en el dispositivo.
  // avisaSiFalla solo se usa en «borrar todo»: los borrados parciales no
  // tocan los respaldos, así que no hay nada que pueda fallar ahí.
  const wireClear = (btnId, title, message, clearFn, doneMsg, avisaSiFalla = false) => {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      const ok = await confirmDangerAsync({ title, message, confirmText: 'Sí, borrar', cancelText: 'No, mantener' });
      if (!ok) return;
      const borrado = await clearFn();
      reloadStateFromStorage();

      if (borrado === false && avisaSiFalla) {
        // El navegador no ha dejado tocar los respaldos automáticos del
        // dispositivo. El cuaderno está borrado, pero no todo. Se avisa y no
        // se recarga, para que el aviso se pueda leer.
        showNotification('Se ha borrado el cuaderno, pero los respaldos automáticos del dispositivo no se han podido borrar. Revisa los permisos del navegador.', 'warning');
        return;
      }

      showNotification(doneMsg, 'info');
      location.reload();
    });
  };

  wireClear('clear-identity-btn', '¿Borrar valores, hábitos y rueda de la vida?',
    'Las tareas, proyectos y diario se mantienen.', clearIdentityData, 'Identidad borrada (valores, hábitos, rueda)');
  wireClear('clear-productivity-btn', '¿Borrar tareas, proyectos y logros?',
    'Valores, hábitos y diario se mantienen.', clearProductivityData, 'Productividad borrada (tareas, proyectos, logros)');
  wireClear('clear-journal-btn', '¿Borrar todas las entradas del diario?',
    'Todo lo demás se mantiene.', clearJournalData, 'Diario borrado');
  wireClear('clear-data-btn', '¿Estás segura de que quieres borrar TODOS los datos?',
    'Esta acción no se puede deshacer. La copia de tu Google Drive no se toca, así que si la tenías conectada, bórrala también desde Drive.', clearAllData, 'Todos los datos borrados', true);

  // Notificaciones
  document.getElementById('notifications-toggle')?.addEventListener('change', async (e) => {
    if (e.target.checked) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        e.target.checked = false;
        showNotification('Permiso de notificaciones denegado', 'warning');
        return;
      }
    }
    data.settings.notificationsEnabled = e.target.checked;
    updateDataCallback('settings', data.settings);
    showNotification(e.target.checked ? 'Notificaciones activadas' : 'Notificaciones desactivadas', 'info');
  });

  // === Revisión Semanal GTD ===

  // Iniciar revisión semanal
  document.getElementById('start-weekly-review')?.addEventListener('click', () => {
    openWeeklyReview();
  });

  // Cambiar día de recordatorio
  document.getElementById('review-day-select')?.addEventListener('change', (e) => {
    const day = parseInt(e.target.value, 10);
    data.settings.weeklyReviewDay = day;
    updateDataCallback('settings', data.settings);
    const dayName = day === 0 ? 'domingos' : 'lunes';
    showNotification(`Recordatorio configurado para los ${dayName}`, 'info');
  });

  // Toggle recordatorio en dashboard
  document.getElementById('review-reminder-toggle')?.addEventListener('change', (e) => {
    data.settings.weeklyReviewReminder = e.target.checked;
    updateDataCallback('settings', data.settings);
    showNotification(
      e.target.checked ? 'Recordatorio activado' : 'Recordatorio desactivado',
      'info'
    );
  });

  // Modo de uso
  document.querySelectorAll('input[name="usage-mode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const newMode = e.target.value;
      const currentSettings = data.settings || {};

      updateDataCallback('settings', {
        ...currentSettings,
        usageMode: newMode
      });

      // Actualizar UI
      document.querySelectorAll('.usage-mode-option').forEach(opt => {
        opt.classList.toggle('usage-mode-option--active', opt.querySelector('input').value === newMode);
      });

      // Notificar a app.js para actualizar el menú
      window.dispatchEvent(new CustomEvent('usage-mode-changed'));

      const modeName = USAGE_MODES[newMode]?.name || 'Sistema Completo';
      showNotification(`Modo cambiado: ${modeName}`, 'success');
    });
  });

  // Archivar año
  const archiveModal = document.getElementById('archive-confirm-modal');

  document.getElementById('archive-year-btn')?.addEventListener('click', () => {
    archiveModal?.showModal();
  });

  document.getElementById('cancel-archive')?.addEventListener('click', () => {
    archiveModal?.close();
  });

  archiveModal?.addEventListener('click', (e) => {
    if (e.target === archiveModal) archiveModal.close();
  });

  document.getElementById('confirm-archive')?.addEventListener('click', () => {
    const confirmBtn = document.getElementById('confirm-archive');
    const cancelBtn = document.getElementById('cancel-archive');

    // Deshabilitar botones y mostrar estado de carga
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Archivando...';
    }
    if (cancelBtn) cancelBtn.disabled = true;

    // Pequeño delay para que la UI se actualice antes del proceso pesado
    setTimeout(() => {
      handleArchiveYear();
      archiveModal?.close();
    }, 50);
  });

  // Importar año archivado para consultar
  document.getElementById('import-archived-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Resetear el input para permitir re-seleccionar el mismo archivo
    e.target.value = '';

    try {
      archivedYearData = await loadArchivedYear(file);
      openArchivedViewer(archivedYearData);
    } catch (error) {
      console.error('[Settings] Error cargando año archivado:', error);
      showNotification(error.message, 'error');
    }
  });

  // Cerrar visor de archivados
  const viewerModal = document.getElementById('archived-viewer-modal');

  document.getElementById('close-archived-viewer')?.addEventListener('click', () => {
    viewerModal?.close();
    archivedYearData = null;
  });

  viewerModal?.addEventListener('click', (e) => {
    if (e.target === viewerModal) {
      viewerModal.close();
      archivedYearData = null;
    }
  });

  // === Respaldo Automático ===

  // Vincular/cambiar carpeta de backup
  document.getElementById('link-folder-btn')?.addEventListener('click', async () => {
    try {
      const folderName = await autoBackup.linkFolder();
      if (folderName) {
        showNotification(`Carpeta vinculada: ${folderName}`, 'success');
        // Reload inmediato para actualizar la UI
        location.reload();
        // El backup inicial se hará automáticamente después del reload
      }
    } catch (error) {
      console.error('[Settings] Error vinculando carpeta:', error);
      showNotification('Error al vincular carpeta: ' + error.message, 'warning');
    }
  });

  // Guardar backup ahora
  document.getElementById('save-backup-now-btn')?.addEventListener('click', async () => {
    try {
      const result = await autoBackup.saveBackup(data);
      if (result.success) {
        showNotification(`Backup guardado: ${result.filename}`, 'success');
        // Actualizar info del último backup
        const detailEl = document.querySelector('.backup-detail');
        if (detailEl) {
          detailEl.textContent = 'Último backup: hace unos segundos';
        }
      } else {
        showNotification('No se pudo guardar el backup', 'warning');
      }
    } catch (error) {
      showNotification('Error: ' + error.message, 'warning');
    }
  });

  // Desvincular carpeta
  document.getElementById('unlink-folder-btn')?.addEventListener('click', async () => {
    if (await confirmDangerAsync({ title: '¿Desvincular la carpeta de backup?', message: 'Tus datos seguirán en el navegador.', confirmText: 'Sí, continuar', cancelText: 'Cancelar', type: 'warning' })) {
      await autoBackup.unlinkFolder();
      showNotification('Carpeta desvinculada', 'info');
      location.reload();
    }
  });
};

/**
 * Maneja el proceso de archivar el año
 */
const handleArchiveYear = () => {
  try {
    // Archivar y exportar
    const { archivedNotebooks } = archiveCurrentYear();

    // Iniciar nuevo año
    startNewYear(archivedNotebooks);
    reloadStateFromStorage();

    showNotification('¡Año archivado! Bienvenida al nuevo cuaderno.', 'success');

    // Recargar para mostrar el nuevo estado
    setTimeout(() => location.reload(), 1500);
  } catch (error) {
    showNotification('Error al archivar: ' + error.message, 'error');
  }
};

/**
 * Abre el visor de año archivado
 */
const openArchivedViewer = (data) => {
  const modal = document.getElementById('archived-viewer-modal');
  const title = document.getElementById('archived-viewer-title');
  const content = document.getElementById('archived-viewer-content');

  if (!modal || !content) return;

  const notebook = data.notebook || {};
  const summary = data.summary || generateYearSummary(data);
  // Las listas del archivo pueden no ser listas si el archivo está dañado:
  // se comprueba antes de pintarlas.
  const proyectosCompletados = (Array.isArray(data.projects) ? data.projects : [])
    .filter(p => p?.status === 'completed');
  const valores = Array.isArray(data.values) ? data.values : [];
  const habitosGraduados = Array.isArray(data.habits?.graduated) ? data.habits.graduated : [];

  title.textContent = notebook.name || `Cuaderno ${notebook.year}`;

  content.innerHTML = `
    <div class="archived-viewer">
      <div class="viewer-header">
        <span class="viewer-badge">Solo lectura</span>
        <p>Archivado el ${formatDate(notebook.archivedAt)}</p>
      </div>

      <div class="viewer-summary">
        <h3>Resumen del año</h3>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="stat-value">${numeroSeguro(summary.totalTasksCompleted)}</span>
            <span class="stat-label">tareas completadas</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${numeroSeguro(summary.habitsGraduated)}</span>
            <span class="stat-label">hábitos graduados</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${numeroSeguro(summary.habitDaysLogged)}</span>
            <span class="stat-label">días de hábito</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${numeroSeguro(summary.projectsCompleted)}</span>
            <span class="stat-label">proyectos completados</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${numeroSeguro(summary.journalEntries)}</span>
            <span class="stat-label">entradas de diario</span>
          </div>
        </div>
      </div>

      ${valores.length > 0 ? `
        <div class="viewer-section">
          <h3>Valores del año</h3>
          <ul class="viewer-list">
            ${valores.map(v => `<li>${escapeHTML(v?.name)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${habitosGraduados.length > 0 ? `
        <div class="viewer-section">
          <h3>Hábitos consolidados</h3>
          <ul class="viewer-list">
            ${habitosGraduados.map(h => `
              <li>
                <strong>${escapeHTML(h?.name)}</strong>
                ${h?.identity ? `<span class="viewer-subtitle">${escapeHTML(h.identity)}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${proyectosCompletados.length > 0 ? `
        <div class="viewer-section">
          <h3>Proyectos completados</h3>
          <ul class="viewer-list">
            ${proyectosCompletados.map(p => `
              <li>${escapeHTML(p.name)}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  modal.showModal();
};

/**
 * Renderiza la sección de sincronización entre dispositivos
 */
const renderSyncSection = (data) => {
  return `
    <section class="settings-section">
      <h2>
        <span class="material-symbols-outlined">cloud_sync</span>
        Google Drive Sync
      </h2>

      <div id="gdrive-sync-container">
        <div id="gdrive-disconnected">
          <p class="section-description">
            Sincroniza tus datos automáticamente entre todos tus dispositivos.
            Tus datos se guardan en <strong>tu Google Drive</strong>, en una carpeta privada que solo Oráculo puede ver.
          </p>
          <button class="btn btn--primary" id="gdrive-connect-btn">
            <span class="material-symbols-outlined">link</span>
            Conectar Google Drive
          </button>
          <p class="sync-privacy-note">
            <span class="material-symbols-outlined">shield</span>
            Solo accedemos a una carpeta oculta exclusiva de Oráculo. No leemos ningún otro archivo de tu Drive.
          </p>
        </div>

        <div id="gdrive-connected" style="display:none;">
          <div class="gdrive-status">
            <span class="material-symbols-outlined gdrive-status-icon">cloud_done</span>
            <div>
              <p class="gdrive-email" id="gdrive-email"></p>
              <p class="gdrive-last-sync" id="gdrive-last-sync"></p>
            </div>
          </div>
          <div class="gdrive-actions">
            <button class="btn btn--primary" id="gdrive-sync-now-btn">
              <span class="material-symbols-outlined">sync</span>
              Sincronizar ahora
            </button>
            <button class="btn btn--secondary btn--danger-text" id="gdrive-disconnect-btn">
              <span class="material-symbols-outlined">link_off</span>
              Desconectar
            </button>
          </div>
        </div>
      </div>
    </section>

    ${gcalSettings.render()}

    <section class="settings-section">
      <h2>
        <span class="material-symbols-outlined">sync</span>
        Sincronización Manual
      </h2>
      <p class="section-description">
        Exporta e importa datos manualmente si prefieres no usar Google Drive.
      </p>

      <div class="sync-instructions">
        <div class="sync-step">
          <span class="step-number">1</span>
          <div class="step-content">
            <strong>Exporta tus datos</strong>
            <p>Descarga un archivo JSON con todo tu contenido.</p>
            <button class="btn btn--primary" id="export-sync-btn">
              <span class="material-symbols-outlined">download</span>
              Descargar backup
            </button>
          </div>
        </div>

        <div class="sync-step">
          <span class="step-number">2</span>
          <div class="step-content">
            <strong>Importa en el otro dispositivo</strong>
            <p>Abre Oráculo en tu otro dispositivo e importa el archivo.</p>
            <label class="btn btn--secondary">
              <span class="material-symbols-outlined">upload</span>
              Importar backup
              <input type="file" id="import-sync-input" accept=".json" hidden>
            </label>
          </div>
        </div>
      </div>
    </section>
  `;
};

/**
 * Renderiza la sección del Agente IA (MCP)
 *
 * Cinco estados visuales posibles:
 *  - not-supported: navegador sin File System Access API (Firefox, Safari, móvil)
 *  - connected:     handle vivo, todo OK
 *  - waiting:       MCP activado pero handle no vivo (normal tras recarga, NO es error)
 *  - error:         hubo un error de permisos en esta sesión (permission-lost) — banner amarillo
 *  - idle:          desactivado o sin archivo
 *
 * La extensión Chrome y Capacitor no muestran esta sección (no soportan File System Access API).
 */
const renderMcpSection = () => {
  // En extensión Chrome y Capacitor, esta sección no se renderiza.
  if (window.__ORACULO_EXTENSION__ || window.__ORACULO_CAPACITOR__) {
    return '';
  }

  const isSupported = McpBridge.isSupported();
  const isConnected = mcpBridge.isConnected;
  const isEnabled = mcpBridge.isEnabled;
  const hasStale = mcpBridge.hasStaleState;  // Solo true tras NotAllowedError real
  const lastFolderName = mcpBridge.lastFolderName;
  const folderName = mcpBridge.folderName;
  // "Esperando reconexión" = usuario activó MCP pero Chrome perdió el handle.
  // Esto es NORMAL tras recarga — NO es un error, solo requiere que la usuaria
  // haga click en "Reconectar" una vez por sesión.
  const waitingReconnect = isEnabled && !isConnected && !hasStale && !!(lastFolderName || folderName);

  // ── Estado 1: navegador sin soporte ────────────────────────────────────
  if (!isSupported) {
    return `
      <section class="settings-section settings-section--mcp">
        <h2>
          <span class="material-symbols-outlined">smart_toy</span>
          Agente IA
        </h2>
        <p class="section-description">
          Conecta Oráculo con tu asistente de IA mediante una carpeta
          <em>bridge</em> en tu ordenador.
        </p>
        <div class="mcp-not-supported">
          <span class="material-symbols-outlined">cloud_off</span>
          <div>
            <strong>Función no disponible en este navegador</strong>
            <p>La sincronización con agentes IA requiere acceso directo al sistema de archivos,
            disponible solo en <strong>Chrome</strong> o <strong>Edge</strong> de escritorio.
            Tu navegador actual (${escapeHTML(navigator.vendor || navigator.userAgent.split(' ').pop())})
            no soporta esta API.</p>
          </div>
        </div>
      </section>
    `;
  }

  // ── Estados 2-4: navegador con soporte ────────────────────────────────
  return `
    <section class="settings-section settings-section--mcp">
      <h2>
        <span class="material-symbols-outlined">smart_toy</span>
        Agente IA
      </h2>
      <p class="section-description">
        Conecta Oráculo con tu asistente de IA (Claude, MiniMax, Hermes, Gemini, OpenAI) mediante una carpeta
        <em>bridge</em> en tu ordenador. El agente puede leer tu día y proponerte cambios, pero
        <strong>tus datos nunca salen de tu dispositivo</strong> y nada se aplica sin tu aprobación.
      </p>

      <details class="mcp-help">
        <summary>
          <span class="material-symbols-outlined icon-sm">help</span>
          ¿Cómo conectar mi agente de IA?
        </summary>
        <div class="mcp-help__body">
          <ol class="mcp-help__steps">
            <li><strong>Activa la sincronización</strong> con el interruptor de abajo y elige una <strong>carpeta</strong>
              para el Agente IA en tu ordenador. Oráculo creará ahí <code>oraculo-bridge.json</code> (tus datos) y leerá
              <code>oraculo-queue.json</code> (las propuestas del agente).</li>
            <li><strong>Configura tu agente</strong> apuntando a esa misma carpeta. Necesitas el servidor MCP de Oráculo
              corriendo en tu ordenador (carpeta <code>mcp-server/</code> del proyecto), lanzado con
              <code>--bridge-dir &lt;tu-carpeta&gt;</code>. Las instrucciones completas están en el <code>README</code> del servidor MCP.</li>
            <li><strong>El agente lee tu información</strong>: tareas, hábitos, diario, proyectos, valores y tu contexto
              del día (tiempo, energía, roca principal).</li>
            <li><strong>Tú apruebas los cambios.</strong> Cuando el agente propone añadir una tarea, una entrada de
              diario o un logro, aparecen aquí abajo como <em>cambios pendientes</em>. Decides cuáles aceptar y cuáles
              rechazar. Nada se modifica solo.</li>
          </ol>
          <p class="mcp-help__note">
            <span class="material-symbols-outlined icon-sm">verified_user</span>
            Compatible con <strong>Claude</strong> (Desktop y Code), <strong>MiniMax</strong>, <strong>Hermes</strong>,
            <strong>Gemini</strong> (CLI) y <strong>OpenAI</strong> (Agents SDK). Requiere Chrome o Edge, y que el
            agente se ejecute en este mismo ordenador (la carpeta bridge es local).
          </p>
        </div>
      </details>

      <label class="toggle-label">
        <input type="checkbox" id="mcp-enabled-toggle" ${isEnabled ? 'checked' : ''}>
        <span>Habilitar sincronización MCP</span>
      </label>

      <div id="mcp-config-panel" style="margin-top: var(--space-4);">
        ${hasStale ? `
          <div class="mcp-status mcp-status--warning" id="mcp-permission-lost-banner">
            <span class="material-symbols-outlined status-icon status-icon--warning">lock_reset</span>
            <div class="mcp-info">
              <strong>Reconexión necesaria</strong>
              <span class="mcp-file">La carpeta <code>${escapeHTML(lastFolderName || folderName || 'anterior')}</code> necesita que re-otorgues el permiso.
              Esto es normal — Chrome lo requiere cada vez que reinicias.</span>
            </div>
            <div class="mcp-banner-actions">
              <button class="btn btn--primary" id="mcp-reconnect-btn">
                <span class="material-symbols-outlined">refresh</span>
                Reconectar
              </button>
              <button class="btn btn--outline" id="mcp-forget-btn" title="Olvidar esta carpeta MCP y empezar de cero">
                <span class="material-symbols-outlined">link_off</span>
                Olvidar MCP
              </button>
            </div>
          </div>
        ` : ''}

        ${isConnected ? `
          <div class="mcp-status mcp-status--connected">
            <span class="material-symbols-outlined status-icon status-icon--success">check_circle</span>
            <div class="mcp-info">
              <strong>Conectado</strong>
              <span class="mcp-file">${escapeHTML(folderName)}</span>
            </div>
          </div>
          <div class="settings-actions">
            <button class="btn btn--secondary" id="mcp-select-folder-btn">
              <span class="material-symbols-outlined">folder_open</span>
              Cambiar carpeta
            </button>
            <button class="btn btn--outline btn--warning" id="mcp-disable-btn">
              <span class="material-symbols-outlined">link_off</span>
              Desconectar
            </button>
          </div>
        ` : waitingReconnect ? `
          <div class="mcp-status mcp-status--waiting">
            <span class="material-symbols-outlined status-icon status-icon--info">sync</span>
            <div class="mcp-info">
              <strong>Activado — esperando reconexión</strong>
              <span class="mcp-file">Carpeta: <code>${escapeHTML(lastFolderName || folderName)}</code>.
              Cada sesión requiere re-otorgar el permiso a Chrome.</span>
            </div>
            <div class="mcp-banner-actions">
              <button class="btn btn--primary" id="mcp-reconnect-btn">
                <span class="material-symbols-outlined">refresh</span>
                Reconectar ahora
              </button>
              <button class="btn btn--outline btn--warning" id="mcp-disable-btn">
                <span class="material-symbols-outlined">link_off</span>
                Desactivar
              </button>
            </div>
          </div>
        ` : `
          <div class="mcp-status mcp-status--disconnected">
            <span class="material-symbols-outlined status-icon status-icon--warning">link_off</span>
            <div class="mcp-info">
              <strong>Sin carpeta bridge</strong>
              <span class="mcp-file">Elige la carpeta que usará el Agente IA. Oráculo creará los archivos dentro.</span>
            </div>
          </div>
          <div class="settings-actions">
            <button class="btn btn--primary" id="mcp-select-folder-btn">
              <span class="material-symbols-outlined">folder_open</span>
              Elegir carpeta del Agente IA
            </button>
          </div>
        `}
      </div>

      <div id="mcp-pending-panel" style="display:none; margin-top: var(--space-4);">
        <h3>
          <span class="material-symbols-outlined">notifications</span>
          Cambios pendientes del agente
          <span class="badge" id="mcp-pending-count">0</span>
        </h3>
        <p class="text-muted">
          El agente ha propuesto estas acciones. Tú decides cuáles aplicar.
        </p>
        <form id="mcp-pending-form" class="mcp-pending-list">
          <!-- Se rellena dinámicamente -->
        </form>
        <div class="settings-actions">
          <button class="btn btn--primary" id="mcp-apply-selected-btn" type="button">
            <span class="material-symbols-outlined">check</span>
            Aplicar seleccionados
          </button>
          <button class="btn btn--outline btn--warning" id="mcp-reject-selected-btn" type="button">
            <span class="material-symbols-outlined">close</span>
            Rechazar seleccionados
          </button>
          <button class="btn btn--secondary" id="mcp-refresh-queue-btn" type="button">
            <span class="material-symbols-outlined">refresh</span>
            Refrescar
          </button>
        </div>
      </div>

      <p class="action-hint">
        <span class="material-symbols-outlined icon-sm">info</span>
        Las escrituras del agente requieren tu aprobación y nunca modifican directamente tus datos.
      </p>
    </section>
  `;
};

/**
 * Renderiza la sección de respaldo automático
 */
const renderAutoBackupSection = () => {
  // En Capacitor, File System Access API no existe (showDirectoryPicker)
  // El backup automatico en IndexedDB sigue activo silenciosamente
  if (window.__ORACULO_CAPACITOR__) {
    return '';
  }

  const isSupported = autoBackup.isSupported();
  const hasFolder = autoBackup.hasLinkedFolder();
  const folderName = autoBackup.getFolderName();
  const lastBackup = autoBackup.getTimeSinceLastBackup();

  if (!isSupported) {
    return `
      <section class="settings-section">
        <h2>
          <span class="material-symbols-outlined">cloud_off</span>
          Respaldo Automático
        </h2>
        <p class="section-description">
          Tu navegador no soporta el respaldo automático a carpeta.
          Usa Chrome o Edge para esta función.
        </p>
        <p class="text-muted">
          Puedes usar el botón "Exportar backup" de la sección Datos para guardar manualmente.
        </p>
      </section>
    `;
  }

  return `
    <section class="settings-section">
      <h2>
        <span class="material-symbols-outlined">${hasFolder ? 'cloud_done' : 'cloud_upload'}</span>
        Respaldo Automático
      </h2>
      <p class="section-description">
        Guarda copias de seguridad automáticas en una carpeta de tu ordenador.
      </p>

      <div class="backup-status">
        ${hasFolder ? `
          <div class="backup-linked">
            <span class="material-symbols-outlined status-icon status-icon--success">folder_open</span>
            <div class="backup-info">
              <strong>Carpeta vinculada: ${folderName}</strong>
              <span class="backup-detail">
                ${lastBackup ? `Último backup: ${lastBackup}` : 'Sin backups aún'}
              </span>
            </div>
          </div>
        ` : `
          <div class="backup-unlinked">
            <span class="material-symbols-outlined status-icon status-icon--warning">folder_off</span>
            <div class="backup-info">
              <strong>Sin carpeta vinculada</strong>
              <span class="backup-detail">
                Tus datos solo están en el navegador
              </span>
            </div>
          </div>
        `}
      </div>

      <div class="settings-actions">
        <button class="btn ${hasFolder ? 'btn--secondary' : 'btn--primary'}" id="link-folder-btn">
          <span class="material-symbols-outlined">${hasFolder ? 'folder_copy' : 'create_new_folder'}</span>
          ${hasFolder ? 'Cambiar carpeta' : 'Vincular carpeta'}
        </button>
        ${hasFolder ? `
          <button class="btn btn--secondary" id="save-backup-now-btn">
            <span class="material-symbols-outlined">save</span>
            Guardar ahora
          </button>
          <button class="btn btn--outline btn--warning" id="unlink-folder-btn">
            <span class="material-symbols-outlined">link_off</span>
            Desvincular
          </button>
        ` : ''}
      </div>

      <p class="action-hint">
        ${hasFolder
          ? 'Los backups se guardan automáticamente cuando haces cambios.'
          : 'Al vincular una carpeta, tus datos se guardarán automáticamente.'}
      </p>
    </section>
  `;
};

/**
 * Renderiza el resumen del cuaderno actual
 */
const renderCurrentSummary = (data) => {
  const summary = generateYearSummary(data);

  return `
    <div class="summary-mini">
      <span title="Tareas completadas">
        <span class="material-symbols-outlined icon-sm">task_alt</span>
        ${numeroSeguro(summary.totalTasksCompleted)}
      </span>
      <span title="Días de hábito">
        <span class="material-symbols-outlined icon-sm">local_fire_department</span>
        ${numeroSeguro(summary.habitDaysLogged)}
      </span>
      <span title="Proyectos completados">
        <span class="material-symbols-outlined icon-sm">folder</span>
        ${numeroSeguro(summary.projectsCompleted)}
      </span>
      <span title="Entradas de diario">
        <span class="material-symbols-outlined icon-sm">edit_note</span>
        ${numeroSeguro(summary.journalEntries)}
      </span>
    </div>
  `;
};

/**
 * Formatea fecha
 */
const formatDate = (isoDate) => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Renderiza la sección de modo de uso
 */
const renderUsageModeSection = (data) => {
  const currentMode = data.settings?.usageMode || 'complete';

  return `
    <section class="settings-section">
      <h2>
        <span class="material-symbols-outlined">tune</span>
        Modo de Uso
      </h2>
      <p class="section-description">
        Simplifica la interfaz según cómo quieras usar Oráculo.
      </p>

      <div class="usage-modes-grid" role="radiogroup" aria-label="Modo de uso">
        ${Object.values(USAGE_MODES).map(mode => `
          <label class="usage-mode-option ${mode.id === currentMode ? 'usage-mode-option--active' : ''}">
            <input
              type="radio"
              name="usage-mode"
              value="${mode.id}"
              ${mode.id === currentMode ? 'checked' : ''}
            >
            <div class="usage-mode-content">
              <span class="material-symbols-outlined usage-mode-icon">${mode.icon}</span>
              <div class="usage-mode-info">
                <strong>${mode.name}</strong>
                <span class="usage-mode-desc">${mode.description}</span>
              </div>
              <span class="material-symbols-outlined usage-mode-check">check_circle</span>
            </div>
          </label>
        `).join('')}
      </div>

      <p class="action-hint">
        <span class="material-symbols-outlined icon-sm">info</span>
        Las secciones ocultas siguen funcionando, solo no aparecen en el menú.
      </p>
    </section>
  `;
};

// ═══════════════════════════════════════════════════════════════
// Google Drive Sync UI
// ═══════════════════════════════════════════════════════════════

async function initGDriveSyncUI() {
  let gdriveSync;
  try {
    gdriveSync = await import('../gdrive/sync.js');
  } catch (e) {
    console.warn('[Settings] GDrive sync no disponible:', e.message);
    return;
  }

  const disconnectedEl = document.getElementById('gdrive-disconnected');
  const connectedEl = document.getElementById('gdrive-connected');
  const emailEl = document.getElementById('gdrive-email');
  const lastSyncEl = document.getElementById('gdrive-last-sync');

  if (!disconnectedEl || !connectedEl) return;

  // Mostrar estado actual
  function updateSyncUI() {
    const info = gdriveSync.getSyncInfo();
    if (gdriveSync.isConnected()) {
      disconnectedEl.style.display = 'none';
      connectedEl.style.display = 'block';
      emailEl.textContent = info.email || 'Conectada';

      // Mostrar estado de salud del sync
      if (info.syncHealth === 'token_expired') {
        lastSyncEl.textContent = 'Sesión expirada — reconecta pulsando "Sincronizar ahora"';
        lastSyncEl.style.color = 'var(--color-error, #e11d48)';
      } else if (info.syncHealth === 'error') {
        lastSyncEl.textContent = 'Error de conexión — reintenta con "Sincronizar ahora"';
        lastSyncEl.style.color = 'var(--color-warning, #eab308)';
      } else if (info.lastSyncAt) {
        const ago = formatTimeAgo(info.lastSyncAt);
        lastSyncEl.textContent = `Última sincronización: ${ago}`;
        lastSyncEl.style.color = '';
      } else {
        lastSyncEl.textContent = 'Pendiente de primera sincronización';
        lastSyncEl.style.color = '';
      }
    } else {
      disconnectedEl.style.display = 'block';
      connectedEl.style.display = 'none';
    }
  }

  updateSyncUI();

  // Conectar
  document.getElementById('gdrive-connect-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">hourglass_empty</span> Conectando...';

    try {
      await gdriveSync.connect();
      showNotification('Google Drive conectado. Tus datos se sincronizarán automáticamente.', 'success');
      updateSyncUI();
    } catch (err) {
      console.error('[GDrive] Error conectando:', err);
      showNotification('Error al conectar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">link</span> Conectar Google Drive';
    }
  });

  // Sincronizar ahora
  document.getElementById('gdrive-sync-now-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Sincronizando...';

    try {
      await gdriveSync.syncNow();
      showNotification('Datos sincronizados', 'success');
      updateSyncUI();
    } catch (err) {
      showNotification('Error al sincronizar: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-symbols-outlined">sync</span> Sincronizar ahora';
    }
  });

  // Desconectar
  document.getElementById('gdrive-disconnect-btn')?.addEventListener('click', async () => {
    if (!(await confirmDangerAsync({ title: '¿Desconectar Google Drive?', message: 'Tus datos locales se mantendrán.', confirmText: 'Sí, continuar', cancelText: 'Cancelar', type: 'warning' }))) return;

    await gdriveSync.disconnect();
    showNotification('Google Drive desconectado', 'success');
    updateSyncUI();
  });

  // Escuchar cambios de estado del sync
  window.addEventListener('gdrive-sync-status', () => updateSyncUI());
}

function formatTimeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days} día${days > 1 ? 's' : ''}`;
}

// ═══════════════════════════════════════════════════════════════
// Agente IA (MCP) UI
// ═══════════════════════════════════════════════════════════════

function initMcpUI(data) {
  // Si la sección no se renderizó (extensión / capacitor), salir sin error.
  const toggle = document.getElementById('mcp-enabled-toggle');
  if (!toggle) return;

  // ── Refrescar panel MCP in-place (sin recargar la página) ─────────────
  // CRÍTICO: NO usamos location.reload() tras conectar. El FileHandle vive
  // mientras la página esté abierta. Recargar destruiría el handle y volvería
  // a estado "esperando reconexión" inmediatamente tras conectar, dando
  // sensación de bug. En su lugar, re-renderizamos solo la sección MCP.
  const refreshMcpPanel = () => {
    const oldSection = document.querySelector('.settings-section--mcp');
    if (!oldSection) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderMcpSection();
    const newSection = wrapper.firstElementChild;
    if (newSection) {
      oldSection.replaceWith(newSection);
      // Re-vincular listeners de la nueva sección
      initMcpUI(data);
    }
  };

  const configPanel = document.getElementById('mcp-config-panel');
  const selectBtn = document.getElementById('mcp-select-folder-btn');
  const disableBtn = document.getElementById('mcp-disable-btn');
  const reconnectBtn = document.getElementById('mcp-reconnect-btn');
  const forgetBtn = document.getElementById('mcp-forget-btn');
  const permissionLostBanner = document.getElementById('mcp-permission-lost-banner');
  const pendingPanel = document.getElementById('mcp-pending-panel');
  const pendingForm = document.getElementById('mcp-pending-form');
  const pendingCount = document.getElementById('mcp-pending-count');
  const applyBtn = document.getElementById('mcp-apply-selected-btn');
  const rejectBtn = document.getElementById('mcp-reject-selected-btn');
  const refreshBtn = document.getElementById('mcp-refresh-queue-btn');

  // ── Handlers compartidos ──────────────────────────────────────────────
  // NO usamos location.reload() tras conectar: el handle FileHandle vive mientras
  // la página esté abierta. Recargar destruiría el handle y volvería a estado
  // "esperando reconexión" inmediatamente, dando sensación de bug.
  // En su lugar, refrescamos solo la sección MCP in-place.
  const handleSelectSuccess = () => {
    showNotification('Carpeta del Agente IA configurada', 'success');
    refreshMcpPanel();
  };

  const handlePickerCancel = () => {
    showNotification('No se seleccionó carpeta. Sincronización MCP desactivada.', 'warning');
  };

  const handlePickerError = (err) => {
    console.error('[McpUI] Error:', err);
    showNotification('Error: ' + err.message, 'error');
  };

  // ── Toggle habilitar/deshabilitar ────────────────────────────────────
  toggle.addEventListener('change', async () => {
    if (toggle.checked) {
      // Si ya estaba enabled (estado waitingReconnect), el render del checkbox puede
      // llegar desmarcado aunque isEnabled=true. NO abrimos el picker aquí — eso
      // lo hace el botón "Reconectar" del panel de waiting. Solo sincronizamos
      // la UI con el estado real del bridge.
      if (mcpBridge.isEnabled) {
        // Ya activado, nada que hacer. El botón "Reconectar" abre el picker cuando
        // la usuaria lo necesite.
        return;
      }
      // Si NO estaba enabled, sí abrimos el picker para elegir carpeta.
      try {
        await mcpBridge.selectBridgeFolder();
        if (!mcpBridge.isConnected) {
          toggle.checked = false;
          handlePickerCancel();
        } else {
          handleSelectSuccess();
        }
      } catch (err) {
        toggle.checked = false;
        handlePickerError(err);
      }
    } else {
      mcpBridge.disable();
      showNotification('Sincronización MCP desactivada', 'info');
    }
  });

  // ── Botón "Elegir carpeta del Agente IA" ──────────────────────────────
  selectBtn?.addEventListener('click', async () => {
    try {
      await mcpBridge.selectBridgeFolder();
      if (mcpBridge.isConnected) {
        handleSelectSuccess();
      } else {
        handlePickerCancel();
      }
    } catch (err) {
      handlePickerError(err);
    }
  });

  // ── Botón "Desconectar" ──────────────────────────────────────────────
  disableBtn?.addEventListener('click', async () => {
    if (await confirmDangerAsync({ title: '¿Desconectar el agente IA?', message: 'Tus datos locales se mantendrán.', confirmText: 'Sí, continuar', cancelText: 'Cancelar', type: 'warning' })) {
      mcpBridge.disable();
      showNotification('Agente IA desconectado', 'info');
      refreshMcpPanel(data);
    }
  });

  // ── Botón "Reconectar" del banner ─────────────────────────────────────
  reconnectBtn?.addEventListener('click', async () => {
    // Intentar primero re-validar el handle existente (sin prompt)
    if (mcpBridge._dirHandle) {
      const valid = await mcpBridge.verifyHandle();
      if (valid) {
        showNotification('Permiso restaurado. Sincronización reactivada.', 'success');
        refreshMcpPanel(data);
        return;
      }
    }
    // Si no hay handle o la re-validación falló, pedir carpeta de nuevo
    try {
      await mcpBridge.selectBridgeFolder();
      if (mcpBridge.isConnected) {
        handleSelectSuccess();
      } else {
        showNotification('Reconexión cancelada.', 'info');
      }
    } catch (err) {
      handlePickerError(err);
    }
  });

  // ── Botón "Olvidar MCP" — resetea completamente el estado MCP ─────────
  forgetBtn?.addEventListener('click', async () => {
    if (!(await confirmDangerAsync({ title: '¿Olvidar la configuración MCP?', message: 'Tu agente IA se desconectará y tendrás que volver a vincularlo desde cero.', confirmText: 'Sí, continuar', cancelText: 'Cancelar', type: 'warning' }))) {
      return;
    }
    mcpBridge.forget();
    showNotification('Configuración MCP olvidada', 'info');
    refreshMcpPanel(data);
  });

  // ── Listeners de eventos del bridge ──────────────────────────────────
  // Bug 2: permission-lost ya se emite pero nadie lo escuchaba.
  // Ahora actualizamos la UI para que la usuaria sepa qué pasó.
  mcpBridge.on('permission-lost', () => {
    showNotification('Permiso MCP perdido. Vuelve a elegir la carpeta.', 'error');
    // Marcar para que al recargar (si la usuaria lo hace) o al volver
    // a esta vista se muestre el banner. El toggle se desmarca visualmente.
    if (toggle) toggle.checked = false;
    if (permissionLostBanner) permissionLostBanner.style.display = '';
  });

  mcpBridge.on('stale-state', (e) => {
    if (permissionLostBanner) {
      permissionLostBanner.style.display = '';
      // Actualizar el nombre de la carpeta mostrada en el banner si vino en el evento
      const fileSpan = permissionLostBanner.querySelector('.mcp-file');
      if (fileSpan && e?.folderName) {
        fileSpan.innerHTML = `Tu navegador ha olvidado el acceso a <code>${escapeHTML(e.folderName)}</code>.
        Vuelve a elegirla para seguir sincronizando.`;
      }
    }
    if (toggle) toggle.checked = false;
  });

  mcpBridge.on('sync-error', (e) => {
    showNotification('Error al sincronizar bridge: ' + (e?.message || 'desconocido'), 'error');
  });

  mcpBridge.on('disconnected', () => {
    if (toggle) toggle.checked = false;
  });

  // Renderizar lista de acciones pendientes
  const renderPendingActions = (actions) => {
    pendingForm.innerHTML = '';

    if (!actions || actions.length === 0) {
      pendingPanel.style.display = 'none';
      return;
    }

    pendingPanel.style.display = '';
    pendingCount.textContent = actions.length;

    const toolLabels = {
      add_journal_entry: 'Entrada de diario',
      add_task: 'Nueva tarea',
      complete_task: 'Completar tarea',
      add_spontaneous_achievement: 'Logro espontáneo',
      set_roca_principal: 'Roca principal',
    };

    actions.forEach(action => {
      const label = toolLabels[action.tool] || action.tool;
      const summary = getActionSummary(action);
      const item = document.createElement('div');
      item.className = 'mcp-pending-item';
      item.innerHTML = `
        <label class="mcp-pending-label">
          <input type="checkbox" name="mcp-action" value="${escapeHTML(action.id)}" checked>
          <div class="mcp-pending-content">
            <strong>${escapeHTML(label)}</strong>
            <span class="mcp-pending-summary">${escapeHTML(summary)}</span>
            <span class="mcp-pending-date">${formatTimeAgo(action.createdAt)}</span>
          </div>
        </label>
      `;
      pendingForm.appendChild(item);
    });
  };

  const getActionSummary = (action) => {
    const p = action.params || {};
    switch (action.tool) {
      case 'add_journal_entry': return p.type + (p.content ? `: ${p.content.slice(0, 60)}` : '');
      case 'add_task': return `${p.text || ''} → ${p.horizon || ''}`;
      case 'complete_task': return `ID: ${p.taskId || ''}`;
      case 'add_spontaneous_achievement': return `${p.text || ''} (${p.mood || ''})`;
      case 'set_roca_principal': return `ID: ${p.taskId || ''}`;
      default: return '';
    }
  };

  // Refrescar queue
  const refreshQueue = async () => {
    try {
      const { pending } = await mcpBridge.readAgentQueue();
      renderPendingActions(pending);
    } catch (err) {
      console.warn('[McpUI] Error refrescando queue:', err);
    }
  };

  refreshBtn?.addEventListener('click', refreshQueue);

  // Aplicar seleccionados
  applyBtn?.addEventListener('click', async () => {
    const selected = Array.from(pendingForm.querySelectorAll('input[name="mcp-action"]:checked')).map(i => i.value);
    if (selected.length === 0) {
      showNotification('Selecciona al menos una acción', 'warning');
      return;
    }

    applyBtn.disabled = true;
    applyBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Aplicando...';

    try {
      // Aplicar solo las seleccionadas: marcar las no seleccionadas como rejected
      const allIds = Array.from(pendingForm.querySelectorAll('input[name="mcp-action"]')).map(i => i.value);
      const rejected = allIds.filter(id => !selected.includes(id));

      // Primero rechazar las no seleccionadas para que no se apliquen
      if (rejected.length > 0) {
        await mcpBridge.rejectPendingActions(rejected);
      }

      const result = await mcpBridge.applyPendingActions(data, saveData);

      if (result.applied.length > 0) {
        showNotification(`${result.applied.length} cambio(s) aplicado(s)`, 'success');
        location.reload();
      } else if (result.failed.length > 0) {
        showNotification('No se pudo aplicar ningún cambio', 'warning');
      }
    } catch (err) {
      showNotification('Error aplicando cambios: ' + err.message, 'error');
    } finally {
      applyBtn.disabled = false;
      applyBtn.innerHTML = '<span class="material-symbols-outlined">check</span> Aplicar seleccionados';
    }
  });

  // Rechazar seleccionados
  rejectBtn?.addEventListener('click', async () => {
    const selected = Array.from(pendingForm.querySelectorAll('input[name="mcp-action"]:checked')).map(i => i.value);
    if (selected.length === 0) {
      showNotification('Selecciona al menos una acción', 'warning');
      return;
    }

    rejectBtn.disabled = true;
    try {
      await mcpBridge.rejectPendingActions(selected);
      showNotification(`${selected.length} acción(es) rechazada(s)`, 'info');
      await refreshQueue();
    } catch (err) {
      showNotification('Error rechazando acciones: ' + err.message, 'error');
    } finally {
      rejectBtn.disabled = false;
    }
  });

  // Escuchar eventos del bridge
  mcpBridge.on('connected', refreshQueue);
  mcpBridge.on('queue-pending', (e) => renderPendingActions(e.actions));

  // Carga inicial: emitir stale-state si corresponde (banner tras recarga)
  mcpBridge.emitStaleStateIfNeeded();

  // Solo refrescar queue si hay conexión viva (Bug 1)
  if (mcpBridge.isConnected) {
    refreshQueue();
  }
}
