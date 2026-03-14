'use client'

import { useState, useRef, useEffect } from 'react'

const behaviorCategories = [
  {
    title: 'Success',
    behaviors: [
      { value: 'success', label: 'Success', code: '200', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', desc: 'Returns HTTP 200 with a JSON success body. Simulates a healthy endpoint.' },
    ],
  },
  {
    title: 'Server Errors',
    behaviors: [
      { value: 'server-error', label: 'Server Error', code: '500', color: 'bg-red-500/15 text-red-400 border-red-500/30', desc: 'Triggers retry logic — the sender should retry this delivery.' },
      { value: 'timeout', label: 'Timeout', code: 'HANG', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', desc: 'Holds connection open without responding. Tests timeout handling.' },
      { value: 'slow', label: 'Slow Response', code: 'SLOW', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', desc: 'Responds successfully but after a configurable delay.' },
    ],
  },
  {
    title: 'Client Errors',
    behaviors: [
      { value: 'client-error', label: 'Bad Request', code: '400', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', desc: 'Senders typically do not retry 4xx errors.' },
      { value: 'unauthorized', label: 'Unauthorized', code: '401', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', desc: 'Simulates invalid or missing authentication.' },
      { value: 'not-found', label: 'Not Found', code: '404', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', desc: 'Simulates a missing or deregistered endpoint.' },
      { value: 'rate-limited', label: 'Rate Limited', code: '429', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', desc: 'Tests rate limiting and backoff handling.' },
    ],
  },
  {
    title: 'Edge Cases',
    behaviors: [
      { value: 'redirect', label: 'Redirect', code: '302', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', desc: 'Tests whether the sender follows HTTP redirects.' },
      { value: 'large-response', label: 'Large Response', code: '1.5MB', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', desc: 'Returns a 1.5MB JSON body. Tests large payload handling.' },
      { value: 'empty-response', label: 'Empty Body', code: '200', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', desc: 'Returns 200 with no body. Tests if sender requires one.' },
      { value: 'non-json-response', label: 'Non-JSON', code: 'TEXT', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30', desc: 'Returns plain text. Tests content type handling.' },
      { value: 'custom', label: 'Custom Code', code: '???', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', desc: 'Return any HTTP status code (100-599).' },
    ],
  },
]

const allBehaviors = behaviorCategories.flatMap(c => c.behaviors)

export function BehaviorControlPanel({ channelSlug }: { channelSlug: string }) {
  const [activeBehavior, setActiveBehavior] = useState('success')
  const [pendingBehavior, setPendingBehavior] = useState<string | null>(null)
  const [delayMs, setDelayMs] = useState(0)
  const [statusCode, setStatusCode] = useState<number | undefined>(undefined)
  const [applying, setApplying] = useState(false)
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch(`/api/channels/${channelSlug}/status`)
      .then(r => r.json())
      .then(data => {
        if (data.behavior) setActiveBehavior(data.behavior)
      })
      .catch(() => {})
  }, [channelSlug])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  function handleCardClick(value: string) {
    if (value === activeBehavior) return
    setPendingBehavior(value)
    setDelayMs(0)
    setStatusCode(undefined)
  }

  function dismissPopup() {
    setPendingBehavior(null)
  }

  async function applyBehavior() {
    if (!pendingBehavior) return
    setApplying(true)
    setFeedback(null)
    try {
      const body: Record<string, unknown> = { behavior: pendingBehavior }
      if (pendingBehavior === 'slow' || pendingBehavior === 'timeout') {
        body.delayMs = delayMs || (pendingBehavior === 'timeout' ? 35000 : 10000)
      }
      if (pendingBehavior === 'custom' && statusCode !== undefined) {
        body.statusCode = statusCode
      }
      const res = await fetch(`/api/channels/${channelSlug}/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setActiveBehavior(pendingBehavior)
        setPendingBehavior(null)
        setFeedback({ ok: true, msg: 'Behavior updated' })
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

  const pending = pendingBehavior ? allBehaviors.find(b => b.value === pendingBehavior) : null
  const active = allBehaviors.find(b => b.value === activeBehavior)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-1">Behavior Control</h2>
        <p className="text-sm text-[var(--muted)]">
          Choose how this channel responds to incoming webhooks.
        </p>
      </div>

      <div className="space-y-6">
        {behaviorCategories.map(category => (
          <div key={category.title}>
            <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">{category.title}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {category.behaviors.map(b => {
                const isActive = activeBehavior === b.value

                return (
                  <button
                    key={b.value}
                    onClick={() => handleCardClick(b.value)}
                    className={`group relative text-left rounded-lg border p-3 transition-all ${
                      isActive
                        ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/30'
                        : 'border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--accent)]/50 hover:bg-[var(--accent)]/5 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${b.color}`}>
                        {b.code}
                      </span>
                      <span className="text-sm font-medium">{b.label}</span>
                      {isActive && (
                        <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--muted)] leading-relaxed">{b.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation popup/modal */}
      {pendingBehavior && pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={dismissPopup}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <div className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold mb-3">Switch Behavior</div>
              <div className="flex items-center gap-3">
                {active && (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${active.color}`}>
                      {active.code}
                    </span>
                    <span>{active.label}</span>
                  </div>
                )}
                <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${pending.color}`}>
                    {pending.code}
                  </span>
                  <span>{pending.label}</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="px-6 pb-4">
              <p className="text-sm text-[var(--muted)] leading-relaxed">{pending.desc}</p>
            </div>

            {/* Config inputs */}
            {(pendingBehavior === 'slow' || pendingBehavior === 'timeout') && (
              <div className="px-6 pb-4">
                <label className="text-xs text-[var(--muted)] mb-1.5 block">Delay (milliseconds)</label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={e => setDelayMs(parseInt(e.target.value) || 0)}
                  placeholder={pendingBehavior === 'timeout' ? '35000' : '10000'}
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            {pendingBehavior === 'custom' && (
              <div className="px-6 pb-4">
                <label className="text-xs text-[var(--muted)] mb-1.5 block">HTTP Status Code (100-599)</label>
                <input
                  type="number"
                  value={statusCode ?? ''}
                  onChange={e => setStatusCode(parseInt(e.target.value) || undefined)}
                  placeholder="418"
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            )}

            {/* Actions */}
            <div className="px-6 py-4 border-t border-[var(--card-border)] bg-[var(--background)]/50 flex items-center justify-end gap-3">
              <button
                onClick={dismissPopup}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--card-border)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyBehavior}
                disabled={applying}
                className="px-6 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
              >
                {applying ? 'Applying...' : 'Apply'}
              </button>
            </div>

            {feedback && (
              <div className={`mx-6 mb-4 text-xs px-3 py-2 rounded-md ${feedback.ok ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
                {feedback.msg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Success feedback toast */}
      {feedback && !pendingBehavior && (
        <div className={`fixed bottom-6 right-6 z-50 text-sm px-4 py-3 rounded-lg shadow-lg ${feedback.ok ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-red-400 bg-red-500/10 border border-red-500/20'}`}>
          {feedback.msg}
        </div>
      )}

      {/* Reference */}
      <div className="mt-6 rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4">
        <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">Webhook System Reference</h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-[var(--muted)]">Circuit threshold</span><span>5 failures</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Cooldown</span><span>5 min</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Max attempts</span><span>3</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Retry 1</span><span>~60s</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Retry 2</span><span>~300s</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">HTTP timeout</span><span>30s</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Max payload</span><span>200KB</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">4xx</span><span>No retry</span></div>
          <div className="flex justify-between"><span className="text-[var(--muted)]">5xx</span><span>Retried</span></div>
        </div>
      </div>
    </div>
  )
}
