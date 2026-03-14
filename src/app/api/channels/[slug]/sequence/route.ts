import { NextRequest, NextResponse } from 'next/server'
import { setSequence, getState, ServerBehavior, SequenceStep } from '@/lib/webhook-state'

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

  let body: { steps?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { steps } = body

  if (!steps || !Array.isArray(steps) || steps.length === 0) {
    return NextResponse.json(
      { error: 'steps must be a non-empty array', example: { steps: [{ behavior: 'server-error' }, { behavior: 'success' }] } },
      { status: 400 },
    )
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]
    if (!step.behavior || !validBehaviors.includes(step.behavior)) {
      return NextResponse.json({ error: `steps[${i}].behavior is invalid`, validBehaviors }, { status: 400 })
    }
    if (step.delayMs !== undefined && (typeof step.delayMs !== 'number' || step.delayMs < 0 || step.delayMs > 60000)) {
      return NextResponse.json({ error: `steps[${i}].delayMs must be a number between 0 and 60000` }, { status: 400 })
    }
    if (step.statusCode !== undefined && (typeof step.statusCode !== 'number' || step.statusCode < 100 || step.statusCode > 599)) {
      return NextResponse.json({ error: `steps[${i}].statusCode must be a number between 100 and 599` }, { status: 400 })
    }
  }

  await setSequence(slug, steps as SequenceStep[])

  const updated = await getState(slug)
  return NextResponse.json(updated)
}
