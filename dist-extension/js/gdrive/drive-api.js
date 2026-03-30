/**
 * Google Drive API v3 - Wrapper REST puro
 *
 * Usa fetch() directamente contra la API REST de Google Drive.
 * Trabaja exclusivamente con appDataFolder (carpeta oculta).
 * No requiere SDK ni librerias externas.
 */

import { GDRIVE_CONFIG } from './config.js';

const { API_FILES, API_UPLOAD, FILE_NAME } = GDRIVE_CONFIG;

/**
 * Headers de autorizacion para todas las peticiones
 */
function authHeaders(accessToken) {
  return { 'Authorization': `Bearer ${accessToken}` };
}

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

  const res = await fetch(`${API_FILES}?${params}`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Drive findFile failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.files?.length > 0 ? data.files[0] : null;
}

/**
 * Lee el contenido del archivo JSON.
 * @returns {object} Datos parseados
 */
export async function readFile(accessToken, fileId) {
  const res = await fetch(`${API_FILES}/${fileId}?alt=media`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Drive readFile failed: ${res.status} ${res.statusText}`);
  }

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

  const res = await fetch(`${API_UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime,version`, {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
    },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive createFile failed: ${res.status} ${errorText}`);
  }

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

  const res = await fetch(`${API_UPLOAD}/files/${fileId}?uploadType=multipart&fields=id,modifiedTime,version`, {
    method: 'PATCH',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': `multipart/related; boundary=${BOUNDARY}`,
    },
    body,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Drive updateFile failed: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Obtiene solo metadata del archivo (sin descargar contenido).
 * Ligero: solo una peticion GET con campos minimos.
 * @returns {{ id: string, version: string, modifiedTime: string }}
 */
export async function getFileMetadata(accessToken, fileId) {
  const res = await fetch(`${API_FILES}/${fileId}?fields=id,version,modifiedTime`, {
    headers: authHeaders(accessToken),
  });

  if (!res.ok) {
    throw new Error(`Drive getFileMetadata failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Elimina el archivo (para reset/desconexion).
 */
export async function deleteFile(accessToken, fileId) {
  const res = await fetch(`${API_FILES}/${fileId}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Drive deleteFile failed: ${res.status}`);
  }
}

/**
 * Verifica si el token es valido haciendo una peticion ligera.
 * @returns {boolean}
 */
export async function verifyToken(accessToken) {
  try {
    const res = await fetch(`${API_FILES}?spaces=appDataFolder&pageSize=1`, {
      headers: authHeaders(accessToken),
    });
    return res.ok;
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
