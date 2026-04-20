/**
 * Google Auth - Web App (Google Identity Services).
 * Acepta scopes opcionales para reutilizar con multiples APIs (Drive, Calendar).
 * Tokens de distinto scope-set se cachean por separado.
 */

import { GDRIVE_CONFIG } from './config.js';

const TOKEN_KEY_BASE = 'oraculo_gauth_token';
const TOKEN_EXPIRY_KEY_BASE = 'oraculo_gauth_token_expiry';

/**
 * Calcula las keys de localStorage segun el scope-set.
 * Legacy: si scopes == solo drive.appdata, usamos las keys antiguas
 * para no invalidar sesiones existentes.
 */
function cacheKeys(scopes) {
  const scopeList = normalizeScopes(scopes);
  const isDriveOnly = scopeList.length === 1 && scopeList[0] === GDRIVE_CONFIG.SCOPE;
  if (isDriveOnly) {
    return {
      token: 'oraculo_gdrive_token',
      expiry: 'oraculo_gdrive_token_expiry',
    };
  }
  const hash = scopeList.join(',').replace(/[^a-z0-9]+/gi, '_');
  return {
    token: `${TOKEN_KEY_BASE}_${hash}`,
    expiry: `${TOKEN_EXPIRY_KEY_BASE}_${hash}`,
  };
}

function normalizeScopes(scopes) {
  if (!scopes) return [GDRIVE_CONFIG.SCOPE];
  if (typeof scopes === 'string') return [scopes];
  return scopes;
}

/**
 * Inicia sesion interactiva (abre popup de Google).
 * @param {{ scopes?: string|string[] }} [opts]
 * @returns {Promise<{ token: string, email: string }>}
 */
export function signIn({ scopes } = {}) {
  return new Promise((resolve, reject) => {
    ensureGisLoaded();
    const scopeList = normalizeScopes(scopes);
    const keys = cacheKeys(scopeList);

    const client = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CONFIG.CLIENT_ID_WEB,
      scope: scopeList.join(' '),
      callback: async (response) => {
        if (response.error) {
          reject(new Error(response.error_description || response.error));
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;
        localStorage.setItem(keys.token, token);
        localStorage.setItem(keys.expiry, String(Date.now() + expiresIn * 1000));
        const email = await fetchUserEmail(token);
        resolve({ token, email });
      },
      error_callback: (err) => {
        reject(new Error(err.message || 'Error en autenticacion'));
      },
    });

    client.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Obtiene token silenciosamente (sin popup).
 * @param {{ scopes?: string|string[] }} [opts]
 * @returns {Promise<string | null>}
 */
export async function getTokenSilent({ scopes } = {}) {
  const keys = cacheKeys(scopes);
  const token = localStorage.getItem(keys.token);
  const expiry = parseInt(localStorage.getItem(keys.expiry) || '0', 10);
  if (token && Date.now() < expiry - 300000) {
    return token;
  }
  try {
    return await silentRefresh(scopes);
  } catch {
    return null;
  }
}

/**
 * Fuerza refresh del token descartando el cacheado.
 * @param {{ scopes?: string|string[] }} [opts]
 * @returns {Promise<string | null>}
 */
export async function refreshToken({ scopes } = {}) {
  const keys = cacheKeys(scopes);
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.expiry);
  try {
    return await silentRefresh(scopes);
  } catch {
    return null;
  }
}

/**
 * Cierra sesion y revoca el token.
 * @param {{ scopes?: string|string[] }} [opts]
 */
export async function signOut({ scopes } = {}) {
  const keys = cacheKeys(scopes);
  const token = localStorage.getItem(keys.token);
  if (token) {
    try { google.accounts.oauth2.revoke(token); } catch { /* noop */ }
  }
  localStorage.removeItem(keys.token);
  localStorage.removeItem(keys.expiry);
}

// ───────────────────────────────────────────────
// Helpers internos
// ───────────────────────────────────────────────

function silentRefresh(scopes) {
  return new Promise((resolve, reject) => {
    ensureGisLoaded();
    const scopeList = normalizeScopes(scopes);
    const keys = cacheKeys(scopeList);
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GDRIVE_CONFIG.CLIENT_ID_WEB,
      scope: scopeList.join(' '),
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        const token = response.access_token;
        const expiresIn = response.expires_in || 3600;
        localStorage.setItem(keys.token, token);
        localStorage.setItem(keys.expiry, String(Date.now() + expiresIn * 1000));
        resolve(token);
      },
      error_callback: () => reject(new Error('Silent refresh failed')),
    });
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
      headers: { Authorization: `Bearer ${token}` },
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
