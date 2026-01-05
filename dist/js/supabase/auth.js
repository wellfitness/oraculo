/**
 * Oráculo Cloud - Módulo de Autenticación
 *
 * Maneja Magic Link login para usuario único autorizado.
 * Solo los emails en ALLOWED_EMAILS pueden acceder a Supabase.
 */

import { getSupabase } from './client.js';
import { AUTH_REDIRECT_URL, ALLOWED_EMAILS } from '../config.js';

/**
 * Verifica si un email está autorizado para usar Supabase
 * @param {string} email
 * @returns {boolean}
 */
const isEmailAllowed = (email) => {
  const normalizedEmail = email.toLowerCase().trim();
  return ALLOWED_EMAILS.some(allowed => allowed.toLowerCase() === normalizedEmail);
};

/**
 * Envía Magic Link al email (solo si está autorizado)
 * @param {string} email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const sendMagicLink = async (email) => {
  // Verificar lista blanca ANTES de llamar a Supabase
  if (!isEmailAllowed(email)) {
    console.warn('[Auth] Intento de acceso no autorizado:', email);
    return {
      success: false,
      error: 'Acceso restringido. Este email no tiene permisos de sincronización.'
    };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase no disponible' };
  }

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: AUTH_REDIRECT_URL,
        shouldCreateUser: false  // No crear usuarios nuevos - solo el usuario existente
      }
    });

    if (error) {
      console.error('[Auth] Error enviando magic link:', error);
      return { success: false, error: error.message };
    }

    console.log('[Auth] Magic link enviado a:', email);
    return { success: true };
  } catch (error) {
    console.error('[Auth] Error inesperado:', error);
    return { success: false, error: 'Error al enviar el enlace' };
  }
};

/**
 * Obtiene la sesión actual
 * @returns {Promise<{session: object|null, error?: string}>}
 */
export const getSession = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return { session: null };
  }

  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('[Auth] Error obteniendo sesión:', error);
      return { session: null, error: error.message };
    }

    return { session };
  } catch (error) {
    console.error('[Auth] Error inesperado:', error);
    return { session: null, error: 'Error al verificar sesión' };
  }
};

/**
 * Cierra la sesión actual
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const signOut = async () => {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, error: 'Supabase no disponible' };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('[Auth] Error cerrando sesión:', error);
      return { success: false, error: error.message };
    }

    console.log('[Auth] Sesión cerrada');
    return { success: true };
  } catch (error) {
    console.error('[Auth] Error inesperado:', error);
    return { success: false, error: 'Error al cerrar sesión' };
  }
};

/**
 * Escucha cambios en el estado de autenticación
 * @param {function} callback - Función a llamar con (event, session)
 * @returns {function} Función para cancelar la suscripción
 */
export const onAuthStateChange = (callback) => {
  const supabase = getSupabase();
  if (!supabase) {
    return () => {}; // No-op unsubscribe
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    console.log('[Auth] Estado cambiado:', event);
    callback(event, session);
  });

  return () => subscription.unsubscribe();
};

/**
 * Obtiene el email del usuario actual
 * @returns {Promise<string|null>}
 */
export const getUserEmail = async () => {
  const { session } = await getSession();
  return session?.user?.email || null;
};
