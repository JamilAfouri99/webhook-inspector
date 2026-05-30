import { NextRequest, NextResponse } from 'next/server'
import { getChannel } from '@/lib/webhook-state'
import type { Channel } from '@/lib/types'

/**
 * Thrown anywhere inside a `route()` handler to short-circuit with a JSON error
 * envelope. Centralises the 4xx/5xx response shape so every endpoint is
 * consistent and handlers can read top-to-bottom without `if (!x) return …`.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra?: Record<string, unknown>,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export function jsonError(message: string, status: number, extra?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status })
}

type RouteContext<P> = { params: Promise<P> }
type RouteHandler<P> = (request: NextRequest, params: P) => Promise<Response> | Response

/**
 * Wraps a route handler: resolves dynamic `params`, maps `HttpError` to a JSON
 * envelope, and converts any unexpected throw into a logged 500. Deleting this
 * wrapper would re-spread try/catch + error-shaping across every endpoint.
 */
export function route<P = Record<string, never>>(handler: RouteHandler<P>) {
  return async (request: NextRequest, context: RouteContext<P>): Promise<Response> => {
    try {
      const params = await context.params
      return await handler(request, params)
    } catch (e) {
      if (e instanceof HttpError) return jsonError(e.message, e.status, e.extra)
      console.error('[api] unhandled error:', e)
      return jsonError('Internal server error', 500)
    }
  }
}

/** Load a channel by slug or abort the request with a 404. */
export async function requireChannel(slug: string): Promise<Channel> {
  const channel = await getChannel(slug)
  if (!channel) throw new HttpError(404, 'Channel not found')
  return channel
}

/** Parse a JSON request body or abort with a 400. */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new HttpError(400, 'Invalid JSON body')
  }
}

/** Parse a JSON request body, or `undefined` when the body is absent/invalid. */
export async function readJsonBodyOptional(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return undefined
  }
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null) return fallback
  const n = Number(raw)
  if (!Number.isInteger(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

/**
 * Read and validate `limit`/`offset` query params. Malformed values fall back
 * to defaults rather than producing NaN skip/take that Prisma would reject.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  opts?: { defaultLimit?: number; maxLimit?: number },
): { limit: number; offset: number } {
  const maxLimit = opts?.maxLimit ?? 1000
  const defaultLimit = Math.min(opts?.defaultLimit ?? maxLimit, maxLimit)
  return {
    limit: clampInt(searchParams.get('limit'), defaultLimit, 1, maxLimit),
    offset: clampInt(searchParams.get('offset'), 0, 0, Number.MAX_SAFE_INTEGER),
  }
}
