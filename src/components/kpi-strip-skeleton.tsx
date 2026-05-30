import { Skeleton } from './ui/skeleton'

export function KpiStripSkeleton() {
  return (
    <div className="px-4 py-2 border-b border-[var(--card-border)] flex items-center gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Skeleton className="h-2.5 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  )
}

export function TimelineStripSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-[var(--card-border)]">
      <Skeleton className="h-6 w-full" />
    </div>
  )
}
