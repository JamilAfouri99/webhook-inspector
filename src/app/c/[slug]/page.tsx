'use client'

import { useEffect, useState, use, useMemo, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Group, Panel, Separator, type PanelImperativeHandle } from 'react-resizable-panels'
import { useWebhookEvents } from '@/lib/hooks/use-webhook-events'
import { useHotkeys } from '@/lib/hooks/use-hotkeys'
import { TopBar } from '@/components/top-bar'
import { Sidebar, SEQUENCE_PRESETS } from '@/components/sidebar'
import { EventStream } from '@/components/event-stream'
import { EventInspector } from '@/components/event-inspector'
import { SendComposer } from '@/components/send-composer'
import { KpiStrip } from '@/components/kpi-strip'
import { TimelineStrip } from '@/components/timeline-strip'
import { CommandPalette, type Command } from '@/components/command-palette'
import type { ReceivedWebhook } from '@/lib/webhook-state'

type ChannelMeta = { id: string; slug: string; name: string }

const SIDEBAR_BEHAVIORS = [
  { value: 'success',           label: 'Success',         code: '200',   pill: 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]' },
  { value: 'server-error',      label: 'Server Error',    code: '500',   pill: 'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]' },
  { value: 'timeout',           label: 'Timeout',         code: 'HANG',  pill: 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]' },
  { value: 'slow',              label: 'Slow',            code: 'SLOW',  pill: 'bg-[#ffedb0] text-[#793200] border-[#fae079]' },
  { value: 'client-error',      label: 'Bad Request',     code: '400',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'unauthorized',      label: 'Unauthorized',    code: '401',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'not-found',         label: 'Not Found',       code: '404',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'rate-limited',      label: 'Rate Limited',    code: '429',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'redirect',          label: 'Redirect',        code: '302',   pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'large-response',    label: 'Large Response',  code: '1.5MB', pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'empty-response',    label: 'Empty Body',      code: '200',   pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'non-json-response', label: 'Non-JSON',        code: 'TEXT',  pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
]

export default function ChannelDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { webhooks, state, connected } = useWebhookEvents(slug)
  const [selectedWebhook, setSelectedWebhook] = useState<ReceivedWebhook | null>(null)
  const [webhookUrl, setWebhookUrl] = useState(`/api/webhook/${slug}`)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [allChannels, setAllChannels] = useState<ChannelMeta[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false)

  const sidebarRef = useRef<PanelImperativeHandle>(null)
  const inspectorRef = useRef<PanelImperativeHandle>(null)

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhook/${slug}`)
  }, [slug])

  useEffect(() => {
    fetch('/api/channels').then(r => r.json()).then(d => setAllChannels(d.channels || [])).catch(() => {})
  }, [])

  useEffect(() => {
    const eventId = searchParams.get('event')
    if (!eventId) return
    const found = webhooks.find(w => w.id === eventId)
    if (found && (!selectedWebhook || selectedWebhook.id !== eventId)) {
      setSelectedWebhook(found)
    }
  }, [searchParams, webhooks, selectedWebhook])

  const selectAndPersist = useCallback((w: ReceivedWebhook) => {
    setSelectedWebhook(w)
    if (inspectorCollapsed && inspectorRef.current) {
      inspectorRef.current.expand()
    }
    const params = new URLSearchParams(searchParams.toString())
    params.set('event', w.id)
    router.replace(`?${params.toString()}`, { scroll: false })
  }, [router, searchParams, inspectorCollapsed])

  useEffect(() => {
    if (webhooks.length === 0) setSelectedWebhook(null)
    else if (selectedWebhook && !webhooks.find(w => w.id === selectedWebhook.id)) {
      setSelectedWebhook(webhooks[webhooks.length - 1])
    }
  }, [webhooks, selectedWebhook])

  function toggleSidebar() {
    const ref = sidebarRef.current
    if (!ref) return
    if (sidebarCollapsed) ref.expand()
    else ref.collapse()
  }

  function toggleInspector() {
    const ref = inspectorRef.current
    if (!ref) return
    if (inspectorCollapsed) ref.expand()
    else ref.collapse()
  }

  function closeInspector() {
    setSelectedWebhook(null)
    const params = new URLSearchParams(searchParams.toString())
    params.delete('event')
    router.replace(params.toString() ? `?${params.toString()}` : '', { scroll: false })
  }

  useHotkeys({
    'meta+k': (e) => { e.preventDefault(); setPaletteOpen(true) },
    'ctrl+k': (e) => { e.preventDefault(); setPaletteOpen(true) },
    '/': (e) => { e.preventDefault(); document.getElementById('stream-search')?.focus() },
    'escape': () => { if (selectedWebhook) closeInspector() },
    '[': (e) => { e.preventDefault(); toggleSidebar() },
    ']': (e) => { e.preventDefault(); toggleInspector() },
  })

  async function setBehavior(value: string, extra: Record<string, unknown> = {}) {
    await fetch(`/api/channels/${slug}/behavior`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ behavior: value, ...extra }),
    })
  }

  async function applySequencePreset(steps: Array<{ behavior: string; delayMs?: number; statusCode?: number }>, name: string) {
    await fetch(`/api/channels/${slug}/sequence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps, name }),
    })
  }

  const commands: Command[] = useMemo(() => {
    const out: Command[] = []
    for (const ch of allChannels) {
      if (ch.slug === slug) continue
      out.push({
        id: `channel:${ch.slug}`,
        label: ch.name,
        hint: ch.slug,
        group: 'Channels',
        action: () => router.push(`/c/${ch.slug}`),
      })
    }
    for (const b of SIDEBAR_BEHAVIORS) {
      out.push({
        id: `behavior:${b.value}`,
        label: `Set behavior — ${b.label}`,
        hint: b.value,
        group: 'Behaviors',
        pill: { text: b.code, cls: b.pill },
        action: () => setBehavior(b.value),
      })
    }
    for (const s of SEQUENCE_PRESETS) {
      out.push({
        id: `sequence:${s.name}`,
        label: `Apply sequence — ${s.label}`,
        hint: s.description,
        group: 'Sequences',
        action: () => applySequencePreset(s.steps, s.name),
      })
    }
    out.push(
      { id: 'copy-url', label: 'Copy webhook URL', group: 'Actions', action: () => navigator.clipboard.writeText(webhookUrl) },
      { id: 'reset',    label: 'Reset channel',     group: 'Actions', action: () => fetch(`/api/channels/${slug}/reset`, { method: 'POST' }) },
      { id: 'clear',    label: 'Clear history',     group: 'Actions', action: () => fetch(`/api/channels/${slug}/history`, { method: 'DELETE' }) },
      { id: 'toggle-sidebar', label: 'Toggle sidebar', hint: '[', group: 'View', action: toggleSidebar },
      { id: 'toggle-inspector', label: 'Toggle inspector', hint: ']', group: 'View', action: toggleInspector },
    )
    return out
  }, [allChannels, slug, webhookUrl, router, sidebarCollapsed, inspectorCollapsed])

  return (
    <div className="h-screen flex flex-col bg-[var(--surface)] overflow-hidden">
      <TopBar
        channelSlug={slug}
        channelName={state?.channel?.name}
        connected={connected}
        webhookCount={webhooks.length}
        onOpenCommand={() => setPaletteOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
        inspectorCollapsed={inspectorCollapsed}
        onToggleSidebar={toggleSidebar}
        onToggleInspector={toggleInspector}
      />

      <div className="flex-1 min-h-0">
        <Group orientation="horizontal" id="channel-layout" className="h-full">
          <Panel
            id="sidebar"
            panelRef={sidebarRef}
            defaultSize="22%"
            minSize="16%"
            maxSize="36%"
            collapsible
            collapsedSize="0%"
            onResize={(size) => setSidebarCollapsed(size.asPercentage < 1)}
            className="overflow-hidden"
          >
            <Sidebar
              channelSlug={slug}
              webhookUrl={webhookUrl}
              activeBehavior={state?.behavior ?? 'success'}
              activeScenario={state?.activeScenario ?? 'none'}
              forwardUrl={state?.forwardUrl ?? null}
              forwardEnabled={state?.forwardEnabled ?? false}
            />
          </Panel>

          {!sidebarCollapsed && <ResizeSeparator />}

          <Panel id="stream" defaultSize="46%" minSize="30%" className="overflow-hidden">
            <div className="flex flex-col min-w-0 bg-white h-full">
              <KpiStrip webhooks={webhooks} />
              <TimelineStrip webhooks={webhooks} onSelect={selectAndPersist} />
              <EventStream
                webhooks={webhooks}
                onSelect={selectAndPersist}
                selectedId={selectedWebhook?.id}
                channelSlug={slug}
              />
            </div>
          </Panel>

          {!inspectorCollapsed && <ResizeSeparator />}

          <Panel
            id="inspector"
            panelRef={inspectorRef}
            defaultSize="32%"
            minSize="22%"
            maxSize="48%"
            collapsible
            collapsedSize="0%"
            onResize={(size) => setInspectorCollapsed(size.asPercentage < 1)}
            className="overflow-hidden"
          >
            {selectedWebhook ? (
              <EventInspector
                webhook={selectedWebhook}
                allWebhooks={webhooks}
                channelSlug={slug}
                onClose={closeInspector}
              />
            ) : (
              <EmptyInspector />
            )}
          </Panel>
        </Group>
      </div>

      <SendComposer channelSlug={slug} sidebarCollapsed={sidebarCollapsed} inspectorCollapsed={inspectorCollapsed} />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        placeholder="Search channels, behaviors, sequences, actions…"
      />
    </div>
  )
}

function ResizeSeparator() {
  return (
    <Separator className="w-px bg-[var(--card-border)] hover:bg-[var(--accent)] data-[resizing=true]:bg-[var(--accent)] transition-colors relative" />
  )
}

function EmptyInspector() {
  return (
    <aside className="h-full bg-white flex items-center justify-center text-[var(--muted)] text-sm">
      <div className="text-center px-6">
        <div className="w-12 h-12 mx-auto rounded-full bg-[var(--muted-soft)] flex items-center justify-center mb-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div className="font-medium text-[var(--heading)]">Inspector</div>
        <div className="text-xs mt-1">Select a webhook to inspect</div>
        <div className="mt-4 text-[10px] text-[var(--muted)] space-x-1">
          <kbd className="px-1 py-0.5 rounded bg-[var(--muted-soft)] border border-[var(--card-border)] font-mono text-[var(--heading)]">⌘K</kbd>
          <span>commands</span>
          <span>·</span>
          <kbd className="px-1 py-0.5 rounded bg-[var(--muted-soft)] border border-[var(--card-border)] font-mono text-[var(--heading)]">/</kbd>
          <span>search</span>
          <span>·</span>
          <kbd className="px-1 py-0.5 rounded bg-[var(--muted-soft)] border border-[var(--card-border)] font-mono text-[var(--heading)]">]</kbd>
          <span>collapse</span>
        </div>
      </div>
    </aside>
  )
}
