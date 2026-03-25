import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Cliente con privilegios de admin — SOLO usar en API Routes del servidor
// NUNCA importar en componentes del cliente
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
