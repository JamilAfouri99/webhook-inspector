import { NextResponse } from 'next/server'
import { getHistory, clearHistory } from '@/lib/webhook-state'
import { route, requireChannel } from '@/lib/api/handler'
import { deliveryKey } from '@/domain/delivery-analysis'

type Params = { slug: string }

function parsePositiveInt(raw: string | null): number | undefined {
  if (raw === null) return undefined
  const n = Number(raw)
  return Number.isInteger(n) && n >= 0 ? n : undefined
}

export const GET = route<Params>(async (request, { slug }) => {
  await requireChannel(slug)

  const sp = request.nextUrl.searchParams
  // No cap by default — the full history is returned. `limit`/`offset` are
  // honored for optional pagination but never forced.
  const limit = parsePositiveInt(sp.get('limit'))
  const offset = parsePositiveInt(sp.get('offset')) ?? 0
  const event = sp.get('event') || undefined
  const result = await getHistory(slug, { limit, offset, event })

  // Annotate each webhook with its attempt number within its event group.
  const attempts = new Map<string, number>()
  const webhooks = result.webhooks.map((w) => {
    const key = deliveryKey(w)
    const attempt = (attempts.get(key) ?? 0) + 1
    attempts.set(key, attempt)
    return { ...w, attempt }
  })

  return NextResponse.json({ total: result.total, offset, limit, webhooks })
})

export const DELETE = route<Params>(async (_request, { slug }) => {
  await requireChannel(slug)
  const count = await clearHistory(slug)
  return NextResponse.json({ cleared: true, count })
})
