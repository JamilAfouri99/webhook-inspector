import { NextResponse } from 'next/server'
import { getState } from '@/lib/webhook-state'
import { route, HttpError } from '@/lib/api/handler'

export const GET = route<{ slug: string }>(async (_request, { slug }) => {
  const state = await getState(slug)
  if (!state) throw new HttpError(404, 'Channel not found')
  return NextResponse.json(state)
})
