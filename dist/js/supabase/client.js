/**
 * Oráculo Cloud - Cliente Supabase
 *
 * Inicializa y exporta el cliente de Supabase.
 * Requiere que supabase-js esté cargado via CDN en el HTML.
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

// Cliente de Supabase (singleton)
let supabaseClient = null;

/**
 * Obtiene o crea el cliente de Supabase
 * @returns {object|null} Cliente de Supabase o null si no está disponible
 */
export const getSupabase = () => {
  // Si ya tenemos cliente, retornarlo
  if (supabaseClient) {
    return supabaseClient;
  }

  // Verificar que la librería está cargada (via CDN)
  if (typeof window.supabase === 'undefined') {
    console.warn('[Supabase] Librería no cargada. Funcionando en modo offline.');
    return null;
  }

  // Crear cliente
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    });
    console.log('[Supabase] Cliente inicializado correctamente');
    return supabaseClient;
  } catch (error) {
    console.error('[Supabase] Error al crear cliente:', error);
    return null;
  }
};

/**
 * Verifica si el usuario está autenticado
 * @returns {Promise<boolean>}
 */
export const isAuthenticated = async () => {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { data: { session } } = await client.auth.getSession();
    return !!session;
  } catch (error) {
    console.error('[Supabase] Error verificando sesión:', error);
    return false;
  }
};

/**
 * Obtiene el usuario actual
 * @returns {Promise<object|null>}
 */
export const getCurrentUser = async () => {
  const client = getSupabase();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch (error) {
    console.error('[Supabase] Error obteniendo usuario:', error);
    return null;
  }
};

/**
 * Verifica si Supabase está disponible (librería cargada)
 * @returns {boolean}
 */
export const isSupabaseAvailable = () => {
  return typeof window.supabase !== 'undefined';
};

export default getSupabase;
