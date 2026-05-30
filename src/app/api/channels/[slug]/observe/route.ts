import { NextResponse } from 'next/server'
import { getHistory, getState } from '@/lib/webhook-state'
import { analyzeDeliveries } from '@/domain/delivery-analysis'
import { route, requireChannel } from '@/lib/api/handler'

export const GET = route<{ slug: string }>(async (_request, { slug }) => {
  await requireChannel(slug)

  const [result, state] = await Promise.all([getHistory(slug), getState(slug)])
  const { summary, deliveries } = analyzeDeliveries(result.webhooks, state?.activeScenario ?? 'none')

  return NextResponse.json({ summary, deliveries })
})
