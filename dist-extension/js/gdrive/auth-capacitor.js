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

let _initialized = false;

/**
 * Obtiene referencia al plugin nativo GoogleAuth.
 */
function getPlugin() {
  const plugin = window.Capacitor?.Plugins?.GoogleAuth;
  if (!plugin) {
    throw new Error('GoogleAuth plugin no disponible');
  }
  return plugin;
}

/**
 * Inicializa el plugin GoogleAuth (OBLIGATORIO antes de signIn/refresh).
 * Sin esto, el plugin tiene googleSignInClient = null y crashea.
 */
async function ensureInitialized() {
  if (_initialized) return;

  try {
    const GoogleAuth = getPlugin();
    // initialize() configura GoogleSignInClient con scopes y serverClientId
    // de capacitor.config.ts
    await GoogleAuth.initialize();
    _initialized = true;
    console.log('[GoogleAuth] Plugin inicializado');
  } catch (e) {
    console.warn('[GoogleAuth] Error al inicializar:', e);
    throw e;
  }
}

function cacheToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_LIFETIME_MS));
}

function clearCachedToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
}

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
  await ensureInitialized();
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
 * CONTRATO: Nunca throw — devuelve null si no hay token disponible.
 * @returns {Promise<string | null>}
 */
export async function getTokenSilent() {
  try {
    // Primero intentar cache local
    const cached = getCachedToken();
    if (cached) return cached;

    await ensureInitialized();
    const GoogleAuth = getPlugin();

    // Intentar refresh silencioso via plugin nativo
    const result = await GoogleAuth.refresh();
    const token = result.accessToken;

    if (token) {
      cacheToken(token);
      return token;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Cierra sesion y revoca token.
 * CONTRATO: Nunca throw.
 * @returns {Promise<void>}
 */
export async function signOut() {
  try {
    await ensureInitialized();
    const GoogleAuth = getPlugin();
    await GoogleAuth.signOut();
  } catch {
    // Contrato: nunca throw
  }

  clearCachedToken();
}
