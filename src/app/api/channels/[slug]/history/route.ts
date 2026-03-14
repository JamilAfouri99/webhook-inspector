import { NextRequest, NextResponse } from 'next/server'
import { getHistory, clearHistory, getChannel } from '@/lib/webhook-state'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const url = request.nextUrl
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '1000'), 5000)
  const offset = parseInt(url.searchParams.get('offset') || '0')
  const event = url.searchParams.get('event') || undefined

  const result = await getHistory(slug, { limit, offset, event })

  // Add attempt numbers per eventId
  const attemptCounters = new Map<string, number>()
  const webhooks = result.webhooks.map(w => {
    const eid = w.body?.eventId || `unknown-${w.index}`
    const attempt = (attemptCounters.get(eid) || 0) + 1
    attemptCounters.set(eid, attempt)
    return { ...w, attempt }
  })

  return NextResponse.json({ total: result.total, offset, limit, webhooks })
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const count = await clearHistory(slug)
  return NextResponse.json({ cleared: true, count })
}
