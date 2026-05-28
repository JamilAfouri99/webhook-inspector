import { prisma } from './db'
import { getBehavior, type BehaviorName } from '@/domain/behaviors'

// ============================================================
// Types
// ============================================================

export type ServerBehavior = BehaviorName

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
  forwardUrl: string | null
  forwardEnabled: boolean
  webhooksReceived: number
  signatureVerification: boolean
  channel: { slug: string; name: string }
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

const startedAt = Date.now()

export function behaviorToStatusCode(b: ServerBehavior): number {
  return getBehavior(b).defaultStatusCode
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
    forwardUrl: ch.forwardUrl ?? null,
    forwardEnabled: ch.forwardEnabled,
    webhooksReceived: ch._count.webhooks,
    signatureVerification: !!ch.publicKeyPem,
    channel: { slug: ch.slug, name: ch.name },
  }
}

export async function getForwardConfig(slug: string): Promise<{ url: string; enabled: boolean } | null> {
  const ch = await prisma.channel.findUnique({
    where: { slug },
    select: { forwardUrl: true, forwardEnabled: true },
  })
  if (!ch || !ch.forwardUrl) return null
  return { url: ch.forwardUrl, enabled: ch.forwardEnabled }
}

export async function setForwardConfig(slug: string, url: string | null, enabled: boolean) {
  await prisma.channel.update({
    where: { slug },
    data: { forwardUrl: url, forwardEnabled: url ? enabled : false },
  })
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
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

export async function setSequence(slug: string, steps: SequenceStep[], presetName?: string) {
  await prisma.channel.update({
    where: { slug },
    data: {
      useSequence: true,
      sequence: steps as any,
      sequenceIndex: 0,
      activeScenario: presetName ?? 'manual:sequence',
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
