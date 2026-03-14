import { NextRequest, NextResponse } from 'next/server'
import { activateScenarioByName, getChannel, scenarios } from '@/lib/webhook-state'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; name: string }> }
) {
  const { slug, name } = await params
  const channel = await getChannel(slug)
  if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 })

  const activated = await activateScenarioByName(slug, name)
  if (!activated) {
    return NextResponse.json(
      { error: `Unknown scenario: ${name}`, available: scenarios.map(s => s.name) },
      { status: 404 }
    )
  }

  return NextResponse.json({ activated: true, scenario: name })
}
