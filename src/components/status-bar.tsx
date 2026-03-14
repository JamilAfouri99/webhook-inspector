'use client'

import { useState } from 'react'
import type { StateData } from '@/lib/hooks/use-webhook-events'

type StatusBarProps = {
  state: StateData | null
  connected: boolean
  webhookCount: number
  channelSlug: string
}

export function StatusBar({ state, connected, webhookCount, channelSlug }: StatusBarProps) {
  const scenario = state?.activeScenario || 'none'
  const behavior = state?.behavior || 'success'
  const [actionError, setActionError] = useState<string | null>(null)

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
    <header className="h-14 border-b border-[var(--card-border)] bg-[var(--card)] flex items-center px-6 gap-6 shrink-0">
      <div className="flex items-center gap-2">
        <a href="/" className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <a href="/" className="text-sm font-semibold tracking-tight hover:text-[var(--accent)] transition-colors">Webhook Tester</a>
        <span className="text-xs text-[var(--muted)] font-mono">/ {channelSlug}</span>
      </div>

      <div className="h-4 w-px bg-[var(--card-border)]" />

      <div className="flex items-center gap-4 text-xs text-[var(--muted)]">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--success)] animate-pulse-dot' : 'bg-[var(--error)]'}`} />
          <span>{connected ? 'Connected' : 'Disconnected'}</span>
        </div>

        <div>
          Scenario: <span className="text-[var(--foreground)] font-medium">{scenario}</span>
        </div>

        <div>
          Behavior: <span className={`font-medium ${
            behavior === 'success' ? 'text-[var(--success)]' :
            behavior.includes('error') ? 'text-[var(--error)]' :
            'text-[var(--warning)]'
          }`}>{behavior}</span>
        </div>

        <div>
          Events: <span className="text-[var(--foreground)] font-medium">{webhookCount}</span>
        </div>

        {actionError && (
          <span className="text-[var(--error)]">{actionError}</span>
        )}
      </div>

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
    </header>
  )
}
