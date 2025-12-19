/**
 * Oráculo - Laboratorio de Hábitos
 * Psicología conductista aplicada (Hábitos Atómicos)
 */

import { generateId, showNotification } from '../app.js';
import { getReflexionDelDia, getReflexionPorPilar } from '../data/burkeman.js';

// Iconos disponibles para actividades atélicas
const ATELIC_ICONS = [
  { icon: 'palette', name: 'Arte' },
  { icon: 'music_note', name: 'Música' },
  { icon: 'menu_book', name: 'Lectura' },
  { icon: 'park', name: 'Naturaleza' },
  { icon: 'sports_tennis', name: 'Deportes' },
  { icon: 'local_florist', name: 'Jardinería' },
  { icon: 'videogame_asset', name: 'Juegos' },
  { icon: 'camera', name: 'Fotografía' },
  { icon: 'restaurant', name: 'Cocina' },
  { icon: 'handyman', name: 'Manualidades' },
  { icon: 'pets', name: 'Mascotas' },
  { icon: 'directions_walk', name: 'Pasear' }
];

let updateDataCallback = null;

/**
 * Renderiza el laboratorio de hábitos
 */
export const render = (data) => {
  const activeHabit = data.habits.active;
  const graduatedHabits = data.habits.graduated || [];
  const history = data.habits.history || [];

  return `
    <div class="habits-page">
      <header class="page-header">
        <h1 class="page-title">Laboratorio de Hábitos</h1>
        <p class="page-description">
          Un hábito a la vez. Los hábitos compiten por recursos cognitivos.
          Instala uno completamente antes de empezar otro.
        </p>
        <blockquote class="quote quote--header">
          <p>"${getReflexionDelDia('habits')}"</p>
        </blockquote>
      </header>

      <section class="habits-active">
        <h2>Hábito Activo</h2>

        ${activeHabit ? renderActiveHabit(activeHabit, history) : `
          <div class="empty-state">
            <p>No tienes ningún hábito en proceso de instalación.</p>
            <button class="btn btn--primary" id="create-habit-btn">
              Crear mi primer hábito
            </button>
          </div>
        `}
      </section>

      ${graduatedHabits.length > 0 ? `
        <section class="habits-graduated">
          <h2>Hábitos Consolidados</h2>
          <p class="section-description">
            Estos hábitos ya forman parte de tu rutina automática. ¡Felicidades!
          </p>
          <ul class="graduated-list">
            ${graduatedHabits.map(h => `
              <li class="graduated-item">
                <span class="material-symbols-outlined icon-success">check_circle</span>
                <span class="graduated-name">${h.name}</span>
                <span class="graduated-date">Desde ${formatShortDate(h.graduatedAt)}</span>
              </li>
            `).join('')}
          </ul>
        </section>
      ` : ''}

      <section class="habits-science">
        <h2>Las 4 Leyes de los Hábitos</h2>
        <div class="laws-grid">
          <div class="law-card">
            <span class="law-number">1</span>
            <h3>Hacerlo Obvio</h3>
            <p>La señal debe ser visible. Prepara el entorno para que el hábito sea inevitable.</p>
          </div>
          <div class="law-card">
            <span class="law-number">2</span>
            <h3>Hacerlo Atractivo</h3>
            <p>Vincúlalo con algo que disfrutes. El deseo impulsa la acción.</p>
          </div>
          <div class="law-card">
            <span class="law-number">3</span>
            <h3>Hacerlo Fácil</h3>
            <p>Reduce la fricción. La versión de 2 minutos es suficiente para empezar.</p>
          </div>
          <div class="law-card">
            <span class="law-number">4</span>
            <h3>Hacerlo Satisfactorio</h3>
            <p>Recompénsate inmediatamente. Lo que se recompensa, se repite.</p>
          </div>
        </div>
      </section>

      ${renderAtelicSection(data.atelicActivities || [])}

      <!-- Modal para crear/editar hábito -->
      <dialog id="habit-modal" class="modal modal--large">
        <form method="dialog" class="modal-content" id="habit-form">
          <h2 class="modal-title">Diseña tu Hábito</h2>

          <div class="form-section">
            <h3>Identidad</h3>
            <div class="form-group">
              <label for="habit-identity">¿Quién quieres ser?</label>
              <input
                type="text"
                id="habit-identity"
                class="input"
                placeholder="Soy una persona que se mueve a diario"
                maxlength="100"
              >
              <small>Los hábitos basados en identidad son más duraderos.</small>
            </div>
          </div>

          <div class="form-section">
            <h3>El Hábito</h3>
            <div class="form-group">
              <label for="habit-name">¿Qué hábito quieres instalar?</label>
              <input
                type="text"
                id="habit-name"
                class="input"
                placeholder="Hacer 5 minutos de movilidad"
                maxlength="100"
                required
              >
            </div>

            <div class="form-group">
              <label for="habit-micro">Micro-versión (regla de 2 minutos)</label>
              <input
                type="text"
                id="habit-micro"
                class="input"
                placeholder="Abrir la esterilla"
                maxlength="100"
              >
              <small>La versión tan pequeña que es imposible fallar.</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Habit Stacking (Ley 1: Obvio)</h3>
            <div class="form-group">
              <label for="habit-trigger">Después de [hábito existente]...</label>
              <input
                type="text"
                id="habit-trigger"
                class="input"
                placeholder="Después de servir mi café de la mañana"
                maxlength="100"
              >
              <small>Vincular el nuevo hábito a uno que ya haces automáticamente.</small>
            </div>
          </div>

          <div class="form-section">
            <h3>Hacerlo Atractivo (Ley 2)</h3>
            <div class="form-group">
              <label for="habit-attractive">¿Con qué lo emparejamos?</label>
              <input
                type="text"
                id="habit-attractive"
                class="input"
                placeholder="Mientras escucho mi podcast favorito"
                maxlength="100"
              >
            </div>
          </div>

          <div class="form-section">
            <h3>Hacerlo Fácil (Ley 3)</h3>
            <div class="form-group">
              <label for="habit-easy">¿Cómo reducimos la fricción?</label>
              <input
                type="text"
                id="habit-easy"
                class="input"
                placeholder="Dejo la esterilla desplegada junto a la cama"
                maxlength="100"
              >
            </div>
          </div>

          <div class="form-section">
            <h3>Recompensa (Ley 4: Satisfactorio)</h3>
            <div class="form-group">
              <label for="habit-reward">¿Qué te das justo después?</label>
              <input
                type="text"
                id="habit-reward"
                class="input"
                placeholder="Me digo: ¡Bien hecho! y marco el día en mi tracker"
                maxlength="100"
              >
            </div>
          </div>

          <div class="form-section">
            <h3>Duración Estimada</h3>
            <div class="form-group">
              <label for="habit-duration">¿Cuánto tiempo para instalarlo?</label>
              <select id="habit-duration" class="input">
                <option value="14">2 semanas (hábitos simples)</option>
                <option value="30" selected>1 mes (mayoría de hábitos)</option>
                <option value="60">2 meses (hábitos complejos)</option>
                <option value="90">3 meses (cambios de estilo de vida)</option>
              </select>
              <small>No existe el "21 días mágicos". Cada hábito tiene su tiempo.</small>
            </div>
          </div>

          <input type="hidden" id="habit-id">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-habit">Cancelar</button>
            <button type="submit" class="btn btn--primary">Activar Hábito</button>
          </div>
        </form>
      </dialog>

      <!-- Modal para actividades atélicas -->
      <dialog id="atelic-modal" class="modal">
        <form method="dialog" class="modal-content" id="atelic-form">
          <h2 class="modal-title">
            <span class="material-symbols-outlined icon-primary">spa</span>
            Registrar Actividad de Ocio
          </h2>

          <p class="modal-subtitle">
            Ocio sin objetivo. Está permitido "ser malo" en esto.
          </p>

          <div class="form-group">
            <label for="atelic-name">¿Qué hiciste?</label>
            <input
              type="text"
              id="atelic-name"
              class="input"
              placeholder="Pintar sin presión, tocar la guitarra mal..."
              maxlength="100"
              required
            >
          </div>

          <div class="form-group">
            <label>Elige un icono</label>
            <div class="atelic-icons" id="atelic-icons">
              ${ATELIC_ICONS.map((item, i) => `
                <button type="button" class="atelic-icon-btn ${i === 0 ? 'selected' : ''}" data-icon="${item.icon}" title="${item.name}">
                  <span class="material-symbols-outlined">${item.icon}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="form-group">
            <label for="atelic-duration">Duración aproximada (opcional)</label>
            <select id="atelic-duration" class="input">
              <option value="">No quiero medir</option>
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="120">2+ horas</option>
            </select>
          </div>

          <div class="form-group">
            <label for="atelic-note">¿Cómo te sentiste? (opcional)</label>
            <textarea
              id="atelic-note"
              class="input textarea"
              placeholder="Simplemente disfruté, sin pensar en el resultado..."
              rows="2"
              maxlength="200"
            ></textarea>
          </div>

          <input type="hidden" id="atelic-id">
          <input type="hidden" id="atelic-icon" value="palette">

          <div class="modal-actions">
            <button type="button" class="btn btn--tertiary" id="cancel-atelic">Cancelar</button>
            <button type="submit" class="btn btn--primary">Guardar</button>
          </div>
        </form>
      </dialog>
    </div>
  `;
};

/**
 * Renderiza la sección de Descanso Atélico
 */
const renderAtelicSection = (activities) => {
  const recentActivities = activities
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  return `
    <section class="habits-atelic">
      <div class="atelic-header">
        <div>
          <h2>
            <span class="material-symbols-outlined icon-primary">spa</span>
            Actividades de Ocio
          </h2>
          <p class="section-description">
            Ocio sin objetivo. Aquí no hay racha, ni metas, ni "mejorar".
          </p>
        </div>
        <button class="btn btn--secondary" id="add-atelic-btn">
          <span class="material-symbols-outlined icon-sm">add</span>
          Registrar
        </button>
      </div>

      <blockquote class="quote quote--secondary">
        <p>"${getReflexionPorPilar('imperfeccion')}"</p>
      </blockquote>

      ${recentActivities.length > 0 ? `
        <div class="atelic-list">
          ${recentActivities.map(activity => `
            <div class="atelic-item" data-id="${activity.id}">
              <span class="material-symbols-outlined atelic-item__icon">${activity.icon || 'spa'}</span>
              <div class="atelic-item__content">
                <span class="atelic-item__name">${activity.name}</span>
                <span class="atelic-item__date">${formatShortDate(activity.date)}</span>
                ${activity.note ? `<p class="atelic-item__note">${activity.note}</p>` : ''}
              </div>
              ${activity.duration ? `
                <span class="atelic-item__duration">${activity.duration} min</span>
              ` : ''}
              <button class="btn btn--icon atelic-item__delete" data-id="${activity.id}" title="Eliminar">
                <span class="material-symbols-outlined icon-sm">close</span>
              </button>
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="empty-state atelic-empty">
          <span class="material-symbols-outlined icon-xl icon-muted">self_improvement</span>
          <p>
            ¿Cuándo fue la última vez que hiciste algo solo por el placer de hacerlo?<br>
            Sin presión, sin metas, sin "ser buena" en ello.
          </p>
        </div>
      `}
    </section>
  `;
};

/**
 * Inicializa eventos
 */
export const init = (data, updateData) => {
  updateDataCallback = updateData;

  // Botón crear hábito
  document.getElementById('create-habit-btn')?.addEventListener('click', () => {
    openHabitModal();
  });

  // Botón editar hábito activo
  document.getElementById('edit-habit-btn')?.addEventListener('click', () => {
    openHabitModal(data.habits.active);
  });

  // Botón marcar como hecho hoy
  document.getElementById('habit-done-today')?.addEventListener('click', () => {
    markHabitDone(data);
  });

  // Botón graduar hábito
  document.getElementById('graduate-habit-btn')?.addEventListener('click', () => {
    graduateHabit(data);
  });

  // Botón abandonar hábito
  document.getElementById('abandon-habit-btn')?.addEventListener('click', () => {
    abandonHabit(data);
  });

  // Modal de hábitos
  setupModal(data);

  // Modal de actividades atélicas
  setupAtelicModal(data);

  // Botón añadir actividad atélica
  document.getElementById('add-atelic-btn')?.addEventListener('click', () => {
    openAtelicModal();
  });

  // Eliminar actividades atélicas
  document.querySelectorAll('.atelic-item__delete').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteAtelicActivity(btn.dataset.id, data);
    });
  });
};

/**
 * Renderiza el hábito activo con su tracker
 */
const renderActiveHabit = (habit, history) => {
  const streak = calculateStreak(habit.id, history);
  const completedToday = isCompletedToday(habit.id, history);
  const progress = calculateProgress(habit, history);
  const calendarDays = generateCalendarDays(habit, history);

  return `
    <div class="active-habit-card">
      <div class="habit-header">
        ${habit.identity ? `<p class="habit-identity">"${habit.identity}"</p>` : ''}
        <h3 class="habit-name">${habit.name}</h3>
      </div>

      <div class="habit-formula">
        ${habit.trigger ? `<p><strong>Señal:</strong> ${habit.trigger}</p>` : ''}
        ${habit.micro ? `<p><strong>Micro-versión:</strong> ${habit.micro}</p>` : ''}
        ${habit.attractive ? `<p><strong>Lo hago atractivo:</strong> ${habit.attractive}</p>` : ''}
        ${habit.easy ? `<p><strong>Lo hago fácil:</strong> ${habit.easy}</p>` : ''}
        ${habit.reward ? `<p><strong>Recompensa:</strong> ${habit.reward}</p>` : ''}
      </div>

      <div class="habit-stats">
        <div class="stat">
          <span class="stat-value">${streak}</span>
          <span class="stat-label">días seguidos</span>
        </div>
        <div class="stat">
          <span class="stat-value">${progress.completed}</span>
          <span class="stat-label">de ${progress.target} días</span>
        </div>
        <div class="stat">
          <span class="stat-value">${progress.percentage}%</span>
          <span class="stat-label">completado</span>
        </div>
      </div>

      <div class="habit-calendar">
        <h4>Registro de este mes</h4>
        <div class="calendar-grid">
          ${calendarDays.map(day => `
            <div class="calendar-day ${day.completed ? 'completed' : ''} ${day.isToday ? 'today' : ''} ${day.isFuture ? 'future' : ''}">
              <span class="day-number">${day.day}</span>
              ${day.completed ? '<span class="material-symbols-outlined day-check icon-sm filled">check</span>' : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="habit-actions">
        ${completedToday ? `
          <p class="done-message">
            <span class="material-symbols-outlined icon-success">check_circle</span>
            Hecho hoy. ¡Sigue así!
          </p>
        ` : `
          <button class="btn btn--primary btn--large" id="habit-done-today">
            <span class="material-symbols-outlined">check</span>
            Marcar como hecho hoy
          </button>
        `}
      </div>

      <div class="habit-secondary-actions">
        <button class="btn btn--tertiary" id="edit-habit-btn">
          <span class="material-symbols-outlined icon-sm">edit</span>
          Editar
        </button>
        ${progress.percentage >= 80 ? `
          <button class="btn btn--secondary" id="graduate-habit-btn">
            <span class="material-symbols-outlined icon-sm">workspace_premium</span>
            Graduar hábito
          </button>
        ` : ''}
        <button class="btn btn--danger-subtle" id="abandon-habit-btn">
          <span class="material-symbols-outlined icon-sm">close</span>
          Abandonar
        </button>
      </div>
    </div>
  `;
};

/**
 * Configura el modal
 */
const setupModal = (data) => {
  const modal = document.getElementById('habit-modal');
  const form = document.getElementById('habit-form');

  document.getElementById('cancel-habit')?.addEventListener('click', () => {
    modal.close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveHabit(data);
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });
};

/**
 * Abre el modal
 */
const openHabitModal = (habit = null) => {
  const modal = document.getElementById('habit-modal');

  document.getElementById('habit-id').value = habit?.id || '';
  document.getElementById('habit-identity').value = habit?.identity || '';
  document.getElementById('habit-name').value = habit?.name || '';
  document.getElementById('habit-micro').value = habit?.micro || '';
  document.getElementById('habit-trigger').value = habit?.trigger || '';
  document.getElementById('habit-attractive').value = habit?.attractive || '';
  document.getElementById('habit-easy').value = habit?.easy || '';
  document.getElementById('habit-reward').value = habit?.reward || '';
  document.getElementById('habit-duration').value = habit?.duration || '30';

  modal.showModal();
};

/**
 * Guarda el hábito
 */
const saveHabit = (data) => {
  const name = document.getElementById('habit-name').value.trim();
  if (!name) {
    showNotification('El nombre del hábito es obligatorio', 'warning');
    return;
  }

  const habitData = {
    id: document.getElementById('habit-id').value || generateId(),
    name,
    identity: document.getElementById('habit-identity').value.trim(),
    micro: document.getElementById('habit-micro').value.trim(),
    trigger: document.getElementById('habit-trigger').value.trim(),
    attractive: document.getElementById('habit-attractive').value.trim(),
    easy: document.getElementById('habit-easy').value.trim(),
    reward: document.getElementById('habit-reward').value.trim(),
    duration: parseInt(document.getElementById('habit-duration').value),
    createdAt: data.habits.active?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  data.habits.active = habitData;
  updateDataCallback('habits', data.habits);

  document.getElementById('habit-modal').close();
  showNotification('¡Hábito activado! Recuerda: un día a la vez.', 'success');
  location.reload();
};

/**
 * Marca el hábito como hecho hoy
 */
const markHabitDone = (data) => {
  if (!data.habits.active) return;

  const today = new Date().toISOString().split('T')[0];
  const habitId = data.habits.active.id;

  // Verificar si ya está marcado
  if (isCompletedToday(habitId, data.habits.history)) return;

  data.habits.history.push({
    habitId,
    date: today,
    completedAt: new Date().toISOString()
  });

  updateDataCallback('habits', data.habits);
  showNotification('¡Genial! Otro día más en tu racha. 🔥', 'success');
  location.reload();
};

/**
 * Gradúa el hábito (lo marca como consolidado)
 */
const graduateHabit = (data) => {
  if (!data.habits.active) return;

  if (!confirm('¿Este hábito ya forma parte de tu rutina automática? Una vez graduado, podrás empezar uno nuevo.')) {
    return;
  }

  const graduated = {
    ...data.habits.active,
    graduatedAt: new Date().toISOString()
  };

  data.habits.graduated.push(graduated);
  data.habits.active = null;

  updateDataCallback('habits', data.habits);
  showNotification('🎉 ¡Felicidades! Hábito consolidado. Ya puedes empezar uno nuevo.', 'success');
  location.reload();
};

/**
 * Abandona el hábito actual
 */
const abandonHabit = (data) => {
  if (!confirm('¿Segura que quieres abandonar este hábito? El historial se mantendrá pero el hábito dejará de estar activo.')) {
    return;
  }

  data.habits.active = null;
  updateDataCallback('habits', data.habits);
  showNotification('Hábito abandonado. Cuando quieras, puedes empezar otro.', 'info');
  location.reload();
};

// --- Funciones auxiliares ---

const calculateStreak = (habitId, history) => {
  const habitHistory = history
    .filter(h => h.habitId === habitId)
    .map(h => h.date)
    .sort()
    .reverse();

  if (habitHistory.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const todayStr = currentDate.toISOString().split('T')[0];
  if (!habitHistory.includes(todayStr)) {
    currentDate.setDate(currentDate.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = currentDate.toISOString().split('T')[0];
    if (habitHistory.includes(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
};

const isCompletedToday = (habitId, history) => {
  const today = new Date().toISOString().split('T')[0];
  return history.some(h => h.habitId === habitId && h.date === today);
};

const calculateProgress = (habit, history) => {
  const completedDays = history.filter(h => h.habitId === habit.id).length;
  const target = habit.duration || 30;
  const percentage = Math.min(100, Math.round((completedDays / target) * 100));

  return { completed: completedDays, target, percentage };
};

const generateCalendarDays = (habit, history) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const habitDates = history
    .filter(h => h.habitId === habit.id)
    .map(h => h.date);

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dateStr = date.toISOString().split('T')[0];

    days.push({
      day: d,
      completed: habitDates.includes(dateStr),
      isToday: d === today.getDate(),
      isFuture: d > today.getDate()
    });
  }

  return days;
};

const formatShortDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
};

// ============================================================
// FUNCIONES PARA DESCANSO ATÉLICO
// ============================================================

/**
 * Configura el modal de actividades atélicas
 */
const setupAtelicModal = (data) => {
  const modal = document.getElementById('atelic-modal');
  const form = document.getElementById('atelic-form');

  document.getElementById('cancel-atelic')?.addEventListener('click', () => {
    modal.close();
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveAtelicActivity(data);
  });

  modal?.addEventListener('click', (e) => {
    if (e.target === modal) modal.close();
  });

  // Configurar selección de iconos
  document.querySelectorAll('.atelic-icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.atelic-icon-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      document.getElementById('atelic-icon').value = btn.dataset.icon;
    });
  });
};

/**
 * Abre el modal de actividades atélicas
 */
const openAtelicModal = () => {
  const modal = document.getElementById('atelic-modal');

  // Resetear formulario
  document.getElementById('atelic-id').value = '';
  document.getElementById('atelic-name').value = '';
  document.getElementById('atelic-duration').value = '';
  document.getElementById('atelic-note').value = '';
  document.getElementById('atelic-icon').value = 'palette';

  // Resetear selección de iconos
  document.querySelectorAll('.atelic-icon-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i === 0);
  });

  modal.showModal();
};

/**
 * Guarda una actividad atélica
 */
const saveAtelicActivity = (data) => {
  const name = document.getElementById('atelic-name').value.trim();

  if (!name) {
    showNotification('Describe qué hiciste', 'warning');
    return;
  }

  // Asegurar que existe el array
  if (!data.atelicActivities) {
    data.atelicActivities = [];
  }

  const activity = {
    id: document.getElementById('atelic-id').value || generateId(),
    name,
    icon: document.getElementById('atelic-icon').value,
    duration: document.getElementById('atelic-duration').value || null,
    note: document.getElementById('atelic-note').value.trim() || null,
    date: new Date().toISOString()
  };

  data.atelicActivities.push(activity);
  updateDataCallback('atelicActivities', data.atelicActivities);

  document.getElementById('atelic-modal').close();
  showNotification('¡Actividad de ocio registrada! El ocio es un fin en sí mismo.', 'success');
  location.reload();
};

/**
 * Elimina una actividad atélica
 */
const deleteAtelicActivity = (activityId, data) => {
  if (!confirm('¿Eliminar esta actividad?')) return;

  data.atelicActivities = data.atelicActivities.filter(a => a.id !== activityId);
  updateDataCallback('atelicActivities', data.atelicActivities);

  showNotification('Actividad eliminada', 'info');
  location.reload();
};
