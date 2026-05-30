'use client'

import useSWR, { type SWRConfiguration } from 'swr'
import type { ReceivedWebhook } from '@/lib/webhook-state'

type Channel = { id: string; slug: string; name: string; createdAt: string }

type Stats = {
  channels: number
  events24h: number
  successRate: number | null
  failed24h: number
  avgDelayMs: number
}

type Activity = {
  id: string
  receivedAt: string
  event: string | null
  eventId: string | null
  statusCode: number
  behavior: string
  channel: { slug: string; name: string }
}

type ChannelStatus = {
  behavior: string
  delayMs: number
  customStatusCode: number
  activeScenario: string
  webhooksReceived: number
  signatureVerification: boolean
  signatureScheme?: string | null
  useSequence: boolean
  sequence?: { behavior: string; delayMs?: number; statusCode?: number }[]
  sequencePosition?: string
  forwardUrl?: string | null
  forwardEnabled?: boolean
  channel?: { slug: string; name: string }
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json() as Promise<T>
}

const SHARED: SWRConfiguration = {
  keepPreviousData: true,
  revalidateOnFocus: false,
  shouldRetryOnError: true,
  errorRetryInterval: 5_000,
  errorRetryCount: 3,
}

export function useChannels() {
  return useSWR<{ channels: Channel[] }>('/api/channels', fetcher, {
    ...SHARED,
    refreshInterval: 30_000,
  })
}

export function useStats() {
  return useSWR<Stats>('/api/stats', fetcher, {
    ...SHARED,
    refreshInterval: 15_000,
  })
}

export function useActivity(limit = 30, onSuccess?: () => void) {
  return useSWR<{ items: Activity[] }>(`/api/activity?limit=${limit}`, fetcher, {
    ...SHARED,
    refreshInterval: 5_000,
    onSuccess,
  })
}

export function useChannelStatus(slug: string | null | undefined) {
  return useSWR<ChannelStatus>(
    slug ? `/api/channels/${slug}/status` : null,
    fetcher,
    { ...SHARED, refreshInterval: 10_000 },
  )
}

export function useChannelHistory(slug: string | null | undefined, limit?: number) {
  return useSWR<{ webhooks: ReceivedWebhook[] }>(
    slug ? HISTORY_KEY(slug, limit) : null,
    fetcher,
    { ...SHARED, refreshInterval: 10_000 },
  )
}

export const STATUS_KEY = (slug: string) => `/api/channels/${slug}/status`
// Omitting `limit` returns the full history (no cap).
export const HISTORY_KEY = (slug: string, limit?: number) =>
  limit ? `/api/channels/${slug}/history?limit=${limit}` : `/api/channels/${slug}/history`
