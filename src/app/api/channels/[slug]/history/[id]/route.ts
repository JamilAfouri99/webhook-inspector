import { NextRequest, NextResponse } from 'next/server'
import { getHistoryEntry, getChannel } from '@/lib/webhook-state'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const wh = await getHistoryEntry(slug, id)
  if (!wh) return NextResponse.json({ error: `Webhook ${id} not found` }, { status: 404 })

  return NextResponse.json(wh)
}
