import { NextResponse } from 'next/server'
import { PLAYBOOKS } from '@/domain/playbooks'

export async function GET() {
  return NextResponse.json({ playbooks: PLAYBOOKS })
}
