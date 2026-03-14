'use client'

import { useEffect, useRef } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'

type Props = {
  webhooks: ReceivedWebhook[]
  onSelect: (webhook: ReceivedWebhook) => void
  selectedId?: string
}

function statusColor(code: number): string {
  if (code === 0) return 'text-purple-400'
  if (code >= 200 && code < 300) return 'text-[var(--success)]'
  if (code >= 400 && code < 500) return 'text-[var(--warning)]'
  if (code >= 500) return 'text-[var(--error)]'
  return 'text-[var(--muted)]'
}

function statusDot(code: number): string {
  if (code === 0) return 'bg-purple-400'
  if (code >= 200 && code < 300) return 'bg-[var(--success)]'
  if (code >= 400 && code < 500) return 'bg-[var(--warning)]'
  if (code >= 500) return 'bg-[var(--error)]'
  return 'bg-[var(--muted)]'
}

export function EventStream({ webhooks, onSelect, selectedId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to top when new webhooks arrive (list is reversed, newest at top)
  useEffect(() => {
    if (containerRef.current) {
      const isNearTop = containerRef.current.scrollTop < 100
      if (isNearTop) {
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }, [webhooks.length])

  if (webhooks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--card-border)] flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="text-sm">Waiting for webhooks...</div>
        <div className="text-xs text-[var(--muted)]/60">Point your webhook URL to this server</div>
      </div>
    )
  }

  const reversed = [...webhooks].reverse()

  return (
    <div ref={containerRef} className="h-full overflow-auto">
      <div className="px-4 py-2 border-b border-[var(--card-border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="grid grid-cols-[40px_1fr_180px_80px_60px_60px] gap-2 text-xs text-[var(--muted)] font-medium">
          <span>#</span>
          <span>Event</span>
          <span>Event ID</span>
          <span>Status</span>
          <span>Behavior</span>
          <span>Time</span>
        </div>
      </div>
      <div>
        {reversed.map(wh => {
          const isSelected = wh.id === selectedId
          const event = wh.body?.event || 'unknown'
          const eventId = (wh.body?.eventId || '-').substring(0, 16)
          const time = new Date(wh.receivedAt).toLocaleTimeString()
          const code = wh.respondedWith.statusCode

          return (
            <button
              key={wh.id}
              onClick={() => onSelect(wh)}
              className={`w-full px-4 py-2.5 text-left border-b border-[var(--card-border)]/50 hover:bg-[var(--card)] transition-colors animate-fade-in ${
                isSelected ? 'bg-[var(--accent-dim)]/30 border-l-2 border-l-[var(--accent)]' : ''
              }`}
            >
              <div className="grid grid-cols-[40px_1fr_180px_80px_60px_60px] gap-2 items-center text-xs">
                <span className="text-[var(--muted)]">{wh.index}</span>
                <span className="font-medium truncate">{event}</span>
                <span className="text-[var(--muted)] font-mono text-[10px] truncate">{eventId}</span>
                <span className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusDot(code)}`} />
                  <span className={statusColor(code)}>{code || 'TIMEOUT'}</span>
                </span>
                <span className="text-[var(--muted)] truncate">{wh.respondedWith.behavior}</span>
                <span className="text-[var(--muted)]">{time}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
