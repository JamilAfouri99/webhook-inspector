'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkline } from './sparkline'
import { bucketByMinute } from '@/lib/sparkline'
import { relativeTime, kFormat } from '@/lib/format'
import { useChannelHistory, useChannelStatus } from '@/lib/hooks/use-api'

type Channel = {
  id: string
  slug: string
  name: string
  createdAt: string
}

const BEHAVIOR_PILL: Record<string, string> = {
  'success': 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]',
  'server-error': 'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]',
  'timeout': 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]',
  'slow': 'bg-[#ffedb0] text-[#793200] border-[#fae079]',
  'client-error': 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
  'unauthorized': 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
  'not-found': 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
  'rate-limited': 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
  'redirect': 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]',
  'large-response': 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]',
  'empty-response': 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]',
  'non-json-response': 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]',
  'custom': 'bg-[#ebeef1] text-[#425466] border-[#d8dee4]',
  'sequence': 'bg-[#f0f3ff] text-[#3d4eac] border-[#c8d2fa]',
}

export function ChannelCard({ channel }: { channel: Channel }) {
  const router = useRouter()
  const { data: status } = useChannelStatus(channel.slug)
  const { data: history } = useChannelHistory(channel.slug, 200)

  const [copied, setCopied] = useState(false)

  const { sparklinePoints, lastEventAt, totalEvents, behavior, scenario } = useMemo(() => {
    const webhooks = history?.webhooks ?? []
    const last = webhooks.length > 0 ? webhooks[webhooks.length - 1] : null
    return {
      sparklinePoints: bucketByMinute(webhooks.map(w => w.receivedAtMs), 30),
      lastEventAt: last?.receivedAt ?? null,
      totalEvents: status?.webhooksReceived ?? 0,
      behavior: status?.behavior ?? 'success',
      scenario: status?.activeScenario,
    }
  }, [history, status])

  const pill = BEHAVIOR_PILL[behavior] ?? BEHAVIOR_PILL['custom']
  const showsScenarioBadge = scenario && scenario !== 'none' && !scenario.startsWith('manual:')
  const isInitialLoad = !status && !history

  function copy() {
    navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${channel.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="group bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4 hover:border-[var(--card-border-strong)] transition-colors cursor-pointer"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onClick={() => router.push(`/c/${channel.slug}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-[var(--heading)] truncate">{channel.name}</h3>
          <code className="block text-[11px] font-mono text-[var(--muted)] truncate mt-0.5 mb-2">{channel.slug}</code>
          <div className="flex items-center gap-1.5 flex-wrap">
            {isInitialLoad ? (
              <span className="inline-block h-4 w-16 rounded bg-[var(--muted-soft)] animate-pulse" />
            ) : (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${pill}`}>
                {behavior}
              </span>
            )}
            {showsScenarioBadge && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30">
                {scenario}
              </span>
            )}
          </div>
        </div>
        <Sparkline points={sparklinePoints} width={120} height={36} />
      </div>

      <div className="flex items-end justify-between gap-3">
        <div className="flex gap-5 text-[11px] text-[var(--muted)]">
          <div>
            <div className="text-base font-semibold text-[var(--heading)] leading-none">
              {isInitialLoad ? <span className="inline-block h-4 w-8 rounded bg-[var(--muted-soft)] animate-pulse" /> : kFormat(totalEvents)}
            </div>
            <div className="mt-0.5 text-[10px]">events</div>
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--heading)] leading-none">
              {isInitialLoad
                ? <span className="inline-block h-4 w-12 rounded bg-[var(--muted-soft)] animate-pulse" />
                : (lastEventAt ? relativeTime(lastEventAt) : '—')}
            </div>
            <div className="mt-0.5 text-[10px]">last event</div>
          </div>
        </div>

        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={copy}
            className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--card-border)] bg-[var(--card)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
          >
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
          <button
            onClick={() => router.push(`/c/${channel.slug}`)}
            className="text-[11px] px-3 py-1 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}
