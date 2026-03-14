import { NextRequest, NextResponse } from 'next/server'
import * as jwt from 'jsonwebtoken'
import {
  resolveCurrentBehavior,
  recordWebhook,
  getPublicKey,
  getLargeResponseData,
  getChannel,
  behaviorToStatusCode,
} from '@/lib/webhook-state'
import type { ServerBehavior } from '@/lib/webhook-state'

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
  const { b, delay, status } = resolved

  let body: any = null
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
  let signaturePayload: any
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

  const statusCode = b === 'timeout' ? 0 : status

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
      statusCode,
      behavior: b,
      delayMs: delay,
    },
  })

  // Handle delay (for slow responses)
  if (delay > 0 && b !== 'timeout') {
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  // Timeout — hang until caller's timeout kicks in
  if (b === 'timeout') {
    const timeoutDelay = delay || 35000
    await new Promise(resolve => setTimeout(resolve, timeoutDelay))
    return new NextResponse(null, { status: 504 })
  }

  // Special response behaviors
  switch (b) {
    case 'redirect':
      return NextResponse.redirect('https://example.com/redirected', 302)

    case 'large-response':
      return NextResponse.json(
        { received: true, data: getLargeResponseData() },
        { status: 200 }
      )

    case 'large-body': {
      const bigBody = 'a'.repeat(10000)
      return NextResponse.json(
        { received: true, data: bigBody, eventId: body?.eventId },
        { status: 200 }
      )
    }

    case 'empty-response':
      return new NextResponse(null, { status: 200 })

    case 'non-json-response':
      return new NextResponse('OK - not json', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
  }

  // Standard JSON responses
  const bodies: Record<string, any> = {
    'success': { received: true, eventId: body?.eventId },
    'server-error': { error: 'Internal Server Error' },
    'slow': { received: true, delayed: true, eventId: body?.eventId },
    'client-error': { error: 'Bad Request' },
    'unauthorized': { error: 'Unauthorized' },
    'not-found': { error: 'Not Found' },
    'rate-limited': { error: 'Too Many Requests', retryAfter: 60 },
    'custom': { status: status },
  }

  return NextResponse.json(bodies[b] || { received: true }, { status: statusCode || 200 })
}
