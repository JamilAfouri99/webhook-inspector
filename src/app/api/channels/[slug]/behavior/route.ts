import { NextRequest, NextResponse } from 'next/server'
import { setBehavior, getState, ServerBehavior } from '@/lib/webhook-state'

const validBehaviors: ServerBehavior[] = [
  'success', 'server-error', 'timeout', 'slow',
  'client-error', 'unauthorized', 'not-found', 'rate-limited',
  'redirect', 'large-response', 'large-body', 'empty-response', 'non-json-response',
  'custom',
]

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const state = await getState(slug)
  if (!state) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  let body: { behavior?: unknown; delayMs?: unknown; statusCode?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { behavior, delayMs, statusCode } = body

  if (!behavior || !validBehaviors.includes(behavior as ServerBehavior)) {
    return NextResponse.json({ error: 'Invalid behavior', validBehaviors }, { status: 400 })
  }

  if (delayMs !== undefined && (typeof delayMs !== 'number' || delayMs < 0 || delayMs > 60000)) {
    return NextResponse.json({ error: 'delayMs must be a number between 0 and 60000' }, { status: 400 })
  }

  if (statusCode !== undefined && (typeof statusCode !== 'number' || statusCode < 100 || statusCode > 599)) {
    return NextResponse.json({ error: 'statusCode must be a number between 100 and 599' }, { status: 400 })
  }

  await setBehavior(
    slug,
    behavior as ServerBehavior,
    delayMs as number | undefined,
    statusCode as number | undefined,
  )

  const updated = await getState(slug)
  return NextResponse.json(updated)
}
