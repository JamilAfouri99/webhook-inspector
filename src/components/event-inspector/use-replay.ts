'use client'

import { useCallback, useState } from 'react'

export type ReplayResult = {
  ok: boolean
  status?: number
  durationMs?: number
  body?: unknown
  error?: string
}

/** Replays a recorded webhook back to its channel and tracks the in-flight result. */
export function useReplay(channelSlug: string, webhookId: string) {
  const [replaying, setReplaying] = useState(false)
  const [result, setResult] = useState<ReplayResult | null>(null)

  const reset = useCallback(() => setResult(null), [])

  const replay = useCallback(async () => {
    setReplaying(true)
    setResult(null)
    try {
      const res = await fetch(`/api/channels/${channelSlug}/history/${webhookId}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      setResult({
        ok: res.ok && data.status >= 200 && data.status < 300,
        status: data.status,
        durationMs: data.responseTimeMs,
        body: data.responseBody,
        error: data.error,
      })
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message })
    } finally {
      setReplaying(false)
    }
  }, [channelSlug, webhookId])

  return { replaying, result, replay, reset }
}
