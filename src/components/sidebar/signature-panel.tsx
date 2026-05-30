'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { useToast } from '@/components/toaster'
import { STATUS_KEY } from '@/lib/hooks/use-api'
import { SIGNATURE_SCHEME_CATALOG } from '@/domain/signatures/catalog'
import { Section } from './section'

type Props = {
  channelSlug: string
  signatureScheme: string | null
}

export function SignaturePanel({ channelSlug, signatureScheme }: Props) {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const [selected, setSelected] = useState(signatureScheme ?? '')
  const [secret, setSecret] = useState('')
  const [saving, setSaving] = useState(false)

  // Sync the dropdown when the saved scheme changes elsewhere.
  const [prevScheme, setPrevScheme] = useState(signatureScheme)
  if (signatureScheme !== prevScheme) {
    setPrevScheme(signatureScheme)
    setSelected(signatureScheme ?? '')
  }

  const meta = SIGNATURE_SCHEME_CATALOG.find((s) => s.id === selected)

  async function save() {
    if (selected && secret.trim() === '') {
      toast({ kind: 'error', title: 'Secret required', detail: 'Enter the signing secret for this provider.' })
      return
    }
    setSaving(true)
    try {
      const payload = selected ? { scheme: selected, secret: secret.trim() } : { scheme: null }
      const res = await fetch(`/api/channels/${channelSlug}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        mutate(STATUS_KEY(channelSlug))
        setSecret('')
        toast({ kind: 'success', title: selected ? `Verifying ${meta?.label ?? selected} signatures` : 'Signature checks off' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast({ kind: 'error', title: 'Could not save', detail: data.error ?? `HTTP ${res.status}` })
      }
    } catch (e) {
      toast({ kind: 'error', title: 'Network error', detail: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title="Signature verification" subtitle="Validate incoming webhooks against a provider's signing scheme.">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full px-2.5 py-1.5 text-xs border border-[var(--card-border)] rounded-md bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
      >
        <option value="">None</option>
        {SIGNATURE_SCHEME_CATALOG.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>

      {selected && (
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={meta?.secretHint ?? 'signing secret'}
          autoComplete="off"
          className="w-full mt-2 px-2.5 py-1.5 text-[11px] font-mono border border-[var(--card-border)] rounded-md bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
        />
      )}

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[var(--muted)]">
          {signatureScheme ? `Active: ${SIGNATURE_SCHEME_CATALOG.find((s) => s.id === signatureScheme)?.label ?? signatureScheme}` : 'No verification'}
        </span>
        <button
          onClick={save}
          disabled={saving}
          className="text-[11px] px-3 py-1 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </Section>
  )
}
