import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(url, anonKey)
  : (null as unknown as SupabaseClient);

export async function signInWithGoogle() {
  if (!supabaseConfigured) {
    alert('Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
    return;
  }
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

export async function signOut() {
  if (supabaseConfigured) await supabase.auth.signOut();
}

export async function getAccessToken(): Promise<string | null> {
  if (!supabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
