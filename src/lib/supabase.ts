import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente para uso en el cliente (con RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente para uso en el servidor (bypass RLS para tareas administrativas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
