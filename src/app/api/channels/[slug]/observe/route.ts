import { NextRequest, NextResponse } from 'next/server'
import { getHistory, analyzeDeliveries, getState, getChannel } from '@/lib/webhook-state'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const [result, state] = await Promise.all([
    getHistory(slug),
    getState(slug),
  ])

  const activeScenario = state?.activeScenario ?? 'none'
  const { summary, deliveries } = analyzeDeliveries(result.webhooks, activeScenario)

  return NextResponse.json({ summary, deliveries })
}
