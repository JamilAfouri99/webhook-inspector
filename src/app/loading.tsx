import { StatsStripSkeleton } from '@/components/stats-strip-skeleton'
import { ChannelCardGridSkeleton } from '@/components/channel-card-skeleton'
import { ActivityFeedSkeleton } from '@/components/activity-feed-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { Logo } from '@/components/logo'

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <header className="h-14 shrink-0 bg-[var(--card)] border-b border-[var(--card-border)] flex items-center px-6 gap-3">
        <Logo />
        <span className="hidden sm:inline text-xs text-[var(--muted)] border-l border-[var(--card-border)] pl-3">Workspace</span>
        <Skeleton className="ml-6 h-7 flex-1 max-w-md" />
      </header>

      <main className="flex-1 px-6 py-7 max-w-7xl w-full mx-auto space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-2" />
          <Skeleton className="h-3.5 w-72" />
        </div>

        <StatsStripSkeleton />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div
              className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-44" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>

            <ChannelCardGridSkeleton count={4} />
          </div>

          <div className="lg:col-span-1">
            <ActivityFeedSkeleton />
          </div>
        </div>
      </main>
    </div>
  )
}
