/**
 * Google Drive Auth - Web App + Capacitor
 *
 * Usa Google Identity Services (GIS) Token Model.
 * Abre popup de consentimiento, devuelve access token.
 * No requiere backend - todo es client-side.
 */

import { GDRIVE_CONFIG } from './config.js';

const TOKEN_KEY = 'oraculo_gdrive_token';
const TOKEN_EXPIRY_KEY = 'oraculo_gdrive_token_expiry';

let _tokenClient = null;

/**
 * Inicia sesion interactiva (abre popup de Google).
 * @returns {{ token: string, email: string }}
 */
export function signIn() {
  return new Promise((resolve, reject) => {
    ensureGisLoaded();

    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CONFIG.CLIENT_ID_WEB,
      scope: GDRIVE_CONFIG.SCOPE,
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }

        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;

        // Guardar token y expiracion
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));

        // Obtener email del usuario
        const email = await fetchUserEmail(token);

        resolve({ token, email });
      },
      error_callback: (err) => {
        reject(new Error(err.message || 'Error en autenticacion'));
      },
    });

    // Abrir popup
    _tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Obtiene token silenciosamente (sin popup).
 * Si el token ha expirado, intenta refresh silencioso.
 * @returns {string | null}
 */
export async function getTokenSilent() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);

  // Si el token existe y no ha expirado (con 5min de margen)
  if (token && Date.now() < expiry - 300000) {
    return token;
  }

  // Intentar refresh silencioso
  try {
    return await silentRefresh();
  } catch {
    return null;
  }
}

/**
 * Cierra sesion y revoca el token.
 */
export async function signOut() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    try {
      google.accounts.oauth2.revoke(token);
    } catch {
      // Ignorar si GIS no esta cargado
    }
  }

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

// ───────────────────────────────────────────────
// Helpers internos
// ───────────────────────────────────────────────

/**
 * Intenta obtener un token nuevo sin interaccion del usuario.
 * Solo funciona si el usuario ya dio consentimiento previamente.
 */
function silentRefresh() {
  return new Promise((resolve, reject) => {
    ensureGisLoaded();

    const client = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CONFIG.CLIENT_ID_WEB,
      scope: GDRIVE_CONFIG.SCOPE,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;

        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresIn * 1000));

        resolve(token);
      },
      error_callback: () => {
        reject(new Error('Silent refresh failed'));
      },
    });

    // prompt: '' = intenta sin mostrar popup
    client.requestAccessToken({ prompt: '' });
  });
}

function ensureGisLoaded() {
  if (typeof google === 'undefined' || !google.accounts?.oauth2) {
    throw new Error('Google Identity Services no cargado. Verifica el script en app.html.');
  }
}

async function fetchUserEmail(token) {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) {
      const info = await res.json();
      return info.email || '';
    }
  } catch {
    // No critico
  }
  return '';
}
