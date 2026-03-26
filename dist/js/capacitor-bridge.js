/**
 * Oraculo - Capacitor Bridge
 * Integracion con plugins nativos (solo se carga en contexto Capacitor)
 *
 * IMPORTANTE: Usa Capacitor.Plugins (NO imports ES de npm)
 * porque el proyecto no tiene bundler. El bridge nativo
 * auto-registra los plugins en window.Capacitor.Plugins.
 */

const { LocalNotifications } = Capacitor.Plugins;
const { StatusBar } = Capacitor.Plugins;
const { App: CapApp } = Capacitor.Plugins;

let notificationPermissionGranted = false;

// ============================================================
// INICIALIZACION
// ============================================================

/**
 * Inicializa todos los plugins nativos.
 * Se llama desde bootstrap() en app.js
 */
export const initCapacitorPlugins = async () => {
  await createNotificationChannels();
  await requestNotificationPermission();
  setupStatusBar();
  setupBackButton();
};

/**
 * Crea los canales de notificacion (Android 8+)
 */
const createNotificationChannels = async () => {
  try {
    await LocalNotifications.createChannel({
      id: 'muevete-breaks',
      name: 'Vitaminas de Movimiento',
      description: 'Alertas de breaks de movimiento cada 2 horas',
      importance: 4, // HIGH
      vibration: true,
      sound: 'alert.mp3'
    });

    await LocalNotifications.createChannel({
      id: 'habit-reminders',
      name: 'Recordatorios de Habitos',
      description: 'Recordatorios diarios para tu habito activo',
      importance: 3, // DEFAULT
      vibration: true
    });
  } catch (e) {
    console.warn('[Capacitor] Error creando channels:', e);
  }
};

/**
 * Solicita permiso de notificaciones (Android 13+ lo requiere en runtime)
 */
const requestNotificationPermission = async () => {
  try {
    const result = await LocalNotifications.requestPermissions();
    notificationPermissionGranted = result.display === 'granted';
  } catch (e) {
    console.warn('[Capacitor] Error permisos notificacion:', e);
  }
};

/**
 * Configura la barra de estado con color turquesa
 */
const setupStatusBar = async () => {
  try {
    await StatusBar.setBackgroundColor({ color: '#06b6d4' });
    await StatusBar.setStyle({ style: 'DARK' }); // Texto claro sobre turquesa
  } catch (e) {
    console.warn('[Capacitor] Error StatusBar:', e);
  }
};

/**
 * Configura el boton back de Android:
 * - En dashboard: minimiza la app
 * - En otras vistas: navega atras
 */
const setupBackButton = () => {
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      const hash = window.location.hash;
      if (!canGoBack || hash === '#dashboard' || hash === '' || hash === '#') {
        CapApp.minimizeApp();
      } else {
        window.history.back();
      }
    });
  } catch (e) {
    console.warn('[Capacitor] Error back button:', e);
  }
};

// ============================================================
// NOTIFICACIONES INMEDIATAS
// ============================================================

/**
 * Envia una notificacion nativa inmediata
 * @param {Object} options - { title, body, id, tag }
 */
export const sendNativeNotification = async ({ title, body, id, tag }) => {
  if (!notificationPermissionGranted) return false;

  try {
    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: id || Date.now(),
        channelId: tag === 'habit-reminder' ? 'habit-reminders' : 'muevete-breaks',
        smallIcon: 'ic_stat_oraculo',
        iconColor: '#06b6d4',
        sound: 'alert.mp3'
      }]
    });
    return true;
  } catch (e) {
    console.warn('[Capacitor] Error notificacion:', e);
    return false;
  }
};

// ============================================================
// NOTIFICACIONES PROGRAMADAS - MUEVETE
// ============================================================

const BREAK_NOTIFICATION_ID = 3001;

/**
 * Programa una notificacion para cuando termine el bloque de trabajo
 * @param {number} durationMs - Duracion del bloque en ms
 */
export const scheduleBreakNotification = async (durationMs) => {
  if (!notificationPermissionGranted) return;

  try {
    // Cancelar anterior si existe
    await LocalNotifications.cancel({ notifications: [{ id: BREAK_NOTIFICATION_ID }] });

    const breakTime = new Date(Date.now() + durationMs);

    await LocalNotifications.schedule({
      notifications: [{
        title: '\u00a1Hora de moverse!',
        body: '8 minutos de movimiento. Tu cuerpo lo necesita.',
        id: BREAK_NOTIFICATION_ID,
        channelId: 'muevete-breaks',
        smallIcon: 'ic_stat_oraculo',
        iconColor: '#06b6d4',
        sound: 'alert.mp3',
        schedule: { at: breakTime, allowWhileIdle: true }
      }]
    });
  } catch (e) {
    console.warn('[Capacitor] Error programando break:', e);
  }
};

/**
 * Cancela la notificacion de break programada
 */
export const cancelBreakNotification = async () => {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: BREAK_NOTIFICATION_ID }] });
  } catch (e) {
    // Ignorar si no habia ninguna programada
  }
};

// ============================================================
// NOTIFICACIONES PROGRAMADAS - HABITOS
// ============================================================

const HABIT_NOTIFICATION_ID = 2001;

/**
 * Programa un recordatorio diario recurrente para el habito activo
 * @param {Object} options - { title, body, hour, minute }
 */
export const scheduleHabitNotification = async ({ title, body, hour, minute }) => {
  if (!notificationPermissionGranted) return;

  try {
    // Cancelar anterior
    await LocalNotifications.cancel({ notifications: [{ id: HABIT_NOTIFICATION_ID }] });

    // Calcular proxima ocurrencia
    const now = new Date();
    const scheduleDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute);
    if (scheduleDate <= now) {
      scheduleDate.setDate(scheduleDate.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [{
        title,
        body,
        id: HABIT_NOTIFICATION_ID,
        channelId: 'habit-reminders',
        smallIcon: 'ic_stat_oraculo',
        iconColor: '#06b6d4',
        schedule: { at: scheduleDate, every: 'day', allowWhileIdle: true }
      }]
    });
  } catch (e) {
    console.warn('[Capacitor] Error programando habito:', e);
  }
};

/**
 * Cancela el recordatorio de habito
 */
export const cancelHabitNotification = async () => {
  try {
    await LocalNotifications.cancel({ notifications: [{ id: HABIT_NOTIFICATION_ID }] });
  } catch (e) {
    // Ignorar
  }
};
