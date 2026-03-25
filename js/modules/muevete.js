/**
 * Oráculo - Módulo Muévete
 * Breaks de movimiento integrados en tu jornada.
 *
 * Vista con 4 pantallas según el estado del timer:
 * idle → working → break_alert → active_break
 */

import { showNotification } from '../app.js';
import {
  getMueveteState,
  getWeekSummary,
  getRandomBreakTip,
  formatTime,
  startWorkBlock,
  acknowledgeBreak,
  snoozeBreak,
  endBreakEarly,
  resetTimer,
  dismissSoleusReminder,
  updateMueveteSettings,
  requestNotificationPermission
} from '../components/muevete-timer.js';

const WORK_OPTIONS = [
  { label: '1h 30m', ms: 90 * 60 * 1000 },
  { label: '2h', ms: 120 * 60 * 1000 },
  { label: '2h 30m', ms: 150 * 60 * 1000 }
];

const BREAK_OPTIONS = [
  { label: '6 min', ms: 6 * 60 * 1000 },
  { label: '8 min', ms: 8 * 60 * 1000 },
  { label: '10 min', ms: 10 * 60 * 1000 }
];

const SOLEUS_OPTIONS = [
  { label: '20 min', ms: 20 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '45 min', ms: 45 * 60 * 1000 }
];

const DAY_NAMES = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

let stateChangeHandler = null;
let updateDataCallback = null;

// ============================================================
// TIMER CIRCULAR SVG
// ============================================================

const renderTimerRing = (remaining, total, color = 'turquesa') => {
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, remaining / total) : 0;
  const offset = circumference * (1 - progress);

  const strokeColor = color === 'rosa'
    ? 'var(--rosa-500, #e11d48)'
    : 'var(--turquesa-400, #06b6d4)';

  return `
    <div class="muevete-timer-ring">
      <svg viewBox="0 0 200 200" width="200" height="200">
        <circle class="muevete-timer-ring__track"
          cx="100" cy="100" r="${radius}"
          fill="none" stroke="var(--gris-100, #f1f5f9)" stroke-width="8" />
        <circle class="muevete-timer-ring__progress"
          cx="100" cy="100" r="${radius}"
          fill="none" stroke="${strokeColor}" stroke-width="8"
          stroke-linecap="round"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"
          transform="rotate(-90 100 100)" />
      </svg>
      <div class="muevete-timer-ring__text">
        <span class="muevete-timer-ring__time">${formatTime(remaining)}</span>
      </div>
    </div>
  `;
};

// ============================================================
// WEEK STRIP
// ============================================================

const renderWeekStrip = (data) => {
  const log = data?.muevete?.activityLog || { entries: [], currentStreak: 0, bestStreak: 0 };
  const summary = getWeekSummary(log);

  const daysHtml = summary.days.map(day => {
    const dayName = DAY_NAMES[day.dayOfWeek];
    const statusClass = `muevete-weekstrip__circle--${day.status}`;
    const count = day.completed > 0 ? day.completed : '';

    return `
      <div class="muevete-weekstrip__day">
        <span class="muevete-weekstrip__label">${dayName}</span>
        <span class="muevete-weekstrip__circle ${statusClass}">${count}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="muevete-weekstrip">
      <div class="muevete-weekstrip__days">${daysHtml}</div>
      <div class="muevete-weekstrip__stats">
        <span>${summary.totalCompleted} vitaminas M esta semana</span>
        ${summary.currentStreak > 0 ? `<span class="muevete-weekstrip__streak"><span class="material-symbols-outlined" style="font-size:16px">local_fire_department</span> ${summary.currentStreak} días</span>` : ''}
      </div>
    </div>
  `;
};

// ============================================================
// PANTALLAS
// ============================================================

const renderIdle = (state, data) => {
  const notifStatus = 'Notification' in window ? Notification.permission : 'denied';

  return `
    <div class="muevete-idle">
      <div class="muevete-idle__hero">
        <span class="material-symbols-outlined muevete-idle__icon">directions_run</span>
        <h2 class="muevete-idle__title">Muévete</h2>
        <p class="muevete-idle__subtitle">Tu cuerpo necesita movimiento cada 2 horas. Inicia un bloque de trabajo y te avisaré.</p>
      </div>

      ${renderWeekStrip(data)}

      <button class="btn btn--primary btn--large muevete-idle__cta" id="muevete-start">
        <span class="material-symbols-outlined">play_arrow</span>
        Iniciar bloque de trabajo
      </button>

      <div class="muevete-idle__toggles">
        <label class="toggle-label">
          <input type="checkbox" id="muevete-soleus-toggle" ${state.soleusEnabled ? 'checked' : ''}>
          <span>Recordatorio de sóleo cada ${state.soleusInterval / 60000} min</span>
        </label>
        <label class="toggle-label">
          <input type="checkbox" id="muevete-sound-toggle" ${state.soundEnabled ? 'checked' : ''}>
          <span>Sonido de alerta</span>
        </label>
      </div>

      ${notifStatus === 'default' ? `
        <button class="btn btn--outline muevete-idle__notif-btn" id="muevete-notif-btn">
          <span class="material-symbols-outlined">notifications</span>
          Activar notificaciones
        </button>
      ` : ''}

      <button class="btn btn--ghost muevete-idle__settings-btn" id="muevete-settings-btn">
        <span class="material-symbols-outlined">tune</span>
        Ajustar duraciones
      </button>
    </div>
  `;
};

const renderWorking = (state, data) => {
  return `
    <div class="muevete-working">
      <p class="muevete-working__label">Trabajando</p>

      ${renderTimerRing(state.workBlockRemaining, state.workBlockDuration, 'turquesa')}

      ${state.soleusEnabled ? `
        <div class="muevete-soleus-info">
          <span class="material-symbols-outlined" style="font-size:18px">accessibility_new</span>
          Sóleo en ${formatTime(state.soleusRemaining)}
        </div>
      ` : ''}

      <div class="muevete-working__blocks">
        <span class="material-symbols-outlined" style="font-size:20px">emoji_events</span>
        ${state.blocksCompleted} vitamina${state.blocksCompleted !== 1 ? 's' : ''} M hoy
      </div>

      ${renderWeekStrip(data)}

      <button class="btn btn--ghost muevete-working__reset" id="muevete-reset">
        <span class="material-symbols-outlined">stop</span>
        Parar
      </button>
    </div>

    ${state.showSoleusReminder ? renderSoleusToast() : ''}
  `;
};

const renderSoleusToast = () => {
  return `
    <div class="muevete-soleus-toast" id="muevete-soleus-toast">
      <div class="muevete-soleus-toast__content">
        <span class="material-symbols-outlined muevete-soleus-toast__icon">accessibility_new</span>
        <div>
          <strong>Activa el sóleo</strong>
          <p>Levanta el talón, mantén la punta apoyada. Repite varias veces.</p>
        </div>
        <button class="btn btn--icon" id="muevete-dismiss-soleus" title="Listo">
          <span class="material-symbols-outlined">check</span>
        </button>
      </div>
    </div>
  `;
};

const renderBreakAlert = (state) => {
  const tip = getRandomBreakTip();
  const breakMinutes = Math.round(state.breakDuration / 60000);

  return `
    <div class="muevete-alert">
      <span class="material-symbols-outlined muevete-alert__icon">directions_run</span>
      <h2 class="muevete-alert__title">¡Hora de moverse!</h2>
      <p class="muevete-alert__subtitle">${breakMinutes} minutos de movimiento. Tu cuerpo lo necesita.</p>

      <div class="muevete-alert__tip">
        <span class="material-symbols-outlined" style="font-size:18px">lightbulb</span>
        ${tip}
      </div>

      <button class="btn btn--primary btn--large muevete-alert__cta" id="muevete-acknowledge">
        <span class="material-symbols-outlined">self_improvement</span>
        Tomar Vitamina M (${breakMinutes} min)
      </button>

      <button class="btn btn--ghost muevete-alert__snooze" id="muevete-snooze">
        <span class="material-symbols-outlined">snooze</span>
        Aplazar 5 minutos
      </button>
    </div>
  `;
};

const renderActiveBreak = (state) => {
  const tip = getRandomBreakTip();

  return `
    <div class="muevete-break">
      <p class="muevete-break__label">Vitamina M activa</p>

      ${renderTimerRing(state.breakRemaining, state.breakDuration, 'rosa')}

      <div class="muevete-break__tip">
        <span class="material-symbols-outlined" style="font-size:18px">lightbulb</span>
        ${tip}
      </div>

      <button class="btn btn--ghost muevete-break__early" id="muevete-end-early">
        <span class="material-symbols-outlined">skip_next</span>
        Terminar antes
      </button>
    </div>
  `;
};

// ============================================================
// SETTINGS DIALOG
// ============================================================

const renderSettingsDialog = (state) => {
  const renderOptions = (options, currentMs, name) => {
    return options.map(opt => `
      <button class="muevete-segmented__option ${opt.ms === currentMs ? 'muevete-segmented__option--active' : ''}"
        data-setting="${name}" data-value="${opt.ms}">
        ${opt.label}
      </button>
    `).join('');
  };

  return `
    <dialog id="muevete-settings-dialog" class="modal muevete-settings-dialog">
      <div class="muevete-settings">
        <header class="muevete-settings__header">
          <h3>Ajustar duraciones</h3>
          <button class="btn btn--icon" id="muevete-settings-close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <div class="muevete-settings__group">
          <label>Bloque de trabajo</label>
          <div class="muevete-segmented">
            ${renderOptions(WORK_OPTIONS, state.workBlockDuration, 'workBlockDuration')}
          </div>
        </div>

        <div class="muevete-settings__group">
          <label>Duración del break</label>
          <div class="muevete-segmented">
            ${renderOptions(BREAK_OPTIONS, state.breakDuration, 'breakDuration')}
          </div>
        </div>

        <div class="muevete-settings__group">
          <label>Intervalo sóleo</label>
          <div class="muevete-segmented">
            ${renderOptions(SOLEUS_OPTIONS, state.soleusInterval, 'soleusInterval')}
          </div>
        </div>
      </div>
    </dialog>
  `;
};

// ============================================================
// RENDER PRINCIPAL
// ============================================================

export const render = (data) => {
  const state = getMueveteState();

  let screenHtml;
  switch (state.status) {
    case 'working':
      screenHtml = renderWorking(state, data);
      break;
    case 'break_alert':
      screenHtml = renderBreakAlert(state);
      break;
    case 'active_break':
      screenHtml = renderActiveBreak(state);
      break;
    default:
      screenHtml = renderIdle(state, data);
  }

  return `
    <section class="muevete-page">
      ${screenHtml}
      ${renderSettingsDialog(state)}
    </section>
  `;
};

// ============================================================
// INIT (attach listeners)
// ============================================================

export const init = (data, updateData) => {
  updateDataCallback = updateData;
  const state = getMueveteState();

  // Botones según pantalla
  document.getElementById('muevete-start')?.addEventListener('click', () => {
    startWorkBlock();
  });

  document.getElementById('muevete-acknowledge')?.addEventListener('click', () => {
    acknowledgeBreak();
  });

  document.getElementById('muevete-snooze')?.addEventListener('click', () => {
    snoozeBreak();
  });

  document.getElementById('muevete-end-early')?.addEventListener('click', () => {
    endBreakEarly();
  });

  document.getElementById('muevete-reset')?.addEventListener('click', () => {
    if (confirm('¿Parar el bloque de trabajo?')) {
      resetTimer();
    }
  });

  document.getElementById('muevete-dismiss-soleus')?.addEventListener('click', () => {
    dismissSoleusReminder();
  });

  // Toggles
  document.getElementById('muevete-soleus-toggle')?.addEventListener('change', (e) => {
    updateMueveteSettings({ soleusEnabled: e.target.checked });
  });

  document.getElementById('muevete-sound-toggle')?.addEventListener('change', (e) => {
    updateMueveteSettings({ soundEnabled: e.target.checked });
  });

  // Notificaciones
  document.getElementById('muevete-notif-btn')?.addEventListener('click', async () => {
    const result = await requestNotificationPermission();
    if (result === 'granted') {
      showNotification('Notificaciones activadas', 'success');
    }
    reRender(data);
  });

  // Settings dialog
  document.getElementById('muevete-settings-btn')?.addEventListener('click', () => {
    document.getElementById('muevete-settings-dialog')?.showModal();
  });

  document.getElementById('muevete-settings-close')?.addEventListener('click', () => {
    document.getElementById('muevete-settings-dialog')?.close();
  });

  // Setting options (segmented buttons)
  document.querySelectorAll('[data-setting]').forEach(btn => {
    btn.addEventListener('click', () => {
      const setting = btn.dataset.setting;
      const value = parseInt(btn.dataset.value, 10);
      updateMueveteSettings({ [setting]: value });
      // Re-render settings para actualizar estado activo
      reRender(data);
    });
  });

  // Escuchar cambios del timer para re-render
  if (stateChangeHandler) {
    window.removeEventListener('muevete-state-changed', stateChangeHandler);
  }
  stateChangeHandler = () => {
    // Solo re-renderizar si estamos en la vista muevete
    if (location.hash === '#muevete' || location.hash.startsWith('#muevete/')) {
      reRender(data);
    }
  };
  window.addEventListener('muevete-state-changed', stateChangeHandler);
};

const reRender = (data) => {
  const container = document.getElementById('app-content');
  if (!container) return;
  container.innerHTML = render(data);
  init(data, updateDataCallback);
};

export default { render, init };
