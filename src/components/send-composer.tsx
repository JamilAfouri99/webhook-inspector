'use client'

import { useEffect, useMemo, useState } from 'react'
import { PROVIDER_SAMPLES, samplesByProvider, type ProviderSample } from '@/data/provider-samples'

type Mode = 'quick' | 'provider'

type EventDef = { value: string; label: string; payload: Record<string, unknown> }

const QUICK_EVENTS: EventDef[] = [
  { value: 'test.ping', label: 'Test Ping', payload: { message: 'hello' } },
  { value: 'order.created', label: 'Order Created', payload: { orderId: 'ord_abc', totalAmount: 14999, currency: 'USD' } },
  { value: 'order.cancelled', label: 'Order Cancelled', payload: { orderId: 'ord_abc', reason: 'CUSTOMER_REQUEST' } },
  { value: 'payment.completed', label: 'Payment Completed', payload: { paymentId: 'pay_xyz', amount: 4900 } },
  { value: 'payment.failed', label: 'Payment Failed', payload: { paymentId: 'pay_xyz', errorCode: 'CARD_DECLINED' } },
]

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

type Result = { ok: boolean; status?: number; durationMs?: number; body?: unknown; error?: string }

type SendComposerProps = { channelSlug: string; sidebarCollapsed?: boolean; inspectorCollapsed?: boolean }

export function SendComposer({ channelSlug, sidebarCollapsed, inspectorCollapsed }: SendComposerProps) {
  void sidebarCollapsed
  void inspectorCollapsed
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('quick')
  const [quickEvent, setQuickEvent] = useState<EventDef>(QUICK_EVENTS[0])
  const [activeProvider, setActiveProvider] = useState<string>('stripe')
  const [activeSampleId, setActiveSampleId] = useState<string>(PROVIDER_SAMPLES[0].id)
  const [override, setOverride] = useState('')
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook/${channelSlug}`)
  }, [channelSlug])

  const groupedProviders = useMemo(() => samplesByProvider(), [])
  const activeSample: ProviderSample | undefined = useMemo(
    () => PROVIDER_SAMPLES.find(s => s.id === activeSampleId),
    [activeSampleId],
  )

  useEffect(() => {
    setOverride('')
    setOverrideError(null)
  }, [activeSampleId, quickEvent.value, mode])

  async function send() {
    setOverrideError(null)
    let payload: unknown
    let headers: Record<string, string>
    let envelope: Record<string, unknown>

    if (mode === 'provider' && activeSample) {
      try {
        payload = override.trim() ? JSON.parse(override) : activeSample.payload
      } catch (e) {
        setOverrideError(`Invalid JSON: ${(e as Error).message}`)
        return
      }
      headers = { ...activeSample.headers }
      envelope = payload as Record<string, unknown>
    } else {
      try {
        payload = override.trim() ? JSON.parse(override) : quickEvent.payload
      } catch (e) {
        setOverrideError(`Invalid JSON: ${(e as Error).message}`)
        return
      }
      headers = { 'Content-Type': 'application/json', 'User-Agent': 'Webhook-Tester/1.0' }
      envelope = {
        apiVersion: 'v1',
        event: quickEvent.value,
        eventId: uuid(),
        timestamp: new Date().toISOString(),
        data: payload,
      }
    }

    setSending(true)
    setResult(null)
    const startMs = Date.now()
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(envelope),
      })
      const text = await res.text()
      let body: unknown
      try { body = text ? JSON.parse(text) : null } catch { body = text }
      setResult({ ok: res.ok, status: res.status, durationMs: Date.now() - startMs, body })
    } catch (e) {
      setResult({ ok: false, error: (e as Error).message })
    } finally {
      setSending(false)
    }
  }

  const fabPosition = inspectorCollapsed ? 'right-5' : 'right-5'
  void fabPosition
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-strong)] transition-colors"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Send Test
      </button>
    )
  }

  const placeholderPayload = mode === 'provider' && activeSample
    ? JSON.stringify(activeSample.payload, null, 2)
    : JSON.stringify(quickEvent.payload, null, 2)
  const placeholderHeaders = mode === 'provider' && activeSample ? activeSample.headers : null

  return (
    <div
      className="fixed bottom-5 right-5 z-40 w-[640px] max-w-[calc(100vw-2.5rem)] bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden flex flex-col"
      style={{ boxShadow: 'var(--shadow-md)', maxHeight: 'calc(100vh - 2.5rem)' }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)] bg-[var(--muted-soft)]">
        <h3 className="text-sm font-semibold text-[var(--heading)]">Send Test Webhook</h3>
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[var(--card)] border border-[var(--card-border)] rounded-md p-0.5">
            <button
              onClick={() => setMode('quick')}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors ${mode === 'quick' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--heading)]'}`}
            >
              Quick
            </button>
            <button
              onClick={() => setMode('provider')}
              className={`text-[11px] px-2.5 py-1 rounded transition-colors ${mode === 'provider' ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--muted)] hover:text-[var(--heading)]'}`}
            >
              Provider library
            </button>
          </div>
          <button onClick={() => setOpen(false)} className="text-[var(--muted)] hover:text-[var(--heading)]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {mode === 'provider' && (
          <div className="w-[150px] shrink-0 border-r border-[var(--card-border)] overflow-y-auto py-2 bg-[var(--muted-soft)]/40">
            {groupedProviders.map(group => (
              <button
                key={group.provider}
                onClick={() => {
                  setActiveProvider(group.provider)
                  setActiveSampleId(group.samples[0].id)
                }}
                className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                  activeProvider === group.provider
                    ? 'bg-[var(--card)] text-[var(--heading)] font-medium border-r-2 border-[var(--accent)]'
                    : 'text-[var(--muted)] hover:bg-[var(--card)] hover:text-[var(--heading)]'
                }`}
              >
                {group.label}
                <span className="ml-1 text-[10px] text-[var(--muted)]">·{group.samples.length}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 space-y-3">
            {mode === 'quick' ? (
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1.5">Event</label>
                <select
                  value={quickEvent.value}
                  onChange={(e) => setQuickEvent(QUICK_EVENTS.find(ev => ev.value === e.target.value) ?? QUICK_EVENTS[0])}
                  className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--heading)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                >
                  {QUICK_EVENTS.map(e => (
                    <option key={e.value} value={e.value}>{e.label} — {e.value}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1.5">Event</label>
                <select
                  value={activeSampleId}
                  onChange={(e) => setActiveSampleId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--heading)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                >
                  {(groupedProviders.find(g => g.provider === activeProvider)?.samples ?? []).map(s => (
                    <option key={s.id} value={s.id}>{s.event}</option>
                  ))}
                </select>
                {activeSample && (
                  <p className="text-[11px] text-[var(--muted)] mt-1.5">{activeSample.description}</p>
                )}
              </div>
            )}

            {placeholderHeaders && (
              <details className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)]">
                <summary className="cursor-pointer text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider px-3 py-2 select-none">
                  Headers ({Object.keys(placeholderHeaders).length})
                </summary>
                <div className="px-3 pb-3 space-y-0.5">
                  {Object.entries(placeholderHeaders).map(([k, v]) => (
                    <div key={k} className="flex gap-2 text-[10px] font-mono leading-snug">
                      <span className="text-[var(--accent)] shrink-0">{k}:</span>
                      <span className="text-[var(--heading)] break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div>
              <label className="block text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-1.5">
                Payload {override.trim() ? <span className="text-[var(--accent)] normal-case font-normal">· overridden</span> : <span className="text-[var(--muted)] normal-case font-normal">· using default</span>}
              </label>
              <textarea
                value={override}
                onChange={(e) => { setOverride(e.target.value); setOverrideError(null) }}
                placeholder={placeholderPayload}
                rows={mode === 'provider' ? 8 : 5}
                className={`w-full px-3 py-2 text-[11px] font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 ${overrideError ? 'border-[var(--error)]' : 'border-[var(--card-border)] focus:border-[var(--accent)]'}`}
              />
              {overrideError && <div className="text-[10px] text-[var(--error)] mt-1">{overrideError}</div>}
            </div>

            <button
              onClick={send}
              disabled={sending}
              className="w-full px-4 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
            >
              {sending ? 'Sending…' : `Send to ${channelSlug}`}
            </button>

            {result && (
              <div className={`rounded-md border p-3 text-xs ${result.ok ? 'border-[var(--success-border)] bg-[var(--success-soft)]' : 'border-[var(--error-border)] bg-[var(--error-soft)]'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-semibold ${result.ok ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'}`}>
                    {result.ok ? 'Sent' : 'Failed'}
                  </span>
                  {result.status !== undefined && <span className="text-[var(--muted)]">{result.status}</span>}
                  {result.durationMs !== undefined && <span className="text-[var(--muted)]">{result.durationMs}ms</span>}
                </div>
                {result.error && <div className="text-[var(--error-text)]">{result.error}</div>}
                {result.body !== undefined && result.body !== null && (
                  <pre className="text-[10px] font-mono mt-1 overflow-auto max-h-24 text-[var(--heading)]">
                    {typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
