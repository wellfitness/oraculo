/**
 * Oráculo - Diario Reflexivo
 * Journaling con prompts guiados
 */

import { generateId, showNotification, formatDate } from '../app.js';

let updateDataCallback = null;

// Tipos de entrada
const ENTRY_TYPES = {
  daily: { name: 'Check-in diario', icon: 'wb_sunny', iconClass: 'icon-warning' },
  weekly: { name: 'Revisión semanal', icon: 'date_range', iconClass: 'icon-primary' },
  quarterly: { name: 'Revisión trimestral', icon: 'flag', iconClass: 'icon-secondary' },
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
  free: []
};

/**
 * Renderiza el diario
 */
export const render = (data) => {
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
      </header>

      <section class="journal-new">
        <h2>Nueva entrada</h2>
        <div class="entry-type-buttons">
          ${Object.entries(ENTRY_TYPES).map(([type, info]) => `
            <button class="entry-type-btn" data-type="${type}">
              <span class="material-symbols-outlined entry-type-icon ${info.iconClass}">${info.icon}</span>
              <span class="entry-type-name">${info.name}</span>
            </button>
          `).join('')}
        </div>
      </section>

      <section class="journal-entries">
        <h2>Entradas anteriores</h2>

        ${entries.length === 0 ? `
          <div class="empty-state">
            <p>Todavía no has escrito ninguna entrada.</p>
            <p>Empieza con un check-in diario. Solo toma unos minutos.</p>
          </div>
        ` : `
          <div class="entries-list">
            ${entries.map(entry => renderEntry(entry)).join('')}
          </div>
        `}
      </section>

      <!-- Modal para nueva/editar entrada -->
      <dialog id="journal-modal" class="modal modal--large">
        <form method="dialog" class="modal-content" id="journal-form">
          <header class="modal-header">
            <span class="entry-type-badge" id="modal-type-badge"></span>
            <h2 class="modal-title" id="journal-modal-title">Nueva entrada</h2>
            <time class="modal-date" id="modal-date"></time>
          </header>

          <div class="journal-prompts" id="journal-prompts"></div>

          <div class="form-group">
            <textarea
              id="journal-content"
              class="input textarea textarea--large"
              placeholder="Escribe aquí..."
              rows="10"
            ></textarea>
          </div>

          <input type="hidden" id="journal-id">
          <input type="hidden" id="journal-type">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-journal">Cancelar</button>
            <button type="button" class="btn btn--danger" id="delete-journal" style="display:none">Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>
    </div>
  `;
};

/**
 * Inicializa eventos
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;

  // Botones de tipo de entrada
  document.querySelectorAll('.entry-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      openJournalModal(null, type);
    });
  });

  // Click en entrada para ver/editar
  document.querySelectorAll('.entry-card').forEach(card => {
    card.addEventListener('click', () => {
      const entryId = card.dataset.id;
      const entry = data.journal.find(e => e.id === entryId);
      if (entry) openJournalModal(entry);
    });
  });

  setupModal(data);
};

/**
 * Renderiza una entrada del diario
 */
const renderEntry = (entry) => {
  const typeInfo = ENTRY_TYPES[entry.type] || ENTRY_TYPES.free;
  const preview = entry.content.substring(0, 150) + (entry.content.length > 150 ? '...' : '');

  return `
    <article class="entry-card" data-id="${entry.id}">
      <header class="entry-card__header">
        <span class="entry-type-badge">
          <span class="material-symbols-outlined icon-sm ${typeInfo.iconClass}">${typeInfo.icon}</span>
          ${typeInfo.name}
        </span>
        <time class="entry-date">${formatEntryDate(entry.createdAt)}</time>
      </header>
      <p class="entry-preview">${preview}</p>
    </article>
  `;
};

/**
 * Configura el modal
 */
const setupModal = (data) => {
  const modal = document.getElementById('journal-modal');
  const form = document.getElementById('journal-form');

  document.getElementById('cancel-journal')?.addEventListener('click', () => modal.close());

  document.getElementById('delete-journal')?.addEventListener('click', () => {
    const id = document.getElementById('journal-id').value;
    if (id && confirm('¿Eliminar esta entrada?')) {
      data.journal = data.journal.filter(e => e.id !== id);
      updateDataCallback('journal', data.journal);
      modal.close();
      showNotification('Entrada eliminada', 'info');
      location.reload();
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEntry(data);
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  // Clicks en prompts para insertarlos
  document.getElementById('journal-prompts')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('prompt-item')) {
      const textarea = document.getElementById('journal-content');
      const prompt = e.target.textContent;
      const currentContent = textarea.value;

      textarea.value = currentContent
        ? `${currentContent}\n\n${prompt}\n`
        : `${prompt}\n`;

      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  });
};

/**
 * Abre el modal
 */
const openJournalModal = (entry = null, type = 'free') => {
  const modal = document.getElementById('journal-modal');
  const title = document.getElementById('journal-modal-title');
  const typeBadge = document.getElementById('modal-type-badge');
  const dateEl = document.getElementById('modal-date');
  const promptsContainer = document.getElementById('journal-prompts');
  const deleteBtn = document.getElementById('delete-journal');

  const entryType = entry?.type || type;
  const typeInfo = ENTRY_TYPES[entryType];

  document.getElementById('journal-id').value = entry?.id || '';
  document.getElementById('journal-type').value = entryType;
  document.getElementById('journal-content').value = entry?.content || '';

  title.textContent = entry ? 'Editar entrada' : 'Nueva entrada';
  typeBadge.innerHTML = `<span class="material-symbols-outlined icon-sm ${typeInfo.iconClass}">${typeInfo.icon}</span> ${typeInfo.name}`;
  dateEl.textContent = entry ? formatEntryDate(entry.createdAt) : formatEntryDate(new Date());
  deleteBtn.style.display = entry ? 'block' : 'none';

  // Mostrar prompts
  const prompts = PROMPTS[entryType] || [];
  if (prompts.length > 0 && !entry) {
    promptsContainer.innerHTML = `
      <p class="prompts-label">Prompts para guiarte (click para insertar):</p>
      <ul class="prompts-list">
        ${prompts.map(p => `<li class="prompt-item">${p}</li>`).join('')}
      </ul>
    `;
    promptsContainer.style.display = 'block';
  } else {
    promptsContainer.style.display = 'none';
  }

  modal.showModal();

  // Focus en textarea
  setTimeout(() => {
    document.getElementById('journal-content').focus();
  }, 100);
};

/**
 * Guarda la entrada
 */
const saveEntry = (data) => {
  const id = document.getElementById('journal-id').value;
  const type = document.getElementById('journal-type').value;
  const content = document.getElementById('journal-content').value.trim();

  if (!content) {
    showNotification('Escribe algo antes de guardar', 'warning');
    return;
  }

  const entryData = {
    id: id || generateId(),
    type,
    content,
    createdAt: id
      ? data.journal.find(e => e.id === id)?.createdAt
      : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (id) {
    const index = data.journal.findIndex(e => e.id === id);
    if (index !== -1) data.journal[index] = entryData;
  } else {
    data.journal.push(entryData);
  }

  updateDataCallback('journal', data.journal);
  document.getElementById('journal-modal').close();
  showNotification('Entrada guardada', 'success');
  location.reload();
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
