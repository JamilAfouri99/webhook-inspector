'use client'

import { useIsMac } from '@/lib/hooks/use-platform'
import { ThemeToggle } from './theme-toggle'
import { Logo } from './logo'

export function WorkspaceHeader({ onOpenCommand }: { onOpenCommand: () => void }) {
  const isMac = useIsMac()

  return (
    <header className="h-14 shrink-0 bg-[var(--card)] border-b border-[var(--card-border)] flex items-center px-6 gap-3">
      <Logo />
      <span className="hidden sm:inline text-xs text-[var(--muted)] border-l border-[var(--card-border)] pl-3">
        Workspace
      </span>

      <button
        onClick={onOpenCommand}
        className="ml-6 flex-1 max-w-md flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] text-[var(--muted)] text-xs hover:bg-[var(--card)] hover:border-[var(--card-border-strong)] transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
        </svg>
        <span className="flex-1 text-left">Search channels, behaviors, scenarios…</span>
        <kbd className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--card-border)] text-[10px] font-mono text-[var(--muted)]">
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  )
}
