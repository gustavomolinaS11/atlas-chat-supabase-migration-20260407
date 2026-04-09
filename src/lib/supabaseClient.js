import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_CONFIG } from '../config/supabase.js';
import { supabaseAuthStorage } from './sessionPersistence.js';

if (!SUPABASE_CONFIG?.url || !SUPABASE_CONFIG?.anonKey) {
  throw new Error('Supabase nao configurado. Copie src/config/supabase.example.js para src/config/supabase.js e preencha url/anonKey.');
}

export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'atlas.supabase.auth',
    storage: supabaseAuthStorage
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});
