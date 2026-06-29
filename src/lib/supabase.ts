import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Whether a real backend is configured. When it isn't, the app still runs as a
// no-account experience — lessons work fully; only sign-in, saved progress, and
// streaks are unavailable. Throwing here instead would crash the entire app at
// module load (before React mounts, so no error boundary can catch it), which
// contradicts the app's "works with the backend off" design.
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase environment variables are not set — sign-in and saved progress are disabled. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your .env to enable them.',
  )
}

export const supabase = createClient<Database>(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseKey ?? 'public-anon-key-not-configured',
)
