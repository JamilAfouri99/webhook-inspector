import { describe, it, expect } from 'vitest'
import { buildSparklinePath, bucketByMinute } from '@/lib/sparkline'

describe('buildSparklinePath', () => {
  it('returns empty geometry for no points', () => {
    expect(buildSparklinePath([])).toEqual({ line: '', area: '', max: 0, min: 0 })
  })

  it('handles a single point without dividing by zero', () => {
    const r = buildSparklinePath([{ t: 0, v: 5 }], { width: 100, height: 24 })
    expect(r.line.startsWith('M ')).toBe(true)
    expect(r.line).not.toContain('NaN')
    expect(r.max).toBe(5)
    expect(r.min).toBe(0)
  })

  it('draws a line with segments and a closed area for multiple points', () => {
    const r = buildSparklinePath([{ t: 1, v: 1 }, { t: 2, v: 4 }, { t: 3, v: 2 }], { width: 90, height: 30 })
    expect(r.line).toContain('L')
    expect(r.area.endsWith('Z')).toBe(true)
    expect(r.max).toBe(4)
    expect(r.min).toBe(0)
  })

  it('sorts points by time before plotting', () => {
    const unsorted = buildSparklinePath([{ t: 3, v: 9 }, { t: 1, v: 1 }])
    const sorted = buildSparklinePath([{ t: 1, v: 1 }, { t: 3, v: 9 }])
    expect(unsorted.line).toBe(sorted.line)
  })
})

describe('bucketByMinute', () => {
  const now = 3_000_000

  it('produces one zero bucket per minute when empty, oldest first', () => {
    const out = bucketByMinute([], 3, now)
    expect(out.map((p) => p.v)).toEqual([0, 0, 0])
    expect(out[0].t).toBe(now - 2 * 60_000)
    expect(out[2].t).toBe(now)
  })

  it('counts timestamps into the correct minute bucket', () => {
    const out = bucketByMinute([now - 30_000, now - 30_000, now - 90_000], 3, now)
    expect(out[2].v).toBe(2) // last minute
    expect(out[1].v).toBe(1) // 1–2 minutes ago
    expect(out[0].v).toBe(0)
  })

  it('includes a timestamp on a bucket start boundary (half-open [start, end))', () => {
    const out = bucketByMinute([now - 60_000], 2, now)
    // now-60s is the inclusive start of the most-recent bucket (out[1]).
    expect(out[1].v).toBe(1)
    expect(out[0].v).toBe(0)
  })
})
