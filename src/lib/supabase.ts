import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  ? normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
  : ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl.includes('.supabase.co'))
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        flowType: 'pkce',
        persistSession: true,
      },
    })
  }

  return client
}
