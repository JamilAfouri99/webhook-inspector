'use client'

import type { ReceivedWebhook } from '@/lib/webhook-state'
import { Section, CodeBlock, jsonPretty } from './ui'

export function SignatureSection({ webhook }: { webhook: ReceivedWebhook }) {
  return (
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
        {webhook.signatureHeader && <CodeBlock value={webhook.signatureHeader} small />}
        {webhook.signaturePayload !== undefined && webhook.signaturePayload !== null && (
          <CodeBlock value={jsonPretty(webhook.signaturePayload)} />
        )}
      </div>
    </Section>
  )
}
