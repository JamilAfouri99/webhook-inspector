import { NextRequest, NextResponse } from 'next/server'
import { getChannel, setForwardConfig, getState } from '@/lib/webhook-state'

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const channel = await getChannel(slug)
  if (!channel) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  let body: { url?: unknown; enabled?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const url = body.url
  const enabled = body.enabled

  if (url !== null && url !== '' && typeof url !== 'string') {
    return NextResponse.json({ error: 'url must be a string or null' }, { status: 400 })
  }

  if (typeof url === 'string' && url.length > 0) {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'url must be http:// or https://' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'url is not a valid URL' }, { status: 400 })
    }
  }

  await setForwardConfig(slug, typeof url === 'string' && url.length > 0 ? url : null, !!enabled)

  return NextResponse.json(await getState(slug))
}
