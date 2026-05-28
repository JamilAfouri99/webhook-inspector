'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkline } from './sparkline'
import { bucketByMinute } from '@/lib/sparkline'
import { relativeTime, kFormat } from '@/lib/format'

type Channel = {
  id: string
  slug: string
  name: string
  createdAt: string
}

type ChannelDetail = {
  state: {
    behavior: string
    webhooksReceived: number
    activeScenario: string
  } | null
  recentTimestamps: number[]
  lastEventAt: string | null
  successRate: number | null
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
  const [detail, setDetail] = useState<ChannelDetail | null>(null)
  const [copied, setCopied] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState(`/api/webhook/${channel.slug}`)

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook/${channel.slug}`)
  }, [channel.slug])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [statusRes, historyRes] = await Promise.all([
          fetch(`/api/channels/${channel.slug}/status`).then(r => r.json()),
          fetch(`/api/channels/${channel.slug}/history?limit=200`).then(r => r.json()),
        ])
        if (cancelled) return
        const webhooks = (historyRes.webhooks || []) as Array<{ receivedAtMs: number; respondedWith: { statusCode: number }; receivedAt: string }>
        const last = webhooks.length > 0 ? webhooks[webhooks.length - 1] : null
        const success = webhooks.filter(w => w.respondedWith.statusCode >= 200 && w.respondedWith.statusCode < 300).length
        setDetail({
          state: statusRes ? { behavior: statusRes.behavior, webhooksReceived: statusRes.webhooksReceived, activeScenario: statusRes.activeScenario } : null,
          recentTimestamps: webhooks.map(w => w.receivedAtMs),
          lastEventAt: last?.receivedAt ?? null,
          successRate: webhooks.length === 0 ? null : success / webhooks.length,
        })
      } catch { /* swallow */ }
    }
    load()
    const id = setInterval(load, 10_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [channel.slug])

  const sparklinePoints = bucketByMinute(detail?.recentTimestamps ?? [], 30)
  const totalEvents = detail?.state?.webhooksReceived ?? 0
  const behavior = detail?.state?.behavior ?? 'success'
  const pill = BEHAVIOR_PILL[behavior] ?? BEHAVIOR_PILL['custom']
  const scenario = detail?.state?.activeScenario
  const showsScenarioBadge = scenario && scenario !== 'none' && !scenario.startsWith('manual:')

  function copy() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div
      className="group bg-white rounded-lg border border-[var(--card-border)] p-4 hover:border-[var(--card-border-strong)] transition-colors cursor-pointer"
      style={{ boxShadow: 'var(--shadow-sm)' }}
      onClick={() => router.push(`/c/${channel.slug}`)}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[var(--heading)] truncate">{channel.name}</h3>
            <code className="text-[10px] font-mono text-[var(--muted)] bg-[var(--muted-soft)] px-1.5 py-0.5 rounded">
              {channel.slug}
            </code>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${pill}`}>
              {behavior}
            </span>
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
            <div className="text-base font-semibold text-[var(--heading)] leading-none">{kFormat(totalEvents)}</div>
            <div className="mt-0.5 text-[10px]">events</div>
          </div>
          <div>
            <div className="text-base font-semibold text-[var(--heading)] leading-none">
              {detail?.lastEventAt ? relativeTime(detail.lastEventAt) : '—'}
            </div>
            <div className="mt-0.5 text-[10px]">last event</div>
          </div>
        </div>

        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={copy}
            className="text-[11px] px-2.5 py-1 rounded-md border border-[var(--card-border)] bg-white hover:bg-[var(--muted-soft)] text-[var(--heading)]"
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
