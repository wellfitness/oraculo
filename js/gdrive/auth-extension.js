/**
 * Google Auth - Extension Chrome (chrome.identity).
 * Acepta scopes opcionales para multiples APIs. Chrome cachea por (clientId, scopes).
 */

import { GDRIVE_CONFIG } from './config.js';

function normalizeScopes(scopes) {
  if (!scopes) return [GDRIVE_CONFIG.SCOPE];
  if (typeof scopes === 'string') return [scopes];
  return scopes;
}

/**
 * Inicia sesion interactiva (muestra popup de consentimiento).
 * @param {{ scopes?: string|string[] }} [opts]
 * @returns {Promise<{ token: string, email: string }>}
 */
export async function signIn({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  const token = await getAuthToken(true, scopeList);
  const email = await fetchUserEmail(token);
  return { token, email };
}

/**
 * Obtiene token silenciosamente (sin popup).
 * @param {{ scopes?: string|string[] }} [opts]
 * @returns {Promise<string | null>}
 */
export async function getTokenSilent({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  try {
    return await getAuthToken(false, scopeList);
  } catch {
    return null;
  }
}

/**
 * Fuerza refresh del token invalidando el cacheado en Chrome.
 * @param {{ scopes?: string|string[] }} [opts]
 * @returns {Promise<string | null>}
 */
export async function refreshToken({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  try {
    const old = await getAuthToken(false, scopeList);
    if (old) await removeCachedToken(old);
  } catch { /* ignore */ }
  try {
    return await getAuthToken(false, scopeList);
  } catch {
    return null;
  }
}

/**
 * Cierra sesion y revoca el token.
 * @param {{ scopes?: string|string[] }} [opts]
 */
export async function signOut({ scopes } = {}) {
  const scopeList = normalizeScopes(scopes);
  try {
    const token = await getAuthToken(false, scopeList);
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

function getAuthToken(interactive, scopes) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      { interactive, scopes },
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
      headers: { Authorization: `Bearer ${token}` },
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
