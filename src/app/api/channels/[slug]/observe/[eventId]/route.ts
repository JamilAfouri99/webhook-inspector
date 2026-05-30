import { NextResponse } from 'next/server'
import { getHistory, getState } from '@/lib/webhook-state'
import { analyzeDeliveries, bodyEventId } from '@/domain/delivery-analysis'
import { route, requireChannel, HttpError } from '@/lib/api/handler'

export const GET = route<{ slug: string; eventId: string }>(async (_request, { slug, eventId }) => {
  await requireChannel(slug)

  const [result, state] = await Promise.all([getHistory(slug), getState(slug)])
  const matching = result.webhooks.filter((w) => bodyEventId(w.body) === eventId)
  if (matching.length === 0) {
    throw new HttpError(404, `No webhooks found for eventId: ${eventId}`)
  }

  const { deliveries } = analyzeDeliveries(matching, state?.activeScenario ?? 'none')
  return NextResponse.json(deliveries[0])
})
