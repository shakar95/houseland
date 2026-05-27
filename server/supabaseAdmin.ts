import ws from 'ws';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/** Supabase client for Node.js server (needs `ws` on Node < 22). */
export function createSupabaseServerClient(apiKey: string): SupabaseClient {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  if (!url || !apiKey) {
    throw new Error('Supabase URL or API key missing');
  }

  return createClient(url, apiKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws },
  });
}

export function createSupabaseAdmin(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  }
  return createSupabaseServerClient(serviceKey);
}
