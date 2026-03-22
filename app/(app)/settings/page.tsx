import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './profile-form'
import { Separator } from '@/components/ui/separator'
import type { Profile } from '@/types/database.types'

export const metadata = { title: 'Settings — Novelty' }

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your profile and account.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Profile</h2>
        <ProfileForm profile={profile} />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Data export</h2>
        <p className="text-sm text-muted-foreground">
          Download all your data in JSON format (GDPR-compliant).
        </p>
        <a
          href="/api/user/export"
          download="novelty-export.json"
          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Export my data
        </a>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        <p className="text-sm text-muted-foreground">
          Account deletion is not yet available. Contact support if needed.
        </p>
      </section>
    </div>
  )
}
