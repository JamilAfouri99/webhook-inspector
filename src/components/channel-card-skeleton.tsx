import { Skeleton } from './ui/skeleton'

export function ChannelCardSkeleton() {
  return (
    <div
      className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-[120px]" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-5">
          <div>
            <Skeleton className="h-5 w-10 mb-1.5" />
            <Skeleton className="h-2.5 w-8" />
          </div>
          <div>
            <Skeleton className="h-5 w-14 mb-1.5" />
            <Skeleton className="h-2.5 w-12" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChannelCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => <ChannelCardSkeleton key={i} />)}
      </div>
    </div>
  )
}
