'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'

export type StateData = {
  behavior: string
  delayMs: number
  customStatusCode: number
  activeScenario: string
  webhooksReceived: number
  signatureVerification: boolean
  useSequence: boolean
  sequence?: { behavior: string; delayMs?: number; statusCode?: number }[]
  sequencePosition?: string
  channel?: { slug: string; name: string }
}

export function useWebhookEvents(channelSlug: string) {
  const [webhooks, setWebhooks] = useState<ReceivedWebhook[]>([])
  const [state, setState] = useState<StateData | null>(null)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchInitialData = useCallback(() => {
    fetch(`/api/channels/${channelSlug}/status`).then(r => r.json()).then(setState).catch(() => {})
    fetch(`/api/channels/${channelSlug}/history?limit=1000`).then(r => r.json()).then(data => {
      setWebhooks(data.webhooks || [])
    }).catch(() => {})
  }, [channelSlug])

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
      fetchInitialData()
    })

    es.addEventListener('webhook', (event) => {
      try {
        const webhook = JSON.parse(event.data)
        setWebhooks(prev => [...prev, webhook])
      } catch { /* malformed SSE data */ }
    })

    es.addEventListener('state-change', (event) => {
      try {
        const newState = JSON.parse(event.data)
        setState(newState)
      } catch { /* malformed SSE data */ }
    })

    es.addEventListener('reset', () => {
      setWebhooks([])
    })

    es.addEventListener('history-cleared', () => {
      setWebhooks([])
    })

    es.onerror = () => {
      setConnected(false)
      es.close()
      reconnectTimerRef.current = setTimeout(connect, 3000)
    }

    return es
  }, [channelSlug, fetchInitialData])

  useEffect(() => {
    fetchInitialData()
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
  }, [connect, fetchInitialData])

  return { webhooks, state, connected }
}
