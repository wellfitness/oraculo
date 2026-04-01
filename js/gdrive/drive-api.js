/**
 * Google Drive API v3 - Wrapper REST puro
 *
 * Usa fetch() directamente contra la API REST de Google Drive.
 * Trabaja exclusivamente con appDataFolder (carpeta oculta).
 * No requiere SDK ni librerias externas.
 *
 * Incluye retry automatico en 401 (token expirado) via
 * _tokenRefresher inyectado desde sync.js.
 */

import { GDRIVE_CONFIG } from './config.js';

const { API_FILES, API_UPLOAD, FILE_NAME } = GDRIVE_CONFIG;

// ───────────────────────────────────────────────
// Token refresher (inyectado desde sync.js)
// ───────────────────────────────────────────────

let _tokenRefresher = null;

/**
 * Registra la funcion que obtiene un token fresco.
 * Llamado por sync.js en init() para evitar dependencia circular.
 */
export function setTokenRefresher(fn) {
  _tokenRefresher = fn;
}

// ───────────────────────────────────────────────
// Fetch con retry automatico en 401
// ───────────────────────────────────────────────

/**
 * Wrapper de fetch que:
 * 1. Inyecta Authorization header
 * 2. Si recibe 401 y hay _tokenRefresher, refresca token y reintenta UNA vez
 * 3. Lanza error con .status para que el caller distinga tipo de error
 */
async function fetchWithAuth(url, options, accessToken) {
  const opts = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${accessToken}`,
    },
  };

  let res = await fetch(url, opts);

  // Retry en 401 si hay refresher disponible
  if (res.status === 401 && _tokenRefresher) {
    const newToken = await _tokenRefresher();
    if (newToken) {
      opts.headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, opts);
    }
  }

  if (!res.ok) {
    const err = new Error(`Drive API ${res.status}: ${res.statusText}`);
    err.status = res.status;
    throw err;
  }

  return res;
}

// ───────────────────────────────────────────────
// API Functions
// ───────────────────────────────────────────────

/**
 * Busca el archivo oraculo_data.json en appDataFolder.
 * @returns {{ id: string, modifiedTime: string } | null}
 */
export async function findFile(accessToken) {
  const params = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}'`,
    fields: 'files(id,name,modifiedTime,version)',
    pageSize: '1',
  });

  const res = await fetchWithAuth(`${API_FILES}?${params}`, {}, accessToken);
  const data = await res.json();
  return data.files?.length > 0 ? data.files[0] : null;
}

/**
 * Lee el contenido del archivo JSON.
 * @returns {object} Datos parseados
 */
export async function readFile(accessToken, fileId) {
  const res = await fetchWithAuth(`${API_FILES}/${fileId}?alt=media`, {}, accessToken);
  return res.json();
}

/**
 * Crea el archivo oraculo_data.json en appDataFolder.
 * Se usa solo la primera vez (cuando no existe archivo previo).
 * @returns {{ id: string, modifiedTime: string }}
 */
export async function createFile(accessToken, data) {
  const metadata = {
    name: FILE_NAME,
    parents: ['appDataFolder'],
    mimeType: 'application/json',
  };

  const body = buildMultipartBody(metadata, data);

  const res = await fetchWithAuth(
    `${API_UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime,version`,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${BOUNDARY}` },
      body,
    },
    accessToken
  );

  return res.json();
}

/**
 * Actualiza el contenido del archivo existente.
 * @returns {{ id: string, modifiedTime: string }}
 */
export async function updateFile(accessToken, fileId, data) {
  const metadata = {
    mimeType: 'application/json',
  };

  const body = buildMultipartBody(metadata, data);

  const res = await fetchWithAuth(
    `${API_UPLOAD}/files/${fileId}?uploadType=multipart&fields=id,modifiedTime,version`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': `multipart/related; boundary=${BOUNDARY}` },
      body,
    },
    accessToken
  );

  return res.json();
}

/**
 * Obtiene solo metadata del archivo (sin descargar contenido).
 * Ligero: solo una peticion GET con campos minimos.
 * @returns {{ id: string, version: string, modifiedTime: string }}
 */
export async function getFileMetadata(accessToken, fileId) {
  const res = await fetchWithAuth(
    `${API_FILES}/${fileId}?fields=id,version,modifiedTime`,
    {},
    accessToken
  );
  return res.json();
}

/**
 * Elimina el archivo (para reset/desconexion).
 */
export async function deleteFile(accessToken, fileId) {
  const opts = { method: 'DELETE' };
  try {
    await fetchWithAuth(`${API_FILES}/${fileId}`, opts, accessToken);
  } catch (err) {
    if (err.status !== 404) throw err;
  }
}

/**
 * Verifica si el token es valido haciendo una peticion ligera.
 * @returns {boolean}
 */
export async function verifyToken(accessToken) {
  try {
    await fetchWithAuth(
      `${API_FILES}?spaces=appDataFolder&pageSize=1`,
      {},
      accessToken
    );
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Multipart upload helpers
// ---------------------------------------------------------------------------

const BOUNDARY = 'oraculo_drive_boundary';

/**
 * Construye el body multipart/related para upload a Drive API.
 * Drive API requiere un formato especifico:
 * - Parte 1: metadata JSON
 * - Parte 2: contenido del archivo
 */
function buildMultipartBody(metadata, data) {
  const jsonContent = JSON.stringify(data);

  return [
    `--${BOUNDARY}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${BOUNDARY}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    jsonContent,
    `--${BOUNDARY}--`,
  ].join('\r\n');
}
