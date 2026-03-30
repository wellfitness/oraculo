/**
 * Google Drive Sync - Configuracion OAuth
 *
 * Client IDs publicos (no son secrets).
 * Cada plataforma usa su propio Client ID.
 */

export const GDRIVE_CONFIG = {
  // Scope minimo: solo carpeta oculta de la app
  SCOPE: 'https://www.googleapis.com/auth/drive.appdata',

  // Nombre del archivo en appDataFolder
  FILE_NAME: 'oraculo_data.json',

  // Client IDs por plataforma
  CLIENT_ID_WEB: '113523103085-jdtnfi537aa6contu7h5142h2mbchnqa.apps.googleusercontent.com',
  CLIENT_ID_CHROME: '113523103085-t0sj57s11kqo5r28r9e7s7b8llv1rttp.apps.googleusercontent.com',
  CLIENT_ID_ANDROID: '113523103085-kqqo1mg6im9docphob0jtj73t2hf14gc.apps.googleusercontent.com',

  // API endpoints
  API_BASE: 'https://www.googleapis.com',
  API_UPLOAD: 'https://www.googleapis.com/upload/drive/v3',
  API_FILES: 'https://www.googleapis.com/drive/v3/files',

  // Sync settings
  DEBOUNCE_MS: 2000,        // Esperar 2s tras ultimo cambio antes de push
  SYNC_COOLDOWN_MS: 5000,   // Minimo 5s entre syncs
};
