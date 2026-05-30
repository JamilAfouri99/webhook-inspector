import { describe, it, expect } from 'vitest'
import { analyzeDeliveries, bodyEventId, bodyEvent, deliveryKey } from '@/domain/delivery-analysis'
import type { ReceivedWebhook } from '@/lib/types'

function wh(over: Partial<ReceivedWebhook> & { id: string }): ReceivedWebhook {
  return {
    index: 0,
    receivedAt: new Date(over.receivedAtMs ?? 0).toISOString(),
    receivedAtMs: 0,
    method: 'POST',
    path: '/',
    headers: {},
    body: null,
    respondedWith: { statusCode: 200, behavior: 'success', delayMs: 0 },
    ...over,
  }
}

describe('body field helpers', () => {
  it('reads eventId / event only when non-empty strings', () => {
    expect(bodyEventId({ eventId: 'e1' })).toBe('e1')
    expect(bodyEventId({ eventId: '' })).toBeUndefined()
    expect(bodyEventId({})).toBeUndefined()
    expect(bodyEventId(null)).toBeUndefined()
    expect(bodyEvent({ event: 'payment' })).toBe('payment')
    expect(bodyEvent('nope')).toBeUndefined()
  })

  it('deliveryKey falls back to the index when no eventId', () => {
    expect(deliveryKey(wh({ id: 'a', index: 7, body: {} }))).toBe('unknown-7')
    expect(deliveryKey(wh({ id: 'a', index: 7, body: { eventId: 'evt' } }))).toBe('evt')
  })
})

describe('analyzeDeliveries', () => {
  it('groups attempts by eventId and sorts them by time', () => {
    const webhooks = [
      wh({ id: '2', receivedAtMs: 2000, body: { eventId: 'e1', event: 'paid' }, respondedWith: { statusCode: 500, behavior: 'server-error', delayMs: 0 } }),
      wh({ id: '1', receivedAtMs: 1000, body: { eventId: 'e1', event: 'paid' }, respondedWith: { statusCode: 500, behavior: 'server-error', delayMs: 0 } }),
      wh({ id: '3', receivedAtMs: 9000, body: { eventId: 'e1', event: 'paid' }, respondedWith: { statusCode: 200, behavior: 'success', delayMs: 0 } }),
    ]
    const { deliveries, summary } = analyzeDeliveries(webhooks, 'retry-storm')

    expect(deliveries).toHaveLength(1)
    const d = deliveries[0]
    expect(d.eventId).toBe('e1')
    expect(d.event).toBe('paid')
    expect(d.attempts).toBe(3)
    expect(d.statuses).toEqual([500, 500, 200])
    expect(d.succeeded).toBe(true) // last attempt is 2xx
    expect(d.retryGaps).toEqual(['1s', '7s'])
    expect(d.firstSeen).toBe(new Date(1000).toISOString())
    expect(d.lastSeen).toBe(new Date(9000).toISOString())
    expect(d.totalDurationMs).toBe(8000)

    expect(summary.totalWebhooksReceived).toBe(3)
    expect(summary.uniqueEventIds).toBe(1)
    expect(summary.eventsWithRetries).toBe(1)
    expect(summary.successfulDeliveries).toBe(1)
    expect(summary.failedDeliveries).toBe(0)
    expect(summary.activeScenario).toBe('retry-storm')
  })

  it('marks a delivery failed when the last attempt is not 2xx', () => {
    const { deliveries, summary } = analyzeDeliveries(
      [wh({ id: '1', receivedAtMs: 1, body: { eventId: 'e' }, respondedWith: { statusCode: 503, behavior: 'server-error', delayMs: 0 } })],
      'none',
    )
    expect(deliveries[0].succeeded).toBe(false)
    expect(deliveries[0].totalDurationMs).toBe(0) // single attempt
    expect(summary.failedDeliveries).toBe(1)
  })

  it('treats webhooks without an eventId as distinct events via the index fallback', () => {
    const { summary } = analyzeDeliveries(
      [wh({ id: '1', index: 1, body: {} }), wh({ id: '2', index: 2, body: {} })],
      'none',
    )
    expect(summary.uniqueEventIds).toBe(2)
    expect(summary.eventsWithRetries).toBe(0)
  })

  it('aggregates signature validity counts when present', () => {
    const { deliveries } = analyzeDeliveries(
      [
        wh({ id: '1', receivedAtMs: 1, body: { eventId: 'e' }, signatureValid: true }),
        wh({ id: '2', receivedAtMs: 2, body: { eventId: 'e' }, signatureValid: false }),
      ],
      'none',
    )
    expect(deliveries[0].signature).toEqual({ valid: 1, invalid: 1 })
  })

  it('omits signature stats when no attempt was checked', () => {
    const { deliveries } = analyzeDeliveries(
      [wh({ id: '1', receivedAtMs: 1, body: { eventId: 'e' } })],
      'none',
    )
    expect(deliveries[0].signature).toBeUndefined()
  })

  it('returns empty results for no webhooks', () => {
    const { deliveries, summary } = analyzeDeliveries([], 'none')
    expect(deliveries).toEqual([])
    expect(summary.totalWebhooksReceived).toBe(0)
    expect(summary.uniqueEventIds).toBe(0)
  })
})
