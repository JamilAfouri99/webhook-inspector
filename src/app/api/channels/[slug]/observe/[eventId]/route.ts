import { NextRequest, NextResponse } from 'next/server'
import { getHistory, analyzeDeliveries, getState, getChannel } from '@/lib/webhook-state'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; eventId: string }> }
) {
  const { slug, eventId } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const [result, state] = await Promise.all([
    getHistory(slug),
    getState(slug),
  ])

  const matching = result.webhooks.filter(w => w.body?.eventId === eventId)
  if (matching.length === 0) {
    return NextResponse.json({ error: `No webhooks found for eventId: ${eventId}` }, { status: 404 })
  }

  const activeScenario = state?.activeScenario ?? 'none'
  const { deliveries } = analyzeDeliveries(matching, activeScenario)

  return NextResponse.json(deliveries[0])
}
