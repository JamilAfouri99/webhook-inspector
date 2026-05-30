import { NextResponse } from 'next/server'
import { getHistoryEntry } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBody, jsonError } from '@/lib/api/handler'
import { asObject, parseTargetUrl } from '@/lib/api/validation'
import { buildForwardHeaders } from '@/lib/forwarding'

export const maxDuration = 120

const MAX_BULK = 100

async function replayOne(slug: string, id: unknown, targetUrl: string) {
  if (typeof id !== 'string') return { id: String(id), ok: false, error: 'invalid id' }

  const recorded = await getHistoryEntry(slug, id)
  if (!recorded) return { id, ok: false, error: 'not found' }

  const headers = buildForwardHeaders(recorded.headers)
  const startMs = Date.now()
  try {
    const res = await fetch(targetUrl, {
      method: recorded.method || 'POST',
      headers,
      body: recorded.body == null ? undefined : JSON.stringify(recorded.body),
      redirect: 'manual',
    })
    return { id, ok: res.status >= 200 && res.status < 300, status: res.status, durationMs: Date.now() - startMs }
  } catch (e) {
    return { id, ok: false, error: (e as Error).message }
  }
}

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)
  const body = asObject(await readJsonBody(request))

  const { ids } = body
  if (!Array.isArray(ids) || ids.length === 0) {
    return jsonError('ids must be a non-empty array', 400)
  }
  if (ids.length > MAX_BULK) {
    return jsonError(`Cannot replay more than ${MAX_BULK} webhooks at once`, 400)
  }

  const targetUrl = parseTargetUrl(body.targetUrl, 'targetUrl') ?? `${request.nextUrl.origin}/api/webhook/${slug}`

  const results = await Promise.all(ids.map((id) => replayOne(slug, id, targetUrl)))

  return NextResponse.json({
    replayedTo: targetUrl,
    total: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  })
})
