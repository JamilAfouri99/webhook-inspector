import { prisma } from '@/lib/db'

const DAY_MS = 24 * 60 * 60 * 1000
const SUCCESS = { gte: 200, lt: 300 } as const

export type Stats = {
  channels: number
  events24h: number
  successRate: number | null
  failed24h: number
  avgDelayMs: number
}

export async function getStats(now: number = Date.now()): Promise<Stats> {
  const since = new Date(now - DAY_MS)
  const recent = { receivedAt: { gte: since } }

  const [channels, events24h, success24h, failed24h, avgDelay] = await Promise.all([
    prisma.channel.count(),
    prisma.webhook.count({ where: recent }),
    prisma.webhook.count({ where: { ...recent, respondedStatusCode: SUCCESS } }),
    prisma.webhook.count({ where: { ...recent, NOT: { respondedStatusCode: SUCCESS } } }),
    prisma.webhook.aggregate({ _avg: { respondedDelayMs: true }, where: recent }),
  ])

  return {
    channels,
    events24h,
    successRate: events24h === 0 ? null : success24h / events24h,
    failed24h,
    avgDelayMs: avgDelay._avg.respondedDelayMs ?? 0,
  }
}

export type ActivityItem = {
  id: string
  index: number
  receivedAt: string
  receivedAtMs: number
  event: string | null
  eventId: string | null
  statusCode: number
  behavior: string
  channel: { slug: string; name: string }
}

export async function getActivityFeed(limit: number): Promise<ActivityItem[]> {
  const rows = await prisma.webhook.findMany({
    take: limit,
    orderBy: { receivedAtMs: 'desc' },
    include: { channel: { select: { slug: true, name: true } } },
  })

  return rows.map((r) => {
    const body = r.body as { event?: string; eventId?: string } | null
    return {
      id: r.id,
      index: r.index,
      receivedAt: r.receivedAt.toISOString(),
      receivedAtMs: Number(r.receivedAtMs),
      event: body?.event ?? null,
      eventId: body?.eventId ?? null,
      statusCode: r.respondedStatusCode,
      behavior: r.respondedBehavior,
      channel: { slug: r.channel.slug, name: r.channel.name },
    }
  })
}
