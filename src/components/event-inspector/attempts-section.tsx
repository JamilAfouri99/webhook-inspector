'use client'

import type { ReceivedWebhook } from '@/lib/webhook-state'
import { Section, StatusBadge } from './ui'

export function AttemptsSection({ related, currentId }: { related: ReceivedWebhook[]; currentId: string }) {
  if (related.length <= 1) return null
  return (
    <Section title={`Delivery attempts (${related.length})`}>
      {related.map((rw, i) => {
        const gap = i > 0 ? Math.round((rw.receivedAtMs - related[i - 1].receivedAtMs) / 1000) : 0
        const isCurrent = rw.id === currentId
        return (
          <div
            key={rw.id}
            className={`flex items-center gap-2 text-[11px] py-1 ${isCurrent ? 'text-[var(--accent)] font-medium' : ''}`}
          >
            <span className="w-5 text-right text-[var(--muted)]">{i + 1}.</span>
            <StatusBadge code={rw.respondedWith.statusCode} />
            <span className="text-[var(--muted)] font-mono">{new Date(rw.receivedAt).toLocaleTimeString()}</span>
            {gap > 0 && <span className="text-[var(--muted)]">+{gap}s</span>}
          </div>
        )
      })}
    </Section>
  )
}
