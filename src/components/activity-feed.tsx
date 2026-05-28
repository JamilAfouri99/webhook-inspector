'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { relativeTime } from '@/lib/format'

type Activity = {
  id: string
  receivedAt: string
  event: string | null
  eventId: string | null
  statusCode: number
  behavior: string
  channel: { slug: string; name: string }
}

function pillFor(code: number): string {
  if (code === 0) return 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]'
  if (code >= 200 && code < 300) return 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]'
  if (code >= 400 && code < 500) return 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]'
  return 'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]'
}

export function ActivityFeed() {
  const [items, setItems] = useState<Activity[] | null>(null)
  const router = useRouter()

  useEffect(() => {
    const load = () => fetch('/api/activity?limit=30').then(r => r.json()).then(d => setItems(d.items || [])).catch(() => {})
    load()
    const id = setInterval(load, 5_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="bg-white rounded-lg border border-[var(--card-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="px-4 py-3 border-b border-[var(--card-border)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--heading)]">Recent activity</h3>
        <span className="text-[10px] text-[var(--muted)]">Across all channels</span>
      </div>
      {items === null ? (
        <div className="px-4 py-6 text-xs text-[var(--muted)]">Loading…</div>
      ) : items.length === 0 ? (
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
              <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${pillFor(item.statusCode)}`}>
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
