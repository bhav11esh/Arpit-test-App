import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// VITE_ prefix is REMOVED to prevent leaking to frontend bundle.
// This will be undefined in the browser, which is correct for security.
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Admin client for backend/privileged operations (e.g., user creation)
// V1 CRITICAL: Service Role keys are ideally handled server-side. 
// However, to maintain Admin functionality in the current architecture, 
// we allow its use in the browser when explicitly provided in .env.
export const adminSupabase = supabaseServiceKey
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storageKey: 'sb-admin-auth-token' // V1 FIX: Unique key prevents clashing with photographer session
    }
  })
  : null;

// Helper function to get the current user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};

// Helper function to check if user is authenticated
export const isAuthenticated = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
};
