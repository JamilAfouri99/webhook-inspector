import type { BehaviorName } from '@/domain/behaviors'

export type ServerBehavior = BehaviorName

export type SequenceStep = {
  behavior: ServerBehavior
  delayMs?: number
  statusCode?: number
}

export type WebhookHeaders = Record<string, string | string[] | undefined>

export type ReceivedWebhook = {
  id: string
  index: number
  receivedAt: string
  receivedAtMs: number
  method: string
  path: string
  headers: WebhookHeaders
  body: unknown
  signatureHeader?: string
  signatureValid?: boolean
  signatureError?: string
  signaturePayload?: unknown
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
  signatureScheme: string | null
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
