/**
 * Oráculo - Calendario
 * Vista semanal y gestión de eventos
 */

import { generateId, showNotification } from '../app.js';
import { escapeHTML } from '../utils/sanitizer.js';
import { getReflexionDelDia } from '../data/burkeman.js';

let updateDataCallback = null;
let currentWeekStart = getWeekStart(new Date());
let currentData = null;

/**
 * Renderiza el calendario
 */
export const render = (data) => {
  const weekDays = generateWeekDays(currentWeekStart);
  const events = data.calendar.events || [];
  const recurring = data.calendar.recurring || [];

  return `
    <div class="calendar-page">
      <header class="page-header">
        <h1 class="page-title">Calendario</h1>
        <p class="page-description">
          Si no está en el calendario, no existe. Bloquea tiempo para lo importante.
        </p>
        <blockquote class="quote quote--header">
          <p>"${getReflexionDelDia('calendar')}"</p>
        </blockquote>
      </header>

      <div class="calendar-navigation">
        <button class="btn btn--icon" id="prev-week">
          <span class="material-symbols-outlined">chevron_left</span>
        </button>
        <h2 class="week-title">${formatWeekRange(currentWeekStart)}</h2>
        <button class="btn btn--icon" id="next-week">
          <span class="material-symbols-outlined">chevron_right</span>
        </button>
        <button class="btn btn--tertiary" id="today-btn">
          <span class="material-symbols-outlined icon-sm">today</span>
          Hoy
        </button>
      </div>

      <div class="calendar-actions">
        <button class="btn btn--primary" id="add-event-btn">
          <span class="material-symbols-outlined icon-sm">add</span>
          Nuevo evento
        </button>
        <button class="btn btn--secondary" id="add-recurring-btn">
          <span class="material-symbols-outlined icon-sm">repeat</span>
          Evento recurrente
        </button>
        <button class="btn btn--tertiary" id="export-ics-btn"
          title="Descargar archivo .ics para importar en Google Calendar, Outlook, etc.">
          <span class="material-symbols-outlined icon-sm">download</span>
          Exportar .ics
        </button>
      </div>

      <div class="week-view">
        ${weekDays.map(day => renderDayColumn(day, events, recurring)).join('')}
      </div>

      <!-- Modal evento puntual -->
      <dialog id="event-modal" class="modal">
        <form method="dialog" class="modal-content" id="event-form">
          <h2 class="modal-title" id="event-modal-title">Nuevo Evento</h2>

          <div class="form-group">
            <label for="event-name">Nombre</label>
            <input type="text" id="event-name" class="input" required maxlength="100">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="event-date">Fecha</label>
              <input type="date" id="event-date" class="input" required>
            </div>
            <div class="form-group">
              <label for="event-time">Hora</label>
              <input type="time" id="event-time" class="input">
            </div>
          </div>

          <div class="form-group">
            <label for="event-duration">Duración (minutos)</label>
            <input type="number" id="event-duration" class="input" value="60" min="15" step="15">
          </div>

          <div class="form-group">
            <label for="event-notes">Notas</label>
            <textarea id="event-notes" class="input textarea" rows="2" maxlength="300"></textarea>
          </div>

          <div class="form-group form-group--checkbox">
            <label class="checkbox-label">
              <input type="checkbox" id="event-sincronia" class="checkbox">
              <span class="material-symbols-outlined icon-sm">group</span>
              <span>Evento de sincronía (tiempo con otros)</span>
            </label>
            <p class="form-hint">El tiempo compartido tiene un valor especial.</p>
          </div>

          <input type="hidden" id="event-id">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-event">Cancelar</button>
            <button type="button" class="btn btn--danger" id="delete-event" style="display:none">Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>

      <!-- Modal evento recurrente -->
      <dialog id="recurring-modal" class="modal">
        <form method="dialog" class="modal-content" id="recurring-form">
          <h2 class="modal-title">Evento Recurrente</h2>

          <div class="form-group">
            <label for="recurring-name">Nombre</label>
            <input type="text" id="recurring-name" class="input" required maxlength="100"
              placeholder="Ej: Entrenamiento">
          </div>

          <div class="form-group">
            <label for="recurring-time">Hora</label>
            <input type="time" id="recurring-time" class="input">
          </div>

          <div class="form-group">
            <label>Días de la semana</label>
            <div class="days-selector">
              <!-- Valores coinciden con JavaScript getDay(): 0=Dom, 1=Lun, 2=Mar, etc. -->
              <label title="Lunes"><input type="checkbox" name="recurring-day" value="1"> Lun</label>
              <label title="Martes"><input type="checkbox" name="recurring-day" value="2"> Mar</label>
              <label title="Miércoles"><input type="checkbox" name="recurring-day" value="3"> Mié</label>
              <label title="Jueves"><input type="checkbox" name="recurring-day" value="4"> Jue</label>
              <label title="Viernes"><input type="checkbox" name="recurring-day" value="5"> Vie</label>
              <label title="Sábado"><input type="checkbox" name="recurring-day" value="6"> Sáb</label>
              <label title="Domingo"><input type="checkbox" name="recurring-day" value="0"> Dom</label>
            </div>
          </div>

          <div class="form-group form-group--checkbox">
            <label class="checkbox-label">
              <input type="checkbox" id="recurring-sincronia" class="checkbox">
              <span class="material-symbols-outlined icon-sm">group</span>
              <span>Evento de sincronía</span>
            </label>
          </div>

          <input type="hidden" id="recurring-id">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-recurring">Cancelar</button>
            <button type="button" class="btn btn--danger" id="delete-recurring" style="display:none">Eliminar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>
    </div>
  `;
};

/**
 * Re-renderiza el calendario sin recargar la página
 * Útil para navegación de semanas y actualización de eventos
 */
const reRender = () => {
  if (!currentData) return;

  const container = document.querySelector('.calendar-section');
  if (!container) return;

  // Re-generar HTML
  const weekDays = generateWeekDays(currentWeekStart);
  const events = currentData.calendar.events || [];
  const recurring = currentData.calendar.recurring || [];

  // Actualizar solo el contenido de navegación y la vista semanal
  const navigation = container.querySelector('.calendar-navigation');
  const weekView = container.querySelector('.week-view');

  if (navigation) {
    navigation.querySelector('.week-title').innerHTML = formatWeekRange(currentWeekStart);
  }

  if (weekView) {
    weekView.innerHTML = weekDays.map(day => renderDayColumn(day, events, recurring)).join('');
  }

  // Re-bind event listeners para los nuevos elementos
  bindWeekViewEvents();
};

/**
 * Vincula eventos de la vista semanal (doble-clic en días, clic en eventos)
 */
const bindWeekViewEvents = () => {
  // Click en día para añadir evento
  document.querySelectorAll('.day-column').forEach(col => {
    col.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('day-column') || e.target.classList.contains('day-events')) {
        const date = col.dataset.date;
        openEventModal(null, date);
      }
    });
  });

  // Click en evento para editar
  document.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const eventId = item.dataset.id;
      const isRecurring = item.dataset.recurring === 'true';

      if (isRecurring) {
        const recurring = currentData.calendar.recurring.find(r => r.id === eventId);
        if (recurring) openRecurringModal(recurring);
      } else {
        const event = currentData.calendar.events.find(ev => ev.id === eventId);
        if (event) openEventModal(event);
      }
    });
  });
};

/**
 * Inicializa eventos
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;
  currentData = data;

  // Navegación de semanas
  document.getElementById('prev-week')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    reRender();
  });

  document.getElementById('next-week')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    reRender();
  });

  document.getElementById('today-btn')?.addEventListener('click', () => {
    currentWeekStart = getWeekStart(new Date());
    reRender();
  });

  // Modales
  document.getElementById('add-event-btn')?.addEventListener('click', () => {
    openEventModal();
  });

  document.getElementById('add-recurring-btn')?.addEventListener('click', () => {
    openRecurringModal();
  });

  // Click en día para añadir evento
  document.querySelectorAll('.day-column').forEach(col => {
    col.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('day-column') || e.target.classList.contains('day-events')) {
        const date = col.dataset.date;
        openEventModal(null, date);
      }
    });
  });

  // Click en evento para editar
  document.querySelectorAll('.event-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const eventId = item.dataset.id;
      const isRecurring = item.dataset.recurring === 'true';

      if (isRecurring) {
        const recurring = data.calendar.recurring.find(r => r.id === eventId);
        if (recurring) openRecurringModal(recurring);
      } else {
        const event = data.calendar.events.find(ev => ev.id === eventId);
        if (event) openEventModal(event);
      }
    });
  });

  // Exportar ICS
  document.getElementById('export-ics-btn')?.addEventListener('click', () => {
    exportToICS(data);
  });

  // Añadir a Google Calendar
  document.querySelectorAll('.event-item__gcal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar abrir el modal de edición
      const eventData = JSON.parse(btn.dataset.event);
      openGoogleCalendar(eventData);
    });
  });

  setupEventModal(data);
  setupRecurringModal(data);
};

/**
 * Renderiza una columna de día
 */
/**
 * Obtiene la fecha en formato YYYY-MM-DD usando la hora LOCAL del sistema
 */
const getLocalDateString = (date = new Date()) => {
  return date.toLocaleDateString('en-CA');
};

const renderDayColumn = (day, events, recurring) => {
  const dayEvents = getDayEvents(day.dateStr, events, recurring, day.dayOfWeek);
  const isToday = day.dateStr === getLocalDateString();

  return `
    <div class="day-column ${isToday ? 'day-column--today' : ''}" data-date="${day.dateStr}"
         title="Doble clic para crear evento">
      <div class="day-header">
        <span class="day-name">${day.dayName}</span>
        <span class="day-number">${day.dayNumber}</span>
      </div>
      <div class="day-events">
        ${dayEvents.map(event => `
          <div class="event-item ${event.recurring ? 'event-item--recurring' : ''} ${event.isSincronia ? 'event-item--sincronia' : ''}"
               data-id="${event.id}" data-recurring="${event.recurring || false}">
            <div class="event-item__content">
              ${event.isSincronia ? '<span class="material-symbols-outlined event-sincronia-icon" title="Evento de sincronía">group</span>' : ''}
              ${event.time ? `<span class="event-time">${event.time}</span>` : ''}
              <span class="event-name">${escapeHTML(event.name)}</span>
            </div>
            <button class="event-item__gcal btn--icon"
                    data-event='${JSON.stringify({ name: event.name, date: event.recurring ? day.dateStr : event.date, time: event.time, duration: event.duration, notes: event.notes })}'
                    title="Añadir a Google Calendar">
              <span class="material-symbols-outlined icon-xs">open_in_new</span>
            </button>
          </div>
        `).join('')}
      </div>
    </div>
  `;
};

/**
 * Obtiene eventos de un día
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 * @param {Array} events - Eventos puntuales
 * @param {Array} recurring - Eventos recurrentes
 * @param {number} dayOfWeek - Día de la semana según JS getDay(): 0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb
 */
const getDayEvents = (dateStr, events, recurring, dayOfWeek) => {
  const dayEvents = [];

  // Eventos puntuales
  events.forEach(e => {
    if (e.date === dateStr) {
      dayEvents.push(e);
    }
  });

  // Eventos recurrentes
  // Los valores en r.days coinciden con JS getDay(): 0=Dom, 1=Lun, 2=Mar, etc.
  recurring.forEach(r => {
    if (r.days && r.days.includes(dayOfWeek)) {
      dayEvents.push({ ...r, recurring: true });
    }
  });

  // Ordenar por hora
  return dayEvents.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
};

/**
 * Genera los días de la semana
 */
const generateWeekDays = (weekStart) => {
  const days = [];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + i);

    days.push({
      date,
      dateStr: getLocalDateString(date),
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      dayOfWeek: date.getDay()
    });
  }

  return days;
};

/**
 * Obtiene el inicio de la semana (lunes)
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Verifica si la semana mostrada es la semana actual
 */
const isCurrentWeek = (weekStart) => {
  const today = new Date();
  const currentStart = getWeekStart(today);
  return weekStart.getTime() === currentStart.getTime();
};

/**
 * Formatea el rango de la semana
 */
const formatWeekRange = (weekStart) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const options = { day: 'numeric', month: 'short' };
  const start = weekStart.toLocaleDateString('es-ES', options);
  const end = weekEnd.toLocaleDateString('es-ES', options);

  const current = isCurrentWeek(weekStart);
  const indicator = current ? ' <span class="week-current-badge">Semana actual</span>' : '';

  return `${start} - ${end}${indicator}`;
};

// --- Modal de eventos ---

const openEventModal = (event = null, defaultDate = null) => {
  const modal = document.getElementById('event-modal');
  const title = document.getElementById('event-modal-title');
  const deleteBtn = document.getElementById('delete-event');

  document.getElementById('event-id').value = event?.id || '';
  document.getElementById('event-name').value = event?.name || '';
  document.getElementById('event-date').value = event?.date || defaultDate || getLocalDateString();
  document.getElementById('event-time').value = event?.time || '';
  document.getElementById('event-duration').value = event?.duration || 60;
  document.getElementById('event-notes').value = event?.notes || '';
  document.getElementById('event-sincronia').checked = event?.isSincronia || false;

  title.textContent = event ? 'Editar Evento' : 'Nuevo Evento';
  deleteBtn.style.display = event ? 'block' : 'none';

  modal.showModal();
};

const setupEventModal = (data) => {
  const modal = document.getElementById('event-modal');
  const form = document.getElementById('event-form');

  document.getElementById('cancel-event')?.addEventListener('click', () => modal.close());

  document.getElementById('delete-event')?.addEventListener('click', () => {
    const id = document.getElementById('event-id').value;
    if (id && confirm('¿Eliminar este evento?')) {
      data.calendar.events = data.calendar.events.filter(e => e.id !== id);
      currentData.calendar = data.calendar;
      updateDataCallback('calendar', data.calendar);
      modal.close();
      reRender();
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveEvent(data);
  });

  // Atajo Ctrl+Enter para guardar
  form?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      saveEvent(data);
    }
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
};

const saveEvent = (data) => {
  const id = document.getElementById('event-id').value;
  const eventData = {
    id: id || generateId(),
    name: document.getElementById('event-name').value.trim(),
    date: document.getElementById('event-date').value,
    time: document.getElementById('event-time').value,
    duration: parseInt(document.getElementById('event-duration').value) || 60,
    notes: document.getElementById('event-notes').value.trim(),
    isSincronia: document.getElementById('event-sincronia').checked
  };

  if (!eventData.name || !eventData.date) {
    showNotification('Nombre y fecha son obligatorios', 'warning');
    return;
  }

  if (id) {
    const index = data.calendar.events.findIndex(e => e.id === id);
    if (index !== -1) data.calendar.events[index] = eventData;
  } else {
    data.calendar.events.push(eventData);
  }

  currentData.calendar = data.calendar;
  updateDataCallback('calendar', data.calendar);
  document.getElementById('event-modal').close();
  showNotification('Evento guardado', 'success');
  reRender();
};

// --- Modal de eventos recurrentes ---

const openRecurringModal = (recurring = null) => {
  const modal = document.getElementById('recurring-modal');
  const deleteBtn = document.getElementById('delete-recurring');

  document.getElementById('recurring-id').value = recurring?.id || '';
  document.getElementById('recurring-name').value = recurring?.name || '';
  document.getElementById('recurring-time').value = recurring?.time || '';

  // Reset checkboxes
  document.querySelectorAll('input[name="recurring-day"]').forEach(cb => {
    cb.checked = recurring?.days?.includes(parseInt(cb.value)) || false;
  });

  // Sincronía
  document.getElementById('recurring-sincronia').checked = recurring?.isSincronia || false;

  deleteBtn.style.display = recurring ? 'block' : 'none';
  modal.showModal();
};

const setupRecurringModal = (data) => {
  const modal = document.getElementById('recurring-modal');
  const form = document.getElementById('recurring-form');

  document.getElementById('cancel-recurring')?.addEventListener('click', () => modal.close());

  document.getElementById('delete-recurring')?.addEventListener('click', () => {
    const id = document.getElementById('recurring-id').value;
    if (id && confirm('¿Eliminar este evento recurrente?')) {
      data.calendar.recurring = data.calendar.recurring.filter(r => r.id !== id);
      currentData.calendar = data.calendar;
      updateDataCallback('calendar', data.calendar);
      modal.close();
      reRender();
    }
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveRecurring(data);
  });

  // Atajo Ctrl+Enter para guardar
  form?.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      saveRecurring(data);
    }
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
};

const saveRecurring = (data) => {
  const id = document.getElementById('recurring-id').value;
  const days = Array.from(document.querySelectorAll('input[name="recurring-day"]:checked'))
    .map(cb => parseInt(cb.value));

  const recurringData = {
    id: id || generateId(),
    name: document.getElementById('recurring-name').value.trim(),
    time: document.getElementById('recurring-time').value,
    days,
    isSincronia: document.getElementById('recurring-sincronia').checked
  };

  if (!recurringData.name || days.length === 0) {
    showNotification('Nombre y al menos un día son obligatorios', 'warning');
    return;
  }

  if (id) {
    const index = data.calendar.recurring.findIndex(r => r.id === id);
    if (index !== -1) data.calendar.recurring[index] = recurringData;
  } else {
    data.calendar.recurring.push(recurringData);
  }

  currentData.calendar = data.calendar;
  updateDataCallback('calendar', data.calendar);
  document.getElementById('recurring-modal').close();
  showNotification('Evento recurrente guardado', 'success');
  reRender();
};

// --- Exportar a ICS ---

const exportToICS = (data) => {
  const events = data.calendar.events || [];
  const recurring = data.calendar.recurring || [];

  if (events.length === 0 && recurring.length === 0) {
    showNotification('No hay eventos para exportar', 'warning');
    return;
  }

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Oráculo//Movimiento Funcional//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  // Eventos puntuales
  events.forEach(event => {
    const dtStart = formatICSDate(event.date, event.time);
    const dtEnd = formatICSDate(event.date, event.time, event.duration);

    icsContent.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@oraculo`,
      `DTSTAMP:${formatICSDate(new Date().toISOString().split('T')[0], '00:00')}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${event.name}`,
      event.notes ? `DESCRIPTION:${event.notes}` : '',
      'END:VEVENT'
    );
  });

  icsContent.push('END:VCALENDAR');

  const blob = new Blob([icsContent.filter(Boolean).join('\r\n')], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `oraculo-calendario-${new Date().toISOString().split('T')[0]}.ics`;
  a.click();

  URL.revokeObjectURL(url);
  showNotification('Calendario exportado', 'success');
};

const formatICSDate = (date, time, durationMinutes = 0) => {
  const d = new Date(`${date}T${time || '00:00'}`);
  if (durationMinutes) d.setMinutes(d.getMinutes() + durationMinutes);

  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Abre Google Calendar con el evento pre-rellenado
 */
const openGoogleCalendar = (event) => {
  const { name, date, time, duration = 60, notes } = event;

  // Formatear fechas para Google Calendar (YYYYMMDDTHHmmss)
  const startDate = new Date(`${date}T${time || '09:00'}`);
  const endDate = new Date(startDate.getTime() + (duration * 60 * 1000));

  const formatGoogleDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0];
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: name,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
  });

  if (notes) {
    params.set('details', notes);
  }

  const url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  window.open(url, '_blank');

  showNotification('Abriendo Google Calendar...', 'info');
};
