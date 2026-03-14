'use client'

import { useState, useEffect, use } from 'react'
import { useWebhookEvents } from '@/lib/hooks/use-webhook-events'
import { StatusBar } from '@/components/status-bar'
import { EventStream } from '@/components/event-stream'
import { EventInspector } from '@/components/event-inspector'
import { ScenarioPanel } from '@/components/scenario-panel'
import { BehaviorControlPanel } from '@/components/behavior-control-panel'
import { ObservePanel } from '@/components/observe-panel'
import { TestTriggerPanel } from '@/components/test-trigger-panel'
import type { ReceivedWebhook } from '@/lib/webhook-state'

type Tab = 'stream' | 'scenarios' | 'observe' | 'test'

export default function ChannelDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const { webhooks, state, connected } = useWebhookEvents(slug)
  const [activeTab, setActiveTab] = useState<Tab>('stream')
  const [selectedWebhook, setSelectedWebhook] = useState<ReceivedWebhook | null>(null)
  const [copied, setCopied] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook/${slug}`)
  }, [slug])

  useEffect(() => {
    if (webhooks.length === 0) {
      setSelectedWebhook(null)
    }
  }, [webhooks.length])

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'stream', label: 'Event Stream' },
    { id: 'scenarios', label: 'Scenarios' },
    { id: 'observe', label: 'Observe' },
    { id: 'test', label: 'Test Trigger' },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <StatusBar state={state} connected={connected} webhookCount={webhooks.length} channelSlug={slug} />

      {/* Webhook URL bar */}
      <div className="border-b border-[var(--card-border)] bg-[var(--card)]/50 px-6 py-2 flex items-center gap-3">
        <span className="text-[10px] text-[var(--muted)] uppercase tracking-wider font-semibold">Endpoint</span>
        <code className="text-xs font-mono text-[var(--accent)] bg-[var(--background)] px-3 py-1 rounded border border-[var(--card-border)] flex-1 max-w-xl truncate">
          {webhookUrl || `/api/webhook/${slug}`}
        </code>
        <button
          onClick={copyWebhookUrl}
          className="px-3 py-1 text-xs rounded bg-[var(--card-border)] hover:bg-[var(--muted)]/20 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-[var(--card-border)] px-6">
        <nav className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'stream' && (
          <>
            <div className="flex-1 overflow-hidden">
              <EventStream
                webhooks={webhooks}
                onSelect={setSelectedWebhook}
                selectedId={selectedWebhook?.id}
              />
            </div>
            <div className="w-[480px] border-l border-[var(--card-border)] overflow-hidden">
              {selectedWebhook ? (
                <EventInspector webhook={selectedWebhook} allWebhooks={webhooks} />
              ) : (
                <div className="flex items-center justify-center h-full text-[var(--muted)] text-sm">
                  Select an event to inspect
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'scenarios' && (
          <div className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ScenarioPanel activeScenario={state?.activeScenario || 'none'} channelSlug={slug} />
              </div>
              <div>
                <BehaviorControlPanel channelSlug={slug} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'observe' && (
          <div className="flex-1 overflow-auto p-6">
            <ObservePanel webhooks={webhooks} channelSlug={slug} />
          </div>
        )}

        {activeTab === 'test' && (
          <div className="flex-1 overflow-auto p-6">
            <TestTriggerPanel channelSlug={slug} />
          </div>
        )}
      </div>
    </div>
  )
}
