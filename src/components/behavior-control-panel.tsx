'use client'

import { useState, useRef, useEffect } from 'react'

export function BehaviorControlPanel({ channelSlug }: { channelSlug: string }) {
  const [behavior, setBehavior] = useState('success')
  const [delayMs, setDelayMs] = useState(0)
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined)
  const [applying, setApplying] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  const behaviors = [
    { value: 'success', label: 'Success (200)', color: 'text-[var(--success)]' },
    { value: 'server-error', label: 'Server Error (500)', color: 'text-[var(--error)]' },
    { value: 'timeout', label: 'Timeout (hang)', color: 'text-purple-400' },
    { value: 'slow', label: 'Slow Response', color: 'text-[var(--warning)]' },
    { value: 'client-error', label: 'Client Error (400)', color: 'text-[var(--warning)]' },
    { value: 'unauthorized', label: 'Unauthorized (401)', color: 'text-[var(--warning)]' },
    { value: 'not-found', label: 'Not Found (404)', color: 'text-[var(--warning)]' },
    { value: 'rate-limited', label: 'Rate Limited (429)', color: 'text-[var(--warning)]' },
    { value: 'redirect', label: 'Redirect (302)', color: 'text-cyan-400' },
    { value: 'large-response', label: 'Large Response (1.5MB)', color: 'text-cyan-400' },
    { value: 'large-body', label: 'Large Body (>4KB)', color: 'text-cyan-400' },
    { value: 'empty-response', label: 'Empty Response', color: 'text-cyan-400' },
    { value: 'non-json-response', label: 'Non-JSON Response', color: 'text-cyan-400' },
    { value: 'custom', label: 'Custom Status Code', color: 'text-[var(--muted)]' },
  ]

  async function applyBehavior() {
    setApplying(true)
    setFeedback(null)
    try {
      const body: any = { behavior }
      if (behavior === 'slow' || behavior === 'timeout') {
        body.delayMs = delayMs || (behavior === 'timeout' ? 35000 : 10000)
      }
      if (behavior === 'custom' && statusCode !== undefined) {
        body.statusCode = statusCode
      }
      const res = await fetch(`/api/channels/${channelSlug}/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setFeedback({ ok: true, msg: `Set to: ${behavior}` })
      } else {
        const data = await res.json().catch(() => ({}))
        setFeedback({ ok: false, msg: data.error || `Error ${res.status}` })
      }
    } catch (e) {
      setFeedback({ ok: false, msg: (e as Error).message })
    } finally {
      setApplying(false)
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = setTimeout(() => setFeedback(null), 3000)
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
      <h3 className="text-sm font-semibold mb-4">Manual Behavior Control</h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-[var(--muted)] mb-1.5 block">Response Behavior</label>
          <div className="space-y-1 max-h-[320px] overflow-auto">
            {behaviors.map(b => (
              <button
                key={b.value}
                onClick={() => setBehavior(b.value)}
                className={`w-full text-left px-3 py-1.5 rounded text-xs transition-colors ${
                  behavior === b.value
                    ? 'bg-[var(--accent-dim)]/30 border border-[var(--accent)]'
                    : 'hover:bg-[var(--card-border)]'
                }`}
              >
                <span className={b.color}>{b.label}</span>
              </button>
            ))}
          </div>
        </div>

        {(behavior === 'slow' || behavior === 'timeout') && (
          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block">Delay (ms)</label>
            <input
              type="number"
              value={delayMs}
              onChange={e => setDelayMs(parseInt(e.target.value) || 0)}
              placeholder={behavior === 'timeout' ? '35000' : '10000'}
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        {behavior === 'custom' && (
          <div>
            <label className="text-xs text-[var(--muted)] mb-1.5 block">Status Code (100-599)</label>
            <input
              type="number"
              value={statusCode ?? ''}
              onChange={e => setStatusCode(parseInt(e.target.value) || undefined)}
              placeholder="418"
              className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--accent)]"
            />
          </div>
        )}

        <button
          onClick={applyBehavior}
          disabled={applying}
          className="w-full py-2 rounded text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
        >
          {applying ? 'Applying...' : 'Apply Behavior'}
        </button>

        {feedback && (
          <div className={`text-xs px-2 py-1 rounded ${feedback.ok ? 'text-[var(--success)] bg-[var(--success)]/10' : 'text-[var(--error)] bg-[var(--error)]/10'}`}>
            {feedback.msg}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--card-border)]">
        <h4 className="text-xs font-semibold text-[var(--muted)] mb-2">Webhook System Reference</h4>
        <div className="space-y-1 text-[10px] text-[var(--muted)]">
          <div>Circuit threshold: <span className="text-[var(--foreground)]">5 consecutive failures</span></div>
          <div>Cooldown period: <span className="text-[var(--foreground)]">5 minutes</span></div>
          <div>Max attempts: <span className="text-[var(--foreground)]">3</span></div>
          <div>Retry 1 delay: <span className="text-[var(--foreground)]">~60s (+/-15s jitter)</span></div>
          <div>Retry 2 delay: <span className="text-[var(--foreground)]">~300s (+/-30s jitter)</span></div>
          <div>HTTP timeout: <span className="text-[var(--foreground)]">30s</span></div>
          <div>Max payload: <span className="text-[var(--foreground)]">200KB</span></div>
          <div>4xx: <span className="text-[var(--foreground)]">No retry, no circuit impact</span></div>
          <div>5xx: <span className="text-[var(--foreground)]">Retried, affects circuit</span></div>
        </div>
      </div>
    </div>
  )
}
