import { createClient } from '@supabase/supabase-js';

// Detectar si estamos en el servidor o en el cliente (Vite)
const isServer = typeof window === 'undefined';

const supabaseUrl = isServer 
  ? (process.env.SUPABASE_URL || '') 
  : (import.meta.env.VITE_SUPABASE_URL || '');

const supabaseAnonKey = isServer 
  ? (process.env.SUPABASE_ANON_KEY || '') 
  : (import.meta.env.VITE_SUPABASE_ANON_KEY || '');

const supabaseServiceKey = isServer 
  ? (process.env.SUPABASE_SERVICE_ROLE_KEY || '') 
  : ''; // El Service Role Key NUNCA debe estar en el cliente

// Cliente para uso en el cliente (con RLS)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Anon Key is missing. Check your environment variables.");
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para uso en el servidor (bypass RLS para tareas administrativas)
// En el cliente, este será un cliente anon normal para evitar errores de importación,
// pero no debería usarse para operaciones administrativas.
if (isServer && !supabaseServiceKey) {
  console.warn("Supabase Service Role Key is missing on server. Administrative tasks will fail.");
}
export const supabaseAdmin = isServer && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase;
