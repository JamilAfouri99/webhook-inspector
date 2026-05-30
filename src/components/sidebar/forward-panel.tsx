'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useToast } from '@/components/toaster'
import { STATUS_KEY } from '@/lib/hooks/use-api'
import { Section } from './section'

type Props = {
  channelSlug: string
  forwardUrl: string | null
  forwardEnabled: boolean
}

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function ForwardPanel({ channelSlug, forwardUrl, forwardEnabled }: Props) {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const [forwardInput, setForwardInput] = useState(forwardUrl ?? '')
  const [forwardSaving, setForwardSaving] = useState(false)

  // Keep the input in sync when the saved URL changes, via render-time adjustment.
  const [prevForwardUrl, setPrevForwardUrl] = useState(forwardUrl)
  if (forwardUrl !== prevForwardUrl) {
    setPrevForwardUrl(forwardUrl)
    setForwardInput(forwardUrl ?? '')
  }

  async function saveForward(opts: { enabled?: boolean; clear?: boolean; silent?: boolean }) {
    setForwardSaving(true)
    const url = opts.clear ? null : forwardInput.trim()
    const enabled = opts.clear ? false : opts.enabled ?? forwardEnabled
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
        mutate(STATUS_KEY(channelSlug))
        if (!opts.silent) {
          toast({
            kind: 'success',
            title: opts.clear ? 'Forwarding cleared' : enabled ? 'Forwarding enabled' : 'Forward URL saved',
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
    if (trimmed === '' && forwardUrl) saveForward({ clear: true })
    else if (trimmed !== '') saveForward({})
  }

  return (
    <Section title="Forward">
      <div
        className={`rounded-lg border p-3 transition-colors ${
          forwardEnabled ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)]' : 'border-[var(--card-border)] bg-[var(--muted-soft)]'
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
          className="w-full px-2.5 py-1.5 text-[11px] font-mono border border-[var(--card-border)] rounded-md bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
        />

        {forwardUrl && (
          <div className="flex items-center justify-end mt-2">
            <button
              onClick={() => saveForward({ clear: true })}
              className="text-[10px] px-2 py-0.5 rounded-md text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--error-text)]"
            >
              Clear URL
            </button>
          </div>
        )}
      </div>
    </Section>
  )
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
