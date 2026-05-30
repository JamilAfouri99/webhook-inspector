'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { WorkspaceHeader } from '@/components/workspace-header'
import { StatsStrip } from '@/components/stats-strip'
import { ChannelCard } from '@/components/channel-card'
import { ActivityFeed } from '@/components/activity-feed'
import { WorkspaceEmptyState } from '@/components/empty-state'
import { CommandPalette, type Command } from '@/components/command-palette'
import { ChannelCardGridSkeleton } from '@/components/channel-card-skeleton'
import { ShortcutsHelp, type Shortcut } from '@/components/shortcuts-help'
import { WorkspaceHero } from '@/components/workspace-hero'
import { Logo } from '@/components/logo'
import { useChannels } from '@/lib/hooks/use-api'
import { useHotkeys } from '@/lib/hooks/use-hotkeys'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$|^[a-z0-9]{3}$/

const SLUG_ADJ = ['swift', 'calm', 'bold', 'bright', 'clever', 'brave', 'keen', 'lucky', 'mellow', 'noble', 'quick', 'sharp', 'sleek', 'vivid', 'witty', 'zen']
const SLUG_NOUN = ['otter', 'falcon', 'comet', 'harbor', 'pine', 'quartz', 'river', 'willow', 'ember', 'delta', 'maple', 'onyx', 'raven', 'summit', 'tide', 'vortex']

function randomSlug(): string {
  const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)]
  return `${pick(SLUG_ADJ)}-${pick(SLUG_NOUN)}-${Math.floor(Math.random() * 900 + 100)}`
}

const HOME_SHORTCUTS: Shortcut[] = [
  { keys: ['⌘/Ctrl', 'K'], label: 'Open command palette' },
  { keys: ['?'], label: 'Show this help' },
]

type SortKey = 'recent' | 'name'

export default function Lobby() {
  const router = useRouter()
  const { mutate } = useSWRConfig()
  const { data, isLoading } = useChannels()
  const channels = useMemo(() => data?.channels ?? [], [data])

  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>('recent')

  useHotkeys({
    'meta+k': (e) => { e.preventDefault(); setPaletteOpen(true) },
    'ctrl+k': (e) => { e.preventDefault(); setPaletteOpen(true) },
    'shift+?': (e) => { e.preventDefault(); setHelpOpen(true) },
  })

  const visibleChannels = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? channels.filter((c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
      : channels
    return [...filtered].sort((a, b) =>
      sort === 'name' ? a.name.localeCompare(b.name) : b.createdAt.localeCompare(a.createdAt),
    )
  }, [channels, search, sort])

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
        mutate('/api/channels')
        router.push(`/c/${s}`)
      } else {
        const errBody = await res.json().catch(() => ({}))
        setCreateError(errBody.error || `Failed (${res.status})`)
      }
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  const slugValid = SLUG_RE.test(slug.trim().toLowerCase())

  const commands: Command[] = [
    ...channels.map<Command>(ch => ({
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

  const showSkeleton = isLoading && channels.length === 0

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <WorkspaceHeader onOpenCommand={() => setPaletteOpen(true)} />

      <main className="flex-1 px-6 py-7 max-w-7xl w-full mx-auto space-y-6">
        <WorkspaceHero />

        <StatsStrip />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <div
              className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] p-4"
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
                <button
                  type="button"
                  onClick={() => setSlug(randomSlug())}
                  title="Generate a random slug"
                  aria-label="Generate a random slug"
                  className="shrink-0 px-3 rounded-md border border-[var(--card-border)] text-[var(--muted)] hover:text-[var(--heading)] hover:bg-[var(--muted-soft)] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                </button>
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

            {showSkeleton ? (
              <ChannelCardGridSkeleton count={4} />
            ) : channels.length === 0 ? (
              <WorkspaceEmptyState />
            ) : (
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-[var(--heading)] shrink-0">
                    Channels{' '}
                    <span className="text-[var(--muted)] font-normal">
                      ({visibleChannels.length === channels.length ? channels.length : `${visibleChannels.length} of ${channels.length}`})
                    </span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filter channels…"
                      className="w-40 px-2.5 py-1.5 text-xs border border-[var(--card-border)] rounded-md bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                    />
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="px-2.5 py-1.5 text-xs border border-[var(--card-border)] rounded-md bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
                      aria-label="Sort channels"
                    >
                      <option value="recent">Recent</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                </div>
                {visibleChannels.length === 0 ? (
                  <div className="text-center text-xs text-[var(--muted)] py-10 border border-dashed border-[var(--card-border)] rounded-lg">
                    No channels match “{search}”.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleChannels.map(ch => (
                      <ChannelCard key={ch.id} channel={ch} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <ActivityFeed />
          </div>
        </div>
      </main>

      <footer className="border-t border-[var(--card-border)] bg-[var(--card)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Logo mark="w-4 h-4" />
            <span>· Inspect, simulate &amp; verify webhooks</span>
          </div>
          <a
            href="https://www.linkedin.com/in/jamil-afouri-18041b191/"
            target="_blank"
            rel="noreferrer"
            className="group inline-flex items-center gap-1.5 hover:text-[var(--heading)] transition-colors"
          >
            <span>Designed &amp; built by</span>
            <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">Jamil Afouri</span>
            <svg className="w-4 h-4 text-[var(--muted)] group-hover:text-[#0a66c2] transition-colors" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 110-4.13 2.06 2.06 0 010 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
            </svg>
          </a>
        </div>
      </footer>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} shortcuts={HOME_SHORTCUTS} />
    </div>
  )
}
