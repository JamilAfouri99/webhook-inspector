import { Skeleton } from './ui/skeleton'

export function StatsStripSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <Skeleton className="h-2.5 w-16 mb-3" />
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-2.5 w-24" />
        </div>
      ))}
    </div>
  )
}
