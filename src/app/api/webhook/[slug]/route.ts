import { NextRequest, NextResponse } from 'next/server'
import { resolveReceiver, recordWebhook, type ReceiverContext } from '@/lib/webhook-state'
import { buildForwardHeaders } from '@/lib/forwarding'
import { verifyIncoming, signatureHeaderFor } from '@/domain/signatures/verify-channel'
import { getBehavior } from '@/domain/behaviors'
import type { ResponseResult } from '@/domain/behavior'
import type { WebhookHeaders } from '@/lib/types'

export const maxDuration = 60

function fireForward(
  forward: ReceiverContext['forward'],
  slug: string,
  headers: WebhookHeaders,
  body: unknown,
) {
  if (!forward || !forward.enabled) return

  const forwardHeaders = buildForwardHeaders(headers, { 'X-Webhook-Tester-Forwarded': slug })

  // Fire-and-forget: forwarding failures must not affect the original response,
  // but they are logged so misconfiguration is observable.
  fetch(forward.url, {
    method: 'POST',
    headers: forwardHeaders,
    body: body == null ? undefined : JSON.stringify(body),
    redirect: 'manual',
  }).catch((e) => {
    console.error(`[forward] channel="${slug}" url="${forward.url}" failed:`, e)
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const ctx = await resolveReceiver(slug)
  if (!ctx) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  // Read the raw body: signature verification must run against the exact bytes
  // sent, not a re-serialized parse.
  const raw = await request.text().catch(() => '')
  let body: unknown = null
  try {
    body = raw ? JSON.parse(raw) : null
  } catch {
    body = null
  }

  const headers: WebhookHeaders = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })

  const signature = verifyIncoming(ctx.signature, { payload: raw, headers })
  const signatureHeader = signatureHeaderFor(ctx.signature, headers)

  const spec = getBehavior(ctx.behavior).respond({
    requestBody: body,
    delayMs: ctx.delayMs,
    statusCodeOverride: ctx.statusCodeOverride,
  })

  await recordWebhook(ctx.channelId, slug, {
    receivedAt: new Date().toISOString(),
    receivedAtMs: Date.now(),
    method: 'POST',
    path: request.nextUrl.pathname,
    headers,
    body,
    signatureHeader: signatureHeader || undefined,
    signatureValid: signature.valid,
    signatureError: signature.error,
    signaturePayload: signature.payload,
    // Record what is actually sent, not the configured override — for behaviors
    // like `timeout` these differ (sends 504, override is 0).
    respondedWith: {
      statusCode: spec.result.status,
      behavior: ctx.behavior,
      delayMs: spec.delayMs,
    },
  })

  fireForward(ctx.forward, slug, headers, body)

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
