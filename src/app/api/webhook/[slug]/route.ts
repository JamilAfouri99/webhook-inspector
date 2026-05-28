import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import {
  resolveCurrentBehavior,
  recordWebhook,
  getPublicKey,
  getChannel,
  getForwardConfig,
} from '@/lib/webhook-state'
import { getBehavior } from '@/domain/behaviors'
import type { ResponseResult } from '@/domain/behavior'

const FORWARD_HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'keep-alive',
  'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer',
])

function fireForward(slug: string, headers: Record<string, string | string[] | undefined>, body: unknown) {
  getForwardConfig(slug)
    .then(async (cfg) => {
      if (!cfg || !cfg.enabled) return
      const forwardHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(headers)) {
        if (FORWARD_HOP_BY_HOP.has(key.toLowerCase())) continue
        if (Array.isArray(value)) forwardHeaders[key] = value.join(', ')
        else if (typeof value === 'string') forwardHeaders[key] = value
      }
      forwardHeaders['X-Webhook-Tester-Forwarded'] = slug
      if (!forwardHeaders['content-type']) forwardHeaders['content-type'] = 'application/json'
      try {
        await fetch(cfg.url, {
          method: 'POST',
          headers: forwardHeaders,
          body: body == null ? undefined : JSON.stringify(body),
          redirect: 'manual',
        })
      } catch {
        // forwarding is fire-and-forget; failures don't affect the original response
      }
    })
    .catch(() => {})
}

export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const channel = await getChannel(slug)
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const resolved = await resolveCurrentBehavior(slug)
  if (!resolved) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  let body: unknown = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  const headers: Record<string, string | string[] | undefined> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  let signatureValid: boolean | undefined
  let signatureError: string | undefined
  let signaturePayload: unknown
  const sigHeader = request.headers.get('x-webhook-signature')
  const publicKey = await getPublicKey(slug)

  if (publicKey && sigHeader) {
    try {
      signaturePayload = jwt.verify(sigHeader, publicKey, { algorithms: ['RS256'] })
      signatureValid = true
    } catch (e) {
      signatureValid = false
      signatureError = (e as Error).message
    }
  }

  const behavior = getBehavior(resolved.b)
  const spec = behavior.respond({
    requestBody: body,
    delayMs: resolved.delay,
    statusCodeOverride: resolved.status,
  })

  await recordWebhook(slug, {
    receivedAt: new Date().toISOString(),
    receivedAtMs: Date.now(),
    method: 'POST',
    path: request.nextUrl.pathname,
    headers,
    body,
    signatureHeader: sigHeader || undefined,
    signatureValid,
    signatureError,
    signaturePayload,
    respondedWith: {
      statusCode: resolved.status,
      behavior: resolved.b,
      delayMs: resolved.delay,
    },
  })

  fireForward(slug, headers, body)

  if (spec.delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, spec.delayMs))
  }

  return buildResponse(spec.result)
}

function buildResponse(result: ResponseResult): NextResponse {
  switch (result.kind) {
    case 'json':
      return NextResponse.json(result.body, { status: result.status })
    case 'text':
      return new NextResponse(result.body, {
        status: result.status,
        headers: { 'Content-Type': result.contentType },
      })
    case 'redirect':
      return NextResponse.redirect(result.to, result.status)
    case 'empty':
      return new NextResponse(null, { status: result.status })
  }
}
