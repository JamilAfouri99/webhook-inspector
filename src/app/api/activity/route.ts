import { NextResponse } from 'next/server'
import { getActivityFeed } from '@/lib/analytics'
import { route, parsePagination } from '@/lib/api/handler'

export const GET = route(async (request) => {
  const { limit } = parsePagination(request.nextUrl.searchParams, { defaultLimit: 50, maxLimit: 200 })
  return NextResponse.json({ items: await getActivityFeed(limit) })
})
