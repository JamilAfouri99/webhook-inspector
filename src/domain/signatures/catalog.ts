import type { SignatureSchemeId } from './types'

export type SignatureSchemeMeta = {
  id: SignatureSchemeId
  label: string
  /** Headers this scheme reads on verify / writes on sign. */
  headerNames: string[]
  /** Short hint shown next to the secret input. */
  secretHint: string
  /** Whether the scheme binds a timestamp into the signature. */
  timestamped: boolean
}

/**
 * Metadata for every signature scheme. Pure data with no crypto imports, so it
 * is safe to import from client components (the actual sign/verify logic lives
 * in `schemes.ts`, server-only).
 */
export const SIGNATURE_SCHEME_CATALOG: SignatureSchemeMeta[] = [
  { id: 'stripe', label: 'Stripe', headerNames: ['stripe-signature'], secretHint: 'whsec_… signing secret', timestamped: true },
  { id: 'github', label: 'GitHub', headerNames: ['x-hub-signature-256'], secretHint: 'webhook secret', timestamped: false },
  { id: 'shopify', label: 'Shopify', headerNames: ['x-shopify-hmac-sha256'], secretHint: 'API secret key', timestamped: false },
  { id: 'slack', label: 'Slack', headerNames: ['x-slack-signature', 'x-slack-request-timestamp'], secretHint: 'signing secret', timestamped: true },
  { id: 'svix', label: 'Svix / Standard Webhooks', headerNames: ['webhook-id', 'webhook-timestamp', 'webhook-signature'], secretHint: 'whsec_…', timestamped: true },
  { id: 'hmac-sha256', label: 'Generic HMAC-SHA256', headerNames: ['x-webhook-signature'], secretHint: 'shared secret', timestamped: false },
]
