'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type Command = {
  id: string
  label: string
  hint?: string
  group: string
  pill?: { text: string; cls: string }
  action: () => void
}

type Props = {
  open: boolean
  onClose: () => void
  commands: Command[]
  placeholder?: string
}

function fuzzyScore(text: string, query: string): number {
  if (!query) return 1
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t === q) return 1000
  if (t.startsWith(q)) return 500
  if (t.includes(q)) return 250
  let ti = 0, qi = 0, score = 0
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) { score += 1; qi += 1 }
    ti += 1
  }
  return qi === q.length ? score : 0
}

export function CommandPalette({ open, onClose, commands, placeholder = 'Type a command, channel, behavior…' }: Props) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset state when the palette opens, or when the query changes, by adjusting
  // during render (React's documented alternative to a reset-in-effect).
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setQuery('')
    setSelectedIndex(0)
  }
  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setSelectedIndex(0)
  }

  useEffect(() => {
    if (open) queueMicrotask(() => inputRef.current?.focus())
  }, [open])

  const filtered = useMemo(() => {
    const scored = commands
      .map(c => ({
        cmd: c,
        score: Math.max(
          fuzzyScore(c.label, query),
          fuzzyScore(c.hint ?? '', query) * 0.5,
          fuzzyScore(c.group, query) * 0.4,
        ),
      }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.map(s => s.cmd)
  }, [commands, query])

  const grouped = useMemo(() => {
    const groups = new Map<string, Command[]>()
    for (const c of filtered) {
      if (!groups.has(c.group)) groups.set(c.group, [])
      groups.get(c.group)!.push(c)
    }
    return Array.from(groups.entries())
  }, [filtered])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, filtered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const cmd = filtered[selectedIndex]
        if (cmd) { cmd.action(); onClose() }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, filtered, selectedIndex, onClose])

  useEffect(() => {
    if (!listRef.current) return
    const active = listRef.current.querySelector<HTMLElement>('[data-active="true"]')
    active?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open) return null

  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-xl mx-4 bg-[var(--card)] rounded-xl border border-[var(--card-border)] overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--card-border)]">
          <svg className="w-4 h-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 18a7 7 0 110-14 7 7 0 010 14z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="flex-1 text-sm bg-transparent outline-none text-[var(--heading)] placeholder:text-[var(--muted)]"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-[var(--muted-soft)] border border-[var(--card-border)] text-[10px] font-mono text-[var(--muted)]">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-xs text-[var(--muted)]">
              No matches for &ldquo;<span className="text-[var(--heading)]">{query}</span>&rdquo;
            </div>
          ) : (
            grouped.map(([group, items]) => (
              <div key={group} className="mb-2 last:mb-0">
                <div className="px-3 py-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">
                  {group}
                </div>
                <div>
                  {items.map(cmd => {
                    flatIndex += 1
                    const isSelected = flatIndex === selectedIndex
                    return (
                      <button
                        key={cmd.id}
                        data-active={isSelected}
                        onMouseEnter={() => setSelectedIndex(filtered.indexOf(cmd))}
                        onClick={() => { cmd.action(); onClose() }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                          isSelected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--muted-soft)]'
                        }`}
                      >
                        {cmd.pill && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${cmd.pill.cls}`}>
                            {cmd.pill.text}
                          </span>
                        )}
                        <span className={`flex-1 truncate ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--heading)]'}`}>
                          {cmd.label}
                        </span>
                        {cmd.hint && (
                          <span className="text-[10px] text-[var(--muted)] font-mono truncate max-w-[180px]">{cmd.hint}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--card-border)] flex items-center gap-4 text-[10px] text-[var(--muted)]">
          <span className="flex items-center gap-1"><Key>↑</Key><Key>↓</Key> navigate</span>
          <span className="flex items-center gap-1"><Key>↵</Key> select</span>
          <span className="flex items-center gap-1"><Key>esc</Key> close</span>
        </div>
      </div>
    </div>
  )
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1 py-0.5 rounded bg-[var(--muted-soft)] border border-[var(--card-border)] font-mono text-[9px] text-[var(--heading)] min-w-[16px] text-center">
      {children}
    </kbd>
  )
}
