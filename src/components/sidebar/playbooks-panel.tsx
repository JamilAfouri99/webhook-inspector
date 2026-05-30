'use client'

import { useEffect, useState } from 'react'
import { Section } from './section'
import { configSummary, type ApplyConfig, type Playbook, type PlaybookStep } from './presets'
import type { ChannelControls } from './use-channel-controls'

export function PlaybooksPanel({ controls }: { controls: ChannelControls }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/playbooks')
      .then((r) => r.json())
      .then((d) => setPlaybooks(d.playbooks || []))
      .catch(() => {})
  }, [])

  return (
    <Section title="Playbooks" subtitle="Guided procedures to verify your producer behavior.">
      <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
        {playbooks.map((p) => {
          const isOpen = expanded === p.name
          return (
            <div key={p.name} className="rounded-md border border-[var(--card-border)] bg-[var(--card)]">
              <button
                onClick={() => setExpanded(isOpen ? null : p.name)}
                className="w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-[var(--muted-soft)] transition-colors"
              >
                <svg className={`w-3 h-3 mt-1 text-[var(--muted)] shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-[var(--heading)] leading-tight">{p.label}</div>
                  <div className="text-[10px] text-[var(--muted)] leading-snug mt-0.5">{p.question}</div>
                </div>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-[var(--card-border)] space-y-2">
                  <ol className="space-y-1.5 mt-1">
                    {p.steps.map((step, i) => (
                      <PlaybookStepView key={i} step={step} index={i + 1} onApply={controls.applyConfig} busy={controls.busy} />
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}

function PlaybookStepView({
  step,
  index,
  onApply,
  busy,
}: {
  step: PlaybookStep
  index: number
  onApply: (cfg: ApplyConfig) => void
  busy: string | null
}) {
  if (step.kind === 'apply' || step.kind === 'switch') {
    const summary = configSummary(step)
    const busyKey = step.sequence ? `sequence:${step.presetName ?? 'custom'}` : `behavior:${step.behavior}`
    const isBusy = busy === busyKey
    return (
      <li className="flex gap-2 text-[11px]">
        <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] text-[9px] font-semibold flex items-center justify-center">{index}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--accent)]">
              {step.kind === 'apply' ? 'Apply' : 'Switch'}
            </span>
            <code className="text-[10px] font-mono bg-[var(--muted-soft)] px-1 py-0.5 rounded">{summary}</code>
            <button
              onClick={() => onApply(step)}
              disabled={isBusy}
              className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {isBusy ? '…' : 'Apply'}
            </button>
          </div>
          {step.note && <div className="text-[10px] text-[var(--muted)] mt-0.5">{step.note}</div>}
        </div>
      </li>
    )
  }
  if (step.kind === 'do') {
    return (
      <li className="flex gap-2 text-[11px]">
        <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-[var(--muted-soft)] text-[var(--heading)] text-[9px] font-semibold flex items-center justify-center">{index}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-0.5">Do</div>
          <div className="text-[11px] text-[var(--heading)] leading-relaxed">{step.text}</div>
        </div>
      </li>
    )
  }
  return (
    <li className="flex gap-2 text-[11px]">
      <span className="shrink-0 w-4 h-4 mt-0.5 rounded-full bg-[var(--success-soft)] text-[var(--success-text)] text-[9px] font-semibold flex items-center justify-center">{index}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--success-text)] mb-0.5">Observe</div>
        <div className="text-[11px] text-[var(--heading)] leading-relaxed">{step.text}</div>
      </div>
    </li>
  )
}
