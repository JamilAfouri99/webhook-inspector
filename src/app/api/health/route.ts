import { NextResponse } from 'next/server'
import { getUptimeMs } from '@/lib/webhook-state'

export async function GET() {
  return NextResponse.json({ status: 'ok', uptimeMs: getUptimeMs() })
}
