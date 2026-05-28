'use client'

import { useEffect, useMemo, useState } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'
import { toCurl } from '@/lib/curl'
import { jsonDiff, type DiffEntry } from '@/lib/json-diff'

type Props = {
  webhook: ReceivedWebhook
  allWebhooks: ReceivedWebhook[]
  channelSlug: string
  onClose?: () => void
}

type ReplayResult = { ok: boolean; status?: number; durationMs?: number; body?: unknown; error?: string }

export function EventInspector({ webhook, allWebhooks, channelSlug, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [replaying, setReplaying] = useState(false)
  const [replayResult, setReplayResult] = useState<ReplayResult | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    setReplayResult(null)
    setShowDiff(false)
  }, [webhook.id])

  const related = useMemo(
    () => allWebhooks
      .filter(w => w.body?.eventId === webhook.body?.eventId)
      .sort((a, b) => a.receivedAtMs - b.receivedAtMs),
    [allWebhooks, webhook.body?.eventId],
  )

  const attemptIndex = related.findIndex(w => w.id === webhook.id)
  const previousAttempt = attemptIndex > 0 ? related[attemptIndex - 1] : null

  const curlCommand = useMemo(() => toCurl({
    method: webhook.method,
    url: typeof window !== 'undefined'
      ? `${window.location.origin}${webhook.path}`
      : webhook.path,
    headers: webhook.headers,
    body: webhook.body,
  }), [webhook])

  const diff: DiffEntry[] = useMemo(() => {
    if (!previousAttempt) return []
    return jsonDiff(previousAttempt.body, webhook.body)
  }, [previousAttempt, webhook])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  async function replay() {
    setReplaying(true)
    setReplayResult(null)
    try {
      const res = await fetch(`/api/channels/${channelSlug}/history/${webhook.id}/replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      const data = await res.json()
      setReplayResult({
        ok: res.ok && (data.status >= 200 && data.status < 300),
        status: data.status,
        durationMs: data.responseTimeMs,
        body: data.responseBody,
        error: data.error,
      })
    } catch (e) {
      setReplayResult({ ok: false, error: (e as Error).message })
    } finally {
      setReplaying(false)
    }
  }

  return (
    <aside className="h-full border-l border-[var(--card-border)] bg-white flex flex-col">
      <div className="px-5 py-3.5 border-b border-[var(--card-border)] shrink-0 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-[var(--muted)] font-mono">#{webhook.index}</span>
            <span className="text-sm font-semibold text-[var(--heading)] truncate">
              {webhook.body?.event || 'unknown'}
            </span>
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            Attempt {attemptIndex + 1} of {related.length}
            {related.length > 1 && <span className="ml-2 text-[var(--accent)]">· {related.length - 1} retries</span>}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--muted-soft)] rounded-md w-7 h-7 flex items-center justify-center shrink-0"
            title="Close inspector (Esc)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="px-5 py-3 border-b border-[var(--card-border)] flex flex-wrap gap-1.5 shrink-0 bg-[var(--muted-soft)]/40">
        <ActionButton onClick={replay} loading={replaying} primary>
          {replaying ? 'Replaying…' : '↻ Replay'}
        </ActionButton>
        <ActionButton onClick={() => copy(curlCommand, 'curl')}>
          {copied === 'curl' ? 'Copied!' : 'Copy as curl'}
        </ActionButton>
        {previousAttempt && (
          <ActionButton onClick={() => setShowDiff(d => !d)} active={showDiff}>
            {showDiff ? 'Hide diff' : 'Diff previous'}
          </ActionButton>
        )}
        <ActionButton
          onClick={() => {
            const link = `${window.location.origin}/share/${webhook.id}`
            navigator.clipboard.writeText(link)
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 1800)
          }}
        >
          {shareCopied ? 'Link copied!' : 'Share link'}
        </ActionButton>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {replayResult && (
          <ReplayCard result={replayResult} />
        )}

        {showDiff && previousAttempt && (
          <DiffCard diff={diff} attemptN={attemptIndex} />
        )}

        <Section title="Overview">
          <Field label="Status" value={
            <StatusBadge code={webhook.respondedWith.statusCode} />
          } />
          <Field label="Behavior" value={<code className="text-[11px] font-mono">{webhook.respondedWith.behavior}</code>} />
          {webhook.respondedWith.delayMs > 0 && (
            <Field label="Delay" value={`${webhook.respondedWith.delayMs}ms`} />
          )}
          <Field label="Received" value={new Date(webhook.receivedAt).toLocaleString()} />
          <Field label="Path" value={<code className="text-[11px] font-mono break-all">{webhook.path}</code>} />
          <Field label="Method" value={<code className="text-[11px] font-mono">{webhook.method}</code>} />
        </Section>

        {related.length > 1 && (
          <Section title={`Delivery attempts (${related.length})`}>
            {related.map((rw, i) => {
              const gap = i > 0 ? Math.round((rw.receivedAtMs - related[i - 1].receivedAtMs) / 1000) : 0
              const isCurrent = rw.id === webhook.id
              return (
                <div
                  key={rw.id}
                  className={`flex items-center gap-2 text-[11px] py-1 ${isCurrent ? 'text-[var(--accent)] font-medium' : ''}`}
                >
                  <span className="w-5 text-right text-[var(--muted)]">{i + 1}.</span>
                  <StatusBadge code={rw.respondedWith.statusCode} />
                  <span className="text-[var(--muted)] font-mono">
                    {new Date(rw.receivedAt).toLocaleTimeString()}
                  </span>
                  {gap > 0 && <span className="text-[var(--muted)]">+{gap}s</span>}
                </div>
              )
            })}
          </Section>
        )}

        <Section title="Payload">
          <CodeBlock value={jsonPretty(webhook.body)} onCopy={() => copy(jsonPretty(webhook.body), 'payload')} copied={copied === 'payload'} />
        </Section>

        <Section title={`Headers (${Object.keys(webhook.headers).length})`} collapsible defaultOpen={false}>
          <div className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] p-2 space-y-1 max-h-[240px] overflow-y-auto">
            {Object.entries(webhook.headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[11px]">
                <span className="text-[var(--accent)] font-mono shrink-0">{key}:</span>
                <span className="text-[var(--heading)] font-mono break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Signature" collapsible defaultOpen={!!webhook.signatureHeader}>
          <div className="space-y-2">
            <div>
              {webhook.signatureValid === true && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--success-soft)] text-[var(--success-text)] border border-[var(--success-border)]">Valid</span>
              )}
              {webhook.signatureValid === false && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--error-soft)] text-[var(--error-text)] border border-[var(--error-border)]">Invalid</span>
              )}
              {webhook.signatureValid === undefined && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--neutral-soft)] text-[var(--muted)] border border-[var(--neutral-border)]">Not Verified</span>
              )}
            </div>
            {webhook.signatureError && (
              <div className="text-[11px] text-[var(--error-text)] bg-[var(--error-soft)] border border-[var(--error-border)] rounded p-2">
                {webhook.signatureError}
              </div>
            )}
            {webhook.signatureHeader && (
              <CodeBlock value={webhook.signatureHeader} small />
            )}
            {webhook.signaturePayload !== undefined && webhook.signaturePayload !== null && (
              <CodeBlock value={jsonPretty(webhook.signaturePayload)} />
            )}
          </div>
        </Section>

        <Section title="Response">
          <Field label="Status code" value={<StatusBadge code={webhook.respondedWith.statusCode} />} />
          <Field label="Behavior" value={<code className="text-[11px] font-mono">{webhook.respondedWith.behavior}</code>} />
          <Field label="Delay applied" value={`${webhook.respondedWith.delayMs}ms`} />
        </Section>
      </div>
    </aside>
  )
}

function ActionButton({
  children, onClick, primary, loading, active,
}: { children: React.ReactNode; onClick: () => void; primary?: boolean; loading?: boolean; active?: boolean }) {
  if (primary) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className="text-xs px-3 py-1.5 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] transition-colors disabled:opacity-50"
      >
        {children}
      </button>
    )
  }
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
        active
          ? 'bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/30'
          : 'border-[var(--card-border)] bg-white hover:bg-[var(--muted-soft)] text-[var(--heading)]'
      }`}
    >
      {children}
    </button>
  )
}

function ReplayCard({ result }: { result: ReplayResult }) {
  const ok = result.ok
  return (
    <div className={`rounded-md border p-3 text-xs animate-fade-in ${ok ? 'border-[var(--success-border)] bg-[var(--success-soft)]' : 'border-[var(--error-border)] bg-[var(--error-soft)]'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`font-semibold ${ok ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'}`}>
          {ok ? 'Replay succeeded' : 'Replay failed'}
        </span>
        {result.status !== undefined && (
          <StatusBadge code={result.status} />
        )}
        {result.durationMs !== undefined && (
          <span className="text-[var(--muted)]">{result.durationMs}ms</span>
        )}
      </div>
      {result.error && <div className="text-[var(--error-text)] mb-1">{result.error}</div>}
      {result.body !== undefined && result.body !== null && (
        <pre className="text-[10px] font-mono mt-1 max-h-32 overflow-auto text-[var(--heading)]">
          {typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
        </pre>
      )}
    </div>
  )
}

function DiffCard({ diff, attemptN }: { diff: DiffEntry[]; attemptN: number }) {
  return (
    <div className="rounded-md border border-[var(--card-border)] bg-white p-3 text-xs animate-fade-in">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-2">
        Diff with attempt {attemptN}
      </div>
      {diff.length === 0 ? (
        <div className="text-[var(--muted)] text-[11px]">Payload identical to previous attempt.</div>
      ) : (
        <ul className="space-y-1 max-h-[260px] overflow-y-auto">
          {diff.map((d, i) => (
            <li key={i} className="text-[11px] font-mono leading-snug">
              {d.kind === 'added' && (
                <span className="text-[var(--success-text)]">+ {d.path}: {String(jsonPretty(d.value))}</span>
              )}
              {d.kind === 'removed' && (
                <span className="text-[var(--error-text)]">− {d.path}: {String(jsonPretty(d.value))}</span>
              )}
              {d.kind === 'changed' && (
                <span>
                  <span className="text-[var(--muted)]">~ {d.path}: </span>
                  <span className="text-[var(--error-text)]">{String(d.before)}</span>
                  <span className="text-[var(--muted)]"> → </span>
                  <span className="text-[var(--success-text)]">{String(d.after)}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Section({
  title, children, collapsible, defaultOpen = true,
}: { title: string; children: React.ReactNode; collapsible?: boolean; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const shown = collapsible ? open : true
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">{title}</h3>
        {collapsible && (
          <button
            onClick={() => setOpen(o => !o)}
            className="text-[var(--muted)] hover:text-[var(--heading)]"
          >
            <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
      {shown && <div className="space-y-1.5">{children}</div>}
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-[11px]">
      <span className="text-[var(--muted)] w-24 shrink-0">{label}</span>
      <span className="text-[var(--heading)] flex-1 min-w-0 break-all">{value}</span>
    </div>
  )
}

function CodeBlock({
  value, onCopy, copied, small,
}: { value: string; onCopy?: () => void; copied?: boolean; small?: boolean }) {
  return (
    <div className="relative rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)]">
      {onCopy && (
        <button
          onClick={onCopy}
          className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-white border border-[var(--card-border)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
      <pre className={`overflow-auto p-3 font-mono text-[var(--heading)] leading-relaxed ${small ? 'text-[10px]' : 'text-[11px]'} max-h-[320px]`}>
        {value}
      </pre>
    </div>
  )
}

function StatusBadge({ code }: { code: number }) {
  const kind = code === 0 ? 'pending' : code >= 200 && code < 300 ? 'success' : code >= 400 && code < 500 ? 'warning' : 'error'
  const cls = {
    pending: 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]',
    success: 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]',
    warning: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
    error:   'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]',
  }[kind]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${cls}`}>
      {code === 0 ? 'HANG' : code}
    </span>
  )
}

function jsonPretty(v: unknown): string {
  if (v === undefined || v === null) return ''
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}
