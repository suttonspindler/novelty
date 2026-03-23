'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number | null
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' }

export function StarRating({ value, onChange, readonly = false, size = 'md' }: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const displayed = hovered ?? value ?? 0
  const starSize = sizes[size]

  function handleMouseMove(e: React.MouseEvent<HTMLButtonElement>, star: number) {
    const rect = e.currentTarget.getBoundingClientRect()
    const half = e.clientX < rect.left + rect.width / 2
    setHovered(half ? star - 0.5 : star)
  }

  return (
    <div
      className={cn('flex items-center gap-0.5', readonly && 'pointer-events-none')}
      onMouseLeave={() => setHovered(null)}
      aria-label={value ? `${value} out of 5 stars` : 'No rating'}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const full = displayed >= star
        const half = !full && displayed >= star - 0.5

        return (
          <button
            key={star}
            type="button"
            className="relative focus:outline-none"
            onMouseMove={(e) => handleMouseMove(e, star)}
            onClick={() => {
              if (!readonly && onChange) {
                onChange(hovered ?? star)
              }
            }}
            aria-label={`Rate ${star} stars`}
          >
            {/* Base star (empty) */}
            <StarIcon className={cn(starSize, 'text-muted-foreground/30')} filled />
            {/* Fill overlay */}
            {(full || half) && (
              <span
                className={cn('absolute inset-0 overflow-hidden', half ? 'w-1/2' : 'w-full')}
              >
                <StarIcon className={cn(starSize, 'text-amber-400')} filled />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
      />
    </svg>
  )
}
