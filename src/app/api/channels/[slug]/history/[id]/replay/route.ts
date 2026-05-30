import { NextResponse } from 'next/server'
import { getHistoryEntry } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBodyOptional, HttpError } from '@/lib/api/handler'
import { parseTargetUrl } from '@/lib/api/validation'
import { buildForwardHeaders } from '@/lib/forwarding'

export const maxDuration = 60

export const POST = route<{ slug: string; id: string }>(async (request, { slug, id }) => {
  await requireChannel(slug)

  const recorded = await getHistoryEntry(slug, id)
  if (!recorded) throw new HttpError(404, 'Webhook not found')

  const body = await readJsonBodyOptional(request)
  const targetField = body && typeof body === 'object' ? (body as Record<string, unknown>).targetUrl : undefined
  const destination = parseTargetUrl(targetField, 'targetUrl') ?? `${request.nextUrl.origin}/api/webhook/${slug}`

  const headers = buildForwardHeaders(recorded.headers)
  const payload = recorded.body == null ? undefined : JSON.stringify(recorded.body)

  const startMs = Date.now()
  let status = 0
  let responseBody: unknown = null
  let error: string | undefined

  try {
    const res = await fetch(destination, {
      method: recorded.method || 'POST',
      headers,
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

  return NextResponse.json({
    replayedTo: destination,
    status,
    responseBody,
    responseTimeMs: Date.now() - startMs,
    error,
  })
})
