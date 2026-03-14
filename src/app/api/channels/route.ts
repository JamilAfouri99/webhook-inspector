import { NextRequest, NextResponse } from 'next/server'
import { createChannel, listChannels } from '@/lib/webhook-state'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$|^[a-z0-9]{3}$/

function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 3 && slug.length <= 40
}

export async function GET() {
  const channels = await listChannels()
  return NextResponse.json({ channels })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    typeof (body as Record<string, unknown>).slug !== 'string' ||
    typeof (body as Record<string, unknown>).name !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Body must include slug (string) and name (string)' },
      { status: 400 }
    )
  }

  const { slug, name } = body as { slug: string; name: string }

  if (!isValidSlug(slug)) {
    return NextResponse.json(
      {
        error:
          'slug must be 3–40 characters, lowercase alphanumeric and hyphens only, and must not start or end with a hyphen',
      },
      { status: 400 }
    )
  }

  const channel = await createChannel(slug, name)
  if (!channel) {
    return NextResponse.json({ error: `Channel slug "${slug}" is already taken` }, { status: 409 })
  }

  return NextResponse.json(channel, { status: 201 })
}
