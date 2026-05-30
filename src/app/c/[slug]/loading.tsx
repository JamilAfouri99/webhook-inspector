import { KpiStripSkeleton, TimelineStripSkeleton } from '@/components/kpi-strip-skeleton'
import { EventStreamSkeleton } from '@/components/event-stream-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/components/logo'

export default function Loading() {
  return (
    <div className="h-screen flex flex-col bg-[var(--surface)] overflow-hidden">
      <header className="h-14 shrink-0 bg-[var(--card)] border-b border-[var(--card-border)] flex items-center px-4 gap-3">
        <Logo mark="w-[18px] h-[18px]" />
        <Skeleton className="h-4 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-7 w-48" />
      </header>

      <div className="flex-1 min-h-0 flex">
        <aside className="w-[22%] min-w-[220px] max-w-[360px] border-r border-[var(--card-border)] bg-[var(--card)] p-4 space-y-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3.5 w-24 mt-4" />
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </aside>

        <main className="flex-1 bg-[var(--card)] flex flex-col min-w-0">
          <KpiStripSkeleton />
          <TimelineStripSkeleton />
          <EventStreamSkeleton />
        </main>

        <aside className="w-[32%] min-w-[260px] max-w-[480px] border-l border-[var(--card-border)] bg-[var(--card)] p-6 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Skeleton className="h-12 w-12 rounded-full mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-44 mx-auto" />
          </div>
        </aside>
      </div>
    </div>
  )
}
