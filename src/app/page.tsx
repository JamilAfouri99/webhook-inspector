'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Channel = {
  id: string
  slug: string
  name: string
  createdAt: string
}

export default function ChannelLobby() {
  const router = useRouter()
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchChannels() {
    try {
      const res = await fetch('/api/channels')
      const data = await res.json()
      setChannels(data.channels || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchChannels() }, [])

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!slug.trim()) return
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slug.trim().toLowerCase(), name: name.trim() || slug.trim() }),
      })
      if (res.ok) {
        router.push(`/c/${slug.trim().toLowerCase()}`)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || `Failed (${res.status})`)
      }
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function deleteChannel(channelSlug: string) {
    await fetch(`/api/channels/${channelSlug}`, { method: 'DELETE' })
    fetchChannels()
  }

  const slugValid = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug.trim().toLowerCase())

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-[var(--card-border)] bg-[var(--card)] flex items-center px-6 gap-4 shrink-0">
        <div className="w-2 h-2 rounded-full bg-[var(--accent)]" />
        <span className="text-sm font-semibold tracking-tight">Webhook Tester</span>
        <span className="text-xs text-[var(--muted)]">Select or create a channel to start testing</span>
      </header>

      <div className="flex-1 flex items-start justify-center p-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* Create channel */}
          <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-6">
            <h2 className="text-base font-semibold mb-4">Create Channel</h2>
            <p className="text-xs text-[var(--muted)] mb-4">
              Each channel is an isolated workspace with its own webhook endpoint, behavior config, and history.
            </p>
            <form onSubmit={createChannel} className="flex gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="channel-slug (e.g. ahmed, sprint-42)"
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="w-full bg-[var(--background)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button
                type="submit"
                disabled={creating || !slugValid}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors disabled:opacity-50 shrink-0"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </form>
            {slug && !slugValid && (
              <div className="text-[var(--warning)] text-[10px] mt-2">3-40 chars, lowercase letters, numbers, hyphens only</div>
            )}
            {error && (
              <div className="text-[var(--error)] text-xs mt-2">{error}</div>
            )}
          </div>

          {/* Channel list */}
          <div>
            <h2 className="text-base font-semibold mb-4">
              Active Channels
              {!loading && <span className="text-[var(--muted)] font-normal ml-2 text-xs">({channels.length})</span>}
            </h2>

            {loading ? (
              <div className="text-[var(--muted)] text-sm">Loading...</div>
            ) : channels.length === 0 ? (
              <div className="text-center text-[var(--muted)] text-sm py-12 rounded-lg border border-dashed border-[var(--card-border)]">
                No channels yet. Create one above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {channels.map(ch => (
                  <div
                    key={ch.id}
                    className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center gap-4 hover:border-[var(--muted)]/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{ch.name}</span>
                        <code className="text-[10px] text-[var(--muted)] font-mono bg-[var(--background)] px-1.5 py-0.5 rounded">{ch.slug}</code>
                      </div>
                      <div className="text-[10px] text-[var(--muted)] font-mono truncate">
                        /api/webhook/{ch.slug}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => router.push(`/c/${ch.slug}`)}
                        className="px-4 py-1.5 rounded text-xs font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent)]/80 transition-colors"
                      >
                        Open
                      </button>
                      <button
                        onClick={() => deleteChannel(ch.slug)}
                        className="px-3 py-1.5 rounded text-xs bg-[var(--card-border)] hover:bg-[var(--error)]/20 hover:text-[var(--error)] transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
