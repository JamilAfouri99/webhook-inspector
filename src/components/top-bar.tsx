'use client'

import Link from 'next/link'
import { useIsMac } from '@/lib/hooks/use-platform'
import { ThemeToggle } from './theme-toggle'
import { Logo } from './logo'

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
  const isMac = useIsMac()

  return (
    <header className="h-12 shrink-0 flex items-center px-3 gap-2 bg-[var(--card)] border-b border-[var(--card-border)]">
      {onToggleSidebar && (
        <PaneToggleButton
          collapsed={!!sidebarCollapsed}
          onClick={onToggleSidebar}
          title={`${sidebarCollapsed ? 'Show' : 'Hide'} sidebar  ([)`}
          side="left"
        />
      )}

      <Link href="/" className="hover:opacity-80 transition-opacity ml-1">
        <Logo mark="w-[18px] h-[18px]" />
      </Link>

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
        <ThemeToggle />
        {onOpenCommand && (
          <button
            onClick={onOpenCommand}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] text-[var(--muted)] hover:bg-[var(--card)] hover:border-[var(--card-border-strong)] transition-colors"
            title="Command palette"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
            </svg>
            <kbd className="text-[10px] font-mono">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
          </button>
        )}
        {onToggleInspector && (
          <PaneToggleButton
            collapsed={!!inspectorCollapsed}
            onClick={onToggleInspector}
            title={`${inspectorCollapsed ? 'Show' : 'Hide'} inspector  (])`}
            side="right"
          />
        )}
      </div>
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
