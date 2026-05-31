import { supabase } from './supabase';

export async function getSupabaseAuthHeaders() {
  if (!supabase?.auth) return {};

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}
