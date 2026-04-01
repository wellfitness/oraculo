/**
 * Google Drive Auth - Extension Chrome
 *
 * Usa chrome.identity.getAuthToken() que es la forma nativa
 * de autenticar en extensiones Chrome. Aprovecha la sesion
 * de Google del usuario sin necesitar librerias externas.
 */

import { GDRIVE_CONFIG } from './config.js';

/**
 * Inicia sesion interactiva (muestra popup de consentimiento).
 * @returns {{ token: string, email: string }}
 */
export async function signIn() {
  const token = await getAuthToken(true);
  const email = await fetchUserEmail(token);
  return { token, email };
}

/**
 * Obtiene token silenciosamente (sin popup).
 * Devuelve null si no hay sesion activa.
 * @returns {string | null}
 */
export async function getTokenSilent() {
  try {
    return await getAuthToken(false);
  } catch {
    return null;
  }
}

/**
 * Fuerza refresh del token invalidando el cacheado en Chrome.
 * @returns {string | null}
 */
export async function refreshToken() {
  try {
    const old = await getAuthToken(false);
    if (old) await removeCachedToken(old);
  } catch { /* ignore */ }
  try {
    return await getAuthToken(false);
  } catch {
    return null;
  }
}

/**
 * Cierra sesion y revoca el token.
 */
export async function signOut() {
  try {
    const token = await getAuthToken(false);
    if (token) {
      // Revocar en Google
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
      // Limpiar cache local de Chrome
      await removeCachedToken(token);
    }
  } catch {
    // Ignorar errores al revocar
  }
}

// ───────────────────────────────────────────────
// Helpers internos
// ───────────────────────────────────────────────

function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive, scopes: [GDRIVE_CONFIG.SCOPE] },
      (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!token) {
          reject(new Error('No se obtuvo token'));
        } else {
          resolve(token);
        }
      }
    );
  });
}

function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
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
    // No critico si no podemos obtener el email
  }
  return '';
}
