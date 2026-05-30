import { describe, it, expect } from 'vitest'
import { relativeTime, kFormat, formatLatency, formatPercent } from '@/lib/format'

describe('relativeTime', () => {
  const ago = (ms: number) => relativeTime(Date.now() - ms)

  it('shows "just now" under 5s', () => {
    expect(ago(1_000)).toBe('just now')
  })
  it('shows seconds, minutes, hours, days', () => {
    expect(ago(30_000)).toBe('30s ago')
    expect(ago(5 * 60_000)).toBe('5m ago')
    expect(ago(3 * 3_600_000)).toBe('3h ago')
    expect(ago(2 * 86_400_000)).toBe('2d ago')
  })
  it('falls back to a locale date past a week', () => {
    const out = ago(30 * 86_400_000)
    expect(out).not.toContain('ago')
    expect(out).toMatch(/\d/)
  })
})

describe('kFormat', () => {
  it.each([
    [999, '999'],
    [1000, '1.0k'],
    [1500, '1.5k'],
    [12_000, '12k'],
    [1_000_000, '1.0M'],
    [2_500_000, '2.5M'],
  ])('formats %i as %s', (n, expected) => {
    expect(kFormat(n)).toBe(expected)
  })
})

describe('formatLatency', () => {
  it('renders an em dash for null/undefined/NaN', () => {
    expect(formatLatency(null)).toBe('—')
    expect(formatLatency(undefined)).toBe('—')
    expect(formatLatency(NaN)).toBe('—')
  })
  it('uses ms under 1s and seconds at/above 1s', () => {
    expect(formatLatency(0)).toBe('0ms')
    expect(formatLatency(999)).toBe('999ms')
    expect(formatLatency(1000)).toBe('1.0s')
    expect(formatLatency(1500)).toBe('1.5s')
  })
})

describe('formatPercent', () => {
  it('renders an em dash for null/undefined/NaN', () => {
    expect(formatPercent(null)).toBe('—')
    expect(formatPercent(NaN)).toBe('—')
  })
  it('uses 0 decimals at the extremes and 1 in between', () => {
    expect(formatPercent(0)).toBe('0%')
    expect(formatPercent(0.5)).toBe('50.0%')
    expect(formatPercent(1)).toBe('100%')
    expect(formatPercent(0.995)).toBe('100%')
  })
})
