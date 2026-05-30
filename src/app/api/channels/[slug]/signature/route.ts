import { NextResponse } from 'next/server'
import { setSignatureScheme, getState } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBody, jsonError } from '@/lib/api/handler'
import { asObject } from '@/lib/api/validation'
import { hasScheme, signatureSchemeIds } from '@/domain/signatures'

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)
  const body = asObject(await readJsonBody(request))
  const { scheme, secret } = body

  // A null/empty scheme clears signature verification for the channel.
  if (scheme === null || scheme === undefined || scheme === '') {
    await setSignatureScheme(slug, null, null)
    return NextResponse.json(await getState(slug))
  }

  if (typeof scheme !== 'string' || !hasScheme(scheme)) {
    return jsonError('Invalid signature scheme', 400, { validSchemes: signatureSchemeIds() })
  }
  if (typeof secret !== 'string' || secret.length === 0) {
    return jsonError('secret is required for the selected scheme', 400)
  }

  await setSignatureScheme(slug, scheme, secret)
  return NextResponse.json(await getState(slug))
})
