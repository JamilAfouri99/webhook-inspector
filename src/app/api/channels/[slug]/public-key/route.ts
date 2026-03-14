import { NextRequest, NextResponse } from 'next/server'
import { setPublicKeyForChannel, getState } from '@/lib/webhook-state'

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const state = await getState(slug)
  if (!state) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  let body: { publicKey?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { publicKey } = body

  if (
    !publicKey ||
    typeof publicKey !== 'string' ||
    (!publicKey.includes('BEGIN PUBLIC KEY') && !publicKey.includes('BEGIN RSA PUBLIC KEY'))
  ) {
    return NextResponse.json(
      { error: 'publicKey must be a valid PEM-encoded public key' },
      { status: 400 },
    )
  }

  await setPublicKeyForChannel(slug, publicKey)

  const updated = await getState(slug)
  return NextResponse.json(updated)
}
