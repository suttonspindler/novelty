'use client'

import { useRouter } from 'next/navigation'
import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search } from 'lucide-react'

export function SearchInput({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
      <Input
        ref={inputRef}
        name="q"
        defaultValue={defaultValue}
        placeholder="Search by title, author, or ISBN…"
        className="flex-1"
        autoFocus={!defaultValue}
      />
      <Button type="submit">
        <Search className="h-4 w-4 mr-1" />
        Search
      </Button>
    </form>
  )
}
