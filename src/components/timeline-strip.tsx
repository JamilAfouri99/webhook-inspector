'use client'

import type { ReceivedWebhook } from '@/lib/webhook-state'

const COLOR: Record<string, string> = {
  pending: '#a855f7',
  success: '#1ea672',
  warning: '#bb5504',
  error:   '#df1b41',
}

function kindOf(code: number): keyof typeof COLOR {
  if (code === 0) return 'pending'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warning'
  return 'error'
}

export function TimelineStrip({
  webhooks,
  onSelect,
}: {
  webhooks: ReceivedWebhook[]
  onSelect: (w: ReceivedWebhook) => void
}) {
  const recent = webhooks.slice(-60)

  if (recent.length === 0) {
    return (
      <div className="px-5 py-2 border-b border-[var(--card-border)] bg-white flex items-center gap-3">
        <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">Timeline</span>
        <div className="flex-1 h-5 rounded border border-dashed border-[var(--card-border)]" />
      </div>
    )
  }

  return (
    <div className="px-5 py-2 border-b border-[var(--card-border)] bg-white flex items-center gap-3">
      <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] shrink-0">
        Last {recent.length}
      </span>
      <div className="flex-1 flex gap-[2px] items-end h-5">
        {recent.map((w) => {
          const k = kindOf(w.respondedWith.statusCode)
          return (
            <button
              key={w.id}
              onClick={() => onSelect(w)}
              title={`#${w.index} · ${w.respondedWith.statusCode || 'HANG'} · ${w.respondedWith.behavior}`}
              className="flex-1 h-full rounded-sm hover:opacity-80 transition-opacity"
              style={{ background: COLOR[k] }}
            />
          )
        })}
      </div>
    </div>
  )
}
