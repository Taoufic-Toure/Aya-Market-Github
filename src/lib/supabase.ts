import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables Supabase manquantes : vérifie VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Supabase gère automatiquement la persistance de session dans le storage du navigateur.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
