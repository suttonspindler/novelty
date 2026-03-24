interface RatingDistributionProps {
  ratings: { rating: number }[]
}

export function RatingDistribution({ ratings }: RatingDistributionProps) {
  if (!ratings.length) return null

  const counts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: ratings.filter((r) => Math.round(r.rating) === star).length,
  }))
  const max = Math.max(...counts.map((c) => c.count), 1)

  return (
    <div className="space-y-1.5 w-full max-w-xs">
      {counts.map(({ star, count }) => (
        <div key={star} className="flex items-center gap-2 text-xs">
          <span className="w-4 text-right text-muted-foreground">{star}</span>
          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="w-6 text-muted-foreground">{count}</span>
        </div>
      ))}
    </div>
  )
}
