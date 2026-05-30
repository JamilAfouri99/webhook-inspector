import { NextResponse } from 'next/server'
import { setForwardConfig, getState } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBody } from '@/lib/api/handler'
import { asObject, parseTargetUrl } from '@/lib/api/validation'

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)
  const body = asObject(await readJsonBody(request))

  const url = parseTargetUrl(body.url)
  await setForwardConfig(slug, url, !!body.enabled)

  return NextResponse.json(await getState(slug))
})
