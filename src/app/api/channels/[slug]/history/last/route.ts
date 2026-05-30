import { NextResponse } from 'next/server'
import { getLastWebhook } from '@/lib/webhook-state'
import { route, requireChannel, HttpError } from '@/lib/api/handler'

export const GET = route<{ slug: string }>(async (_request, { slug }) => {
  await requireChannel(slug)
  const last = await getLastWebhook(slug)
  if (!last) throw new HttpError(404, 'No webhooks received yet')
  return NextResponse.json(last)
})
