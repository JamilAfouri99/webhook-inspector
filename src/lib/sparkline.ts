export type SparklinePoint = { t: number; v: number }

export function buildSparklinePath(
  points: SparklinePoint[],
  opts: { width: number; height: number; padding?: number } = { width: 100, height: 24 },
): { line: string; area: string; max: number; min: number } {
  const padding = opts.padding ?? 2
  if (points.length === 0) {
    return { line: '', area: '', max: 0, min: 0 }
  }

  const sorted = [...points].sort((a, b) => a.t - b.t)
  const values = sorted.map((p) => p.v)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const innerH = opts.height - padding * 2
  const innerW = opts.width - padding * 2

  const xStep = sorted.length === 1 ? 0 : innerW / (sorted.length - 1)
  const coords = sorted.map((p, i) => {
    const x = padding + i * xStep
    const y = padding + innerH - ((p.v - min) / range) * innerH
    return { x, y }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' ')
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${opts.height - padding} L ${coords[0].x.toFixed(2)} ${opts.height - padding} Z`

  return { line, area, max, min }
}

export function bucketByMinute(
  timestamps: number[],
  buckets: number,
  nowMs: number = Date.now(),
): SparklinePoint[] {
  const bucketMs = 60_000
  const out: SparklinePoint[] = []
  for (let i = buckets - 1; i >= 0; i--) {
    const start = nowMs - (i + 1) * bucketMs
    const end = nowMs - i * bucketMs
    const count = timestamps.filter((t) => t >= start && t < end).length
    out.push({ t: end, v: count })
  }
  return out
}
