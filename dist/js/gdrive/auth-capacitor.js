/**
 * Google Drive Auth - Capacitor (Android nativo)
 *
 * Usa @codetrix-studio/capacitor-google-auth para obtener
 * access token via Google Sign-In nativo de Android.
 * Sin popups, sin WebView OAuth — todo nativo.
 *
 * Interfaz identica a auth-web.js y auth-extension.js:
 *   signIn()        -> { token, email }
 *   getTokenSilent() -> string | null
 *   signOut()        -> void
 */

const TOKEN_KEY = 'oraculo_gdrive_token';
const TOKEN_EXPIRY_KEY = 'oraculo_gdrive_token_expiry';
const TOKEN_LIFETIME_MS = 3600 * 1000; // 1 hora (estandar Google)
const EXPIRY_MARGIN_MS = 300000; // 5 min de margen de seguridad

/**
 * Obtiene referencia al plugin nativo GoogleAuth.
 * El plugin se auto-registra en Capacitor.Plugins al hacer cap sync.
 */
function getPlugin() {
  const plugin = window.Capacitor?.Plugins?.GoogleAuth;
  if (!plugin) {
    throw new Error('GoogleAuth plugin no disponible. Verifica que el plugin esta instalado.');
  }
  return plugin;
}

/**
 * Guarda token y su expiracion en localStorage (cache local).
 */
function cacheToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
}

/**
 * Limpia token cacheado de localStorage.
 */
function clearCachedToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

/**
 * Devuelve token cacheado si aun es valido (con margen de seguridad).
 * @returns {string | null}
 */
function getCachedToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = parseInt(localStorage.getItem(TOKEN_EXPIRY_KEY) || '0', 10);

  if (token && Date.now() < expiry - EXPIRY_MARGIN_MS) {
    return token;
  }

  return null;
}

// ───────────────────────────────────────────────
// API publica (misma interfaz que auth-web.js)
// ───────────────────────────────────────────────

/**
 * Sign-in interactivo: muestra UI nativa de Google Sign-In.
 * @returns {Promise<{ token: string, email: string }>}
 */
export async function signIn() {
  const GoogleAuth = getPlugin();

  // Paso 1: Sign-in nativo (muestra selector de cuenta de Google)
  const user = await GoogleAuth.signIn();

  // Paso 2: En Android nativo, signIn() devuelve idToken pero NO accessToken.
  // refresh() usa GoogleAuthUtil.getToken() internamente y SI devuelve accessToken.
  const refreshResult = await GoogleAuth.refresh();
  const token = refreshResult.accessToken;

  if (!token) {
    throw new Error('No se obtuvo access token del sign-in nativo');
  }

  cacheToken(token);

  return {
    token,
    email: user.email || ''
  };
}

/**
 * Obtiene token silenciosamente (sin UI).
 * Primero revisa cache local, luego intenta refresh nativo.
 *
 * CONTRATO: Nunca throw — devuelve null si no hay token disponible.
 * @returns {Promise<string | null>}
 */
export async function getTokenSilent() {
  try {
    // Primero intentar cache local
    const cached = getCachedToken();
    if (cached) return cached;

    // Intentar refresh silencioso via plugin nativo
    const GoogleAuth = getPlugin();
    const result = await GoogleAuth.refresh();
    const token = result.accessToken;

    if (token) {
      cacheToken(token);
      return token;
    }

    return null;
  } catch {
    // Contrato: nunca throw, devolver null
    return null;
  }
}

/**
 * Cierra sesion y revoca token.
 *
 * CONTRATO: Nunca throw.
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    const GoogleAuth = getPlugin();
    await GoogleAuth.signOut();
  } catch {
    // Contrato: nunca throw
  }

  clearCachedToken();
}
