import { NextResponse } from 'next/server'
import { setBehavior, getState } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBody } from '@/lib/api/handler'
import { asObject, parseBehaviorName, parseBoundedInt } from '@/lib/api/validation'

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)
  const body = asObject(await readJsonBody(request))

  const behavior = parseBehaviorName(body.behavior)
  const delayMs = parseBoundedInt(body.delayMs, 'delayMs', 0, 60_000)
  const statusCode = parseBoundedInt(body.statusCode, 'statusCode', 100, 599)

  await setBehavior(slug, behavior, delayMs, statusCode)
  return NextResponse.json(await getState(slug))
})
