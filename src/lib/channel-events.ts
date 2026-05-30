import type { ReceivedWebhook, ChannelState } from '@/lib/types'

/**
 * In-memory, per-channel pub/sub used to push events to connected SSE clients.
 *
 * Scope note: this registry is process-local by design. The tool ships as a
 * single container (see README), so a cross-process broker (Redis, Postgres
 * LISTEN/NOTIFY) is intentionally out of scope. If horizontal scaling is ever
 * required, this module is the single seam to swap.
 */

export type ChannelEvent =
  | { type: 'connected'; data: { channel: string } }
  | { type: 'webhook'; data: ReceivedWebhook }
  | { type: 'state-change'; data: ChannelState }
  | { type: 'reset'; data: null }
  | { type: 'history-cleared'; data: { count: number } }
  | { type: 'channel-deleted'; data: null }

export type ChannelEventName = ChannelEvent['type']

type ChannelEventListener = (event: ChannelEventName, data: ChannelEvent['data']) => void

const channelListeners = new Map<string, Set<ChannelEventListener>>()

/** Subscribe to a channel's events. Returns an unsubscribe function. */
export function addListener(slug: string, listener: ChannelEventListener): () => void {
  let set = channelListeners.get(slug)
  if (!set) {
    set = new Set()
    channelListeners.set(slug, set)
  }
  set.add(listener)

  return () => {
    const current = channelListeners.get(slug)
    if (!current) return
    current.delete(listener)
    if (current.size === 0) channelListeners.delete(slug)
  }
}

/** Broadcast an event to every listener subscribed to `slug`. */
export function emit(slug: string, event: ChannelEventName, data: ChannelEvent['data']): void {
  const set = channelListeners.get(slug)
  if (!set) return
  for (const listener of set) listener(event, data)
}

/** Notify subscribers a channel was deleted, then drop its listener set. */
export function dropChannel(slug: string): void {
  emit(slug, 'channel-deleted', null)
  channelListeners.delete(slug)
}
