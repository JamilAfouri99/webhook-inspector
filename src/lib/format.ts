export function relativeTime(date: Date | string | number): string {
  const ts = typeof date === 'number' ? date : new Date(date).getTime()
  const diff = Date.now() - ts
  const abs = Math.abs(diff)
  if (abs < 5_000) return 'just now'
  if (abs < 60_000) return `${Math.round(abs / 1000)}s ago`
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ago`
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)}h ago`
  if (abs < 604_800_000) return `${Math.round(abs / 86_400_000)}d ago`
  return new Date(ts).toLocaleDateString()
}

export function kFormat(n: number): string {
  if (n < 1000) return `${n}`
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatPercent(p: number | null | undefined): string {
  if (p == null || Number.isNaN(p)) return '—'
  return `${(p * 100).toFixed(p > 0.99 || p === 0 ? 0 : 1)}%`
}
