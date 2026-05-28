'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'

type Props = {
  webhooks: ReceivedWebhook[]
  onSelect: (webhook: ReceivedWebhook) => void
  selectedId?: string
  channelSlug: string
}

function statusKind(code: number): 'pending' | 'success' | 'warning' | 'error' {
  if (code === 0) return 'pending'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warning'
  return 'error'
}

const KIND_PILL: Record<string, string> = {
  pending: 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]',
  success: 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]',
  warning: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
  error:   'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]',
}

const KIND_BAR: Record<string, string> = {
  pending: 'bg-[#a855f7]',
  success: 'bg-[var(--success)]',
  warning: 'bg-[#bb5504]',
  error:   'bg-[var(--error)]',
}

export function EventStream({ webhooks, onSelect, selectedId, channelSlug }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [groupByEvent, setGroupByEvent] = useState(true)
  const [filterKind, setFilterKind] = useState<'all' | 'success' | 'warning' | 'error' | 'pending'>('all')
  const [search, setSearch] = useState('')
  const [paused, setPaused] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkReplaying, setBulkReplaying] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ succeeded: number; failed: number; total: number } | null>(null)

  function toggleId(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function clearSelection() {
    setSelectedIds(new Set())
    setSelectMode(false)
  }

  async function bulkReplay() {
    if (selectedIds.size === 0) return
    setBulkReplaying(true)
    setBulkResult(null)
    try {
      const res = await fetch(`/api/channels/${channelSlug}/history/bulk-replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      })
      const data = await res.json()
      setBulkResult({ succeeded: data.succeeded ?? 0, failed: data.failed ?? 0, total: data.total ?? 0 })
      setTimeout(() => setBulkResult(null), 4000)
      clearSelection()
    } catch {
      setBulkResult({ succeeded: 0, failed: selectedIds.size, total: selectedIds.size })
    } finally {
      setBulkReplaying(false)
    }
  }

  useEffect(() => {
    if (paused) return
    if (containerRef.current && containerRef.current.scrollTop < 100) {
      containerRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [webhooks.length, paused])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return webhooks.filter(w => {
      if (filterKind !== 'all' && statusKind(w.respondedWith.statusCode) !== filterKind) return false
      if (q) {
        const evt = (w.body?.event || '').toString().toLowerCase()
        const eid = (w.body?.eventId || '').toString().toLowerCase()
        if (evt.includes(q) || eid.includes(q)) return true
        // also search inside body JSON content
        try {
          const json = JSON.stringify(w.body ?? '').toLowerCase()
          if (json.includes(q)) return true
        } catch { /* ignore */ }
        return false
      }
      return true
    })
  }, [webhooks, filterKind, search])

  const groups = useMemo(() => {
    if (!groupByEvent) return null
    const map = new Map<string, ReceivedWebhook[]>()
    for (const w of filtered) {
      const k = w.body?.eventId || `unknown-${w.index}`
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(w)
    }
    return Array.from(map.entries())
      .map(([eid, items]) => ({ eventId: eid, items: items.sort((a, b) => a.receivedAtMs - b.receivedAtMs) }))
      .sort((a, b) => b.items[b.items.length - 1].receivedAtMs - a.items[a.items.length - 1].receivedAtMs)
  }, [filtered, groupByEvent])

  function toggleExpand(eventId: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) next.delete(eventId)
      else next.add(eventId)
      return next
    })
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
      <div className="px-4 py-2.5 border-b border-[var(--card-border)] flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          {(['all', 'success', 'warning', 'error', 'pending'] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilterKind(k)}
              className={`text-[11px] px-2 py-1 rounded-md capitalize transition-colors ${
                filterKind === k
                  ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
                  : 'text-[var(--muted)] hover:bg-[var(--muted-soft)]'
              }`}
            >
              {k === 'pending' ? 'Timeout' : k}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-[var(--card-border)] mx-1" />

        <input
          id="stream-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search event, ID, or any field in payload… (/)"
          className="flex-1 max-w-[280px] text-xs px-3 py-1.5 border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
        />

        <label className="flex items-center gap-1.5 text-[11px] text-[var(--muted)] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={groupByEvent}
            onChange={(e) => setGroupByEvent(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          Group by event
        </label>

        <button
          onClick={() => { setSelectMode(s => !s); if (selectMode) setSelectedIds(new Set()) }}
          className={`ml-auto text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
            selectMode
              ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
              : 'border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--muted-soft)]'
          }`}
        >
          {selectMode ? 'Done' : 'Select'}
        </button>

        <button
          onClick={() => setPaused(p => !p)}
          className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${
            paused
              ? 'border-[var(--warning-border)] bg-[var(--warning-soft)] text-[var(--warning-text)]'
              : 'border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--muted-soft)]'
          }`}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>

      {selectMode && (
        <div className="px-4 py-2 border-b border-[var(--accent)]/30 bg-[var(--accent-soft)] flex items-center gap-3 shrink-0">
          <span className="text-xs font-medium text-[var(--accent)]">
            {selectedIds.size} selected
          </span>
          <button
            onClick={bulkReplay}
            disabled={bulkReplaying || selectedIds.size === 0}
            className="text-xs px-3 py-1 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
          >
            {bulkReplaying ? 'Replaying…' : `↻ Replay ${selectedIds.size}`}
          </button>
          <button
            onClick={clearSelection}
            className="text-xs px-2 py-1 rounded-md text-[var(--muted)] hover:bg-white"
          >
            Cancel
          </button>
          {bulkResult && (
            <span className="ml-auto text-[11px] text-[var(--heading)]">
              ✓ {bulkResult.succeeded} succeeded · {bulkResult.failed > 0 && <span className="text-[var(--error-text)]">{bulkResult.failed} failed</span>}
            </span>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <EmptyState search={search} filterKind={filterKind} hasAny={webhooks.length > 0} />
        ) : groupByEvent && groups ? (
          <div className="divide-y divide-[var(--card-border)]">
            {groups.map(group => {
              const isMulti = group.items.length > 1
              const isExpanded = isMulti && expanded.has(group.eventId)
              const latest = group.items[group.items.length - 1]
              const kind = statusKind(latest.respondedWith.statusCode)
              return (
                <div key={group.eventId} className="bg-white">
                  <Row
                    webhook={latest}
                    kind={kind}
                    onClick={() => onSelect(latest)}
                    selected={selectedId === latest.id}
                    extraLabel={isMulti ? `${group.items.length} attempts` : undefined}
                    expandable={isMulti}
                    expanded={isExpanded}
                    onToggleExpand={() => toggleExpand(group.eventId)}
                    selectMode={selectMode}
                    isChecked={selectedIds.has(latest.id)}
                    onToggleCheck={() => toggleId(latest.id)}
                  />
                  {isExpanded && (
                    <div className="bg-[var(--muted-soft)]">
                      {group.items.map((w, i) => {
                        const gap = i > 0 ? Math.round((w.receivedAtMs - group.items[i-1].receivedAtMs) / 1000) : 0
                        return (
                          <button
                            key={w.id}
                            onClick={() => onSelect(w)}
                            className={`w-full text-left px-12 py-1.5 flex items-center gap-3 text-[11px] hover:bg-white transition-colors ${
                              selectedId === w.id ? 'bg-white' : ''
                            }`}
                          >
                            <span className="text-[var(--muted)]">#{i + 1}</span>
                            <StatusPill code={w.respondedWith.statusCode} />
                            <span className="text-[var(--muted)] font-mono">
                              {new Date(w.receivedAt).toLocaleTimeString()}
                            </span>
                            {gap > 0 && (
                              <span className="text-[var(--muted)]">+{gap}s</span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="divide-y divide-[var(--card-border)]">
            {[...filtered].reverse().map(w => (
              <Row
                key={w.id}
                webhook={w}
                kind={statusKind(w.respondedWith.statusCode)}
                onClick={() => onSelect(w)}
                selected={selectedId === w.id}
                selectMode={selectMode}
                isChecked={selectedIds.has(w.id)}
                onToggleCheck={() => toggleId(w.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({
  webhook, kind, onClick, selected, extraLabel, expandable, expanded, onToggleExpand,
  selectMode, isChecked, onToggleCheck,
}: {
  webhook: ReceivedWebhook
  kind: keyof typeof KIND_BAR
  onClick: () => void
  selected: boolean
  extraLabel?: string
  expandable?: boolean
  expanded?: boolean
  onToggleExpand?: () => void
  selectMode?: boolean
  isChecked?: boolean
  onToggleCheck?: () => void
}) {
  const evt = webhook.body?.event || 'unknown'
  const eid = (webhook.body?.eventId || '-').substring(0, 28)
  const time = new Date(webhook.receivedAt).toLocaleTimeString()

  return (
    <div
      className={`group flex items-stretch animate-fade-in ${
        selected ? 'bg-[var(--accent-soft)]' : 'hover:bg-[var(--muted-soft)]'
      } transition-colors`}
    >
      <div className={`w-1 shrink-0 ${KIND_BAR[kind]}`} />
      {selectMode && (
        <label className="flex items-center px-3 cursor-pointer" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={!!isChecked}
            onChange={onToggleCheck}
            className="accent-[var(--accent)]"
          />
        </label>
      )}
      <button
        onClick={onClick}
        className="flex-1 min-w-0 text-left px-3 py-2.5 grid grid-cols-[28px_1fr_220px_70px_90px_70px] gap-3 items-center text-xs"
      >
        <span className="text-[var(--muted)] font-mono">{webhook.index}</span>
        <span className="font-medium text-[var(--heading)] truncate">{evt}</span>
        <span className="text-[var(--muted)] font-mono text-[10px] truncate">{eid}</span>
        <StatusPill code={webhook.respondedWith.statusCode} />
        <span className="text-[var(--muted)] truncate">{webhook.respondedWith.behavior}</span>
        <span className="text-[var(--muted)] text-right">{time}</span>
      </button>
      {expandable && onToggleExpand && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleExpand() }}
          className="px-3 flex items-center gap-1.5 text-[10px] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--muted-soft)] shrink-0"
        >
          <span>{extraLabel}</span>
          <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
    </div>
  )
}

function StatusPill({ code }: { code: number }) {
  const kind = statusKind(code)
  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${KIND_PILL[kind]}`}>
      {code === 0 ? 'HANG' : code}
    </span>
  )
}

function EmptyState({ search, filterKind, hasAny }: { search: string; filterKind: string; hasAny: boolean }) {
  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] gap-3 p-8">
        <div className="w-14 h-14 rounded-full bg-[var(--muted-soft)] flex items-center justify-center">
          <svg className="w-6 h-6 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="text-sm font-medium text-[var(--heading)]">No webhooks yet</div>
        <div className="text-xs text-center max-w-xs">
          Point your producer at the endpoint shown in the sidebar, or use the <span className="font-medium">Send Test</span> button.
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center h-full text-[var(--muted)] gap-2 p-8">
      <div className="text-sm">No matches</div>
      <div className="text-xs">
        {search ? `Search "${search}" returned no results` : `No ${filterKind} events`}
      </div>
    </div>
  )
}
