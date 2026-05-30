'use client'

import { formatLatency, formatPercent, kFormat } from '@/lib/format'
import { useStats } from '@/lib/hooks/use-api'
import { StatsStripSkeleton } from './stats-strip-skeleton'

export function StatsStrip() {
  const { data: stats, isLoading } = useStats()

  if (isLoading && !stats) return <StatsStripSkeleton />

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card label="Channels"        value={stats ? kFormat(stats.channels) : '—'} hint="Total" />
      <Card label="Events (24h)"     value={stats ? kFormat(stats.events24h) : '—'} hint="Last 24 hours" />
      <Card label="Success rate"     value={stats ? formatPercent(stats.successRate) : '—'} hint="2xx / total"
            tone={stats?.successRate != null && stats.successRate < 0.9 ? 'warn' : 'success'} />
      <Card label="Avg sim. delay"   value={stats ? formatLatency(stats.avgDelayMs) : '—'} hint="Applied by tester" />
    </div>
  )
}

function Card({
  label, value, hint, tone,
}: { label: string; value: string; hint?: string; tone?: 'success' | 'warn' | 'error' }) {
  const valueColor =
    tone === 'success' ? 'text-[var(--success-text)]' :
    tone === 'warn' ? 'text-[var(--warning-text)]' :
    tone === 'error' ? 'text-[var(--error-text)]' :
    'text-[var(--heading)]'

  return (
    <div
      className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {hint && <div className="text-[10px] text-[var(--muted)] mt-1">{hint}</div>}
    </div>
  )
}
