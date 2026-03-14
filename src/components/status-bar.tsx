'use client'

import { useState } from 'react'
import type { StateData } from '@/lib/hooks/use-webhook-events'

type StatusBarProps = {
  state: StateData | null
  connected: boolean
  webhookCount: number
  channelSlug: string
}

const behaviorDisplay: Record<string, { label: string; color: string; bg: string }> = {
  'success':           { label: 'Success (200)',     color: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' },
  'server-error':      { label: 'Server Error (500)', color: 'text-red-400',    bg: 'bg-red-500/15 border-red-500/30' },
  'timeout':           { label: 'Timeout (hang)',    color: 'text-purple-400',  bg: 'bg-purple-500/15 border-purple-500/30' },
  'slow':              { label: 'Slow Response',     color: 'text-amber-400',   bg: 'bg-amber-500/15 border-amber-500/30' },
  'client-error':      { label: 'Bad Request (400)', color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/30' },
  'unauthorized':      { label: 'Unauthorized (401)', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  'not-found':         { label: 'Not Found (404)',   color: 'text-orange-400',  bg: 'bg-orange-500/15 border-orange-500/30' },
  'rate-limited':      { label: 'Rate Limited (429)', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  'redirect':          { label: 'Redirect (302)',    color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  'large-response':    { label: 'Large Response',    color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  'empty-response':    { label: 'Empty Body',        color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  'non-json-response': { label: 'Non-JSON',          color: 'text-cyan-400',    bg: 'bg-cyan-500/15 border-cyan-500/30' },
  'custom':            { label: 'Custom Code',       color: 'text-slate-400',   bg: 'bg-slate-500/15 border-slate-500/30' },
}

export function StatusBar({ state, connected, webhookCount, channelSlug }: StatusBarProps) {
  const behavior = state?.behavior || 'success'
  const [actionError, setActionError] = useState<string | null>(null)
  const display = behaviorDisplay[behavior] || { label: behavior, color: 'text-[var(--foreground)]', bg: 'bg-[var(--card-border)] border-[var(--card-border)]' }

  async function handleAction(url: string, method: string) {
    setActionError(null)
    try {
      const res = await fetch(url, { method })
      if (!res.ok) setActionError(`Failed (${res.status})`)
    } catch {
      setActionError('Network error')
    }
  }

  return (
    <header className="border-b border-[var(--card-border)] bg-[var(--card)] shrink-0">
      <div className="h-14 flex items-center px-6 gap-4">
        {/* Logo + channel */}
        <div className="flex items-center gap-2">
          <a href="/" className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <a href="/" className="text-sm font-semibold tracking-tight hover:text-[var(--accent)] transition-colors">Webhook Tester</a>
          <span className="text-xs text-[var(--muted)] font-mono">/ {channelSlug}</span>
        </div>

        <div className="h-4 w-px bg-[var(--card-border)]" />

        {/* Connection */}
        <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--success)] animate-pulse-dot' : 'bg-[var(--error)]'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* Active behavior — prominent badge */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs font-medium ${display.bg} ${display.color}`}>
          <span className="text-[10px] uppercase tracking-wider opacity-70">Active:</span>
          <span>{display.label}</span>
        </div>

        {/* Event count */}
        <div className="text-xs text-[var(--muted)]">
          <span className="text-[var(--foreground)] font-medium">{webhookCount}</span> events
        </div>

        {actionError && (
          <span className="text-xs text-[var(--error)]">{actionError}</span>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleAction(`/api/channels/${channelSlug}/reset`, 'POST')}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--card-border)] hover:bg-[var(--muted)]/20 transition-colors"
          >
            Reset All
          </button>
          <button
            onClick={() => handleAction(`/api/channels/${channelSlug}/history`, 'DELETE')}
            className="px-3 py-1.5 text-xs rounded-md bg-[var(--card-border)] hover:bg-[var(--muted)]/20 transition-colors"
          >
            Clear History
          </button>
        </div>
      </div>
    </header>
  )
}
