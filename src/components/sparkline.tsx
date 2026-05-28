'use client'

import { buildSparklinePath, type SparklinePoint } from '@/lib/sparkline'

export function Sparkline({
  points,
  width = 120,
  height = 32,
  color = 'var(--accent)',
  fill = 'rgba(84, 105, 212, 0.12)',
}: {
  points: SparklinePoint[]
  width?: number
  height?: number
  color?: string
  fill?: string
}) {
  const { line, area } = buildSparklinePath(points, { width, height, padding: 3 })
  if (!line) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <line x1={3} x2={width - 3} y1={height / 2} y2={height / 2} stroke="var(--card-border)" strokeWidth={1.5} strokeDasharray="2 3" />
      </svg>
    )
  }
  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={area} fill={fill} />
      <path d={line} stroke={color} strokeWidth={1.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
