import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Supabase pauses free-tier projects after ~7 days without any API activity.
// Loading the public site makes no Supabase request, so a scheduled read here
// keeps the project active. Wired to a daily Vercel Cron (see vercel.json).
export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { error } = await supabase.from('books').select('id').limit(1)

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() })
}
