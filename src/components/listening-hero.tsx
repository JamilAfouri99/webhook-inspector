'use client'

import { useState } from 'react'
import { toCurl } from '@/lib/curl'

export function ListeningHero({ webhookUrl, connected }: { webhookUrl: string; connected: boolean }) {
  const [copied, setCopied] = useState<null | 'url' | 'curl'>(null)

  const curl = toCurl({
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
    <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
      <div className="max-w-xl w-full text-center">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <span className={`absolute inset-0 rounded-full ${connected ? 'bg-[var(--accent-soft)]' : 'bg-[var(--muted-soft)]'}`} />
          {connected && <span className="absolute inset-0 rounded-full bg-[var(--accent)]/20 animate-ping" />}
          <span className="absolute inset-0 flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12a7 7 0 017-7m0 14a7 7 0 01-7-7m14 0a7 7 0 00-7-7m7 7a7 7 0 01-7 7" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </div>

        <h2 className="text-lg font-semibold text-[var(--heading)]">
          {connected ? 'Listening for webhooks…' : 'Reconnecting…'}
        </h2>
        <p className="text-sm text-[var(--muted)] mt-1 mb-5">
          Point a producer at this channel&apos;s URL and the request appears here instantly.
        </p>

        <div className="rounded-lg border border-[var(--card-border)] bg-[var(--muted-soft)] p-3 flex items-center gap-2 text-left">
          <code className="flex-1 text-[12px] font-mono text-[var(--heading)] break-all">{webhookUrl}</code>
          <button
            onClick={() => copy(webhookUrl, 'url')}
            className="shrink-0 text-xs px-2.5 py-1.5 rounded-md border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
          >
            {copied === 'url' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="mt-3 relative rounded-lg border border-[var(--card-border)] bg-[var(--muted-soft)] p-3 text-left">
          <button
            onClick={() => copy(curl, 'curl')}
            className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
          >
            {copied === 'curl' ? 'Copied!' : 'Copy curl'}
          </button>
          <pre className="text-[11px] font-mono text-[var(--heading)] overflow-x-auto pr-16 leading-relaxed">{curl}</pre>
        </div>

        <p className="text-[11px] text-[var(--muted)] mt-4">
          Or use the <span className="font-medium text-[var(--foreground)]">Send Test</span> composer below.
        </p>
      </div>
    </div>
  )
}
