'use client'

import { useEffect, useState } from 'react'
import { formatLatency, formatPercent, kFormat } from '@/lib/format'

type Stats = {
  channels: number
  events24h: number
  successRate: number | null
  failed24h: number
  avgDelayMs: number
}

export function StatsStrip() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    const load = () => fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {})
    load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [])

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
      className="bg-white rounded-lg border border-[var(--card-border)] p-4"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1">{label}</div>
      <div className={`text-2xl font-semibold tracking-tight ${valueColor}`}>{value}</div>
      {hint && <div className="text-[10px] text-[var(--muted)] mt-1">{hint}</div>}
    </div>
  )
}
