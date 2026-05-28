import type { Behavior, BehaviorName, RespondCtx, ResponseSpec } from './behavior'

const LARGE_RESPONSE_BYTES = 1.5 * 1024 * 1024
const LARGE_BODY_BYTES = 10_000
const DEFAULT_TIMEOUT_MS = 35_000

const largeResponseBlob = 'x'.repeat(LARGE_RESPONSE_BYTES)
const largeBodyBlob = 'a'.repeat(LARGE_BODY_BYTES)

function eventIdOf(body: unknown): unknown {
  if (body && typeof body === 'object' && 'eventId' in body) {
    return (body as Record<string, unknown>).eventId
  }
  return undefined
}

const success: Behavior = {
  name: 'success',
  defaultStatusCode: 200,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 200, body: { received: true, eventId: eventIdOf(ctx.requestBody) } },
  }),
}

const serverError: Behavior = {
  name: 'server-error',
  defaultStatusCode: 500,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 500, body: { error: 'Internal Server Error' } },
  }),
}

const timeout: Behavior = {
  name: 'timeout',
  defaultStatusCode: 0,
  respond: (ctx) => ({
    delayMs: ctx.delayMs || DEFAULT_TIMEOUT_MS,
    result: { kind: 'empty', status: 504 },
  }),
}

const slow: Behavior = {
  name: 'slow',
  defaultStatusCode: 200,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 200, body: { received: true, delayed: true, eventId: eventIdOf(ctx.requestBody) } },
  }),
}

const clientError: Behavior = {
  name: 'client-error',
  defaultStatusCode: 400,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 400, body: { error: 'Bad Request' } },
  }),
}

const unauthorized: Behavior = {
  name: 'unauthorized',
  defaultStatusCode: 401,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 401, body: { error: 'Unauthorized' } },
  }),
}

const notFound: Behavior = {
  name: 'not-found',
  defaultStatusCode: 404,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 404, body: { error: 'Not Found' } },
  }),
}

const rateLimited: Behavior = {
  name: 'rate-limited',
  defaultStatusCode: 429,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 429, body: { error: 'Too Many Requests', retryAfter: 60 } },
  }),
}

const redirect: Behavior = {
  name: 'redirect',
  defaultStatusCode: 302,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'redirect', status: 302, to: 'https://example.com/redirected' },
  }),
}

const largeResponse: Behavior = {
  name: 'large-response',
  defaultStatusCode: 200,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 200, body: { received: true, data: largeResponseBlob } },
  }),
}

const largeBody: Behavior = {
  name: 'large-body',
  defaultStatusCode: 200,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'json', status: 200, body: { received: true, data: largeBodyBlob, eventId: eventIdOf(ctx.requestBody) } },
  }),
}

const emptyResponse: Behavior = {
  name: 'empty-response',
  defaultStatusCode: 200,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'empty', status: 200 },
  }),
}

const nonJsonResponse: Behavior = {
  name: 'non-json-response',
  defaultStatusCode: 200,
  respond: (ctx) => ({
    delayMs: ctx.delayMs,
    result: { kind: 'text', status: 200, body: 'OK - not json', contentType: 'text/plain' },
  }),
}

const custom: Behavior = {
  name: 'custom',
  defaultStatusCode: 200,
  respond: (ctx) => {
    const status = ctx.statusCodeOverride || 200
    return {
      delayMs: ctx.delayMs,
      result: { kind: 'json', status, body: { status } },
    }
  },
}

const allBehaviors: Behavior[] = [
  success,
  serverError,
  timeout,
  slow,
  clientError,
  unauthorized,
  notFound,
  rateLimited,
  redirect,
  largeResponse,
  largeBody,
  emptyResponse,
  nonJsonResponse,
  custom,
]

const registry = new Map<BehaviorName, Behavior>(allBehaviors.map((b) => [b.name, b]))

export function getBehavior(name: BehaviorName): Behavior {
  const b = registry.get(name)
  if (!b) throw new Error(`Unknown behavior: ${name}`)
  return b
}

export function behaviorNames(): BehaviorName[] {
  return [...registry.keys()]
}

export function hasBehavior(name: string): name is BehaviorName {
  return registry.has(name as BehaviorName)
}

export type { Behavior, BehaviorName, RespondCtx, ResponseSpec }
