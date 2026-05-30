'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { useChannelHistory, useChannelStatus, STATUS_KEY, HISTORY_KEY } from './use-api'
import type { ReceivedWebhook } from '@/lib/webhook-state'

export type StateData = {
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

export function useWebhookEvents(channelSlug: string) {
  const { mutate } = useSWRConfig()

  const statusSwr = useChannelStatus(channelSlug)
  const historySwr = useChannelHistory(channelSlug)

  const [liveAppends, setLiveAppends] = useState<ReceivedWebhook[]>([])
  const [liveState, setLiveState] = useState<StateData | null>(null)
  const [connected, setConnected] = useState(false)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<() => void>(() => {})

  const state: StateData | null = liveState ?? (statusSwr.data as StateData | undefined) ?? null

  const baseHistory = historySwr.data?.webhooks ?? []
  const baseIds = new Set(baseHistory.map(w => w.id))
  const freshAppends = liveAppends.filter(w => !baseIds.has(w.id))
  const webhooks = [...baseHistory, ...freshAppends]

  const isInitialLoading =
    (statusSwr.isLoading && !statusSwr.data) ||
    (historySwr.isLoading && !historySwr.data)

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    const es = new EventSource(`/api/channels/${channelSlug}/events`)
    eventSourceRef.current = es

    es.addEventListener('connected', () => {
      setConnected(true)
      mutate(STATUS_KEY(channelSlug))
      mutate(HISTORY_KEY(channelSlug))
    })

    es.addEventListener('webhook', (event) => {
      try {
        const webhook = JSON.parse(event.data) as ReceivedWebhook
        setLiveAppends(prev => (prev.find(p => p.id === webhook.id) ? prev : [...prev, webhook]))
      } catch { /* malformed SSE data */ }
    })

    es.addEventListener('state-change', (event) => {
      try {
        const newState = JSON.parse(event.data) as StateData
        setLiveState(newState)
        mutate(STATUS_KEY(channelSlug), newState, { revalidate: false })
      } catch { /* malformed SSE data */ }
    })

    es.addEventListener('reset', () => {
      setLiveAppends([])
      mutate(HISTORY_KEY(channelSlug))
      mutate(STATUS_KEY(channelSlug))
    })

    es.addEventListener('history-cleared', () => {
      setLiveAppends([])
      mutate(HISTORY_KEY(channelSlug))
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      reconnectTimerRef.current = setTimeout(() => connectRef.current(), 3000)
    }

    return es
  }, [channelSlug, mutate])

  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Drop live state synchronously when the channel changes, before the next
  // paint, via render-time adjustment rather than a setState-in-effect.
  const [prevSlug, setPrevSlug] = useState(channelSlug)
  if (channelSlug !== prevSlug) {
    setPrevSlug(channelSlug)
    setLiveAppends([])
    setLiveState(null)
    setConnected(false)
  }

  useEffect(() => {
    connect()
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
    }
  }, [connect])

  const refresh = useCallback(() => {
    mutate(STATUS_KEY(channelSlug))
    mutate(HISTORY_KEY(channelSlug))
  }, [mutate, channelSlug])

  return { webhooks, state, connected, refresh, isInitialLoading }
}
