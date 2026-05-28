import { describe, it, expect } from 'vitest'
import { behaviorNames, getBehavior, hasBehavior } from '../behaviors'
import type { BehaviorName, RespondCtx } from '../behavior'

function ctx(over: Partial<RespondCtx> = {}): RespondCtx {
  return {
    requestBody: { eventId: 'evt_test' },
    delayMs: 0,
    statusCodeOverride: 0,
    ...over,
  }
}

describe('behavior registry', () => {
  it('exposes all 14 behaviors', () => {
    expect(behaviorNames()).toHaveLength(14)
  })

  it.each<BehaviorName>([
    'success', 'server-error', 'timeout', 'slow',
    'client-error', 'unauthorized', 'not-found', 'rate-limited',
    'redirect', 'large-response', 'large-body',
    'empty-response', 'non-json-response', 'custom',
  ])('resolves %s by name', (name) => {
    expect(getBehavior(name).name).toBe(name)
  })

  it('throws on unknown behavior', () => {
    expect(() => getBehavior('nope' as BehaviorName)).toThrow(/Unknown behavior/)
  })

  it('hasBehavior is a type guard for valid names', () => {
    expect(hasBehavior('success')).toBe(true)
    expect(hasBehavior('totally-fake')).toBe(false)
  })
})

describe('respond() — default status codes match historical behaviorToStatusCode map', () => {
  const cases: Array<[BehaviorName, number]> = [
    ['success', 200], ['server-error', 500], ['timeout', 0], ['slow', 200],
    ['client-error', 400], ['unauthorized', 401], ['not-found', 404], ['rate-limited', 429],
    ['redirect', 302], ['large-response', 200], ['large-body', 200],
    ['empty-response', 200], ['non-json-response', 200], ['custom', 200],
  ]
  it.each(cases)('%s has defaultStatusCode %i', (name, code) => {
    expect(getBehavior(name).defaultStatusCode).toBe(code)
  })
})

describe('respond() — response specs', () => {
  it('success echoes eventId in a 200 JSON body', () => {
    const spec = getBehavior('success').respond(ctx())
    expect(spec).toEqual({
      delayMs: 0,
      result: { kind: 'json', status: 200, body: { received: true, eventId: 'evt_test' } },
    })
  })

  it('success handles null/undefined eventId', () => {
    const spec = getBehavior('success').respond(ctx({ requestBody: null }))
    expect(spec.result).toEqual({ kind: 'json', status: 200, body: { received: true, eventId: undefined } })
  })

  it('server-error returns 500 with error body', () => {
    expect(getBehavior('server-error').respond(ctx()).result).toEqual({
      kind: 'json', status: 500, body: { error: 'Internal Server Error' },
    })
  })

  it('timeout returns empty 504 with default 35s delay when delayMs is 0', () => {
    const spec = getBehavior('timeout').respond(ctx({ delayMs: 0 }))
    expect(spec).toEqual({ delayMs: 35_000, result: { kind: 'empty', status: 504 } })
  })

  it('timeout honors a positive delayMs from context', () => {
    const spec = getBehavior('timeout').respond(ctx({ delayMs: 12_000 }))
    expect(spec.delayMs).toBe(12_000)
  })

  it('slow echoes eventId and marks delayed=true', () => {
    expect(getBehavior('slow').respond(ctx({ delayMs: 5000 })).result).toEqual({
      kind: 'json', status: 200, body: { received: true, delayed: true, eventId: 'evt_test' },
    })
  })

  it('client-error returns 400 with Bad Request body', () => {
    expect(getBehavior('client-error').respond(ctx()).result).toEqual({
      kind: 'json', status: 400, body: { error: 'Bad Request' },
    })
  })

  it('unauthorized returns 401', () => {
    expect(getBehavior('unauthorized').respond(ctx()).result).toMatchObject({ status: 401 })
  })

  it('not-found returns 404', () => {
    expect(getBehavior('not-found').respond(ctx()).result).toMatchObject({ status: 404 })
  })

  it('rate-limited returns 429 with retryAfter:60', () => {
    expect(getBehavior('rate-limited').respond(ctx()).result).toEqual({
      kind: 'json', status: 429, body: { error: 'Too Many Requests', retryAfter: 60 },
    })
  })

  it('redirect returns 302 to example.com', () => {
    expect(getBehavior('redirect').respond(ctx()).result).toEqual({
      kind: 'redirect', status: 302, to: 'https://example.com/redirected',
    })
  })

  it('large-response returns a 1.5MB body', () => {
    const spec = getBehavior('large-response').respond(ctx())
    const body = (spec.result as { body: { data: string } }).body
    expect(body.data.length).toBe(1.5 * 1024 * 1024)
  })

  it('large-body returns a 10KB blob and echoes eventId', () => {
    const spec = getBehavior('large-body').respond(ctx())
    const body = (spec.result as { body: { data: string; eventId: string } }).body
    expect(body.data.length).toBe(10_000)
    expect(body.eventId).toBe('evt_test')
  })

  it('empty-response returns empty 200', () => {
    expect(getBehavior('empty-response').respond(ctx()).result).toEqual({ kind: 'empty', status: 200 })
  })

  it('non-json-response returns text/plain', () => {
    expect(getBehavior('non-json-response').respond(ctx()).result).toEqual({
      kind: 'text', status: 200, body: 'OK - not json', contentType: 'text/plain',
    })
  })

  it('custom honors statusCodeOverride', () => {
    expect(getBehavior('custom').respond(ctx({ statusCodeOverride: 418 })).result).toEqual({
      kind: 'json', status: 418, body: { status: 418 },
    })
  })

  it('custom falls back to 200 when no override is given', () => {
    expect(getBehavior('custom').respond(ctx({ statusCodeOverride: 0 })).result).toMatchObject({ status: 200 })
  })
})

describe('respond() — passes delayMs through for non-timeout behaviors', () => {
  it.each<BehaviorName>([
    'success', 'server-error', 'slow',
    'client-error', 'unauthorized', 'not-found', 'rate-limited',
    'redirect', 'large-response', 'large-body',
    'empty-response', 'non-json-response', 'custom',
  ])('%s passes delayMs through unchanged', (name) => {
    const spec = getBehavior(name).respond(ctx({ delayMs: 1234 }))
    expect(spec.delayMs).toBe(1234)
  })
})
