import { Prisma } from '@prisma/client'
import type { Webhook as WebhookRow } from '@prisma/client'
import { prisma } from '@/lib/db'
import { emit, dropChannel } from '@/lib/channel-events'
import { getBehavior } from '@/domain/behaviors'
import type { SignatureSchemeId } from '@/domain/signatures'
import type { ChannelSignatureConfig } from '@/domain/signatures/verify-channel'
import type {
  Channel,
  ChannelState,
  ReceivedWebhook,
  ServerBehavior,
  SequenceStep,
  WebhookHeaders,
} from '@/lib/types'

export type {
  Channel,
  ChannelState,
  ReceivedWebhook,
  ServerBehavior,
  SequenceStep,
} from '@/lib/types'

// ============================================================
// Behavior helpers
// ============================================================

export function behaviorToStatusCode(b: ServerBehavior): number {
  return getBehavior(b).defaultStatusCode
}

function isKnownError(e: unknown, code: string): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === code
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
  } catch (e) {
    if (isKnownError(e, 'P2002')) return null // slug already exists
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
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, createdAt: r.createdAt.toISOString() }))
}

export async function deleteChannel(slug: string): Promise<boolean> {
  try {
    await prisma.channel.delete({ where: { slug } })
    dropChannel(slug)
    return true
  } catch (e) {
    if (isKnownError(e, 'P2025')) return false // record not found
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

  const seq = (ch.sequence as SequenceStep[] | null) ?? []
  const useSeq = ch.useSequence

  return {
    behavior: useSeq ? 'sequence' : ch.behavior,
    delayMs: ch.delayMs,
    customStatusCode: ch.customStatusCode,
    sequence: useSeq ? seq : undefined,
    sequencePosition: useSeq && seq.length > 0 ? `${(ch.sequenceIndex % seq.length) + 1}/${seq.length}` : undefined,
    useSequence: useSeq,
    publicKeyPem: ch.publicKeyPem,
    signatureScheme: ch.signatureScheme ?? null,
    activeScenario: ch.activeScenario || 'none',
    forwardUrl: ch.forwardUrl ?? null,
    forwardEnabled: ch.forwardEnabled,
    webhooksReceived: ch._count.webhooks,
    signatureVerification: !!(ch.signatureScheme && ch.signatureSecret) || !!ch.publicKeyPem,
    channel: { slug: ch.slug, name: ch.name },
  }
}

export async function setForwardConfig(slug: string, url: string | null, enabled: boolean): Promise<void> {
  await prisma.channel.update({
    where: { slug },
    data: { forwardUrl: url, forwardEnabled: url ? enabled : false },
  })
  await emitState(slug)
}

// ============================================================
// Webhook receiver hot path
// ============================================================

/**
 * Everything the webhook receiver needs, loaded in a single read (plus one
 * atomic write when a sequence is active). Replaces the former three separate
 * lookups (behavior + public key + forward config) on the hottest path.
 */
export type ReceiverContext = {
  channelId: string
  behavior: ServerBehavior
  delayMs: number
  statusCodeOverride: number
  signature: ChannelSignatureConfig
  forward: { url: string; enabled: boolean } | null
}

export async function resolveReceiver(slug: string): Promise<ReceiverContext | null> {
  const ch = await prisma.channel.findUnique({ where: { slug } })
  if (!ch) return null

  const forward = ch.forwardUrl ? { url: ch.forwardUrl, enabled: ch.forwardEnabled } : null
  const signature: ChannelSignatureConfig = {
    scheme: (ch.signatureScheme as SignatureSchemeId | null) ?? null,
    secret: ch.signatureSecret ?? null,
    publicKeyPem: ch.publicKeyPem,
  }
  const seq = ch.sequence as SequenceStep[] | null

  if (ch.useSequence && Array.isArray(seq) && seq.length > 0) {
    // Claim a unique slot: the post-increment value tells this request which
    // step it owns, so concurrent webhooks never resolve to the same step.
    const updated = await prisma.channel.update({
      where: { id: ch.id },
      data: { sequenceIndex: { increment: 1 } },
      select: { sequenceIndex: true },
    })
    const step = seq[(updated.sequenceIndex - 1) % seq.length]
    return {
      channelId: ch.id,
      behavior: step.behavior,
      delayMs: step.delayMs ?? 0,
      statusCodeOverride: step.statusCode ?? behaviorToStatusCode(step.behavior),
      signature,
      forward,
    }
  }

  const behavior = ch.behavior as ServerBehavior
  return {
    channelId: ch.id,
    behavior,
    delayMs: ch.delayMs,
    statusCodeOverride: ch.customStatusCode ?? behaviorToStatusCode(behavior),
    signature,
    forward,
  }
}

export async function recordWebhook(
  channelId: string,
  slug: string,
  webhook: Omit<ReceivedWebhook, 'id' | 'index'>,
): Promise<ReceivedWebhook> {
  // Atomic counter increment returns the index this webhook owns.
  const { webhookCounter: index } = await prisma.channel.update({
    where: { id: channelId },
    data: { webhookCounter: { increment: 1 } },
    select: { webhookCounter: true },
  })

  const row = await prisma.webhook.create({
    data: {
      channelId,
      index,
      receivedAt: new Date(webhook.receivedAt),
      receivedAtMs: BigInt(webhook.receivedAtMs),
      method: webhook.method,
      path: webhook.path,
      headers: webhook.headers as Prisma.InputJsonValue,
      body: webhook.body === undefined ? Prisma.JsonNull : (webhook.body as Prisma.InputJsonValue),
      signatureHeader: webhook.signatureHeader ?? null,
      signatureValid: webhook.signatureValid ?? null,
      signatureError: webhook.signatureError ?? null,
      signaturePayload:
        webhook.signaturePayload === undefined
          ? Prisma.JsonNull
          : (webhook.signaturePayload as Prisma.InputJsonValue),
      respondedStatusCode: webhook.respondedWith.statusCode,
      respondedBehavior: webhook.respondedWith.behavior,
      respondedDelayMs: webhook.respondedWith.delayMs,
    },
    select: { id: true },
  })

  const entry: ReceivedWebhook = { ...webhook, id: row.id, index }
  emit(slug, 'webhook', entry)
  return entry
}

// ============================================================
// History
// ============================================================

function dbRowToWebhook(r: WebhookRow): ReceivedWebhook {
  return {
    id: r.id,
    index: r.index,
    receivedAt: r.receivedAt.toISOString(),
    receivedAtMs: Number(r.receivedAtMs),
    method: r.method,
    path: r.path,
    headers: (r.headers as WebhookHeaders) ?? {},
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
  opts?: { limit?: number; offset?: number; event?: string },
): Promise<{ total: number; webhooks: ReceivedWebhook[] }> {
  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return { total: 0, webhooks: [] }

  const where: Prisma.WebhookWhereInput = { channelId: ch.id }
  if (opts?.event) where.body = { path: ['event'], equals: opts.event }

  const [total, rows] = await Promise.all([
    prisma.webhook.count({ where }),
    prisma.webhook.findMany({
      where,
      orderBy: { receivedAtMs: 'asc' },
      // No default cap — return all matching webhooks unless a caller explicitly
      // paginates with `limit`.
      take: opts?.limit,
      skip: opts?.offset ?? 0,
    }),
  ])

  return { total, webhooks: rows.map(dbRowToWebhook) }
}

export async function getHistoryEntry(slug: string, id: string): Promise<ReceivedWebhook | null> {
  const row = await prisma.webhook.findFirst({ where: { id, channel: { slug } } })
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
    where: { id: ch.id },
    data: { webhookCounter: 0, sequenceIndex: 0 },
  })

  emit(slug, 'history-cleared', { count })
  await emitState(slug)
  return count
}

// ============================================================
// State mutations
// ============================================================

export async function setBehavior(
  slug: string,
  newBehavior: ServerBehavior,
  newDelayMs?: number,
  newStatusCode?: number,
): Promise<void> {
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
  await emitState(slug)
}

export async function setSequence(slug: string, steps: SequenceStep[], presetName?: string): Promise<void> {
  await prisma.channel.update({
    where: { slug },
    data: {
      useSequence: true,
      sequence: steps as unknown as Prisma.InputJsonValue,
      sequenceIndex: 0,
      activeScenario: presetName ?? 'manual:sequence',
    },
  })
  await emitState(slug)
}

export async function setPublicKeyForChannel(slug: string, key: string): Promise<void> {
  await prisma.channel.update({ where: { slug }, data: { publicKeyPem: key } })
  await emitState(slug)
}

export async function setSignatureScheme(
  slug: string,
  scheme: SignatureSchemeId | null,
  secret: string | null,
): Promise<void> {
  await prisma.channel.update({
    where: { slug },
    data: { signatureScheme: scheme, signatureSecret: secret },
  })
  await emitState(slug)
}

export async function resetAll(slug: string): Promise<void> {
  const ch = await prisma.channel.findUnique({ where: { slug }, select: { id: true } })
  if (!ch) return

  await prisma.channel.update({
    where: { id: ch.id },
    data: {
      behavior: 'success',
      delayMs: 0,
      customStatusCode: 200,
      useSequence: false,
      sequence: [],
      sequenceIndex: 0,
      publicKeyPem: null,
      signatureScheme: null,
      signatureSecret: null,
      activeScenario: 'none',
      webhookCounter: 0,
    },
  })
  await prisma.webhook.deleteMany({ where: { channelId: ch.id } })

  emit(slug, 'reset', null)
  await emitState(slug)
}

/** Re-read state and broadcast it; used after every mutation. */
async function emitState(slug: string): Promise<void> {
  const state = await getState(slug)
  if (state) emit(slug, 'state-change', state)
}
