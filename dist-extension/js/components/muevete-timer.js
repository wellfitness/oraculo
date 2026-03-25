/**
 * Oráculo - Muévete Timer (Motor Global)
 *
 * Máquina de estados para breaks de movimiento cada 2h.
 * Se inicializa una vez en app.js y vive independiente de la vista activa.
 * Emite 'muevete-state-changed' para que la vista y el mini-indicator reaccionen.
 *
 * Basado en la app Muévete (break-sit) de Movimiento Funcional.
 */

import { showNotification } from '../app.js';

// ============================================================
// CONSTANTES
// ============================================================

const SNOOZE_MS = 5 * 60 * 1000; // 5 minutos

const NOTIFICATION_MESSAGES = {
  BREAK_ALERT: {
    title: '¡Hora de moverse!',
    body: '8 minutos de movimiento. Tu cuerpo lo necesita.'
  },
  SOLEUS_REMINDER: {
    title: 'Activa el sóleo',
    body: 'Levanta el talón, mantén la punta apoyada.'
  },
  BREAK_DONE: {
    title: 'Vitamina M completada',
    body: 'Próxima vitamina M en 2 horas. ¡Buen trabajo!'
  }
};

const BREAK_TIPS = [
  'Camina por la casa o la oficina.',
  'Estira los brazos por encima de la cabeza.',
  'Haz 10 sentadillas suaves.',
  'Sube y baja escaleras si puedes.',
  'Mueve los hombros en círculos.',
  'Haz círculos con las caderas.',
  'Camina de puntillas y luego de talones.',
  'Estira el cuello suavemente a cada lado.',
  'Haz 10 flexiones contra la pared.',
  'Baila tu canción favorita.'
];

// ============================================================
// ESTADO DEL MÓDULO (persiste mientras la app esté abierta)
// ============================================================

let timerState = {
  status: 'idle',
  workBlockRemaining: 0,
  breakRemaining: 0,
  soleusRemaining: 0,
  blocksCompleted: 0,
  soleusEnabled: true,
  showSoleusReminder: false,
  soundEnabled: true,
  workBlockDuration: 7200000,
  breakDuration: 480000,
  soleusInterval: 1800000
};

// Timestamps internos (no se exponen)
let startTime = null;
let breakStartTime = null;
let soleusStartTime = null;

let intervalId = null;
let wakeLockSentinel = null;
let audioElement = null;
let updateDataRef = null;
let getDataRef = null;

// ============================================================
// UTILIDADES
// ============================================================

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDate = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const formatTime = (ms) => {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

const getRandomTip = () => BREAK_TIPS[Math.floor(Math.random() * BREAK_TIPS.length)];

// ============================================================
// ACTIVITY LOG (funciones puras)
// ============================================================

const recordActivity = (log, date, wasEarlyEnd) => {
  const existingIndex = log.entries.findIndex(e => e.date === date);

  let entries;
  if (existingIndex >= 0) {
    entries = log.entries.map((e, i) =>
      i === existingIndex
        ? { ...e, completed: e.completed + 1, earlyEnds: wasEarlyEnd ? e.earlyEnds + 1 : e.earlyEnds }
        : e
    );
  } else {
    entries = [...log.entries, { date, completed: 1, earlyEnds: wasEarlyEnd ? 1 : 0 }];
  }

  entries.sort((a, b) => b.date.localeCompare(a.date));

  const pruned = pruneOldEntries(entries, 90);
  const currentStreak = calculateStreak(pruned, date);
  const bestStreak = Math.max(log.bestStreak, currentStreak);

  return { entries: pruned, currentStreak, bestStreak };
};

const calculateStreak = (entries, today) => {
  let streak = 0;
  const current = new Date(today + 'T12:00:00');
  let iterations = 0;

  while (iterations < 400) {
    iterations++;
    const dateStr = formatDate(current);
    const day = current.getDay();

    if (day === 0 || day === 6) {
      current.setDate(current.getDate() - 1);
      continue;
    }

    const entry = entries.find(e => e.date === dateStr);
    if (entry && entry.completed > 0) {
      streak++;
      current.setDate(current.getDate() - 1);
    } else {
      if (dateStr === today) {
        current.setDate(current.getDate() - 1);
        continue;
      }
      break;
    }
  }

  return streak;
};

const pruneOldEntries = (entries, maxDays) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffStr = formatDate(cutoff);
  return entries.filter(e => e.date >= cutoffStr);
};

export const getWeekSummary = (log) => {
  const today = getTodayDateString();
  const todayDate = new Date(today + 'T12:00:00');
  const dayOfWeek = todayDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(todayDate);
  monday.setDate(monday.getDate() + mondayOffset);

  const days = [];
  let totalCompleted = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const dateStr = formatDate(d);
    const dow = d.getDay();
    const entry = log.entries.find(e => e.date === dateStr);
    const isWeekend = dow === 0 || dow === 6;
    const isFuture = dateStr > today;

    let status;
    if (isFuture) {
      status = 'future';
    } else if (isWeekend) {
      status = entry && entry.completed > 0 ? 'completed' : 'weekend';
    } else if (!entry || entry.completed === 0) {
      status = 'none';
    } else if (entry.earlyEnds > 0 && entry.earlyEnds === entry.completed) {
      status = 'partial';
    } else {
      status = 'completed';
    }

    const completed = entry?.completed ?? 0;
    const earlyEnds = entry?.earlyEnds ?? 0;
    totalCompleted += completed;

    days.push({ date: dateStr, dayOfWeek: dow, status, completed, earlyEnds });
  }

  return { days, totalCompleted, currentStreak: log.currentStreak, bestStreak: log.bestStreak };
};

// ============================================================
// PERSISTENCIA
// ============================================================

const persist = () => {
  if (!updateDataRef) return;
  updateDataRef('muevete.timerState', {
    status: timerState.status,
    startTime,
    breakStartTime,
    blocksCompleted: timerState.blocksCompleted,
    lastResetDate: getTodayDateString(),
    soleusEnabled: timerState.soleusEnabled,
    workBlockDuration: timerState.workBlockDuration,
    breakDuration: timerState.breakDuration,
    soleusInterval: timerState.soleusInterval,
    soundEnabled: timerState.soundEnabled
  });
};

const persistActivityLog = (log) => {
  if (!updateDataRef) return;
  updateDataRef('muevete.activityLog', log);
};

const emitChange = () => {
  window.dispatchEvent(new CustomEvent('muevete-state-changed', { detail: timerState }));
  updateIndicator();
};

// ============================================================
// NOTIFICACIONES
// ============================================================

const sendNotification = (type) => {
  const msg = NOTIFICATION_MESSAGES[type];
  if (!msg) return;

  if (Notification.permission === 'granted') {
    try {
      new Notification(msg.title, { body: msg.body, tag: type });
    } catch (e) {
      // Fallback para extensión Chrome
      showNotification(msg.title, 'info');
    }
  } else {
    showNotification(msg.title, 'info');
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return await Notification.requestPermission();
};

// ============================================================
// WAKE LOCK
// ============================================================

const requestWakeLock = async () => {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLockSentinel = await navigator.wakeLock.request('screen');
  } catch (e) {
    // No soportado o error
  }
};

const releaseWakeLock = () => {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
};

// ============================================================
// SONIDO
// ============================================================

const playAlertSound = () => {
  if (!timerState.soundEnabled) return;
  try {
    if (!audioElement) {
      audioElement = new Audio('sounds/alert.mp3');
    }
    audioElement.currentTime = 0;
    audioElement.play().catch(() => {});
  } catch (e) {
    // Audio no soportado
  }
};

// ============================================================
// TICK (cada 1 segundo)
// ============================================================

const tick = () => {
  if (timerState.status === 'working' && startTime) {
    const elapsed = Date.now() - startTime;
    timerState.workBlockRemaining = Math.max(0, timerState.workBlockDuration - elapsed);

    // Sóleo countdown
    if (timerState.soleusEnabled && soleusStartTime) {
      const soleusElapsed = Date.now() - soleusStartTime;
      timerState.soleusRemaining = Math.max(0, timerState.soleusInterval - soleusElapsed);

      if (timerState.soleusRemaining <= 0 && !timerState.showSoleusReminder) {
        timerState.showSoleusReminder = true;
        sendNotification('SOLEUS_REMINDER');
        emitChange();
      }
    }

    // Transición a BREAK_ALERT
    if (timerState.workBlockRemaining <= 0) {
      timerState.status = 'break_alert';
      timerState.workBlockRemaining = 0;
      playAlertSound();
      sendNotification('BREAK_ALERT');
      persist();
      stopInterval();
      emitChange();
      return;
    }
  }

  if (timerState.status === 'active_break' && breakStartTime) {
    const elapsed = Date.now() - breakStartTime;
    timerState.breakRemaining = Math.max(0, timerState.breakDuration - elapsed);

    // Break completado
    if (timerState.breakRemaining <= 0) {
      timerState.status = 'working';
      timerState.blocksCompleted++;
      timerState.workBlockRemaining = timerState.workBlockDuration;
      timerState.breakRemaining = timerState.breakDuration;
      timerState.soleusRemaining = timerState.soleusInterval;
      timerState.showSoleusReminder = false;

      const now = Date.now();
      startTime = now;
      breakStartTime = null;
      soleusStartTime = timerState.soleusEnabled ? now : null;

      // Registrar actividad
      logActivity(false);

      releaseWakeLock();
      sendNotification('BREAK_DONE');
      persist();
      emitChange();
      return;
    }
  }

  emitChange();
};

const logActivity = (wasEarlyEnd) => {
  if (!updateDataRef || !getDataRef) return;
  const data = getDataRef();
  const log = data?.muevete?.activityLog || { entries: [], currentStreak: 0, bestStreak: 0 };
  const updated = recordActivity(log, getTodayDateString(), wasEarlyEnd);
  persistActivityLog(updated);
};

const startInterval = () => {
  if (intervalId) return;
  intervalId = setInterval(tick, 1000);
};

const stopInterval = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

// ============================================================
// RESTAURAR ESTADO (al iniciar)
// ============================================================

const restoreState = (data) => {
  const saved = data?.muevete?.timerState;
  if (!saved) return;

  // Aplicar config guardada
  timerState.soleusEnabled = saved.soleusEnabled ?? true;
  timerState.soundEnabled = saved.soundEnabled ?? true;
  timerState.workBlockDuration = saved.workBlockDuration || 7200000;
  timerState.breakDuration = saved.breakDuration || 480000;
  timerState.soleusInterval = saved.soleusInterval || 1800000;
  timerState.workBlockRemaining = timerState.workBlockDuration;
  timerState.breakRemaining = timerState.breakDuration;
  timerState.soleusRemaining = timerState.soleusInterval;

  // Reset diario
  const today = getTodayDateString();
  timerState.blocksCompleted = saved.lastResetDate !== today ? 0 : (saved.blocksCompleted || 0);

  // Recalcular estado según timestamps guardados
  if (saved.status === 'working' && saved.startTime) {
    const elapsed = Date.now() - saved.startTime;
    const remaining = timerState.workBlockDuration - elapsed;

    if (remaining <= 0) {
      timerState.status = 'break_alert';
      timerState.workBlockRemaining = 0;
      playAlertSound();
      sendNotification('BREAK_ALERT');
    } else {
      timerState.status = 'working';
      timerState.workBlockRemaining = remaining;
      startTime = saved.startTime;
      soleusStartTime = timerState.soleusEnabled ? saved.startTime : null;
      startInterval();
    }
  } else if (saved.status === 'active_break' && saved.breakStartTime) {
    const elapsed = Date.now() - saved.breakStartTime;
    const remaining = timerState.breakDuration - elapsed;

    if (remaining <= 0) {
      // Break ya terminó mientras estábamos cerrados
      timerState.status = 'working';
      timerState.blocksCompleted++;
      timerState.workBlockRemaining = timerState.workBlockDuration;
      const now = Date.now();
      startTime = now;
      soleusStartTime = timerState.soleusEnabled ? now : null;
      logActivity(false);
      sendNotification('BREAK_DONE');
      startInterval();
    } else {
      timerState.status = 'active_break';
      timerState.breakRemaining = remaining;
      breakStartTime = saved.breakStartTime;
      requestWakeLock();
      startInterval();
    }
  } else if (saved.status === 'break_alert') {
    timerState.status = 'break_alert';
  } else {
    timerState.status = 'idle';
  }
};

// ============================================================
// MINI-INDICATOR (HTML en el header)
// ============================================================

export const renderMueveteIndicator = () => {
  return `
    <div id="muevete-indicator" class="muevete-indicator" hidden>
      <a href="#muevete" data-view="muevete" class="muevete-indicator__link" title="Muévete">
        <span class="material-symbols-outlined muevete-indicator__icon">directions_run</span>
        <span class="muevete-indicator__time" id="muevete-indicator-time"></span>
      </a>
    </div>
  `;
};

const updateIndicator = () => {
  const el = document.getElementById('muevete-indicator');
  const timeEl = document.getElementById('muevete-indicator-time');
  const iconEl = el?.querySelector('.muevete-indicator__icon');
  if (!el || !timeEl || !iconEl) return;

  if (timerState.status === 'idle') {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.className = 'muevete-indicator';

  switch (timerState.status) {
    case 'working':
      iconEl.textContent = 'directions_run';
      timeEl.textContent = formatTime(timerState.workBlockRemaining);
      el.classList.add('muevete-indicator--working');
      break;
    case 'break_alert':
      iconEl.textContent = 'warning';
      timeEl.textContent = '¡Muévete!';
      el.classList.add('muevete-indicator--alert');
      break;
    case 'active_break':
      iconEl.textContent = 'self_improvement';
      timeEl.textContent = formatTime(timerState.breakRemaining);
      el.classList.add('muevete-indicator--break');
      break;
  }
};

// ============================================================
// API PÚBLICA
// ============================================================

export const getMueveteState = () => ({ ...timerState });

export const getRandomBreakTip = getRandomTip;

export const startWorkBlock = () => {
  const now = Date.now();
  startTime = now;
  breakStartTime = null;
  soleusStartTime = timerState.soleusEnabled ? now : null;

  timerState.status = 'working';
  timerState.workBlockRemaining = timerState.workBlockDuration;
  timerState.breakRemaining = timerState.breakDuration;
  timerState.soleusRemaining = timerState.soleusInterval;
  timerState.showSoleusReminder = false;

  persist();
  startInterval();
  emitChange();
};

export const acknowledgeBreak = () => {
  breakStartTime = Date.now();

  timerState.status = 'active_break';
  timerState.breakRemaining = timerState.breakDuration;
  timerState.showSoleusReminder = false;

  persist();
  requestWakeLock();
  startInterval();
  emitChange();
};

export const snoozeBreak = () => {
  const now = Date.now();
  // Ajustar startTime para que remaining = SNOOZE_MS usando la fórmula:
  // remaining = workBlockDuration - (now - startTime) = SNOOZE_MS
  // → startTime = now - (workBlockDuration - SNOOZE_MS)
  startTime = now - (timerState.workBlockDuration - SNOOZE_MS);
  soleusStartTime = timerState.soleusEnabled ? now : null;

  timerState.status = 'working';
  timerState.workBlockRemaining = SNOOZE_MS;
  timerState.soleusRemaining = timerState.soleusInterval;
  timerState.showSoleusReminder = false;

  persist();
  startInterval();
  emitChange();
};

export const endBreakEarly = () => {
  const now = Date.now();
  startTime = now;
  breakStartTime = null;
  soleusStartTime = timerState.soleusEnabled ? now : null;

  timerState.status = 'working';
  timerState.blocksCompleted++;
  timerState.workBlockRemaining = timerState.workBlockDuration;
  timerState.breakRemaining = timerState.breakDuration;
  timerState.soleusRemaining = timerState.soleusInterval;
  timerState.showSoleusReminder = false;

  logActivity(true);
  releaseWakeLock();
  persist();
  startInterval();
  emitChange();
};

export const resetTimer = () => {
  startTime = null;
  breakStartTime = null;
  soleusStartTime = null;

  timerState.status = 'idle';
  timerState.workBlockRemaining = timerState.workBlockDuration;
  timerState.breakRemaining = timerState.breakDuration;
  timerState.soleusRemaining = timerState.soleusInterval;
  timerState.showSoleusReminder = false;

  stopInterval();
  releaseWakeLock();
  persist();
  emitChange();
};

export const dismissSoleusReminder = () => {
  soleusStartTime = Date.now();
  timerState.showSoleusReminder = false;
  timerState.soleusRemaining = timerState.soleusInterval;
  emitChange();
};

export const updateMueveteSettings = (settings) => {
  if (settings.workBlockDuration !== undefined) timerState.workBlockDuration = settings.workBlockDuration;
  if (settings.breakDuration !== undefined) timerState.breakDuration = settings.breakDuration;
  if (settings.soleusInterval !== undefined) timerState.soleusInterval = settings.soleusInterval;
  if (settings.soleusEnabled !== undefined) timerState.soleusEnabled = settings.soleusEnabled;
  if (settings.soundEnabled !== undefined) timerState.soundEnabled = settings.soundEnabled;

  if (timerState.status === 'idle') {
    timerState.workBlockRemaining = timerState.workBlockDuration;
    timerState.breakRemaining = timerState.breakDuration;
    timerState.soleusRemaining = timerState.soleusInterval;
  }

  persist();
  emitChange();
};

// ============================================================
// INICIALIZACIÓN (llamada desde app.js una sola vez)
// ============================================================

export const initMueveteTimer = (data, updateData, getData) => {
  updateDataRef = updateData;
  getDataRef = getData;

  // Inyectar mini-indicator en el header
  const actionsEl = document.querySelector('.app-actions');
  if (actionsEl) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderMueveteIndicator();
    const indicator = wrapper.firstElementChild;
    if (indicator) {
      actionsEl.insertBefore(indicator, actionsEl.firstChild);
    }
  }

  // Restaurar estado previo
  restoreState(data);

  // Listener de visibilidad (recalcular al volver del background)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (timerState.status === 'working' || timerState.status === 'active_break') {
        tick();
      }
      // Re-request wake lock si estaba en break
      if (timerState.status === 'active_break' && !wakeLockSentinel) {
        requestWakeLock();
      }
    }
  });

  emitChange();
};
