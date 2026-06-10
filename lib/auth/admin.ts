import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Resolve the current user only if they are an admin (profiles.is_admin).
 * Returns null for anonymous or non-admin users. Use this to gate cover
 * curation and other developer-only tools.
 */
export async function requireAdmin(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()
  return data?.is_admin === true ? user : null
}

/** Boolean convenience wrapper around requireAdmin. */
export async function getIsAdmin(): Promise<boolean> {
  return (await requireAdmin()) !== null
}
