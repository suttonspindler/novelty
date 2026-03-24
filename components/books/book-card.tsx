import Link from 'next/link'
import { BookCover } from './book-cover'
import { StarRating } from './star-rating'
import { cn } from '@/lib/utils'

interface BookCardProps {
  id: string
  title: string
  authorNames: string[]
  coverUrl: string | null
  firstPublishYear?: number | null
  avgRating?: number | null
  className?: string
}

export function BookCard({
  id,
  title,
  authorNames,
  coverUrl,
  firstPublishYear,
  avgRating,
  className,
}: BookCardProps) {
  return (
    <Link
      href={`/books/${id}`}
      className={cn(
        'group flex flex-col gap-2 hover:opacity-80 transition-opacity',
        className
      )}
    >
      <BookCover src={coverUrl} title={title} size="lg" className="w-full h-auto aspect-[2/3]" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:underline">
          {title}
        </p>
        {authorNames.length > 0 && (
          <p className="text-xs text-muted-foreground truncate">{authorNames[0]}</p>
        )}
        <div className="flex items-center gap-1.5">
          {avgRating != null && (
            <>
              <StarRating value={avgRating} readonly size="sm" />
              <span className="text-xs text-muted-foreground">{avgRating.toFixed(1)}</span>
            </>
          )}
          {firstPublishYear && (
            <span className="text-xs text-muted-foreground">{firstPublishYear}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
