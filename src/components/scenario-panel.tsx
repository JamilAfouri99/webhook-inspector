'use client'

import { useState, useEffect } from 'react'

type Scenario = {
  name: string
  description: string
  whatToExpect: string
  category: string
}

type Props = {
  activeScenario: string
  channelSlug: string
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  'basic': { label: 'Basic', color: 'bg-blue-500/20 text-blue-400' },
  'retry': { label: 'Retry', color: 'bg-amber-500/20 text-amber-400' },
  'circuit-breaker': { label: 'Circuit Breaker', color: 'bg-purple-500/20 text-purple-400' },
  'edge-case': { label: 'Edge Case', color: 'bg-cyan-500/20 text-cyan-400' },
  'verification': { label: 'Verification', color: 'bg-green-500/20 text-green-400' },
}

export function ScenarioPanel({ activeScenario, channelSlug }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/scenarios')
      .then(r => r.json())
      .then(data => {
        setScenarios(data.scenarios || [])
        setLoading(false)
        setFetchError(false)
      })
      .catch(() => {
        setLoading(false)
        setFetchError(true)
      })
  }, [])

  async function activate(name: string) {
    setActivating(name)
    setActivateError(null)
    let errorOccurred = false
    try {
      const res = await fetch(`/api/channels/${channelSlug}/scenarios/${name}/activate`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setActivateError(data.error || `Failed (${res.status})`)
        errorOccurred = true
      }
    } catch {
      setActivateError('Network error activating scenario')
      errorOccurred = true
    } finally {
      setActivating(null)
      if (errorOccurred) setTimeout(() => setActivateError(null), 5000)
    }
  }

  const filtered = filterCategory
    ? scenarios.filter(s => s.category === filterCategory)
    : scenarios

  const categories = [...new Set(scenarios.map(s => s.category))]

  if (loading) {
    return <div className="text-[var(--muted)] text-sm">Loading scenarios...</div>
  }

  if (fetchError) {
    return <div className="text-[var(--error)] text-sm">Failed to load scenarios.</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Test Scenarios</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterCategory(null)}
            className={`px-2 py-1 rounded text-xs ${!filterCategory ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-border)] text-[var(--muted)]'}`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2 py-1 rounded text-xs ${filterCategory === cat ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-border)] text-[var(--muted)]'}`}
            >
              {categoryLabels[cat]?.label || cat}
            </button>
          ))}
        </div>
      </div>

      {activateError && (
        <div className="text-[var(--error)] text-xs mb-3 px-3 py-2 rounded bg-[var(--error)]/10 border border-[var(--error)]/30">
          {activateError}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(scenario => {
          const isActive = activeScenario === scenario.name
          const isExpanded = expanded === scenario.name
          const cat = categoryLabels[scenario.category]

          return (
            <div
              key={scenario.name}
              className={`rounded-lg border transition-colors ${
                isActive
                  ? 'border-[var(--accent)] bg-[var(--accent-dim)]/20'
                  : 'border-[var(--card-border)] bg-[var(--card)] hover:border-[var(--muted)]/40'
              }`}
            >
              <div className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{scenario.name}</span>
                    {cat && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cat.color}`}>
                        {cat.label}
                      </span>
                    )}
                    {isActive && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--success)]/20 text-[var(--success)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{scenario.description}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : scenario.name)}
                    className="px-2 py-1 rounded text-xs bg-[var(--card-border)] hover:bg-[var(--muted)]/20 transition-colors"
                  >
                    {isExpanded ? 'Less' : 'More'}
                  </button>
                  <button
                    onClick={() => activate(scenario.name)}
                    disabled={activating === scenario.name}
                    className="px-3 py-1 rounded text-xs bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50"
                  >
                    {activating === scenario.name ? 'Activating...' : 'Activate'}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="px-3 pb-3 pt-0">
                  <div className="text-xs text-[var(--muted)] bg-[var(--background)] rounded p-3 leading-relaxed">
                    <span className="text-[var(--warning)] font-medium">What to expect: </span>
                    {scenario.whatToExpect}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
