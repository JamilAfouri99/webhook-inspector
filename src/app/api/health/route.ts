import { NextResponse } from 'next/server'

const startedAt = Date.now()

export async function GET() {
  return NextResponse.json({ status: 'ok', uptimeMs: Date.now() - startedAt })
}
