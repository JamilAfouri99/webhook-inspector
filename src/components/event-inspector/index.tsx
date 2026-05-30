'use client'

import { useMemo, useState } from 'react'
import type { ReceivedWebhook } from '@/lib/webhook-state'
import { bodyEvent, bodyEventId } from '@/domain/delivery-analysis'
import { toCurl } from '@/lib/curl'
import { jsonDiff, type DiffEntry } from '@/lib/json-diff'
import { ActionButton, CodeBlock, Field, Section, StatusBadge, jsonPretty } from './ui'
import { ReplayCard } from './replay-card'
import { DiffCard } from './diff-card'
import { AttemptsSection } from './attempts-section'
import { SignatureSection } from './signature-section'
import { useReplay } from './use-replay'

type Props = {
  webhook: ReceivedWebhook
  allWebhooks: ReceivedWebhook[]
  channelSlug: string
  onClose?: () => void
}

export function EventInspector({ webhook, allWebhooks, channelSlug, onClose }: Props) {
  const [copied, setCopied] = useState<string | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)
  const { replaying, result: replayResult, replay, reset: resetReplay } = useReplay(channelSlug, webhook.id)

  // Reset transient view state when a different webhook is selected.
  const [prevId, setPrevId] = useState(webhook.id)
  if (webhook.id !== prevId) {
    setPrevId(webhook.id)
    resetReplay()
    setShowDiff(false)
  }

  const related = useMemo(
    () => allWebhooks
      .filter((w) => bodyEventId(w.body) === bodyEventId(webhook.body))
      .sort((a, b) => a.receivedAtMs - b.receivedAtMs),
    [allWebhooks, webhook.body],
  )

  const attemptIndex = related.findIndex((w) => w.id === webhook.id)
  const previousAttempt = attemptIndex > 0 ? related[attemptIndex - 1] : null

  const curlCommand = useMemo(
    () =>
      toCurl({
        method: webhook.method,
        url: typeof window !== 'undefined' ? `${window.location.origin}${webhook.path}` : webhook.path,
        headers: webhook.headers,
        body: webhook.body,
      }),
    [webhook],
  )

  const diff: DiffEntry[] = useMemo(() => {
    if (!previousAttempt) return []
    return jsonDiff(previousAttempt.body, webhook.body)
  }, [previousAttempt, webhook])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  function shareLink() {
    navigator.clipboard.writeText(`${window.location.origin}/share/${webhook.id}`)
    setShareCopied(true)
    setTimeout(() => setShareCopied(false), 1800)
  }

  return (
    <aside className="h-full border-l border-[var(--card-border)] bg-[var(--card)] flex flex-col">
      <div className="px-5 py-3.5 border-b border-[var(--card-border)] shrink-0 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs text-[var(--muted)] font-mono">#{webhook.index}</span>
            <span className="text-sm font-semibold text-[var(--heading)] truncate">{bodyEvent(webhook.body) ?? 'unknown'}</span>
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
          <ActionButton onClick={() => setShowDiff((d) => !d)} active={showDiff}>
            {showDiff ? 'Hide diff' : 'Diff previous'}
          </ActionButton>
        )}
        <ActionButton onClick={shareLink}>{shareCopied ? 'Link copied!' : 'Share link'}</ActionButton>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {replayResult && <ReplayCard result={replayResult} />}
        {showDiff && previousAttempt && <DiffCard diff={diff} attemptN={attemptIndex} />}

        <Section title="Overview">
          <Field label="Status" value={<StatusBadge code={webhook.respondedWith.statusCode} />} />
          <Field label="Behavior" value={<code className="text-[11px] font-mono">{webhook.respondedWith.behavior}</code>} />
          {webhook.respondedWith.delayMs > 0 && <Field label="Delay" value={`${webhook.respondedWith.delayMs}ms`} />}
          <Field label="Received" value={new Date(webhook.receivedAt).toLocaleString()} />
          <Field label="Path" value={<code className="text-[11px] font-mono break-all">{webhook.path}</code>} />
          <Field label="Method" value={<code className="text-[11px] font-mono">{webhook.method}</code>} />
        </Section>

        <AttemptsSection related={related} currentId={webhook.id} />

        <Section title="Payload">
          <CodeBlock
            value={jsonPretty(webhook.body)}
            onCopy={() => copy(jsonPretty(webhook.body), 'payload')}
            copied={copied === 'payload'}
          />
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

        <SignatureSection webhook={webhook} />

        <Section title="Response">
          <Field label="Status code" value={<StatusBadge code={webhook.respondedWith.statusCode} />} />
          <Field label="Behavior" value={<code className="text-[11px] font-mono">{webhook.respondedWith.behavior}</code>} />
          <Field label="Delay applied" value={`${webhook.respondedWith.delayMs}ms`} />
        </Section>
      </div>
    </aside>
  )
}
