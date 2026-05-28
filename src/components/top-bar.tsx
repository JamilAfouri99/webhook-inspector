'use client'

import { useEffect, useState } from 'react'
import { useToast } from './toaster'

type Props = {
  channelSlug: string
  channelName?: string
  connected: boolean
  webhookCount: number
  onOpenCommand?: () => void
  sidebarCollapsed?: boolean
  inspectorCollapsed?: boolean
  onToggleSidebar?: () => void
  onToggleInspector?: () => void
}

export function TopBar({
  channelSlug, channelName, connected, webhookCount, onOpenCommand,
  sidebarCollapsed, inspectorCollapsed, onToggleSidebar, onToggleInspector,
}: Props) {
  const [confirm, setConfirm] = useState<null | 'reset' | 'clear'>(null)
  const [working, setWorking] = useState(false)
  const [isMac, setIsMac] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().includes('MAC'))
  }, [])

  async function exec() {
    if (!confirm) return
    setWorking(true)
    try {
      const res = confirm === 'reset'
        ? await fetch(`/api/channels/${channelSlug}/reset`, { method: 'POST' })
        : await fetch(`/api/channels/${channelSlug}/history`, { method: 'DELETE' })
      if (res.ok) {
        toast({ kind: 'success', title: confirm === 'reset' ? 'Channel reset' : 'History cleared' })
      } else {
        toast({ kind: 'error', title: `Failed (${res.status})` })
      }
    } catch {
      toast({ kind: 'error', title: 'Network error' })
    } finally {
      setConfirm(null)
      setWorking(false)
    }
  }

  return (
    <header className="h-12 shrink-0 flex items-center px-3 gap-2 bg-white border-b border-[var(--card-border)]">
      {onToggleSidebar && (
        <PaneToggleButton
          collapsed={!!sidebarCollapsed}
          onClick={onToggleSidebar}
          title={`${sidebarCollapsed ? 'Show' : 'Hide'} sidebar  ([)`}
          side="left"
        />
      )}

      <a href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity ml-1">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-sm font-semibold text-[var(--heading)]">Webhook Tester</span>
      </a>

      <span className="text-[var(--muted)]">/</span>

      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm text-[var(--heading)] font-medium truncate">
          {channelName || channelSlug}
        </span>
        <code className="text-[11px] text-[var(--muted)] font-mono truncate">{channelSlug}</code>
      </div>

      <div className="h-4 w-px bg-[var(--card-border)] mx-1" />

      <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] shrink-0">
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--success)] animate-pulse-dot' : 'bg-[var(--error)]'}`} />
        <span>{connected ? 'Live' : 'Disconnected'}</span>
      </div>

      <div className="text-xs text-[var(--muted)] shrink-0">
        <span className="text-[var(--heading)] font-semibold">{webhookCount}</span> events
      </div>

      <div className="ml-auto flex items-center gap-2 shrink-0">
        {onOpenCommand && (
          <button
            onClick={onOpenCommand}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] text-[var(--muted)] hover:bg-white hover:border-[var(--card-border-strong)] transition-colors"
            title="Command palette"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
            </svg>
            <kbd className="text-[10px] font-mono">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
          </button>
        )}
        <button
          onClick={() => setConfirm('reset')}
          className="text-xs px-3 py-1.5 rounded-md border border-[var(--card-border)] bg-white text-[var(--heading)] hover:bg-[var(--muted-soft)] transition-colors"
        >
          Reset
        </button>
        <button
          onClick={() => setConfirm('clear')}
          className="text-xs px-3 py-1.5 rounded-md border border-[var(--card-border)] bg-white text-[var(--heading)] hover:bg-[var(--muted-soft)] transition-colors"
        >
          Clear history
        </button>
        {onToggleInspector && (
          <PaneToggleButton
            collapsed={!!inspectorCollapsed}
            onClick={onToggleInspector}
            title={`${inspectorCollapsed ? 'Show' : 'Hide'} inspector  (])`}
            side="right"
          />
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setConfirm(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white border border-[var(--card-border)] rounded-xl w-full max-w-sm mx-4 p-5"
            style={{ boxShadow: 'var(--shadow-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--heading)] mb-1.5">
              {confirm === 'reset' ? 'Reset this channel?' : 'Clear all history?'}
            </h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              {confirm === 'reset'
                ? 'Behavior, sequence, and history will be wiped. This cannot be undone.'
                : 'All recorded webhooks will be deleted. Behavior config is preserved.'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="text-xs px-4 py-2 rounded-md border border-[var(--card-border)] bg-white hover:bg-[var(--muted-soft)] text-[var(--heading)]"
              >
                Cancel
              </button>
              <button
                onClick={exec}
                disabled={working}
                className="text-xs px-4 py-2 rounded-md bg-[var(--error)] text-white hover:bg-[var(--error-text)] transition-colors disabled:opacity-50"
              >
                {working ? '...' : confirm === 'reset' ? 'Reset' : 'Clear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function PaneToggleButton({
  collapsed, onClick, title, side,
}: { collapsed: boolean; onClick: () => void; title: string; side: 'left' | 'right' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-pressed={!collapsed}
      className="w-8 h-8 rounded-md text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--muted-soft)] flex items-center justify-center transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        {side === 'left' ? (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="9" y1="4" x2="9" y2="20" />
            {collapsed && <line x1="5" y1="12" x2="7" y2="12" />}
          </>
        ) : (
          <>
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="15" y1="4" x2="15" y2="20" />
            {collapsed && <line x1="17" y1="12" x2="19" y2="12" />}
          </>
        )}
      </svg>
    </button>
  )
}
