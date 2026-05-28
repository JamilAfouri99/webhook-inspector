import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  const sinceMs = Date.now() - 24 * 60 * 60 * 1000
  const since = new Date(sinceMs)

  const [channelsCount, total24h, success24h, failed24h, avgDelayAgg] = await Promise.all([
    prisma.channel.count(),
    prisma.webhook.count({ where: { receivedAt: { gte: since } } }),
    prisma.webhook.count({
      where: { receivedAt: { gte: since }, respondedStatusCode: { gte: 200, lt: 300 } },
    }),
    prisma.webhook.count({
      where: { receivedAt: { gte: since }, NOT: { respondedStatusCode: { gte: 200, lt: 300 } } },
    }),
    prisma.webhook.aggregate({
      _avg: { respondedDelayMs: true },
      where: { receivedAt: { gte: since } },
    }),
  ])

  const successRate = total24h === 0 ? null : success24h / total24h

  return NextResponse.json({
    channels: channelsCount,
    events24h: total24h,
    successRate,
    failed24h,
    avgDelayMs: avgDelayAgg._avg.respondedDelayMs ?? 0,
  })
}
