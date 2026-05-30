import { NextResponse } from 'next/server'
import { setSequence, getState } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBody } from '@/lib/api/handler'
import { asObject, parseSequenceSteps } from '@/lib/api/validation'

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)
  const body = asObject(await readJsonBody(request))

  const steps = parseSequenceSteps(body.steps)
  const presetName = typeof body.name === 'string' && body.name.length > 0 ? body.name : undefined

  await setSequence(slug, steps, presetName)
  return NextResponse.json(await getState(slug))
})
