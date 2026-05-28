import { NextRequest, NextResponse } from 'next/server'
import { getHistoryEntry, getChannel } from '@/lib/webhook-state'

export const maxDuration = 60

const HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'keep-alive',
  'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer',
])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  const { slug, id } = await params

  const channel = await getChannel(slug)
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  const recorded = await getHistoryEntry(slug, id)
  if (!recorded) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
  }

  let targetUrl: string | undefined
  try {
    const body = await request.json()
    if (body && typeof body.targetUrl === 'string') {
      targetUrl = body.targetUrl
    }
  } catch {
    // body is optional
  }

  const destination = targetUrl ?? `${request.nextUrl.origin}/api/webhook/${slug}`

  const forwardHeaders: Record<string, string> = {}
  for (const [key, value] of Object.entries(recorded.headers)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue
    if (Array.isArray(value)) {
      forwardHeaders[key] = value.join(', ')
    } else if (typeof value === 'string') {
      forwardHeaders[key] = value
    }
  }
  if (!forwardHeaders['content-type']) {
    forwardHeaders['content-type'] = 'application/json'
  }

  const payload = recorded.body == null ? undefined : JSON.stringify(recorded.body)

  const startMs = Date.now()
  let status = 0
  let responseBody: unknown = null
  let error: string | undefined

  try {
    const res = await fetch(destination, {
      method: recorded.method || 'POST',
      headers: forwardHeaders,
      body: payload,
      redirect: 'manual',
    })
    status = res.status
    const text = await res.text()
    try {
      responseBody = text ? JSON.parse(text) : null
    } catch {
      responseBody = text
    }
  } catch (e) {
    error = (e as Error).message
  }

  const responseTimeMs = Date.now() - startMs

  return NextResponse.json({
    replayedTo: destination,
    status,
    responseBody,
    responseTimeMs,
    error,
  })
}
