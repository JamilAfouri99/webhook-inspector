'use client'

import { useState, useEffect } from 'react'
import type { ReceivedWebhook, DeliveryAnalysis, AnalysisSummary } from '@/lib/webhook-state'

type Props = {
  webhooks: ReceivedWebhook[]
  channelSlug: string
}

export function ObservePanel({ webhooks, channelSlug }: Props) {
  const [analysis, setAnalysis] = useState<{ summary: AnalysisSummary; deliveries: DeliveryAnalysis[] } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/channels/${channelSlug}/observe`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        setAnalysis(data)
        setError(false)
      })
      .catch(e => {
        if (e.name !== 'AbortError') setError(true)
      })
    return () => controller.abort()
  }, [webhooks.length])

  if (error) {
    return <div className="text-[var(--error)] text-sm">Failed to load delivery analysis.</div>
  }

  if (!analysis) {
    return <div className="text-[var(--muted)] text-sm">Loading...</div>
  }

  const { summary, deliveries } = analysis

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Delivery Analysis</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Webhooks" value={summary.totalWebhooksReceived} />
        <StatCard label="Unique Events" value={summary.uniqueEventIds} />
        <StatCard label="With Retries" value={summary.eventsWithRetries} color="warning" />
        <StatCard label="Successful" value={summary.successfulDeliveries} color="success" />
        <StatCard label="Failed" value={summary.failedDeliveries} color="error" />
      </div>

      {/* Deliveries table */}
      {deliveries.length === 0 ? (
        <div className="text-center text-[var(--muted)] text-sm py-8">No deliveries to analyze</div>
      ) : (
        <div className="rounded-lg border border-[var(--card-border)] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[var(--card)] border-b border-[var(--card-border)]">
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Status</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Event</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Event ID</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Attempts</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Status Codes</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Retry Gaps</th>
                <th className="text-left px-3 py-2 font-medium text-[var(--muted)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map(d => (
                <tr key={d.eventId} className="border-b border-[var(--card-border)]/50 hover:bg-[var(--card)]">
                  <td className="px-3 py-2">
                    {d.succeeded ? (
                      <span className="text-[var(--success)]">Delivered</span>
                    ) : (
                      <span className="text-[var(--error)]">Failed</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-medium">{d.event}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-[var(--muted)]">{d.eventId.substring(0, 20)}</td>
                  <td className="px-3 py-2">
                    <span className={d.attempts > 1 ? 'text-[var(--warning)]' : ''}>{d.attempts}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      {d.statuses.map((s, i) => (
                        <span
                          key={i}
                          className={`px-1 py-0.5 rounded text-[10px] ${
                            s === 0 ? 'bg-purple-400/20 text-purple-400' :
                            s >= 200 && s < 300 ? 'bg-[var(--success)]/20 text-[var(--success)]' :
                            s >= 400 && s < 500 ? 'bg-[var(--warning)]/20 text-[var(--warning)]' :
                            'bg-[var(--error)]/20 text-[var(--error)]'
                          }`}
                        >
                          {s === 0 ? 'TIMEOUT' : s}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">{d.retryGaps.join(' -> ') || '-'}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {d.totalDurationMs > 0 ? `${Math.round(d.totalDurationMs / 1000)}s` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const colorClass = color === 'success' ? 'text-[var(--success)]'
    : color === 'error' ? 'text-[var(--error)]'
    : color === 'warning' ? 'text-[var(--warning)]'
    : 'text-[var(--foreground)]'

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-3">
      <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-[10px] text-[var(--muted)] mt-0.5">{label}</div>
    </div>
  )
}
