import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { Profile } from '@/types/database.types'

interface Props {
  params: { username: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: `@${params.username} — Novelty` }
}

export default async function ProfilePage({ params }: Props) {
  const supabase = createClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', params.username)
    .single()

  const profile = profileData as Profile | null
  if (!profile) notFound()

  const { data: { user } } = await supabase.auth.getUser()
  const isOwner = user?.id === profile.id

  if (profile.is_private && !isOwner) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="font-medium">This profile is private.</p>
      </div>
    )
  }

  const { count: booksRead } = await supabase
    .from('reading_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('status', 'read')

  const { count: reviewCount } = await supabase
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)

  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id)

  const initials = (profile.display_name ?? profile.username).slice(0, 2).toUpperCase()

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-6">
        <Avatar className="h-20 w-20 text-xl">
          <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.username} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-primary hover:underline"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>

      <div className="flex gap-8 text-sm">
        <div>
          <span className="font-bold">{booksRead ?? 0}</span>
          <span className="text-muted-foreground ml-1">books read</span>
        </div>
        <div>
          <span className="font-bold">{reviewCount ?? 0}</span>
          <span className="text-muted-foreground ml-1">reviews</span>
        </div>
        <div>
          <span className="font-bold">{followersCount ?? 0}</span>
          <span className="text-muted-foreground ml-1">followers</span>
        </div>
      </div>

      <Separator />

      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No books to display yet.</p>
      </div>
    </div>
  )
}
