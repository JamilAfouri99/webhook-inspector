'use client'

import { useEffect, useState } from 'react'
import { toCurl } from '@/lib/curl'
import { useToast } from './toaster'

type BehaviorPreset = { value: string; label: string; code: string; pill: string }

const BEHAVIORS: BehaviorPreset[] = [
  { value: 'success',           label: 'Success',         code: '200',   pill: 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]' },
  { value: 'server-error',      label: 'Server Error',    code: '500',   pill: 'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]' },
  { value: 'timeout',           label: 'Timeout',         code: 'HANG',  pill: 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]' },
  { value: 'slow',              label: 'Slow',            code: 'SLOW',  pill: 'bg-[#ffedb0] text-[#793200] border-[#fae079]' },
  { value: 'client-error',      label: 'Bad Request',     code: '400',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'unauthorized',      label: 'Unauthorized',    code: '401',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'not-found',         label: 'Not Found',       code: '404',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'rate-limited',      label: 'Rate Limited',    code: '429',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'redirect',          label: 'Redirect',        code: '302',   pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'large-response',    label: 'Large Response',  code: '1.5MB', pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'empty-response',    label: 'Empty Body',      code: '200',   pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'non-json-response', label: 'Non-JSON',        code: 'TEXT',  pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'custom',            label: 'Custom Code',     code: '???',   pill: 'bg-[#ebeef1] text-[#425466] border-[#d8dee4]' },
]

export type SequenceStep = { behavior: string; delayMs?: number; statusCode?: number }

export type SequencePreset = {
  name: string
  label: string
  description: string
  steps: SequenceStep[]
}

export const SEQUENCE_PRESETS: SequencePreset[] = [
  {
    name: 'flap-500-200',
    label: 'Flap (500, 200, …)',
    description: 'Alternates failure and success on each request.',
    steps: [{ behavior: 'server-error' }, { behavior: 'success' }],
  },
  {
    name: 'recover-after-2-fails',
    label: 'Recover after 2 fails',
    description: 'Two 500s then a 200 — verifies last-attempt success.',
    steps: [{ behavior: 'server-error' }, { behavior: 'server-error' }, { behavior: 'success' }],
  },
  {
    name: 'mixed-errors',
    label: 'Mixed errors (500, 400, 200)',
    description: 'Retryable, non-retryable, success — hits different policies.',
    steps: [{ behavior: 'server-error' }, { behavior: 'client-error' }, { behavior: 'success' }],
  },
]

type ApplyConfig = {
  behavior?: string
  delayMs?: number
  statusCode?: number
  sequence?: SequenceStep[]
  presetName?: string
}

type PlaybookStep =
  | ({ kind: 'apply'; note?: string } & ApplyConfig)
  | ({ kind: 'switch'; note: string } & ApplyConfig)
  | { kind: 'do'; text: string }
  | { kind: 'observe'; text: string }

type Playbook = { name: string; label: string; intent: string; question: string; steps: PlaybookStep[] }

type Props = {
  channelSlug: string
  webhookUrl: string
  activeBehavior: string
  activeScenario: string
  forwardUrl: string | null
  forwardEnabled: boolean
}

export function Sidebar({ channelSlug, webhookUrl, activeBehavior, activeScenario, forwardUrl, forwardEnabled }: Props) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [copied, setCopied] = useState<null | 'url' | 'curl'>(null)
  const [expandedPlaybook, setExpandedPlaybook] = useState<string | null>(null)
  const [showAllBehaviors, setShowAllBehaviors] = useState(false)
  const [customCode, setCustomCode] = useState<number | undefined>(undefined)
  const [pendingDelayBehavior, setPendingDelayBehavior] = useState<string | null>(null)
  const [delayMs, setDelayMs] = useState<number>(0)
  const [forwardInput, setForwardInput] = useState(forwardUrl ?? '')
  const [forwardSaving, setForwardSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    setForwardInput(forwardUrl ?? '')
  }, [forwardUrl])

  useEffect(() => {
    fetch('/api/playbooks').then(r => r.json()).then(d => setPlaybooks(d.playbooks || [])).catch(() => {})
  }, [])

  async function saveForward(opts: { enabled?: boolean; clear?: boolean; silent?: boolean }) {
    setForwardSaving(true)
    const url = opts.clear ? null : forwardInput.trim()
    const enabled = opts.clear ? false : (opts.enabled ?? forwardEnabled)
    if (!opts.clear && url && !isValidUrl(url)) {
      toast({ kind: 'error', title: 'Invalid URL', detail: 'Must start with http:// or https://' })
      setForwardSaving(false)
      return
    }
    try {
      const res = await fetch(`/api/channels/${channelSlug}/forward`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, enabled }),
      })
      if (res.ok) {
        if (!opts.silent) {
          toast({
            kind: 'success',
            title: opts.clear
              ? 'Forwarding cleared'
              : enabled
                ? 'Forwarding enabled'
                : 'Forward URL saved',
            detail: opts.clear ? undefined : url ?? undefined,
          })
        }
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ kind: 'error', title: 'Forward save failed', detail: data.error ?? `HTTP ${res.status}` })
      }
    } catch (e) {
      toast({ kind: 'error', title: 'Network error', detail: (e as Error).message })
    } finally {
      setForwardSaving(false)
    }
  }

  function handleForwardBlur() {
    const trimmed = forwardInput.trim()
    if (trimmed === (forwardUrl ?? '')) return
    if (trimmed === '' && forwardUrl) {
      saveForward({ clear: true })
    } else if (trimmed !== '') {
      saveForward({})
    }
  }

  async function applyBehavior(value: string, extra: Record<string, unknown> = {}) {
    setBusy(`behavior:${value}`)
    try {
      const res = await fetch(`/api/channels/${channelSlug}/behavior`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ behavior: value, ...extra }),
      })
      if (res.ok) toast({ kind: 'success', title: `Behavior: ${value}` })
      else toast({ kind: 'error', title: `Failed to set behavior (${res.status})` })
    } finally {
      setBusy(null)
      setPendingDelayBehavior(null)
    }
  }

  async function applySequence(steps: SequenceStep[], presetName?: string) {
    setBusy(presetName ? `sequence:${presetName}` : 'sequence:custom')
    try {
      const res = await fetch(`/api/channels/${channelSlug}/sequence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steps, name: presetName }),
      })
      if (res.ok) toast({ kind: 'success', title: presetName ? `Sequence: ${presetName}` : 'Custom sequence applied' })
      else toast({ kind: 'error', title: `Failed to apply sequence (${res.status})` })
    } finally {
      setBusy(null)
    }
  }

  async function applyConfig(cfg: ApplyConfig) {
    if (cfg.sequence && cfg.sequence.length > 0) {
      await applySequence(cfg.sequence, cfg.presetName)
      return
    }
    if (cfg.behavior) {
      const extra: Record<string, unknown> = {}
      if (cfg.delayMs !== undefined) extra.delayMs = cfg.delayMs
      if (cfg.statusCode !== undefined) extra.statusCode = cfg.statusCode
      await applyBehavior(cfg.behavior, extra)
    }
  }

  function handleBehaviorClick(value: string) {
    if (value === activeBehavior) return
    if (value === 'slow' || value === 'timeout') {
      setPendingDelayBehavior(value)
      setDelayMs(value === 'timeout' ? 35000 : 10000)
      return
    }
    if (value === 'custom') {
      setPendingDelayBehavior('custom')
      setCustomCode(418)
      return
    }
    applyBehavior(value)
  }

  function copy(value: string, kind: 'url' | 'curl') {
    navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  const curlSnippet = toCurl({
    method: 'POST',
    url: webhookUrl,
    headers: { 'Content-Type': 'application/json' },
    body: { eventId: 'evt_demo', event: 'test.ping' },
  })

  const visibleBehaviors = showAllBehaviors ? BEHAVIORS : BEHAVIORS.slice(0, 6)

  return (
    <aside className="w-[320px] shrink-0 border-r border-[var(--card-border)] bg-white overflow-y-auto">
      <div className="p-4 space-y-5">
        <Section title="Endpoint">
          <div className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] p-2">
            <code className="block text-[11px] font-mono text-[var(--heading)] break-all leading-snug">
              {webhookUrl}
            </code>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => copy(webhookUrl, 'url')}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-white hover:bg-[var(--muted-soft)] text-[var(--heading)]"
            >
              {copied === 'url' ? 'Copied!' : 'Copy URL'}
            </button>
            <button
              onClick={() => copy(curlSnippet, 'curl')}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-white hover:bg-[var(--muted-soft)] text-[var(--heading)]"
            >
              {copied === 'curl' ? 'Copied!' : 'Copy as curl'}
            </button>
          </div>
        </Section>

        <Section title="Behavior" subtitle="One config controls what this channel returns.">
          <div className="space-y-1">
            {visibleBehaviors.map(b => {
              const isActive = activeBehavior === b.value
              const isBusy = busy === `behavior:${b.value}`
              return (
                <button
                  key={b.value}
                  onClick={() => handleBehaviorClick(b.value)}
                  disabled={isBusy}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-left transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30'
                      : 'hover:bg-[var(--muted-soft)]'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center min-w-[44px] px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${b.pill}`}>
                    {b.code}
                  </span>
                  <span className="text-xs text-[var(--heading)] flex-1">{b.label}</span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowAllBehaviors(s => !s)}
            className="text-[11px] text-[var(--accent)] hover:underline mt-2"
          >
            {showAllBehaviors ? 'Show common' : `Show all ${BEHAVIORS.length}`}
          </button>

          <div className="mt-4 pt-3 border-t border-[var(--card-border)]">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1.5">
              Sequence presets
            </div>
            <div className="space-y-1">
              {SEQUENCE_PRESETS.map(p => {
                const isActive = activeScenario === p.name
                const isBusy = busy === `sequence:${p.name}`
                return (
                  <button
                    key={p.name}
                    onClick={() => applySequence(p.steps, p.name)}
                    disabled={isBusy}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md transition-colors ${
                      isActive
                        ? 'bg-[var(--accent-soft)] ring-1 ring-[var(--accent)]/30'
                        : 'hover:bg-[var(--muted-soft)]'
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
        </Section>

        <Section title="Forward">
          <div
            className={`rounded-lg border p-3 transition-colors ${
              forwardEnabled
                ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]'
                : 'border-[var(--card-border)] bg-[var(--muted-soft)]'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`inline-flex w-2 h-2 rounded-full shrink-0 ${forwardEnabled ? 'bg-[var(--success)] animate-pulse-dot' : 'bg-[var(--card-border-strong)]'}`} />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[var(--heading)] leading-tight">
                    {forwardEnabled ? 'Relaying live' : forwardUrl ? 'Configured · paused' : 'Off'}
                  </div>
                  <div className="text-[10px] text-[var(--muted)] leading-snug">
                    {forwardEnabled
                      ? 'Every webhook is fired to the URL below.'
                      : 'Mirror incoming webhooks to a local server or external URL.'}
                  </div>
                </div>
              </div>
              <SlideToggle
                checked={forwardEnabled}
                disabled={!forwardUrl || forwardSaving}
                onChange={(next) => saveForward({ enabled: next })}
              />
            </div>

            <input
              value={forwardInput}
              onChange={(e) => setForwardInput(e.target.value)}
              onBlur={handleForwardBlur}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
              placeholder="https://localhost:3000/webhook"
              className="w-full px-2.5 py-1.5 text-[11px] font-mono border border-[var(--card-border)] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            />

            {forwardUrl && (
              <div className="flex items-center justify-end mt-2">
                <button
                  onClick={() => saveForward({ clear: true })}
                  className="text-[10px] px-2 py-0.5 rounded-md text-[var(--muted)] hover:bg-white hover:text-[var(--error-text)]"
                >
                  Clear URL
                </button>
              </div>
            )}
          </div>
        </Section>

        <Section
          title="Playbooks"
          subtitle="Guided procedures to verify your producer behavior."
        >
          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {playbooks.map(p => {
              const isOpen = expandedPlaybook === p.name
              return (
                <div key={p.name} className="rounded-md border border-[var(--card-border)] bg-white">
                  <button
                    onClick={() => setExpandedPlaybook(isOpen ? null : p.name)}
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
                          <PlaybookStepView
                            key={i}
                            step={step}
                            index={i + 1}
                            onApply={(cfg) => applyConfig(cfg)}
                            busy={busy}
                          />
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Section>
      </div>

      {pendingDelayBehavior && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setPendingDelayBehavior(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white border border-[var(--card-border)] rounded-xl w-full max-w-sm mx-4 p-5"
            style={{ boxShadow: 'var(--shadow-md)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--heading)] mb-3">
              Configure {pendingDelayBehavior}
            </h3>
            {pendingDelayBehavior === 'custom' ? (
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">HTTP Status Code (100–599)</label>
                <input
                  type="number"
                  value={customCode ?? ''}
                  onChange={e => setCustomCode(parseInt(e.target.value) || undefined)}
                  className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs text-[var(--muted)] mb-1.5">Delay (milliseconds)</label>
                <input
                  type="number"
                  value={delayMs}
                  onChange={e => setDelayMs(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                />
              </div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setPendingDelayBehavior(null)}
                className="text-xs px-4 py-2 rounded-md border border-[var(--card-border)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pendingDelayBehavior === 'custom') {
                    applyBehavior('custom', { statusCode: customCode })
                  } else {
                    applyBehavior(pendingDelayBehavior, { delayMs })
                  }
                }}
                className="text-xs px-4 py-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)]">{title}</h3>
        {subtitle && <p className="text-[10px] text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function SlideToggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[20px] w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-[var(--accent)]' : 'bg-[var(--card-border-strong)]'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-[16px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function PlaybookStepView({
  step, index, onApply, busy,
}: { step: PlaybookStep; index: number; onApply: (cfg: ApplyConfig) => void; busy: string | null }) {
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

function configSummary(cfg: ApplyConfig): string {
  if (cfg.sequence && cfg.sequence.length > 0) {
    if (cfg.presetName) return cfg.presetName
    return cfg.sequence.map((s) => s.behavior).join(' → ')
  }
  if (cfg.behavior) {
    const extras: string[] = []
    if (cfg.delayMs) extras.push(`delay=${cfg.delayMs}ms`)
    if (cfg.statusCode) extras.push(`status=${cfg.statusCode}`)
    return extras.length === 0 ? cfg.behavior : `${cfg.behavior} (${extras.join(', ')})`
  }
  return '—'
}
