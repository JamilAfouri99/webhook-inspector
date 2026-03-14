import { prisma } from './db'

// ============================================================
// Types
// ============================================================

export type ServerBehavior =
  | 'success'
  | 'server-error'
  | 'timeout'
  | 'slow'
  | 'client-error'
  | 'unauthorized'
  | 'not-found'
  | 'rate-limited'
  | 'redirect'
  | 'large-response'
  | 'large-body'
  | 'empty-response'
  | 'non-json-response'
  | 'custom'

export type SequenceStep = {
  behavior: ServerBehavior
  delayMs?: number
  statusCode?: number
}

export type ReceivedWebhook = {
  id: string
  index: number
  receivedAt: string
  receivedAtMs: number
  method: string
  path: string
  headers: Record<string, string | string[] | undefined>
  body: any
  signatureHeader?: string
  signatureValid?: boolean
  signatureError?: string
  signaturePayload?: any
  respondedWith: {
    statusCode: number
    behavior: string
    delayMs: number
  }
}

export type Channel = {
  id: string
  slug: string
  name: string
  createdAt: string
}

export type ChannelState = {
  behavior: string
  delayMs: number
  customStatusCode: number
  sequence?: SequenceStep[]
  sequencePosition?: string
  useSequence: boolean
  publicKeyPem: string | null
  activeScenario: string
  webhooksReceived: number
  signatureVerification: boolean
  channel: { slug: string; name: string }
}

export type ScenarioConfig = {
  behavior: ServerBehavior
  delayMs: number
  useSequence: boolean
  sequence: SequenceStep[]
}

export type Scenario = {
  name: string
  description: string
  whatToExpect: string
  category: 'basic' | 'retry' | 'circuit-breaker' | 'edge-case' | 'verification'
  config: ScenarioConfig
}

export type DeliveryAnalysis = {
  eventId: string
  event: string
  attempts: number
  statuses: number[]
  succeeded: boolean
  retryGaps: string[]
  firstSeen: string
  lastSeen: string
  totalDurationMs: number
  signature?: { valid: number; invalid: number }
}

export type AnalysisSummary = {
  totalWebhooksReceived: number
  uniqueEventIds: number
  eventsWithRetries: number
  successfulDeliveries: number
  failedDeliveries: number
  activeScenario: string
}

// ============================================================
// SSE Event System (in-memory, scoped per channel)
// ============================================================

type EventListener = (event: string, data: any) => void
const channelListeners = new Map<string, Set<EventListener>>()

export function addListener(slug: string, listener: EventListener) {
  if (!channelListeners.has(slug)) channelListeners.set(slug, new Set())
  channelListeners.get(slug)!.add(listener)
  return () => {
    const set = channelListeners.get(slug)
    if (set) {
      set.delete(listener)
      if (set.size === 0) channelListeners.delete(slug)
    }
  }
}

function emit(slug: string, event: string, data: any) {
  const set = channelListeners.get(slug)
  if (set) set.forEach(l => l(event, data))
}

// ============================================================
// Shared Constants
// ============================================================

const largeResponseData = 'x'.repeat(1.5 * 1024 * 1024)
const startedAt = Date.now()

export function getLargeResponseData() {
  return largeResponseData
}

export function behaviorToStatusCode(b: ServerBehavior): number {
  const map: Record<ServerBehavior, number> = {
    'success': 200,
    'server-error': 500,
    'timeout': 0,
    'slow': 200,
    'client-error': 400,
    'unauthorized': 401,
    'not-found': 404,
    'rate-limited': 429,
    'redirect': 302,
    'large-response': 200,
    'large-body': 200,
    'empty-response': 200,
    'non-json-response': 200,
    'custom': 200,
  }
  return map[b] ?? 200
}

// ============================================================
// Channel CRUD
// ============================================================

export async function createChannel(slug: string, name: string): Promise<Channel | null> {
  try {
    const ch = await prisma.channel.create({
      data: { slug: slug.toLowerCase(), name },
      select: { id: true, slug: true, name: true, createdAt: true },
    })
    return { id: ch.id, slug: ch.slug, name: ch.name, createdAt: ch.createdAt.toISOString() }
  } catch (e: any) {
    // Unique constraint violation (slug already exists)
    if (e.code === 'P2002') return null
    throw e
  }
}

export async function getChannel(slug: string): Promise<Channel | null> {
  const ch = await prisma.channel.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, createdAt: true },
  })
  if (!ch) return null
  return { id: ch.id, slug: ch.slug, name: ch.name, createdAt: ch.createdAt.toISOString() }
}

export async function listChannels(): Promise<Channel[]> {
  const rows = await prisma.channel.findMany({
    select: { id: true, slug: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(r => ({ id: r.id, slug: r.slug, name: r.name, createdAt: r.createdAt.toISOString() }))
}

export async function deleteChannel(slug: string): Promise<boolean> {
  try {
    await prisma.channel.delete({ where: { slug } })
    channelListeners.delete(slug)
    return true
  } catch (e: any) {
    if (e.code === 'P2025') return false // Record not found
    throw e
  }
}

// ============================================================
// Channel State
// ============================================================

export async function getState(slug: string): Promise<ChannelState | null> {
  const ch = await prisma.channel.findUnique({
    where: { slug },
    include: { _count: { select: { webhooks: true } } },
  })
  if (!ch) return null

  const seq = (ch.sequence as SequenceStep[]) || []
  const useSeq = ch.useSequence

  return {
    behavior: useSeq ? 'sequence' : ch.behavior,
    delayMs: ch.delayMs,
    customStatusCode: ch.customStatusCode,
    sequence: useSeq ? seq : undefined,
    sequencePosition: useSeq && seq.length > 0
      ? `${(ch.sequenceIndex % seq.length) + 1}/${seq.length}`
      : undefined,
    useSequence: useSeq,
    publicKeyPem: ch.publicKeyPem,
    activeScenario: ch.activeScenario || 'none',
    webhooksReceived: ch._count.webhooks,
    signatureVerification: !!ch.publicKeyPem,
    channel: { slug: ch.slug, name: ch.name },
  }
}

export async function getPublicKey(slug: string): Promise<string | null> {
  const ch = await prisma.channel.findUnique({
    where: { slug },
    select: { publicKeyPem: true },
  })
  return ch?.publicKeyPem ?? null
}

// ============================================================
// Behavior Resolution (atomic sequence advance)
// ============================================================

export async function resolveCurrentBehavior(slug: string): Promise<{ b: ServerBehavior; delay: number; status: number } | null> {
  const ch = await prisma.channel.findUnique({ where: { slug } })
  if (!ch) return null

  if (ch.useSequence && Array.isArray(ch.sequence) && (ch.sequence as SequenceStep[]).length > 0) {
    const seq = ch.sequence as SequenceStep[]
    const idx = ch.sequenceIndex % seq.length

    // Atomic increment
    await prisma.channel.update({
      where: { slug },
      data: { sequenceIndex: { increment: 1 } },
    })

    const step = seq[idx]
    return {
      b: step.behavior as ServerBehavior,
      delay: step.delayMs ?? 0,
      status: step.statusCode ?? behaviorToStatusCode(step.behavior as ServerBehavior),
    }
  }

  return {
    b: ch.behavior as ServerBehavior,
    delay: ch.delayMs,
    status: ch.customStatusCode ?? behaviorToStatusCode(ch.behavior as ServerBehavior),
  }
}

// ============================================================
// Record Webhook
// ============================================================

export async function recordWebhook(
  slug: string,
  webhook: Omit<ReceivedWebhook, 'id' | 'index'>
): Promise<ReceivedWebhook | null> {
  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return null

  // Atomic counter increment
  const updated = await prisma.channel.update({
    where: { slug },
    data: { webhookCounter: { increment: 1 } },
    select: { webhookCounter: true },
  })
  const index = updated.webhookCounter

  const row = await prisma.webhook.create({
    data: {
      channelId: ch.id,
      index,
      receivedAt: new Date(webhook.receivedAt),
      receivedAtMs: BigInt(webhook.receivedAtMs),
      method: webhook.method,
      path: webhook.path,
      headers: webhook.headers as any,
      body: webhook.body ?? undefined,
      signatureHeader: webhook.signatureHeader ?? null,
      signatureValid: webhook.signatureValid ?? null,
      signatureError: webhook.signatureError ?? null,
      signaturePayload: webhook.signaturePayload ?? undefined,
      respondedStatusCode: webhook.respondedWith.statusCode,
      respondedBehavior: webhook.respondedWith.behavior,
      respondedDelayMs: webhook.respondedWith.delayMs,
    },
    select: { id: true },
  })

  const entry: ReceivedWebhook = {
    ...webhook,
    id: row.id,
    index,
  }

  emit(slug, 'webhook', entry)
  return entry
}

// ============================================================
// History
// ============================================================

function dbRowToWebhook(r: any): ReceivedWebhook {
  return {
    id: r.id,
    index: r.index,
    receivedAt: r.receivedAt instanceof Date ? r.receivedAt.toISOString() : r.receivedAt,
    receivedAtMs: Number(r.receivedAtMs),
    method: r.method,
    path: r.path,
    headers: (r.headers as Record<string, string | string[] | undefined>) || {},
    body: r.body,
    signatureHeader: r.signatureHeader ?? undefined,
    signatureValid: r.signatureValid ?? undefined,
    signatureError: r.signatureError ?? undefined,
    signaturePayload: r.signaturePayload ?? undefined,
    respondedWith: {
      statusCode: r.respondedStatusCode,
      behavior: r.respondedBehavior,
      delayMs: r.respondedDelayMs,
    },
  }
}

export async function getHistory(
  slug: string,
  opts?: { limit?: number; offset?: number; event?: string }
): Promise<{ total: number; webhooks: ReceivedWebhook[] }> {
  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return { total: 0, webhooks: [] }

  const limit = opts?.limit ?? 1000
  const offset = opts?.offset ?? 0

  // Build where clause
  const where: any = { channelId: ch.id }
  if (opts?.event) {
    where.body = { path: ['event'], equals: opts.event }
  }

  const [total, rows] = await Promise.all([
    prisma.webhook.count({ where }),
    prisma.webhook.findMany({
      where,
      orderBy: { receivedAtMs: 'asc' },
      take: limit,
      skip: offset,
    }),
  ])

  return {
    total,
    webhooks: rows.map(dbRowToWebhook),
  }
}

export async function getHistoryEntry(slug: string, id: string): Promise<ReceivedWebhook | null> {
  const row = await prisma.webhook.findFirst({
    where: {
      id,
      channel: { slug },
    },
  })
  return row ? dbRowToWebhook(row) : null
}

export async function getLastWebhook(slug: string): Promise<ReceivedWebhook | null> {
  const row = await prisma.webhook.findFirst({
    where: { channel: { slug } },
    orderBy: { receivedAtMs: 'desc' },
  })
  return row ? dbRowToWebhook(row) : null
}

export async function clearHistory(slug: string): Promise<number> {
  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return 0

  const { count } = await prisma.webhook.deleteMany({ where: { channelId: ch.id } })

  await prisma.channel.update({
    where: { slug },
    data: { webhookCounter: 0, sequenceIndex: 0 },
  })

  emit(slug, 'history-cleared', { count })
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
  return count
}

// ============================================================
// State Mutations
// ============================================================

export async function setBehavior(slug: string, newBehavior: ServerBehavior, newDelayMs?: number, newStatusCode?: number) {
  await prisma.channel.update({
    where: { slug },
    data: {
      behavior: newBehavior,
      delayMs: newDelayMs ?? 0,
      customStatusCode: newStatusCode ?? behaviorToStatusCode(newBehavior),
      useSequence: false,
      sequence: [],
      sequenceIndex: 0,
      activeScenario: `manual:${newBehavior}`,
    },
  })
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
}

export async function setSequence(slug: string, steps: SequenceStep[]) {
  await prisma.channel.update({
    where: { slug },
    data: {
      useSequence: true,
      sequence: steps as any,
      sequenceIndex: 0,
      activeScenario: 'manual:sequence',
    },
  })
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
}

export async function setPublicKeyForChannel(slug: string, key: string) {
  await prisma.channel.update({
    where: { slug },
    data: { publicKeyPem: key },
  })
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
}

export async function activateScenarioByName(slug: string, name: string): Promise<boolean> {
  const scenario = scenarios.find(s => s.name === name)
  if (!scenario) return false

  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return false

  const cfg = scenario.config

  // Reset + apply scenario config
  await prisma.channel.update({
    where: { slug },
    data: {
      behavior: cfg.behavior,
      delayMs: cfg.delayMs,
      customStatusCode: behaviorToStatusCode(cfg.behavior),
      useSequence: cfg.useSequence,
      sequence: cfg.sequence as any,
      sequenceIndex: 0,
      publicKeyPem: null,
      activeScenario: name,
      webhookCounter: 0,
    },
  })

  // Clear history
  await prisma.webhook.deleteMany({ where: { channelId: ch.id } })

  emit(slug, 'reset', null)
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
  return true
}

export async function resetAll(slug: string) {
  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return

  await prisma.channel.update({
    where: { slug },
    data: {
      behavior: 'success',
      delayMs: 0,
      customStatusCode: 200,
      useSequence: false,
      sequence: [],
      sequenceIndex: 0,
      publicKeyPem: null,
      activeScenario: 'none',
      webhookCounter: 0,
    },
  })

  await prisma.webhook.deleteMany({ where: { channelId: ch.id } })

  emit(slug, 'reset', null)
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
}

// ============================================================
// Analysis (pure functions — same logic, takes webhook array)
// ============================================================

export function analyzeDeliveries(
  webhooks: ReceivedWebhook[],
  activeScenario: string
): { summary: AnalysisSummary; deliveries: DeliveryAnalysis[] } {
  const byEventId = new Map<string, ReceivedWebhook[]>()
  for (const wh of webhooks) {
    const eid = wh.body?.eventId || `unknown-${wh.index}`
    if (!byEventId.has(eid)) byEventId.set(eid, [])
    byEventId.get(eid)!.push(wh)
  }

  const deliveries = Array.from(byEventId.entries()).map(([eventId, whs]) => {
    const sorted = whs.sort((a, b) => a.receivedAtMs - b.receivedAtMs)
    const attempts = sorted.length
    const statuses = sorted.map(w => w.respondedWith.statusCode)
    const lastStatus = statuses[statuses.length - 1]
    const succeeded = lastStatus >= 200 && lastStatus < 300

    const gaps: string[] = []
    for (let i = 1; i < sorted.length; i++) {
      const gapMs = sorted[i].receivedAtMs - sorted[i - 1].receivedAtMs
      gaps.push(`${Math.round(gapMs / 1000)}s`)
    }

    const sigChecked = sorted.filter(w => w.signatureValid !== undefined)
    const sigValid = sigChecked.filter(w => w.signatureValid === true).length
    const sigInvalid = sigChecked.filter(w => w.signatureValid === false).length

    return {
      eventId,
      event: sorted[0].body?.event || 'unknown',
      attempts,
      statuses,
      succeeded,
      retryGaps: gaps,
      firstSeen: sorted[0].receivedAt,
      lastSeen: sorted[sorted.length - 1].receivedAt,
      totalDurationMs: sorted.length > 1
        ? sorted[sorted.length - 1].receivedAtMs - sorted[0].receivedAtMs
        : 0,
      signature: sigChecked.length > 0
        ? { valid: sigValid, invalid: sigInvalid }
        : undefined,
    }
  })

  return {
    summary: {
      totalWebhooksReceived: webhooks.length,
      uniqueEventIds: byEventId.size,
      eventsWithRetries: deliveries.filter(d => d.attempts > 1).length,
      successfulDeliveries: deliveries.filter(d => d.succeeded).length,
      failedDeliveries: deliveries.filter(d => !d.succeeded).length,
      activeScenario,
    },
    deliveries,
  }
}

// ============================================================
// Health
// ============================================================

export function getUptimeMs(): number {
  return Date.now() - startedAt
}

// ============================================================
// Scenarios (static definitions — config objects, no side effects)
// ============================================================

export const scenarios: Scenario[] = [
  {
    name: 'happy-path',
    description: 'All requests return 200 OK',
    whatToExpect: 'Every webhook should be delivered once and marked as "delivered". No retries.',
    category: 'basic',
    config: { behavior: 'success', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'retry-then-recover',
    description: 'Returns 500, switch to 200 manually to test recovery.',
    whatToExpect: 'Step 1: Trigger a webhook event (fails). Step 2: Wait ~60s for retry attempt 2 (also fails). Step 3: Before attempt 3 (~300s after attempt 2), switch behavior to "success". Step 4: Attempt 3 succeeds. Observe: 3 attempts for the same eventId with gaps of ~60s and ~300s.',
    category: 'retry',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'retry-exhaust',
    description: 'Always returns 500 Internal Server Error',
    whatToExpect: 'All 3 attempts fail. Delivery marked "failed" after exhausting retries. Expect ~60s between attempt 1→2, ~300s between attempt 2→3.',
    category: 'retry',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'circuit-breaker-trip',
    description: 'Always 500. Send 5+ events to trip the circuit breaker.',
    whatToExpect: 'Send 5 different webhook events. Each gets 3 attempts (15 total hits). After 5th delivery fully fails → circuit opens. 6th event gets "circuit_blocked" status. Takes ~6 minutes for all retries to complete.',
    category: 'circuit-breaker',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'circuit-breaker-recover',
    description: 'Trip circuit with 500s, then switch to 200 for recovery.',
    whatToExpect: 'Step 1: Send 5+ events (all fail, circuit opens ~6min). Step 2: Switch to "success". Step 3: Wait 5min cooldown. System sends probe → succeeds → circuit closes. Up to 10 blocked deliveries re-queued.',
    category: 'circuit-breaker',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'intermittent-failures',
    description: 'Alternating 500, 200, 500, 200...',
    whatToExpect: 'Circuit should NOT trip because success resets consecutiveFailures to 0.',
    category: 'circuit-breaker',
    config: { behavior: 'success', delayMs: 0, useSequence: true, sequence: [{ behavior: 'server-error' }, { behavior: 'success' }] },
  },
  {
    name: 'timeout',
    description: 'Server never responds (35s hang)',
    whatToExpect: 'Worker should timeout at 30s. Delivery recorded as failed with timeout error. Triggers retries.',
    category: 'edge-case',
    config: { behavior: 'timeout', delayMs: 35000, useSequence: false, sequence: [] },
  },
  {
    name: 'slow-response',
    description: '10 second delay then 200 OK',
    whatToExpect: 'Delivery succeeds but takes 10s. Should be marked "delivered". Response time ~10s.',
    category: 'edge-case',
    config: { behavior: 'slow', delayMs: 10000, useSequence: false, sequence: [] },
  },
  {
    name: 'slow-near-timeout',
    description: '25 second delay then 200 OK — just under 30s limit',
    whatToExpect: 'Should barely succeed. If system has overhead, might timeout. Good edge case test.',
    category: 'edge-case',
    config: { behavior: 'slow', delayMs: 25000, useSequence: false, sequence: [] },
  },
  {
    name: 'client-error-no-retry',
    description: 'Always returns 400 Bad Request',
    whatToExpect: '4xx errors are NOT retried. Single attempt, delivery marked "failed". Circuit breaker NOT affected.',
    category: 'basic',
    config: { behavior: 'client-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'unauthorized',
    description: 'Always returns 401 Unauthorized',
    whatToExpect: 'Same as client-error: no retries, immediate failure.',
    category: 'basic',
    config: { behavior: 'unauthorized', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'rate-limited',
    description: 'Always returns 429 Too Many Requests',
    whatToExpect: '429 is a 4xx so no retries. Delivery fails immediately.',
    category: 'basic',
    config: { behavior: 'rate-limited', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'mixed-errors',
    description: 'Cycles: 500, 400, 200, 500, 400, 200...',
    whatToExpect: '500 triggers retry. 400 does not retry. 200 succeeds. Different eventIds hit different parts of the cycle.',
    category: 'retry',
    config: { behavior: 'success', delayMs: 0, useSequence: true, sequence: [{ behavior: 'server-error' }, { behavior: 'client-error' }, { behavior: 'success' }] },
  },
  {
    name: 'signature-verify',
    description: 'Returns 200 but logs signature validation status',
    whatToExpect: 'Every webhook accepted. Shows whether X-Webhook-Signature JWT was valid. Set public key first.',
    category: 'verification',
    config: { behavior: 'success', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'redirect-blocked',
    description: 'Returns 302 redirect — worker has maxRedirects=0, should reject.',
    whatToExpect: 'Worker blocks redirects. Treated as server error → retried 3 times → fails. Circuit breaker IS affected.',
    category: 'edge-case',
    config: { behavior: 'redirect', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'large-response',
    description: 'Returns 1.5MB response — exceeds worker maxContentLength (1MB).',
    whatToExpect: 'Axios throws when response exceeds 1MB. Treated as server error → retried 3 times. Circuit IS affected.',
    category: 'edge-case',
    config: { behavior: 'large-response', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'response-truncation',
    description: 'Returns 200 with >4KB body — stored truncated in DB.',
    whatToExpect: 'Delivery succeeds. responseBody in DB truncated to 4KB (MAX_RESPONSE_BODY_LENGTH=4096).',
    category: 'edge-case',
    config: { behavior: 'large-body', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'empty-response',
    description: 'Returns 200 with no body.',
    whatToExpect: 'Delivery succeeds. responseBody in DB should be empty/undefined.',
    category: 'edge-case',
    config: { behavior: 'empty-response', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'non-json-response',
    description: 'Returns 200 with Content-Type: text/plain instead of JSON.',
    whatToExpect: 'Delivery succeeds. responseBody stored as plain string.',
    category: 'edge-case',
    config: { behavior: 'non-json-response', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'probe-fails-circuit-reopens',
    description: 'Always 500 — for testing half-open probe failure.',
    whatToExpect: 'Use AFTER circuit is open and cooldown passed. Probe returns 500 → circuit resets to "open".',
    category: 'circuit-breaker',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'four-failures-no-circuit-trip',
    description: 'Always 500 but send only 4 events. Circuit should NOT open.',
    whatToExpect: 'Send 4 events (all fail). consecutiveFailures=4, threshold=5. Circuit stays closed.',
    category: 'circuit-breaker',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'client-error-no-circuit-impact',
    description: 'Always 400. Circuit should NEVER open.',
    whatToExpect: '4xx errors do NOT affect circuit. consecutiveFailures stays at 0.',
    category: 'circuit-breaker',
    config: { behavior: 'client-error', delayMs: 0, useSequence: false, sequence: [] },
  },
  {
    name: 'retry-timing-verify',
    description: 'Always 500 — verify exact retry timing.',
    whatToExpect: 'Send 1 event. Expect: Attempt 1 → ~60s → Attempt 2 → ~300s → Attempt 3. Total ~6 minutes.',
    category: 'retry',
    config: { behavior: 'server-error', delayMs: 0, useSequence: false, sequence: [] },
  },
]
