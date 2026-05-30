import { hmacBase64, hmacHex, header, nowSeconds, safeEqual } from './crypto'
import { SIGNATURE_SCHEME_CATALOG } from './catalog'
import type { SignInput, SignatureScheme, SignatureSchemeId, VerifyInput, VerifyResult } from './types'

type SchemeImpl = {
  sign: (input: SignInput) => Record<string, string>
  verify: (input: VerifyInput) => VerifyResult
}

const DEFAULT_TOLERANCE_SEC = 300

function withinTolerance(stamp: string | undefined, now: number, tolerance: number): VerifyResult | null {
  if (!stamp) return { valid: false, reason: 'missing timestamp' }
  const ts = Number(stamp)
  if (!Number.isFinite(ts)) return { valid: false, reason: 'invalid timestamp' }
  if (Math.abs(now - ts) > tolerance) return { valid: false, reason: 'timestamp outside tolerance' }
  return null
}

const mismatch: VerifyResult = { valid: false, reason: 'signature mismatch' }

// Stripe: `Stripe-Signature: t=<ts>,v1=<hmacHex(secret, "ts.body")>`
const stripe: SchemeImpl = {
  sign: ({ payload, secret, timestamp }) => {
    const t = timestamp ?? nowSeconds()
    return { 'stripe-signature': `t=${t},v1=${hmacHex(secret, `${t}.${payload}`)}` }
  },
  verify: ({ payload, secret, headers, toleranceSec, now }) => {
    const h = header(headers, 'stripe-signature')
    if (!h) return { valid: false, reason: 'missing stripe-signature header' }

    let t: string | undefined
    const v1: string[] = []
    for (const part of h.split(',')) {
      const i = part.indexOf('=')
      if (i < 0) continue
      const key = part.slice(0, i).trim()
      const value = part.slice(i + 1).trim()
      if (key === 't') t = value
      else if (key === 'v1') v1.push(value)
    }

    const stale = withinTolerance(t, now ?? nowSeconds(), toleranceSec ?? DEFAULT_TOLERANCE_SEC)
    if (stale) return stale

    const expected = hmacHex(secret, `${t}.${payload}`)
    return v1.some((sig) => safeEqual(sig, expected)) ? { valid: true } : mismatch
  },
}

// GitHub: `X-Hub-Signature-256: sha256=<hmacHex(secret, body)>`
const github: SchemeImpl = {
  sign: ({ payload, secret }) => ({ 'x-hub-signature-256': `sha256=${hmacHex(secret, payload)}` }),
  verify: ({ payload, secret, headers }) => {
    const h = header(headers, 'x-hub-signature-256')
    if (!h) return { valid: false, reason: 'missing x-hub-signature-256 header' }
    return safeEqual(h, `sha256=${hmacHex(secret, payload)}`) ? { valid: true } : mismatch
  },
}

// Shopify: `X-Shopify-Hmac-Sha256: <base64(hmac(secret, body))>`
const shopify: SchemeImpl = {
  sign: ({ payload, secret }) => ({ 'x-shopify-hmac-sha256': hmacBase64(secret, payload) }),
  verify: ({ payload, secret, headers }) => {
    const h = header(headers, 'x-shopify-hmac-sha256')
    if (!h) return { valid: false, reason: 'missing x-shopify-hmac-sha256 header' }
    return safeEqual(h, hmacBase64(secret, payload)) ? { valid: true } : mismatch
  },
}

// Slack: `X-Slack-Signature: v0=<hmacHex(secret, "v0:ts:body")>` + `X-Slack-Request-Timestamp`
const slack: SchemeImpl = {
  sign: ({ payload, secret, timestamp }) => {
    const t = timestamp ?? nowSeconds()
    return {
      'x-slack-signature': `v0=${hmacHex(secret, `v0:${t}:${payload}`)}`,
      'x-slack-request-timestamp': String(t),
    }
  },
  verify: ({ payload, secret, headers, toleranceSec, now }) => {
    const sig = header(headers, 'x-slack-signature')
    const t = header(headers, 'x-slack-request-timestamp')
    if (!sig || !t) return { valid: false, reason: 'missing slack headers' }

    const stale = withinTolerance(t, now ?? nowSeconds(), toleranceSec ?? DEFAULT_TOLERANCE_SEC)
    if (stale) return stale

    return safeEqual(sig, `v0=${hmacHex(secret, `v0:${t}:${payload}`)}`) ? { valid: true } : mismatch
  },
}

// Svix / Standard Webhooks: base64(hmac(base64decode(whsec), "id.ts.body")), header `webhook-signature: v1,<sig> …`
const svix: SchemeImpl = {
  sign: ({ payload, secret, timestamp, messageId }) => {
    const t = timestamp ?? nowSeconds()
    const id = messageId ?? 'msg_local'
    return {
      'webhook-id': id,
      'webhook-timestamp': String(t),
      'webhook-signature': `v1,${hmacBase64(svixKey(secret), `${id}.${t}.${payload}`)}`,
    }
  },
  verify: ({ payload, secret, headers, toleranceSec, now }) => {
    const id = header(headers, 'webhook-id')
    const t = header(headers, 'webhook-timestamp')
    const sigHeader = header(headers, 'webhook-signature')
    if (!id || !t || !sigHeader) return { valid: false, reason: 'missing svix headers' }

    const stale = withinTolerance(t, now ?? nowSeconds(), toleranceSec ?? DEFAULT_TOLERANCE_SEC)
    if (stale) return stale

    const expected = hmacBase64(svixKey(secret), `${id}.${t}.${payload}`)
    const candidates = sigHeader.split(' ').map((entry) => {
      const i = entry.indexOf(',')
      return i < 0 ? entry : entry.slice(i + 1)
    })
    return candidates.some((c) => safeEqual(c, expected)) ? { valid: true } : mismatch
  },
}

function svixKey(secret: string): Buffer {
  return Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
}

// Generic: `X-Webhook-Signature: <hmacHex(secret, body)>`
const generic: SchemeImpl = {
  sign: ({ payload, secret }) => ({ 'x-webhook-signature': hmacHex(secret, payload) }),
  verify: ({ payload, secret, headers }) => {
    const h = header(headers, 'x-webhook-signature')
    if (!h) return { valid: false, reason: 'missing x-webhook-signature header' }
    return safeEqual(h, hmacHex(secret, payload)) ? { valid: true } : mismatch
  },
}

const impls: Record<SignatureSchemeId, SchemeImpl> = {
  stripe,
  github,
  shopify,
  slack,
  svix,
  'hmac-sha256': generic,
}

const registry = new Map<SignatureSchemeId, SignatureScheme>(
  SIGNATURE_SCHEME_CATALOG.map((meta) => [
    meta.id,
    { id: meta.id, label: meta.label, headerNames: meta.headerNames, ...impls[meta.id] },
  ]),
)

export function getScheme(id: SignatureSchemeId): SignatureScheme {
  const scheme = registry.get(id)
  if (!scheme) throw new Error(`Unknown signature scheme: ${id}`)
  return scheme
}

export function hasScheme(id: string): id is SignatureSchemeId {
  return registry.has(id as SignatureSchemeId)
}

export function signatureSchemes(): SignatureScheme[] {
  return [...registry.values()]
}

export function signatureSchemeIds(): SignatureSchemeId[] {
  return [...registry.keys()]
}
