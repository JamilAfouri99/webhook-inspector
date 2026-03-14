import { NextRequest, NextResponse } from 'next/server'
import { getState } from '@/lib/webhook-state'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const state = await getState(slug)
  if (!state) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }
  return NextResponse.json(state)
}
