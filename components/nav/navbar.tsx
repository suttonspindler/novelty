import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/theme-toggle'
import { UserMenu } from './user-menu'
import { NavSearch } from './nav-search'
import { Button } from '@/components/ui/button'

export async function Navbar() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
        <Link href={user ? '/dashboard' : '/'} className="text-lg font-bold tracking-tight shrink-0">
          Novelty
        </Link>

        <div className="flex-1 max-w-sm">
          <NavSearch />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <ThemeToggle />
          {user && profile ? (
            <UserMenu username={profile.username} displayName={profile.display_name} avatarUrl={profile.avatar_url} />
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
