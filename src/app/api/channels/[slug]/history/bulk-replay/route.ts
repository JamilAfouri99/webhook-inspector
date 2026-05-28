import { NextRequest, NextResponse } from 'next/server'
import { getChannel, getHistoryEntry } from '@/lib/webhook-state'

export const maxDuration = 120

const HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'keep-alive',
  'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer',
])

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  let body: { ids?: unknown; targetUrl?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const ids = body.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: 'Cannot replay more than 100 webhooks at once' }, { status: 400 })
  }

  const targetUrl = typeof body.targetUrl === 'string' && body.targetUrl.length > 0
    ? body.targetUrl
    : `${request.nextUrl.origin}/api/webhook/${slug}`

  const results = await Promise.all(ids.map(async (id) => {
    if (typeof id !== 'string') return { id: String(id), ok: false, error: 'invalid id' }
    const recorded = await getHistoryEntry(slug, id)
    if (!recorded) return { id, ok: false, error: 'not found' }

    const forwardHeaders: Record<string, string> = {}
    for (const [key, value] of Object.entries(recorded.headers)) {
      if (HOP_BY_HOP.has(key.toLowerCase())) continue
      if (Array.isArray(value)) forwardHeaders[key] = value.join(', ')
      else if (typeof value === 'string') forwardHeaders[key] = value
    }
    if (!forwardHeaders['content-type']) forwardHeaders['content-type'] = 'application/json'

    const startMs = Date.now()
    try {
      const res = await fetch(targetUrl, {
        method: recorded.method || 'POST',
        headers: forwardHeaders,
        body: recorded.body == null ? undefined : JSON.stringify(recorded.body),
        redirect: 'manual',
      })
      return { id, ok: res.status >= 200 && res.status < 300, status: res.status, durationMs: Date.now() - startMs }
    } catch (e) {
      return { id, ok: false, error: (e as Error).message }
    }
  }))

  return NextResponse.json({
    replayedTo: targetUrl,
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
}
