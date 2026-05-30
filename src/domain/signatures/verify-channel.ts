import * as jwt from 'jsonwebtoken'
import { header } from './crypto'
import { getScheme, hasScheme } from './schemes'
import type { SignatureSchemeId } from './types'

export type ChannelSignatureConfig = {
  /** An HMAC scheme id, when the channel uses provider-style HMAC signing. */
  scheme: SignatureSchemeId | null
  /** The shared secret for `scheme`. */
  secret: string | null
  /** Legacy RS256 JWT public key (PEM); used only when no `scheme` is set. */
  publicKeyPem: string | null
}

export type IncomingVerifyInput = {
  payload: string
  headers: Record<string, string | string[] | undefined>
  now?: number
}

export type IncomingVerifyResult = {
  /** undefined = signature verification was not attempted for this request. */
  valid?: boolean
  error?: string
  /** Decoded JWT claims (RS256 path only). */
  payload?: unknown
}

/**
 * Verify an incoming webhook's signature against a channel's configuration.
 * Precedence: an explicit HMAC `scheme` wins; otherwise the legacy RS256
 * public-key path applies (and stays lenient — unsigned requests are treated
 * as "not checked" rather than invalid, preserving prior behaviour).
 */
export function verifyIncoming(
  config: ChannelSignatureConfig,
  { payload, headers, now }: IncomingVerifyInput,
): IncomingVerifyResult {
  if (config.scheme && config.secret && hasScheme(config.scheme)) {
    const result = getScheme(config.scheme).verify({ payload, headers, secret: config.secret, now })
    return result.valid ? { valid: true } : { valid: false, error: result.reason }
  }

  if (config.publicKeyPem) {
    const token = header(headers, 'x-webhook-signature')
    if (!token) return {}
    try {
      return { valid: true, payload: jwt.verify(token, config.publicKeyPem, { algorithms: ['RS256'] }) }
    } catch (e) {
      return { valid: false, error: (e as Error).message }
    }
  }

  return {}
}

/** The signature-bearing header value to record for display, for the configured scheme. */
export function signatureHeaderFor(
  config: ChannelSignatureConfig,
  headers: Record<string, string | string[] | undefined>,
): string | undefined {
  if (config.scheme && hasScheme(config.scheme)) {
    for (const name of getScheme(config.scheme).headerNames) {
      const value = header(headers, name)
      if (value) return value
    }
    return undefined
  }
  return header(headers, 'x-webhook-signature')
}
