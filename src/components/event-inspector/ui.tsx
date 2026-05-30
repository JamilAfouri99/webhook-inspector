'use client'

import { useState } from 'react'
import { statusPillClass } from '@/lib/status'

export function jsonPretty(v: unknown): string {
  if (v === undefined || v === null) return ''
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export function StatusBadge({ code }: { code: number }) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${statusPillClass(code)}`}>
      {code === 0 ? 'HANG' : code}
    </span>
  )
}

export function ActionButton({
  children,
  onClick,
  primary,
  loading,
  active,
}: {
  children: React.ReactNode
  onClick: () => void
  primary?: boolean
  loading?: boolean
  active?: boolean
}) {
  if (primary) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] transition-colors disabled:opacity-50"
      >
        {children}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30'
          : 'border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-soft)] text-[var(--heading)]'
      }`}
    >
      {children}
    </button>
  )
}

export function Section({
  title,
  children,
  collapsible,
  defaultOpen = true,
}: {
  title: string
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const shown = collapsible ? open : true
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">{title}</h3>
        {collapsible && (
          <button onClick={() => setOpen((o) => !o)} className="text-[var(--muted)] hover:text-[var(--heading)]">
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {shown && <div className="space-y-1.5">{children}</div>}
    </div>
  )
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-[11px]">
      <span className="text-[var(--muted)] w-24 shrink-0">{label}</span>
      <span className="text-[var(--heading)] flex-1 min-w-0 break-all">{value}</span>
    </div>
  )
}

export function CodeBlock({
  value,
  onCopy,
  copied,
  small,
}: {
  value: string
  onCopy?: () => void
  copied?: boolean
  small?: boolean
}) {
  return (
    <div className="relative rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)]">
      {onCopy && (
        <button
          onClick={onCopy}
          className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-[var(--card)] border border-[var(--card-border)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
      <pre className={`overflow-auto p-3 font-mono text-[var(--heading)] leading-relaxed ${small ? 'text-[10px]' : 'text-[11px]'} max-h-[320px]`}>
        {value}
      </pre>
    </div>
  )
}
