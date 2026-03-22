'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { updateProfile } from '@/app/(auth)/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Profile } from '@/types/database.types'

export function ProfileForm({ profile }: { profile: Profile }) {
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message ?? 'Profile updated.')
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <Input id="username" name="username" defaultValue={profile.username} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="display_name">Display name</Label>
        <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ''} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="bio">Bio</Label>
        <Input id="bio" name="bio" defaultValue={profile.bio ?? ''} maxLength={160} />
        <p className="text-xs text-muted-foreground">Max 160 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" defaultValue={profile.website ?? ''} placeholder="https://" />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_private"
          name="is_private"
          value="true"
          defaultChecked={profile.is_private}
          className="h-4 w-4 rounded border border-input"
        />
        <Label htmlFor="is_private">Private profile</Label>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  )
}
