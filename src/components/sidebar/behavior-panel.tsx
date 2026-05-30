'use client'

import { useState } from 'react'
import { Section } from './section'
import { ConfigModal } from './config-modal'
import { BEHAVIORS, SEQUENCE_PRESETS } from './presets'
import type { ChannelControls } from './use-channel-controls'

type Props = {
  activeBehavior: string
  activeScenario: string
  controls: ChannelControls
}

export function BehaviorPanel({ activeBehavior, activeScenario, controls }: Props) {
  const { busy, applyBehavior, applySequence } = controls
  const [showAllBehaviors, setShowAllBehaviors] = useState(false)
  const [pending, setPending] = useState<string | null>(null)

  function handleBehaviorClick(value: string) {
    if (value === activeBehavior) return
    if (value === 'slow' || value === 'timeout' || value === 'custom') {
      setPending(value)
      return
    }
    applyBehavior(value)
  }

  const visibleBehaviors = showAllBehaviors ? BEHAVIORS : BEHAVIORS.slice(0, 6)

  return (
    <Section title="Behavior" subtitle="One config controls what this channel returns.">
      <div className="space-y-1">
        {visibleBehaviors.map((b) => {
          const isActive = activeBehavior === b.value
          const isBusy = busy === `behavior:${b.value}`
          return (
            <button
              key={b.value}
              onClick={() => handleBehaviorClick(b.value)}
              disabled={isBusy}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                isActive ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30' : 'hover:bg-[var(--muted-soft)]'
              }`}
            >
              <span className={`inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${b.pill}`}>
                {b.code}
              </span>
              <span className="text-xs text-[var(--heading)] flex-1">{b.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => setShowAllBehaviors((s) => !s)}
        className="text-[11px] text-[var(--accent)] hover:underline mt-2"
      >
        {showAllBehaviors ? 'Show common' : `Show all ${BEHAVIORS.length}`}
      </button>

      <div className="mt-4 pt-3 border-t border-[var(--card-border)]">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1.5">
          Sequence presets
        </div>
        <div className="space-y-1">
          {SEQUENCE_PRESETS.map((p) => {
            const isActive = activeScenario === p.name
            const isBusy = busy === `sequence:${p.name}`
            return (
              <button
                key={p.name}
                onClick={() => applySequence(p.steps, p.name)}
                disabled={isBusy}
                className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                  isActive ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30' : 'hover:bg-[var(--muted-soft)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--heading)] truncate flex-1">{p.label}</span>
                  {isActive && <span className="text-[9px] uppercase font-semibold text-[var(--accent)] tracking-wider">Active</span>}
                </div>
                <div className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">{p.description}</div>
              </button>
            )
          })}
        </div>
      </div>

      {pending && (
        <ConfigModal
          behavior={pending}
          onClose={() => setPending(null)}
          onApply={(behavior, extra) => {
            applyBehavior(behavior, extra)
            setPending(null)
          }}
        />
      )}
    </Section>
  )
}
