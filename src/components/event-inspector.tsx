'use client'

import { useState, useEffect } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'

type Props = {
  webhook: ReceivedWebhook
  allWebhooks: ReceivedWebhook[]
}

type InspectorTab = 'overview' | 'headers' | 'payload' | 'signature' | 'response'

export function EventInspector({ webhook, allWebhooks }: Props) {
  const [tab, setTab] = useState<InspectorTab>('overview')

  // Reset tab when selected webhook changes
  useEffect(() => {
    setTab('overview')
  }, [webhook.id])

  const relatedWebhooks = allWebhooks
    .filter(w => w.body?.eventId === webhook.body?.eventId)
    .sort((a, b) => a.receivedAtMs - b.receivedAtMs)

  const attemptIndex = relatedWebhooks.findIndex(w => w.id === webhook.id) + 1

  const tabs: { id: InspectorTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'payload', label: 'Payload' },
    { id: 'headers', label: 'Headers' },
    { id: 'signature', label: 'Signature' },
    { id: 'response', label: 'Response' },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--card-border)] bg-[var(--card)]">
        <div className="text-sm font-semibold">Event Inspector</div>
        <div className="text-xs text-[var(--muted)] mt-0.5">
          {webhook.body?.event || 'unknown'} — Attempt {attemptIndex}/{relatedWebhooks.length}
        </div>
      </div>

      <div className="flex border-b border-[var(--card-border)]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-xs font-medium transition-colors relative ${
              tab === t.id
                ? 'text-[var(--accent)]'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            {t.label}
            {tab === t.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 text-xs">
        {tab === 'overview' && (
          <div className="space-y-4">
            <Section title="Event Details">
              <Field label="Event" value={webhook.body?.event} />
              <Field label="Event ID" value={webhook.body?.eventId} mono />
              <Field label="API Version" value={webhook.body?.apiVersion} />
              <Field label="Timestamp" value={webhook.body?.timestamp} />
            </Section>

            <Section title="Delivery">
              <Field label="Received At" value={webhook.receivedAt} />
              <Field label="Status Code" value={webhook.respondedWith.statusCode || 'TIMEOUT'} />
              <Field label="Behavior" value={webhook.respondedWith.behavior} />
              {webhook.respondedWith.delayMs > 0 && (
                <Field label="Delay" value={`${webhook.respondedWith.delayMs}ms`} />
              )}
            </Section>

            <Section title="Partner">
              <Field label="External User ID" value={webhook.body?.partner?.externalUserId} />
            </Section>

            {webhook.body?.context && Object.values(webhook.body.context as Record<string, unknown>).some(Boolean) && (
              <Section title="Context">
                {Object.entries(webhook.body.context as Record<string, unknown>).map(([key, value]) => (
                  value ? <Field key={key} label={key} value={String(value)} /> : null
                ))}
              </Section>
            )}

            {relatedWebhooks.length > 1 && (
              <Section title="Delivery Attempts">
                <div className="space-y-1.5">
                  {relatedWebhooks.map((rw, i) => {
                    const gap = i > 0 ? Math.round((rw.receivedAtMs - relatedWebhooks[i-1].receivedAtMs) / 1000) : 0
                    return (
                      <div key={rw.id} className={`flex items-center gap-2 ${rw.id === webhook.id ? 'text-[var(--accent)]' : ''}`}>
                        <span className="w-4">{i + 1}.</span>
                        <StatusBadge code={rw.respondedWith.statusCode} />
                        <span className="text-[var(--muted)]">
                          {new Date(rw.receivedAt).toLocaleTimeString()}
                        </span>
                        {gap > 0 && <span className="text-[var(--muted)]">(+{gap}s)</span>}
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}
          </div>
        )}

        {tab === 'payload' && (
          <pre className="bg-[var(--background)] rounded-lg p-3 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
            {(() => { try { return JSON.stringify(webhook.body, null, 2) } catch { return String(webhook.body) } })()}
          </pre>
        )}

        {tab === 'headers' && (
          <div className="space-y-1">
            {Object.entries(webhook.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-[var(--accent)] font-mono shrink-0">{key}:</span>
                <span className="text-[var(--muted)] font-mono break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {tab === 'signature' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {webhook.signatureValid === true && (
                <span className="px-2 py-1 rounded bg-[var(--success)]/20 text-[var(--success)] text-xs font-medium">Valid</span>
              )}
              {webhook.signatureValid === false && (
                <span className="px-2 py-1 rounded bg-[var(--error)]/20 text-[var(--error)] text-xs font-medium">Invalid</span>
              )}
              {webhook.signatureValid === undefined && (
                <span className="px-2 py-1 rounded bg-[var(--muted)]/20 text-[var(--muted)] text-xs font-medium">Not Verified</span>
              )}
            </div>
            {webhook.signatureError && (
              <div className="text-[var(--error)]">Error: {webhook.signatureError}</div>
            )}
            {webhook.signatureHeader && (
              <Section title="JWT Token">
                <pre className="bg-[var(--background)] rounded-lg p-3 overflow-auto whitespace-pre-wrap font-mono text-[10px] break-all">
                  {webhook.signatureHeader}
                </pre>
              </Section>
            )}
            {webhook.signaturePayload && (
              <Section title="Decoded Payload">
                <pre className="bg-[var(--background)] rounded-lg p-3 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                  {JSON.stringify(webhook.signaturePayload, null, 2)}
                </pre>
              </Section>
            )}
          </div>
        )}

        {tab === 'response' && (
          <div className="space-y-4">
            <Section title="Response">
              <Field label="Status Code" value={webhook.respondedWith.statusCode || 'TIMEOUT'} />
              <Field label="Behavior" value={webhook.respondedWith.behavior} />
              <Field label="Delay" value={webhook.respondedWith.delayMs > 0 ? `${webhook.respondedWith.delayMs}ms` : 'None'} />
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] font-semibold mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-[var(--muted)] w-28 shrink-0">{label}</span>
      <span className={`${mono ? 'font-mono text-[11px]' : ''} break-all`}>{String(value ?? '-')}</span>
    </div>
  )
}

function StatusBadge({ code }: { code: number }) {
  const color = code === 0 ? 'bg-purple-400/20 text-purple-400'
    : code >= 200 && code < 300 ? 'bg-[var(--success)]/20 text-[var(--success)]'
    : code >= 400 && code < 500 ? 'bg-[var(--warning)]/20 text-[var(--warning)]'
    : 'bg-[var(--error)]/20 text-[var(--error)]'

  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>
      {code || 'TIMEOUT'}
    </span>
  )
}
