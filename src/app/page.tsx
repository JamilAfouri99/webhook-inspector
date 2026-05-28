'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WorkspaceHeader } from '@/components/workspace-header'
import { StatsStrip } from '@/components/stats-strip'
import { ChannelCard } from '@/components/channel-card'
import { ActivityFeed } from '@/components/activity-feed'
import { WorkspaceEmptyState } from '@/components/empty-state'
import { CommandPalette, type Command } from '@/components/command-palette'
import { useHotkeys } from '@/lib/hooks/use-hotkeys'

type Channel = { id: string; slug: string; name: string; createdAt: string }

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$|^[a-z0-9]{3}$/

export default function Lobby() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[] | null>(null)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)

  const fetchChannels = useCallback(() => {
    fetch('/api/channels').then(r => r.json()).then(d => setChannels(d.channels || [])).catch(() => setChannels([]))
  }, [])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  useHotkeys({
    'meta+k': (e) => { e.preventDefault(); setPaletteOpen(true) },
    'ctrl+k': (e) => { e.preventDefault(); setPaletteOpen(true) },
  })

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    const s = slug.trim().toLowerCase()
    if (!SLUG_RE.test(s)) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: s, name: name.trim() || s }),
      })
      if (res.ok) {
        router.push(`/c/${s}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setCreateError(data.error || `Failed (${res.status})`)
      }
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const slugValid = SLUG_RE.test(slug.trim().toLowerCase())

  const commands: Command[] = [
    ...(channels ?? []).map<Command>(ch => ({
      id: `channel:${ch.slug}`,
      label: ch.name,
      hint: ch.slug,
      group: 'Channels',
      action: () => router.push(`/c/${ch.slug}`),
    })),
    {
      id: 'create-channel',
      label: 'Create channel',
      hint: 'Focus the create form',
      group: 'Actions',
      action: () => {
        const el = document.getElementById('slug-input')
        el?.focus()
      },
    },
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <WorkspaceHeader onOpenCommand={() => setPaletteOpen(true)} />

      <main className="flex-1 px-6 py-7 max-w-7xl w-full mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--heading)] tracking-tight">Workspace</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5">Channels, traffic, and recent activity at a glance.</p>
        </div>

        <StatsStrip />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div
              className="bg-white rounded-lg border border-[var(--card-border)] p-4"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--heading)]">Create a channel</h2>
                <span className="text-[10px] text-[var(--muted)]">Slug must be lowercase, 3–40 chars</span>
              </div>
              <form onSubmit={createChannel} className="flex gap-2">
                <input
                  id="slug-input"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="channel-slug"
                  className="flex-1 px-3 py-2 text-sm font-mono border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="flex-1 px-3 py-2 text-sm border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                />
                <button
                  type="submit"
                  disabled={creating || !slugValid}
                  className="px-5 py-2 text-sm font-medium rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)] disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </form>
              {slug && !slugValid && (
                <div className="mt-2 text-[11px] text-[var(--warning-text)]">
                  Slug must be 3–40 chars, lowercase letters/numbers/hyphens, no leading/trailing hyphen.
                </div>
              )}
              {createError && (
                <div className="mt-2 text-[11px] text-[var(--error-text)] bg-[var(--error-soft)] border border-[var(--error-border)] rounded p-2">
                  {createError}
                </div>
              )}
            </div>

            {channels === null ? (
              <div className="text-sm text-[var(--muted)] px-1">Loading channels…</div>
            ) : channels.length === 0 ? (
              <WorkspaceEmptyState />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[var(--heading)]">
                    Channels <span className="text-[var(--muted)] font-normal">({channels.length})</span>
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {channels.map(ch => (
                    <ChannelCard key={ch.id} channel={ch} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  )
}
