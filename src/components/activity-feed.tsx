'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { relativeTime } from '@/lib/format'
import { statusPillClass } from '@/lib/status'
import { useActivity } from '@/lib/hooks/use-api'
import { ActivityFeedSkeleton } from './activity-feed-skeleton'

export function ActivityFeed() {
  const router = useRouter()
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null)
  // Stamp the fetch time from SWR's success callback (not render, not an effect).
  const { data, isLoading, isValidating, mutate } = useActivity(30, () => setLastUpdatedAt(Date.now()))
  const items = data?.items ?? []
  const [, force] = useState(0)

  useEffect(() => {
    const id = setInterval(() => force(n => n + 1), 5_000)
    return () => clearInterval(id)
  }, [])

  if (isLoading && items.length === 0) return <ActivityFeedSkeleton />

  return (
    <div
      className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--heading)]">Recent activity</h3>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--heading)] transition-colors"
          title="Refresh"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${isValidating ? 'bg-[var(--accent)] animate-pulse-dot' : 'bg-[var(--success)]'}`}
          />
          {isValidating ? 'updating…' : lastUpdatedAt ? `updated ${relativeTime(new Date(lastUpdatedAt).toISOString())}` : 'live'}
        </button>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-[var(--muted)]">
          No webhooks received yet across any channel.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--card-border)] max-h-[480px] overflow-y-auto">
          {items.map(item => (
            <li
              key={item.id}
              onClick={() => router.push(`/c/${item.channel.slug}?event=${item.id}`)}
              className="px-4 py-2.5 flex items-center gap-3 text-xs hover:bg-[var(--muted-soft)] cursor-pointer transition-colors"
            >
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${statusPillClass(item.statusCode)}`}>
                {item.statusCode === 0 ? 'HANG' : item.statusCode}
              </span>
              <span className="font-medium text-[var(--heading)] truncate flex-1 min-w-0">
                {item.event || 'unknown event'}
              </span>
              <code className="text-[10px] font-mono text-[var(--muted)] bg-[var(--muted-soft)] px-1.5 py-0.5 rounded shrink-0">
                {item.channel.slug}
              </code>
              <span className="text-[10px] text-[var(--muted)] tabular-nums shrink-0 w-16 text-right">
                {relativeTime(item.receivedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
