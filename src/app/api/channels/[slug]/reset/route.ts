import { NextRequest, NextResponse } from 'next/server'
import { resetAll, getState } from '@/lib/webhook-state'

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const state = await getState(slug)
  if (!state) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  await resetAll(slug)

  return NextResponse.json({ reset: true })
}
