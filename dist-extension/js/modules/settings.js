/**
 * Oráculo - Módulo de Configuración
 * Gestión de datos, cuadernos anuales y preferencias
 */

import { showNotification, autoBackup, reloadStateFromStorage, USAGE_MODES, openWeeklyReview } from '../app.js';
import {
  exportData,
  importData,
  getStorageUsage,
  clearAllData,
  clearIdentityData,
  clearProductivityData,
  clearJournalData,
  archiveCurrentYear,
  startNewYear,
  loadArchivedYear,
  generateYearSummary
} from '../storage.js';
import { escapeHTML } from '../utils/sanitizer.js';

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
 * Renderiza la página de configuración
 */
export const render = (data) => {
  const usage = getStorageUsage();
  const notebook = data.notebook || { year: new Date().getFullYear() };
  const archivedNotebooks = data.archivedNotebooks || [];
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

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
              <strong>${notebook.name || `Cuaderno ${notebook.year}`}</strong>
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
            Archivar ${notebook.year} y empezar ${nextYear}
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
                      <strong>${nb.name}</strong>
                      <span class="archived-date">Archivado ${formatDate(nb.archivedAt)}</span>
                    </div>
                  </div>
                  ${nb.summary ? `
                    <div class="archived-summary">
                      ${nb.summary.totalTasksCompleted} tareas,
                      ${nb.summary.habitsGraduated} hábitos,
                      ${nb.summary.journalEntries} entradas
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
      ${renderSyncSection()}

      <!-- Respaldo Automático (local) -->
      ${renderAutoBackupSection()}

      <!-- Datos -->
      <section class="settings-section">
        <h2>
          <span class="material-symbols-outlined">database</span>
          Datos
        </h2>

        <div class="local-storage-notice">
          <span class="material-symbols-outlined">smartphone</span>
          <div>
            <strong>Tus datos viven en este dispositivo</strong>
            <p>Oráculo guarda todo localmente en tu navegador. Usa la app siempre desde el mismo dispositivo (recomendamos tu móvil principal) para mantener tu información sincronizada.</p>
          </div>
        </div>

        <div class="storage-info">
          <p>Espacio usado: ${usage.usedMB} MB de ~${usage.maxMB} MB (${usage.percentage}%)</p>
          <div class="storage-bar">
            <div class="storage-bar__fill ${usage.percentage > 80 ? 'warning' : ''}" style="width: ${usage.percentage}%"></div>
          </div>
        </div>

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
          <span>Activar notificaciones del navegador</span>
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
            Esto borra absolutamente todo y no se puede deshacer.
          </p>
        </div>
      </section>

      <!-- Modal de confirmación de archivado -->
      <dialog id="archive-confirm-modal" class="modal">
        <div class="modal-content">
          <h2 class="modal-title">
            <span class="material-symbols-outlined icon-warning">inventory_2</span>
            Archivar año ${notebook.year}
          </h2>
          <div class="modal-body">
            <p>Esto hará lo siguiente:</p>
            <ul class="archive-steps">
              <li>
                <span class="material-symbols-outlined icon-success">download</span>
                Descargar un archivo con todos tus datos de ${notebook.year}
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

  // === Sincronización entre dispositivos ===

  // Exportar (botón de sincronización)
  document.getElementById('export-sync-btn')?.addEventListener('click', () => {
    exportData();
    showNotification('Backup descargado. ¡Súbelo a tu nube!', 'success');
  });

  // Importar (botón de sincronización)
  document.getElementById('import-sync-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Resetear el input para permitir re-seleccionar el mismo archivo
    e.target.value = '';

    try {
      await importData(file);
      // Sincronizar state.data con localStorage para evitar que beforeunload sobrescriba
      reloadStateFromStorage();
      showNotification('¡Datos sincronizados correctamente!', 'success');
      location.reload();
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
      await importData(file);
      // Sincronizar state.data con localStorage para evitar que beforeunload sobrescriba
      reloadStateFromStorage();
      showNotification('Datos importados correctamente', 'success');
      location.reload();
    } catch (error) {
      console.error('[Settings] Error importando:', error);
      showNotification('Error: ' + error.message, 'error');
    }
  });

  // Borrado parcial: Identidad
  document.getElementById('clear-identity-btn')?.addEventListener('click', () => {
    if (clearIdentityData()) {
      showNotification('Identidad borrada (valores, hábitos, rueda)', 'info');
      window.oraculoSkipUnloadWarning = true;
      location.reload();
    }
  });

  // Borrado parcial: Productividad
  document.getElementById('clear-productivity-btn')?.addEventListener('click', () => {
    if (clearProductivityData()) {
      showNotification('Productividad borrada (tareas, proyectos, logros)', 'info');
      window.oraculoSkipUnloadWarning = true;
      location.reload();
    }
  });

  // Borrado parcial: Diario
  document.getElementById('clear-journal-btn')?.addEventListener('click', () => {
    if (clearJournalData()) {
      showNotification('Diario borrado', 'info');
      window.oraculoSkipUnloadWarning = true;
      location.reload();
    }
  });

  // Borrar TODO
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (clearAllData()) {
      showNotification('Todos los datos borrados', 'info');
      window.oraculoSkipUnloadWarning = true;
      location.reload();
    }
  });

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
    updateDataCallback('settings.notificationsEnabled', e.target.checked);
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
    updateDataCallback('settings.weeklyReviewDay', day);
    const dayName = day === 0 ? 'domingos' : 'lunes';
    showNotification(`Recordatorio configurado para los ${dayName}`, 'info');
  });

  // Toggle recordatorio en dashboard
  document.getElementById('review-reminder-toggle')?.addEventListener('change', (e) => {
    updateDataCallback('settings.weeklyReviewReminder', e.target.checked);
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
    if (confirm('¿Desvincular la carpeta de backup? Tus datos seguirán en el navegador.')) {
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
            <span class="stat-value">${summary.totalTasksCompleted}</span>
            <span class="stat-label">tareas completadas</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${summary.habitsGraduated}</span>
            <span class="stat-label">hábitos graduados</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${summary.habitDaysLogged}</span>
            <span class="stat-label">días de hábito</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${summary.projectsCompleted}</span>
            <span class="stat-label">proyectos completados</span>
          </div>
          <div class="summary-stat">
            <span class="stat-value">${summary.journalEntries}</span>
            <span class="stat-label">entradas de diario</span>
          </div>
        </div>
      </div>

      ${(data.values || []).length > 0 ? `
        <div class="viewer-section">
          <h3>Valores del año</h3>
          <ul class="viewer-list">
            ${data.values.map(v => `<li>${escapeHTML(v.name)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${(data.habits?.graduated || []).length > 0 ? `
        <div class="viewer-section">
          <h3>Hábitos consolidados</h3>
          <ul class="viewer-list">
            ${data.habits.graduated.map(h => `
              <li>
                <strong>${escapeHTML(h.name)}</strong>
                ${h.identity ? `<span class="viewer-subtitle">${escapeHTML(h.identity)}</span>` : ''}
              </li>
            `).join('')}
          </ul>
        </div>
      ` : ''}

      ${(data.projects || []).filter(p => p.status === 'completed').length > 0 ? `
        <div class="viewer-section">
          <h3>Proyectos completados</h3>
          <ul class="viewer-list">
            ${data.projects.filter(p => p.status === 'completed').map(p => `
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
const renderSyncSection = () => {
  return `
    <section class="settings-section">
      <h2>
        <span class="material-symbols-outlined">sync</span>
        Sincronizar entre Dispositivos
      </h2>
      <p class="section-description">
        Lleva tus datos a otro ordenador, tablet o móvil.
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
            <strong>Súbelo a tu nube</strong>
            <p>Google Drive, Dropbox, OneDrive, o envíatelo por email.</p>
          </div>
        </div>

        <div class="sync-step">
          <span class="step-number">3</span>
          <div class="step-content">
            <strong>Importa en el otro dispositivo</strong>
            <p>Abre Oráculo e importa el archivo.</p>
            <label class="btn btn--secondary">
              <span class="material-symbols-outlined">upload</span>
              Importar backup
              <input type="file" id="import-sync-input" accept=".json" hidden>
            </label>
          </div>
        </div>
      </div>

      <div class="sync-tip">
        <span class="material-symbols-outlined">lightbulb</span>
        <p><strong>Consejo:</strong> Si vinculas una carpeta de Google Drive o Dropbox en tu ordenador (sección de abajo), los backups se sincronizarán automáticamente con la nube.</p>
      </div>
    </section>
  `;
};

/**
 * Renderiza la sección de respaldo automático
 */
const renderAutoBackupSection = () => {
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
        ${summary.totalTasksCompleted}
      </span>
      <span title="Días de hábito">
        <span class="material-symbols-outlined icon-sm">local_fire_department</span>
        ${summary.habitDaysLogged}
      </span>
      <span title="Proyectos completados">
        <span class="material-symbols-outlined icon-sm">folder</span>
        ${summary.projectsCompleted}
      </span>
      <span title="Entradas de diario">
        <span class="material-symbols-outlined icon-sm">edit_note</span>
        ${summary.journalEntries}
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
