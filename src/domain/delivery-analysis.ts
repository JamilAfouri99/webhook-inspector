import type {
  ReceivedWebhook,
  DeliveryAnalysis,
  AnalysisSummary,
} from '@/lib/types'

/** The `eventId` field of a webhook body, if it is a non-empty string. */
export function bodyEventId(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'eventId' in body) {
    const eid = (body as Record<string, unknown>).eventId
    if (typeof eid === 'string' && eid.length > 0) return eid
  }
  return undefined
}

/** The `event` field of a webhook body, if it is a non-empty string. */
export function bodyEvent(body: unknown): string | undefined {
  if (body && typeof body === 'object' && 'event' in body) {
    const ev = (body as Record<string, unknown>).event
    if (typeof ev === 'string' && ev.length > 0) return ev
  }
  return undefined
}

/** Stable key a webhook is grouped under: its eventId, or an index fallback. */
export function deliveryKey(wh: ReceivedWebhook): string {
  return bodyEventId(wh.body) ?? `unknown-${wh.index}`
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300
}

function analyzeOne(eventId: string, group: ReceivedWebhook[]): DeliveryAnalysis {
  const sorted = [...group].sort((a, b) => a.receivedAtMs - b.receivedAtMs)
  const statuses = sorted.map((w) => w.respondedWith.statusCode)
  const last = sorted[sorted.length - 1]
  const first = sorted[0]

  const retryGaps: string[] = []
  for (let i = 1; i < sorted.length; i++) {
    const gapMs = sorted[i].receivedAtMs - sorted[i - 1].receivedAtMs
    retryGaps.push(`${Math.round(gapMs / 1000)}s`)
  }

  const sigChecked = sorted.filter((w) => w.signatureValid !== undefined)
  const sigValid = sigChecked.filter((w) => w.signatureValid === true).length
  const sigInvalid = sigChecked.filter((w) => w.signatureValid === false).length

  return {
    eventId,
    event: eventNameOf(first),
    attempts: sorted.length,
    statuses,
    succeeded: isSuccess(last.respondedWith.statusCode),
    retryGaps,
    firstSeen: first.receivedAt,
    lastSeen: last.receivedAt,
    totalDurationMs: sorted.length > 1 ? last.receivedAtMs - first.receivedAtMs : 0,
    signature: sigChecked.length > 0 ? { valid: sigValid, invalid: sigInvalid } : undefined,
  }
}

function eventNameOf(wh: ReceivedWebhook): string {
  return bodyEvent(wh.body) ?? 'unknown'
}

/**
 * Group webhooks by their logical event id and compute per-delivery retry
 * analysis plus a summary. Pure function — the unit of testable behaviour.
 */
export function analyzeDeliveries(
  webhooks: ReceivedWebhook[],
  activeScenario: string,
): { summary: AnalysisSummary; deliveries: DeliveryAnalysis[] } {
  const byEventId = new Map<string, ReceivedWebhook[]>()
  for (const wh of webhooks) {
    const eid = deliveryKey(wh)
    const group = byEventId.get(eid)
    if (group) group.push(wh)
    else byEventId.set(eid, [wh])
  }

  const deliveries = Array.from(byEventId.entries()).map(([eventId, group]) =>
    analyzeOne(eventId, group),
  )

  return {
    summary: {
      totalWebhooksReceived: webhooks.length,
      uniqueEventIds: byEventId.size,
      eventsWithRetries: deliveries.filter((d) => d.attempts > 1).length,
      successfulDeliveries: deliveries.filter((d) => d.succeeded).length,
      failedDeliveries: deliveries.filter((d) => !d.succeeded).length,
      activeScenario,
    },
    deliveries,
  }
}
