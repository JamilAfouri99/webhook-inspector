import { NextResponse } from 'next/server'
import { getHistoryEntry } from '@/lib/webhook-state'
import { route, requireChannel, HttpError } from '@/lib/api/handler'

export const GET = route<{ slug: string; id: string }>(async (_request, { slug, id }) => {
  await requireChannel(slug)
  const wh = await getHistoryEntry(slug, id)
  if (!wh) throw new HttpError(404, `Webhook ${id} not found`)
  return NextResponse.json(wh)
})
