import { NextRequest, NextResponse } from 'next/server'
import { getChannel, deleteChannel, getState } from '@/lib/webhook-state'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const channel = await getChannel(slug)
  if (!channel) {
    return NextResponse.json({ error: `Channel "${slug}" not found` }, { status: 404 })
  }

  const state = await getState(slug)

  return NextResponse.json({ ...channel, state })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const deleted = await deleteChannel(slug)
  if (!deleted) {
    return NextResponse.json({ error: `Channel "${slug}" not found` }, { status: 404 })
  }

  return NextResponse.json({ deleted: true })
}
