import { describe, it, expect } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import * as jwt from 'jsonwebtoken'
import { getScheme } from '@/domain/signatures'
import { verifyIncoming } from '@/domain/signatures/verify-channel'

const NO_KEY = { scheme: null, secret: null, publicKeyPem: null }

describe('verifyIncoming — no configuration', () => {
  it('reports "not checked" (valid undefined) when nothing is configured', () => {
    const r = verifyIncoming(NO_KEY, { payload: '{}', headers: {} })
    expect(r.valid).toBeUndefined()
  })
})

describe('verifyIncoming — HMAC scheme configured', () => {
  const secret = 'topsecret'
  const payload = '{"event":"x"}'
  const config = { scheme: 'github' as const, secret, publicKeyPem: null }

  it('validates a correctly signed request', () => {
    const headers = getScheme('github').sign({ payload, secret })
    expect(verifyIncoming(config, { payload, headers })).toEqual({ valid: true })
  })

  it('rejects a tampered payload with a reason', () => {
    const headers = getScheme('github').sign({ payload, secret })
    const r = verifyIncoming(config, { payload: '{"event":"y"}', headers })
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('flags a missing signature header as invalid', () => {
    const r = verifyIncoming(config, { payload, headers: {} })
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/missing/i)
  })
})

describe('verifyIncoming — legacy RS256 public key', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })
  const config = { scheme: null, secret: null, publicKeyPem: publicKey }
  const payload = '{"event":"x"}'

  it('validates a real RS256 JWT and returns the decoded payload', () => {
    const token = jwt.sign({ hello: 'world' }, privateKey, { algorithm: 'RS256' })
    const r = verifyIncoming(config, { payload, headers: { 'x-webhook-signature': token } })
    expect(r.valid).toBe(true)
    expect((r.payload as { hello?: string }).hello).toBe('world')
  })

  it('rejects a malformed token', () => {
    const r = verifyIncoming(config, { payload, headers: { 'x-webhook-signature': 'not.a.jwt' } })
    expect(r.valid).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('stays "not checked" when no signature header is present (legacy leniency)', () => {
    const r = verifyIncoming(config, { payload, headers: {} })
    expect(r.valid).toBeUndefined()
  })
})

describe('verifyIncoming — precedence', () => {
  it('prefers an explicit HMAC scheme over a legacy public key', () => {
    const secret = 's'
    const payload = 'body'
    const headers = getScheme('hmac-sha256').sign({ payload, secret })
    const r = verifyIncoming(
      { scheme: 'hmac-sha256', secret, publicKeyPem: 'PEM-that-would-fail' },
      { payload, headers },
    )
    expect(r).toEqual({ valid: true })
  })
})
