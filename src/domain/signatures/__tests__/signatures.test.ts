import { describe, it, expect } from 'vitest'
import { getScheme, hasScheme, signatureSchemeIds, signatureSchemes } from '@/domain/signatures'
import type { SignatureSchemeId } from '@/domain/signatures'

const T = 1614265330

describe('signature scheme registry', () => {
  it('registers the known schemes', () => {
    expect(signatureSchemeIds().slice().sort()).toEqual(
      ['github', 'hmac-sha256', 'shopify', 'slack', 'stripe', 'svix'],
    )
  })

  it('looks up a scheme by id', () => {
    expect(getScheme('stripe').id).toBe('stripe')
  })

  it('throws on an unknown scheme', () => {
    expect(() => getScheme('nope' as SignatureSchemeId)).toThrow()
  })

  it('guards membership with hasScheme', () => {
    expect(hasScheme('github')).toBe(true)
    expect(hasScheme('nope')).toBe(false)
  })

  it('every scheme advertises a label and the headers it uses', () => {
    for (const s of signatureSchemes()) {
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.headerNames.length).toBeGreaterThan(0)
    }
  })
})

describe('github scheme — documented vector', () => {
  const scheme = getScheme('github')
  const secret = "It's a Secret to Everybody"
  const payload = 'Hello, World!'
  const sig = 'sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17'

  it('signs to the value GitHub documents', () => {
    expect(scheme.sign({ payload, secret })).toEqual({ 'x-hub-signature-256': sig })
  })

  it('verifies a correct signature', () => {
    expect(scheme.verify({ payload, secret, headers: { 'x-hub-signature-256': sig } })).toEqual({ valid: true })
  })

  it('rejects a tampered payload', () => {
    expect(scheme.verify({ payload: 'Hello, World', secret, headers: { 'x-hub-signature-256': sig } }).valid).toBe(false)
  })

  it('rejects a wrong secret', () => {
    expect(scheme.verify({ payload, secret: 'nope', headers: { 'x-hub-signature-256': sig } }).valid).toBe(false)
  })

  it('rejects a missing signature header', () => {
    expect(scheme.verify({ payload, secret, headers: {} }).valid).toBe(false)
  })
})

describe('svix / standard-webhooks scheme — documented vector', () => {
  const scheme = getScheme('svix')
  const secret = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'
  const messageId = 'msg_p5jXN8AQM9LWM0D4loKWxJek'
  const payload = '{"test": 2432232314}'
  const headers = {
    'webhook-id': messageId,
    'webhook-timestamp': String(T),
    'webhook-signature': 'v1,g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=',
  }

  it('verifies the documented vector', () => {
    expect(scheme.verify({ payload, secret, headers, now: T, toleranceSec: 300 })).toEqual({ valid: true })
  })

  it('round-trips sign → verify', () => {
    const signed = scheme.sign({ payload, secret, timestamp: T, messageId })
    expect(scheme.verify({ payload, secret, headers: signed, now: T, toleranceSec: 300 }).valid).toBe(true)
  })

  it('accepts a signature among space-separated candidates', () => {
    const headersMulti = { ...headers, 'webhook-signature': `v1,invalidsig ${headers['webhook-signature']}` }
    expect(scheme.verify({ payload, secret, headers: headersMulti, now: T, toleranceSec: 300 }).valid).toBe(true)
  })

  it('rejects a tampered payload', () => {
    expect(scheme.verify({ payload: payload + ' ', secret, headers, now: T, toleranceSec: 300 }).valid).toBe(false)
  })
})

describe('stripe scheme', () => {
  const scheme = getScheme('stripe')
  const secret = 'whsec_stripe_test'
  const payload = '{"id":"evt_1","type":"charge.succeeded"}'

  it('produces a t=,v1= header and verifies within tolerance', () => {
    const signed = scheme.sign({ payload, secret, timestamp: T })
    expect(signed['stripe-signature']).toMatch(/^t=1614265330,v1=[a-f0-9]{64}$/)
    expect(scheme.verify({ payload, secret, headers: signed, now: T + 10, toleranceSec: 300 })).toEqual({ valid: true })
  })

  it('rejects a timestamp outside the tolerance window', () => {
    const signed = scheme.sign({ payload, secret, timestamp: T })
    const r = scheme.verify({ payload, secret, headers: signed, now: T + 1000, toleranceSec: 300 })
    expect(r.valid).toBe(false)
    expect(r.reason).toMatch(/timestamp|tolerance/i)
  })

  it('rejects a tampered payload', () => {
    const signed = scheme.sign({ payload, secret, timestamp: T })
    expect(scheme.verify({ payload: '{}', secret, headers: signed, now: T, toleranceSec: 300 }).valid).toBe(false)
  })
})

describe('slack scheme', () => {
  const scheme = getScheme('slack')
  const secret = 'slack_signing_secret'
  const payload = 'token=abc&team_id=T123'

  it('signs a v0 header with a timestamp and verifies', () => {
    const signed = scheme.sign({ payload, secret, timestamp: T })
    expect(signed['x-slack-signature']).toMatch(/^v0=[a-f0-9]{64}$/)
    expect(signed['x-slack-request-timestamp']).toBe(String(T))
    expect(scheme.verify({ payload, secret, headers: signed, now: T, toleranceSec: 300 }).valid).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const signed = scheme.sign({ payload, secret, timestamp: T })
    expect(scheme.verify({ payload: 'token=x', secret, headers: signed, now: T, toleranceSec: 300 }).valid).toBe(false)
  })
})

describe('shopify scheme', () => {
  const scheme = getScheme('shopify')
  const secret = 'shopify_secret'
  const payload = '{"order_id":123}'

  it('signs a base64 hmac and verifies', () => {
    const signed = scheme.sign({ payload, secret })
    expect(signed['x-shopify-hmac-sha256']).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(scheme.verify({ payload, secret, headers: signed }).valid).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const signed = scheme.sign({ payload, secret })
    expect(scheme.verify({ payload: '{}', secret, headers: signed }).valid).toBe(false)
  })
})

describe('generic hmac-sha256 scheme', () => {
  const scheme = getScheme('hmac-sha256')
  const secret = 'key'
  const payload = 'body'

  it('signs a hex hmac and verifies', () => {
    const signed = scheme.sign({ payload, secret })
    expect(signed['x-webhook-signature']).toMatch(/^[a-f0-9]{64}$/)
    expect(scheme.verify({ payload, secret, headers: signed }).valid).toBe(true)
  })

  it('rejects a tampered payload', () => {
    const signed = scheme.sign({ payload, secret })
    expect(scheme.verify({ payload: 'other', secret, headers: signed }).valid).toBe(false)
  })
})
