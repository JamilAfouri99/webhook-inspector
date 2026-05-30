import { NextResponse } from 'next/server'
import { resetAll } from '@/lib/webhook-state'
import { route, requireChannel } from '@/lib/api/handler'

export const POST = route<{ slug: string }>(async (_request, { slug }) => {
  await requireChannel(slug)
  await resetAll(slug)
  return NextResponse.json({ reset: true })
})
