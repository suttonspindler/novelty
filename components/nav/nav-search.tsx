'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef } from 'react'
import { Search } from 'lucide-react'

export function NavSearch() {
  const router = useRouter()
  // Prefill with the active query so this single search bar doubles as the
  // "refine your search" field on the results page. The key resets the
  // uncontrolled input when the query changes via navigation.
  const currentQuery = useSearchParams().get('q') ?? ''
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      <input
        key={currentQuery}
        ref={inputRef}
        defaultValue={currentQuery}
        type="search"
        placeholder="Search books…"
        className="w-full h-8 rounded-md border border-input bg-background pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
      />
    </form>
  )
}
