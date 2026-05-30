import { Skeleton } from './ui/skeleton'

export function EventStreamSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2.5 border-b border-[var(--card-border)] flex items-center gap-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-7 w-20" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-24" />
      </div>
      <ul className="flex-1 overflow-hidden divide-y divide-[var(--card-border)]">
        {Array.from({ length: 10 }).map((_, i) => (
          <li key={i} className="px-4 py-2.5 flex items-center gap-3">
            <Skeleton className="h-4 w-1 rounded-none" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-3.5 flex-1" style={{ maxWidth: `${50 + (i * 11) % 35}%` }} />
            <Skeleton className="h-3 w-12 shrink-0" />
            <Skeleton className="h-3 w-14 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}
