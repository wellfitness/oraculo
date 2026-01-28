/**
 * Oráculo - Diario Reflexivo
 * Journaling con prompts guiados - Páginas completas (sin modales)
 */

import { generateId, showNotification, formatDate } from '../app.js';
import { escapeHTML } from '../utils/sanitizer.js';
import {
  getReflexionDelDia,
  getPromptsIncomodidad,
  getPreguntasJung,
  getZoomingOut
} from '../data/burkeman.js';
import { getHerramienta } from '../data/markmanson.js';
import { getSpeechHandler, isSpeechSupported } from '../utils/speech-handler.js';
import { confirmDanger } from '../utils/confirm-modal.js';
import { emptyStateFor } from '../components/empty-state.js';

let updateDataCallback = null;
let currentData = null;
let searchTimeout = null;

// Tipos de entrada
const ENTRY_TYPES = {
  daily: { name: 'Check-in diario', icon: 'wb_sunny', iconClass: 'icon-warning' },
  'evening-check-in': { name: 'Check-in vespertino', icon: 'bedtime', iconClass: 'icon-secondary' },
  weekly: { name: 'Revisión semanal', icon: 'date_range', iconClass: 'icon-primary' },
  quarterly: { name: 'Revisión trimestral', icon: 'flag', iconClass: 'icon-secondary' },
  discomfort: { name: 'Registro de incomodidad', icon: 'psychology', iconClass: 'icon-secondary' },
  meditation: { name: 'Meditación', icon: 'self_improvement', iconClass: 'icon-primary' },
  // Herramientas Mark Manson
  gratitude: { name: 'Gratitud', icon: 'favorite', iconClass: 'icon-danger' },
  'letting-go': { name: 'Lista Soltar', icon: 'delete_sweep', iconClass: 'icon-muted' },
  'control-analysis': { name: 'Análisis de Control', icon: 'tune', iconClass: 'icon-primary' },
  'compassionate-reflection': { name: 'Reflexión Compasiva', icon: 'spa', iconClass: 'icon-primary' },
  legacy: { name: 'Legado', icon: 'volunteer_activism', iconClass: 'icon-primary' },
  free: { name: 'Escritura libre', icon: 'edit_note', iconClass: 'icon-muted' }
};

// Prompts por tipo
const PROMPTS = {
  daily: [
    '¿Cómo me siento hoy?',
    '¿Qué necesito hoy para estar bien?',
    '¿Cuál es mi única prioridad inevitable de hoy?',
    '¿A qué voy a decir "no" hoy para poder decir "sí" a lo importante?'
  ],
  weekly: [
    '¿Qué funcionó bien esta semana?',
    '¿Qué no funcionó y por qué?',
    '¿Qué puedo soltar o delegar?',
    '¿Estoy dedicando tiempo a mis valores fundamentales?',
    '¿Qué ajustes necesito hacer para la próxima semana?'
  ],
  quarterly: [
    '¿Mis objetivos trimestrales siguen alineados con mis valores?',
    '¿Qué he logrado este trimestre que me hace sentir orgullosa?',
    '¿Qué he aprendido sobre mí misma?',
    '¿Qué quiero hacer diferente el próximo trimestre?',
    '¿Estoy cuidando de mi salud física y mental?'
  ],
  discomfort: getPromptsIncomodidad(),
  meditation: [
    '¿Qué surgió durante la práctica?',
    '¿Qué pensamientos o sensaciones notaste?',
    '¿Hubo algún momento de resistencia?',
    '¿Cómo te sientes ahora comparado con antes?'
  ],
  // Herramientas Mark Manson
  gratitude: getHerramienta('gratitude')?.prompts || [],
  'letting-go': getHerramienta('letting-go')?.prompts || [],
  'control-analysis': getHerramienta('control-analysis')?.prompts || [],
  'compassionate-reflection': getHerramienta('compassionate-reflection')?.prompts || [],
  legacy: [
    '¿Qué quieres que diga tu pareja o familia cercana sobre cómo les hiciste sentir?',
    '¿Qué quieres que digan tus hijos, sobrinos o las personas que cuidas?',
    '¿Qué quieres que digan tus amigas?',
    '¿Qué quieres que digan en tu comunidad o trabajo?',
    '¿Hay algo que HOY no estás haciendo para que eso sea verdad?'
  ],
  jung: getPreguntasJung(),
  free: []
};

/**
 * Parsea la subruta del diario
 * Formatos: #journal, #journal/new/daily, #journal/edit/abc123
 */
const parseJournalRoute = () => {
  const hash = window.location.hash;
  const parts = hash.split('/');

  if (parts.length >= 3 && parts[1] === 'new') {
    return { mode: 'new', type: parts[2] || 'free' };
  }
  if (parts.length >= 3 && parts[1] === 'edit') {
    return { mode: 'edit', id: parts[2] };
  }
  return { mode: 'list' };
};

/**
 * Renderiza el diario (detecta si mostrar lista o editor)
 */
export const render = (data) => {
  const route = parseJournalRoute();

  if (route.mode === 'new') {
    return renderEditor(data, null, route.type);
  }
  if (route.mode === 'edit') {
    const entry = (data.journal || []).find(e => e.id === route.id);
    if (entry) {
      return renderEditor(data, entry, entry.type);
    }
  }

  return renderList(data);
};

/**
 * Renderiza la lista de entradas
 */
const renderList = (data) => {
  const entries = (data.journal || []).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return `
    <div class="journal-page">
      <header class="page-header">
        <h1 class="page-title">Diario</h1>
        <p class="page-description">
          Reflexionar te ayuda a tomar mejores decisiones. No tiene que ser perfecto,
          solo tiene que ser honesto.
        </p>
        <blockquote class="quote quote--header">
          <p>"${getReflexionDelDia('journal')}"</p>
          <cite>— Oliver Burkeman</cite>
        </blockquote>
      </header>

      <!-- Filtros de búsqueda -->
      <div class="journal-filters">
        <div class="journal-search">
          <span class="material-symbols-outlined">search</span>
          <input type="text" id="journal-search-input"
                 placeholder="Buscar en el diario..."
                 autocomplete="off">
          <button type="button" id="clear-search" class="btn-icon" hidden>
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <select id="journal-type-filter" class="journal-type-select">
          <option value="">Todos los tipos</option>
          ${Object.entries(ENTRY_TYPES).map(([type, info]) => `
            <option value="${type}">${info.name}</option>
          `).join('')}
        </select>
      </div>

      <section class="journal-new">
        <h2>Nueva entrada</h2>
        <div class="entry-type-buttons">
          ${Object.entries(ENTRY_TYPES).map(([type, info]) => `
            <a href="#journal/new/${type}" class="entry-type-btn">
              <span class="material-symbols-outlined entry-type-icon ${info.iconClass}">${info.icon}</span>
              <span class="entry-type-name">${info.name}</span>
            </a>
          `).join('')}
        </div>
      </section>

      <section class="journal-entries">
        <h2>Entradas anteriores</h2>

        ${entries.length === 0 ? emptyStateFor('journal') : `
          <div class="entries-list">
            ${entries.map(entry => renderEntryCard(entry)).join('')}
          </div>
        `}
      </section>
    </div>
  `;
};

/**
 * Renderiza una tarjeta de entrada en la lista
 */
const renderEntryCard = (entry) => {
  const typeInfo = ENTRY_TYPES[entry.type] || ENTRY_TYPES.free;
  const safeContent = escapeHTML(entry.content);
  const preview = safeContent.substring(0, 150) + (safeContent.length > 150 ? '...' : '');

  return `
    <a href="#journal/edit/${entry.id}" class="entry-card">
      <header class="entry-card__header">
        <span class="entry-type-badge">
          <span class="material-symbols-outlined icon-sm ${typeInfo.iconClass}">${typeInfo.icon}</span>
          ${typeInfo.name}
        </span>
        <time class="entry-date">${formatEntryDate(entry.createdAt)}</time>
      </header>
      <p class="entry-preview">${preview}</p>
    </a>
  `;
};

/**
 * Renderiza el editor de entrada (página completa)
 */
const renderEditor = (data, entry, type) => {
  const typeInfo = ENTRY_TYPES[type] || ENTRY_TYPES.free;
  const herramienta = getHerramienta(type);
  const prompts = PROMPTS[type] || [];
  const isNew = !entry;

  const title = entry
    ? 'Editar entrada'
    : (herramienta?.titulo || typeInfo.name);

  return `
    <div class="journal-editor-page">
      <header class="editor-header">
        <a href="#journal" class="btn btn--ghost editor-back">
          <span class="material-symbols-outlined">arrow_back</span>
          Volver al diario
        </a>
        <div class="editor-meta">
          <span class="entry-type-badge entry-type-badge--large">
            <span class="material-symbols-outlined ${typeInfo.iconClass}">${typeInfo.icon}</span>
            ${typeInfo.name}
          </span>
          <time class="editor-date">${entry ? formatEntryDate(entry.createdAt) : 'Hoy'}</time>
        </div>
      </header>

      <div class="editor-layout">
        <!-- Sidebar con prompts -->
        <aside class="editor-sidebar">
          <h2 class="editor-title">${title}</h2>

          ${herramienta ? `
            <div class="herramienta-intro">
              <p class="herramienta-descripcion">${herramienta.descripcion}</p>
              <p class="herramienta-instruccion"><em>${herramienta.instruccion}</em></p>

              ${herramienta.ejemplos ? `
                <details class="herramienta-ejemplos">
                  <summary>Ver ejemplos</summary>
                  <ul>${herramienta.ejemplos.map(ej => `<li>${ej}</li>`).join('')}</ul>
                </details>
              ` : ''}

              ${type === 'control-analysis' ? `
                <div class="control-lists">
                  <div class="control-list control-list--no">
                    <h4>No puedes cambiar:</h4>
                    <ul>${herramienta.noPuedesControlar.map(x => `<li>${x}</li>`).join('')}</ul>
                  </div>
                  <div class="control-list control-list--yes">
                    <h4>Sí puedes cambiar:</h4>
                    <ul>${herramienta.puedesControlar.map(x => `<li>${x}</li>`).join('')}</ul>
                  </div>
                </div>
              ` : ''}
            </div>
          ` : ''}

          ${prompts.length > 0 ? `
            <div class="prompts-section">
              <p class="prompts-label">Prompts para guiarte <span class="prompts-hint">(click para insertar)</span></p>
              <ul class="prompts-list">
                ${prompts.map(p => `<li class="prompt-item">${p}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </aside>

        <!-- Área de escritura principal -->
        <main class="editor-main">
          <form id="journal-form" class="editor-form">
            <div class="editor-textarea-wrapper">
              <textarea
                id="journal-content"
                class="editor-textarea"
                placeholder="Escribe aquí... Tómate tu tiempo."
                autofocus
              >${escapeHTML(entry?.content || '')}</textarea>

              <!-- Dictado por voz -->
              <div class="dictation-container" ${isSpeechSupported() ? '' : 'hidden'}>
                <div class="dictation-feedback hidden" id="dictation-feedback">
                  <span class="dictation-status">Escuchando...</span>
                  <p class="dictation-interim" id="dictation-interim"></p>
                </div>
                <button type="button" id="dictation-btn" class="btn-dictation" title="Dictar (voz a texto)">
                  <span class="material-symbols-outlined">mic</span>
                </button>
              </div>
            </div>

            <input type="hidden" id="journal-id" value="${entry?.id || ''}">
            <input type="hidden" id="journal-type" value="${type}">
            <input type="hidden" id="journal-created" value="${entry?.createdAt || ''}">

            <div class="editor-actions">
              ${!isNew ? `
                <button type="button" class="btn btn--danger btn--outline" id="delete-journal">
                  <span class="material-symbols-outlined">delete</span>
                  Eliminar
                </button>
              ` : ''}
              <div class="editor-actions-right">
                <a href="#journal" class="btn btn--tertiary">Cancelar</a>
                <button type="submit" class="btn btn--primary btn--large">
                  <span class="material-symbols-outlined">save</span>
                  Guardar
                </button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  `;
};

/**
 * Inicializa eventos
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;
  currentData = data;

  const route = parseJournalRoute();

  if (route.mode === 'new' || route.mode === 'edit') {
    setupEditor(data);
  } else {
    // Modo lista: configurar filtros de búsqueda
    setupFilters(data);
  }
};

/**
 * Configura el editor
 */
const setupEditor = (data) => {
  const form = document.getElementById('journal-form');
  const textarea = document.getElementById('journal-content');

  // Guardar entrada
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEntry(data);
  });

  // Eliminar entrada
  document.getElementById('delete-journal')?.addEventListener('click', () => {
    const id = document.getElementById('journal-id').value;
    if (!id) return;

    confirmDanger({
      title: '¿Eliminar esta entrada?',
      message: 'Se eliminará permanentemente de tu diario.',
      confirmText: 'Sí, eliminar',
      cancelText: 'No, mantener'
    }, () => {
      data.journal = data.journal.filter(e => e.id !== id);
      updateDataCallback('journal', data.journal);
      showNotification('Entrada eliminada', 'info');
      window.location.hash = '#journal';
    });
  });

  // Click en prompts para insertarlos
  document.querySelectorAll('.prompt-item').forEach(item => {
    item.addEventListener('click', () => {
      const prompt = item.textContent;
      const currentContent = textarea.value;

      textarea.value = currentContent
        ? `${currentContent}\n\n${prompt}\n`
        : `${prompt}\n`;

      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);

      // Feedback visual
      item.classList.add('prompt-item--inserted');
      setTimeout(() => item.classList.remove('prompt-item--inserted'), 300);
    });
  });

  // Auto-focus en textarea
  setTimeout(() => textarea?.focus(), 100);

  // Guardar con Ctrl+S / Cmd+S
  textarea?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveEntry(data);
    }
  });

  // Dictado por voz (Speech Recognition API)
  setupDictation(textarea);
};

/**
 * Guarda la entrada
 */
const saveEntry = (data) => {
  const id = document.getElementById('journal-id').value;
  const type = document.getElementById('journal-type').value;
  const content = document.getElementById('journal-content').value.trim();
  const createdAt = document.getElementById('journal-created').value;

  if (!content) {
    showNotification('Escribe algo antes de guardar', 'warning');
    return;
  }

  const entryData = {
    id: id || generateId(),
    type,
    content,
    createdAt: createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (id) {
    const index = data.journal.findIndex(e => e.id === id);
    if (index !== -1) data.journal[index] = entryData;
  } else {
    data.journal.push(entryData);
  }

  updateDataCallback('journal', data.journal);
  showNotification('Entrada guardada', 'success');
  window.location.hash = '#journal';
};

/**
 * Formatea la fecha de una entrada
 */
const formatEntryDate = (isoDate) => {
  const date = new Date(isoDate);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

/**
 * Filtra las entradas por texto y tipo
 */
const filterEntries = (entries, query, type) => {
  return entries.filter(entry => {
    const matchesQuery = !query ||
      entry.content.toLowerCase().includes(query.toLowerCase());
    const matchesType = !type || entry.type === type;
    return matchesQuery && matchesType;
  });
};

/**
 * Renderiza solo la lista de entradas (para updates parciales)
 */
const renderEntriesListHTML = (entries) => {
  if (entries.length === 0) {
    return `
      <div class="empty-state">
        <p>No se encontraron entradas.</p>
        <p>Prueba con otros términos de búsqueda.</p>
      </div>
    `;
  }

  return `
    <div class="entries-list">
      ${entries.map(entry => renderEntryCard(entry)).join('')}
    </div>
  `;
};

/**
 * Actualiza la lista de entradas en el DOM
 */
const updateEntriesList = (data) => {
  const searchInput = document.getElementById('journal-search-input');
  const typeFilter = document.getElementById('journal-type-filter');
  const entriesContainer = document.querySelector('.journal-entries');

  if (!entriesContainer || !searchInput || !typeFilter) return;

  const query = searchInput.value.trim();
  const type = typeFilter.value;

  // Ordenar por fecha descendente
  const allEntries = (data.journal || []).sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Filtrar
  const filteredEntries = filterEntries(allEntries, query, type);

  // Actualizar contador
  const total = allEntries.length;
  const filtered = filteredEntries.length;
  const countText = query || type
    ? `${filtered} de ${total} entradas`
    : `${total} entradas`;

  // Actualizar el DOM
  entriesContainer.innerHTML = `
    <h2>Entradas anteriores <span class="entries-count">(${countText})</span></h2>
    ${allEntries.length === 0 ? `
      <div class="empty-state">
        <p>Todavía no has escrito ninguna entrada.</p>
        <p>Empieza con un check-in diario. Solo toma unos minutos.</p>
      </div>
    ` : renderEntriesListHTML(filteredEntries)}
  `;

  // Mostrar/ocultar botón de limpiar búsqueda
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) {
    clearBtn.hidden = !query;
  }
};

/**
 * Configura los filtros de búsqueda
 */
const setupFilters = (data) => {
  const searchInput = document.getElementById('journal-search-input');
  const typeFilter = document.getElementById('journal-type-filter');
  const clearBtn = document.getElementById('clear-search');

  if (!searchInput || !typeFilter) return;

  // Búsqueda con debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      updateEntriesList(data);
    }, 150);
  });

  // Filtro por tipo (inmediato)
  typeFilter.addEventListener('change', () => {
    updateEntriesList(data);
  });

  // Limpiar búsqueda
  clearBtn?.addEventListener('click', () => {
    searchInput.value = '';
    updateEntriesList(data);
    searchInput.focus();
  });

  // Atajo: Escape para limpiar
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      updateEntriesList(data);
    }
  });
};

/**
 * Configura el dictado por voz usando el speech handler compartido
 */
const setupDictation = (textarea) => {
  const btn = document.getElementById('dictation-btn');
  const feedback = document.getElementById('dictation-feedback');
  const interimEl = document.getElementById('dictation-interim');

  if (!btn || !textarea || !isSpeechSupported()) return;

  const speechHandler = getSpeechHandler();

  // Click en botón: iniciar/detener
  btn.addEventListener('click', () => {
    if (speechHandler.isListening) {
      speechHandler.stop();
    } else {
      speechHandler.start();
    }
  });

  // Evento: inicio de grabación
  speechHandler.on('start', () => {
    btn.classList.add('recording');
    btn.querySelector('.material-symbols-outlined').textContent = 'stop';
    btn.title = 'Detener dictado';
    feedback?.classList.remove('hidden');
    if (interimEl) interimEl.textContent = '';
  });

  // Evento: resultados (interim y final)
  speechHandler.on('result', ({ interim, final }) => {
    // Mostrar texto provisional mientras habla
    if (interim && interimEl) {
      interimEl.textContent = interim;
    }

    // Insertar texto final en el textarea
    if (final) {
      speechHandler.insertAtCursor(textarea, final);
      if (interimEl) interimEl.textContent = '';
    }
  });

  // Evento: fin de grabación
  speechHandler.on('end', () => {
    btn.classList.remove('recording');
    btn.querySelector('.material-symbols-outlined').textContent = 'mic';
    btn.title = 'Dictar (voz a texto)';
    feedback?.classList.add('hidden');
    if (interimEl) interimEl.textContent = '';
  });

  // Evento: error
  speechHandler.on('error', ({ message }) => {
    btn.classList.remove('recording');
    btn.querySelector('.material-symbols-outlined').textContent = 'mic';
    btn.title = 'Dictar (voz a texto)';
    feedback?.classList.add('hidden');
    showNotification(message, 'warning');
  });
};
