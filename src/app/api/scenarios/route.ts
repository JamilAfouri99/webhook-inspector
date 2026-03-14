import { NextResponse } from 'next/server'
import { scenarios } from '@/lib/webhook-state'

export async function GET() {
  return NextResponse.json({
    scenarios: scenarios.map(s => ({
      name: s.name,
      description: s.description,
      whatToExpect: s.whatToExpect,
      category: s.category,
    })),
  })
}
