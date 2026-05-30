import { NextResponse } from 'next/server'
import { createChannel, listChannels } from '@/lib/webhook-state'
import { route, readJsonBody, jsonError } from '@/lib/api/handler'
import { asObject } from '@/lib/api/validation'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$|^[a-z0-9]{3}$/

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 40
}

export const GET = route(async () => {
  return NextResponse.json({ channels: await listChannels() })
})

export const POST = route(async (request) => {
  const body = asObject(await readJsonBody(request))

  if (typeof body.slug !== 'string' || typeof body.name !== 'string') {
    return jsonError('Body must include slug (string) and name (string)', 400)
  }
  if (!isValidSlug(body.slug)) {
    return jsonError(
      'slug must be 3–40 characters, lowercase alphanumeric and hyphens only, and must not start or end with a hyphen',
      400,
    )
  }

  const channel = await createChannel(body.slug, body.name)
  if (!channel) return jsonError(`Channel slug "${body.slug}" is already taken`, 409)

  return NextResponse.json(channel, { status: 201 })
})
