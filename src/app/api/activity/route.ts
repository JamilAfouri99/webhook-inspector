import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50'), 200)

  const rows = await prisma.webhook.findMany({
    take: limit,
    orderBy: { receivedAtMs: 'desc' },
    include: { channel: { select: { slug: true, name: true } } },
  })

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      index: r.index,
      receivedAt: r.receivedAt.toISOString(),
      receivedAtMs: Number(r.receivedAtMs),
      event: (r.body as { event?: string } | null)?.event ?? null,
      eventId: (r.body as { eventId?: string } | null)?.eventId ?? null,
      statusCode: r.respondedStatusCode,
      behavior: r.respondedBehavior,
      channel: { slug: r.channel.slug, name: r.channel.name },
    })),
  })
}
