import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BookCoverProps {
  src: string | null
  title: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  xs: { w: 32,  h: 48,  cls: 'w-8 h-12'    },
  sm: { w: 48,  h: 72,  cls: 'w-12 h-[72px]' },
  md: { w: 80,  h: 120, cls: 'w-20 h-[120px]' },
  lg: { w: 128, h: 192, cls: 'w-32 h-48'   },
  xl: { w: 192, h: 288, cls: 'w-48 h-72'   },
}

export function BookCover({ src, title, size = 'md', className }: BookCoverProps) {
  const { w, h, cls } = sizes[size]
  const initials = title.slice(0, 2).toUpperCase()

  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded', cls, className)}>
      {src ? (
        <Image
          src={src}
          alt={title}
          width={w}
          height={h}
          className="object-cover w-full h-full"
          unoptimized
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm">
          {initials}
        </div>
      )}
    </div>
  )
}
