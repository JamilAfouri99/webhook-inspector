'use client'

import { useMemo } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'
import { formatLatency, formatPercent, kFormat } from '@/lib/format'

export function KpiStrip({ webhooks }: { webhooks: ReceivedWebhook[] }) {
  const stats = useMemo(() => {
    const now = Date.now()
    const last1m = webhooks.filter(w => now - w.receivedAtMs <= 60_000).length
    const last5m = webhooks.filter(w => now - w.receivedAtMs <= 5 * 60_000).length

    const recent = webhooks.slice(-100)
    const success = recent.filter(w => w.respondedWith.statusCode >= 200 && w.respondedWith.statusCode < 300).length
    const successRate = recent.length === 0 ? null : success / recent.length

    const totalDelay = recent.reduce((acc, w) => acc + w.respondedWith.delayMs, 0)
    const avgDelay = recent.length === 0 ? null : totalDelay / recent.length

    const byEventId = new Map<string, number>()
    for (const w of webhooks) {
      const eid = (w.body && typeof w.body === 'object' && 'eventId' in w.body)
        ? String((w.body as Record<string, unknown>).eventId ?? '')
        : ''
      if (!eid) continue
      byEventId.set(eid, (byEventId.get(eid) || 0) + 1)
    }
    const retries = Array.from(byEventId.values()).reduce((acc, n) => acc + Math.max(n - 1, 0), 0)

    return { last1m, last5m, successRate, avgDelay, retries, total: webhooks.length }
  }, [webhooks])

  return (
    <div className="px-5 py-3 border-b border-[var(--card-border)] bg-white grid grid-cols-2 sm:grid-cols-4 gap-4">
      <Tile label="Events / min" value={kFormat(stats.last1m)} hint={`${stats.last5m} in last 5m`} />
      <Tile
        label="Success rate"
        value={formatPercent(stats.successRate)}
        hint="last 100"
        tone={stats.successRate != null && stats.successRate < 0.9 ? 'warn' : 'success'}
      />
      <Tile label="Avg sim. delay" value={formatLatency(stats.avgDelay)} hint="last 100" />
      <Tile label="Retries" value={kFormat(stats.retries)} hint={`${kFormat(stats.total)} total`} tone={stats.retries > 0 ? 'warn' : undefined} />
    </div>
  )
}

function Tile({
  label, value, hint, tone,
}: { label: string; value: string; hint?: string; tone?: 'success' | 'warn' | 'error' }) {
  const valueColor =
    tone === 'success' ? 'text-[var(--success-text)]' :
    tone === 'warn' ? 'text-[var(--warning-text)]' :
    tone === 'error' ? 'text-[var(--error-text)]' :
    'text-[var(--heading)]'
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">{label}</div>
      <div className={`text-lg font-semibold leading-tight tabular-nums ${valueColor}`}>{value}</div>
      {hint && <div className="text-[10px] text-[var(--muted)]">{hint}</div>}
    </div>
  )
}
