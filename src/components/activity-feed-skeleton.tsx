import { Skeleton } from './ui/skeleton'

export function ActivityFeedSkeleton() {
  return (
    <div
      className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
      <ul className="divide-y divide-[var(--card-border)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="px-4 py-2.5 flex items-center gap-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-3 flex-1" style={{ maxWidth: `${60 + (i * 7) % 30}%` }} />
            <Skeleton className="h-3 w-16 shrink-0" />
            <Skeleton className="h-3 w-10 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}
