/**
 * Oráculo - Módulo de Configuración
 * Gestión de datos, cuadernos anuales y preferencias
 */

import { showNotification } from '../app.js';
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

let updateDataCallback = null;
let archivedYearData = null; // Para el visor de años anteriores

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

      <!-- Datos -->
      <section class="settings-section">
        <h2>
          <span class="material-symbols-outlined">database</span>
          Datos
        </h2>
        <p class="section-description">
          Tus datos se guardan localmente en tu navegador.
        </p>

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
  updateDataCallback = updateData;

  // Exportar datos
  document.getElementById('export-data-btn')?.addEventListener('click', () => {
    exportData();
    showNotification('Datos exportados', 'success');
  });

  // Importar datos
  document.getElementById('import-data-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      await importData(file);
      showNotification('Datos importados correctamente', 'success');
      location.reload();
    } catch (error) {
      showNotification(error.message, 'error');
    }
  });

  // Borrado parcial: Identidad
  document.getElementById('clear-identity-btn')?.addEventListener('click', () => {
    if (clearIdentityData()) {
      showNotification('Identidad borrada (valores, hábitos, rueda)', 'info');
      location.reload();
    }
  });

  // Borrado parcial: Productividad
  document.getElementById('clear-productivity-btn')?.addEventListener('click', () => {
    if (clearProductivityData()) {
      showNotification('Productividad borrada (tareas, proyectos, logros)', 'info');
      location.reload();
    }
  });

  // Borrado parcial: Diario
  document.getElementById('clear-journal-btn')?.addEventListener('click', () => {
    if (clearJournalData()) {
      showNotification('Diario borrado', 'info');
      location.reload();
    }
  });

  // Borrar TODO
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    if (clearAllData()) {
      showNotification('Todos los datos borrados', 'info');
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
    handleArchiveYear();
    archiveModal?.close();
  });

  // Importar año archivado para consultar
  document.getElementById('import-archived-input')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      archivedYearData = await loadArchivedYear(file);
      openArchivedViewer(archivedYearData);
    } catch (error) {
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
            ${data.values.map(v => `<li>${v.name}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      ${(data.habits?.graduated || []).length > 0 ? `
        <div class="viewer-section">
          <h3>Hábitos consolidados</h3>
          <ul class="viewer-list">
            ${data.habits.graduated.map(h => `
              <li>
                <strong>${h.name}</strong>
                ${h.identity ? `<span class="viewer-subtitle">${h.identity}</span>` : ''}
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
              <li>${p.name}</li>
            `).join('')}
          </ul>
        </div>
      ` : ''}
    </div>
  `;

  modal.showModal();
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
