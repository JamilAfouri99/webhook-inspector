import { NextResponse } from 'next/server'
import { getStats } from '@/lib/analytics'
import { route } from '@/lib/api/handler'

export const GET = route(async () => {
  return NextResponse.json(await getStats())
})
