import { NextResponse } from 'next/server'
import { setPublicKeyForChannel, getState } from '@/lib/webhook-state'
import { route, requireChannel, readJsonBody, jsonError } from '@/lib/api/handler'
import { asObject } from '@/lib/api/validation'

export const POST = route<{ slug: string }>(async (request, { slug }) => {
  await requireChannel(slug)
  const body = asObject(await readJsonBody(request))
  const { publicKey } = body

  if (
    typeof publicKey !== 'string' ||
    (!publicKey.includes('BEGIN PUBLIC KEY') && !publicKey.includes('BEGIN RSA PUBLIC KEY'))
  ) {
    return jsonError('publicKey must be a valid PEM-encoded public key', 400)
  }

  await setPublicKeyForChannel(slug, publicKey)
  return NextResponse.json(await getState(slug))
})
