/**
 * Oráculo Cloud - Configuración de Supabase
 *
 * Este archivo contiene las credenciales públicas (anon key) para conectar con Supabase.
 * La anon key es segura de exponer en el frontend porque RLS protege los datos.
 */

export const SUPABASE_URL = 'https://plbhgkansnyvmnqvpxrh.supabase.co';

export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYmhna2Fuc255dm1ucXZweHJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0NDY4NDksImV4cCI6MjA4MzAyMjg0OX0.BklPNlUrAV5AXfbvmWHn-pxg-v6cOHfFL-ivnrYN0Ns';

// URLs de redirección para auth
export const AUTH_REDIRECT_URL = `${window.location.origin}/auth-callback.html`;
