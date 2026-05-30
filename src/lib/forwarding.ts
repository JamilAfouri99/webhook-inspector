import type { WebhookHeaders } from '@/lib/types'

/**
 * Headers that describe a specific hop and must not be copied when re-sending a
 * captured request to another destination.
 */
const HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'keep-alive',
  'transfer-encoding', 'upgrade', 'proxy-connection', 'te', 'trailer',
])

/**
 * Project captured webhook headers into a header set safe to forward: drops
 * hop-by-hop headers, flattens multi-value headers, and defaults content-type.
 * `extra` headers are merged last (and win).
 */
export function buildForwardHeaders(
  source: WebhookHeaders,
  extra?: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (HOP_BY_HOP.has(key.toLowerCase())) continue
    if (Array.isArray(value)) out[key] = value.join(', ')
    else if (typeof value === 'string') out[key] = value
  }
  if (!out['content-type']) out['content-type'] = 'application/json'
  return extra ? { ...out, ...extra } : out
}
