'use client'

import { useState } from 'react'
import { toCurl } from '@/lib/curl'
import { Section } from './section'

export function EndpointPanel({ webhookUrl }: { webhookUrl: string }) {
  const [copied, setCopied] = useState<null | 'url' | 'curl'>(null)

  const curlSnippet = toCurl({
    method: 'POST',
    url: webhookUrl,
    headers: { 'Content-Type': 'application/json' },
    body: { eventId: 'evt_demo', event: 'test.ping' },
  })

  function copy(value: string, kind: 'url' | 'curl') {
    navigator.clipboard.writeText(value)
    setCopied(kind)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <Section title="Endpoint">
      <div className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] p-2">
        <code className="block text-[11px] font-mono text-[var(--heading)] break-all leading-snug">
          {webhookUrl}
        </code>
      </div>
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => copy(webhookUrl, 'url')}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
        >
          {copied === 'url' ? 'Copied!' : 'Copy URL'}
        </button>
        <button
          onClick={() => copy(curlSnippet, 'curl')}
          className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
        >
          {copied === 'curl' ? 'Copied!' : 'Copy as curl'}
        </button>
      </div>
    </Section>
  )
}
