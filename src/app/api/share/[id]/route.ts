import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const row = await prisma.webhook.findUnique({
    where: { id },
    include: { channel: { select: { slug: true, name: true } } },
  })

  if (!row) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  return NextResponse.json({
    id: row.id,
    index: row.index,
    receivedAt: row.receivedAt.toISOString(),
    method: row.method,
    path: row.path,
    headers: row.headers,
    body: row.body,
    signatureHeader: row.signatureHeader,
    signatureValid: row.signatureValid,
    signatureError: row.signatureError,
    respondedWith: {
      statusCode: row.respondedStatusCode,
      behavior: row.respondedBehavior,
      delayMs: row.respondedDelayMs,
    },
    channel: { slug: row.channel.slug, name: row.channel.name },
  })
}
