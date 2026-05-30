export type SignatureSchemeId = 'stripe' | 'github' | 'shopify' | 'slack' | 'svix' | 'hmac-sha256'

export type SignInput = {
  /** The raw request body, exactly as transmitted. */
  payload: string
  secret: string
  /** Unix seconds; used by schemes that bind a timestamp into the signature. */
  timestamp?: number
  /** Message id; used by the Svix / Standard Webhooks scheme. */
  messageId?: string
}

export type VerifyInput = {
  payload: string
  headers: Record<string, string | string[] | undefined>
  secret: string
  /** Allowed clock skew in seconds for timestamped schemes (default 300). */
  toleranceSec?: number
  /** Injectable clock (Unix seconds) — defaults to the wall clock. */
  now?: number
}

export type VerifyResult = { valid: boolean; reason?: string }

/**
 * A provider's webhook signature dialect: how to produce its signature headers
 * (`sign`) and how to validate an incoming request against them (`verify`).
 * One implementation per provider, registered in a registry — the same
 * Strategy + Registry shape as the behavior engine.
 */
export interface SignatureScheme {
  id: SignatureSchemeId
  label: string
  /** Headers this scheme reads on verify / writes on sign (for the UI). */
  headerNames: string[]
  sign(input: SignInput): Record<string, string>
  verify(input: VerifyInput): VerifyResult
}
