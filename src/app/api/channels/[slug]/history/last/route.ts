import { NextRequest, NextResponse } from 'next/server'
import { getLastWebhook, getChannel } from '@/lib/webhook-state'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const last = await getLastWebhook(slug)
  if (!last) return NextResponse.json({ error: 'No webhooks received yet' }, { status: 404 })

  return NextResponse.json(last)
}
