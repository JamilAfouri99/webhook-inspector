import { NextResponse } from 'next/server'
import { deleteChannel, getState } from '@/lib/webhook-state'
import { route, requireChannel, jsonError } from '@/lib/api/handler'

type Params = { slug: string }

export const GET = route<Params>(async (_request, { slug }) => {
  const channel = await requireChannel(slug)
  const state = await getState(slug)
  return NextResponse.json({ ...channel, state })
})

export const DELETE = route<Params>(async (_request, { slug }) => {
  // deleteChannel returns false when the channel does not exist and notifies
  // SSE clients on success.
  if (!(await deleteChannel(slug))) return jsonError('Channel not found', 404)
  return NextResponse.json({ deleted: true })
})
