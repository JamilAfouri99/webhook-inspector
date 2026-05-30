'use client'

import { useCallback, useState } from 'react'
import { useSWRConfig } from 'swr'
import { useToast } from '@/components/toaster'
import { STATUS_KEY } from '@/lib/hooks/use-api'
import type { ApplyConfig, SequenceStep } from './presets'

/**
 * Channel mutation actions shared by the behavior panel and playbooks: each
 * POSTs, surfaces a success/error toast, and revalidates the channel status.
 * `busy` carries the key of the in-flight action (e.g. `behavior:slow`).
 */
export function useChannelControls(channelSlug: string) {
  const { toast } = useToast()
  const { mutate } = useSWRConfig()
  const [busy, setBusy] = useState<string | null>(null)

  const applyBehavior = useCallback(
    async (value: string, extra: Record<string, unknown> = {}) => {
      setBusy(`behavior:${value}`)
      try {
        const res = await fetch(`/api/channels/${channelSlug}/behavior`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ behavior: value, ...extra }),
        })
        if (res.ok) {
          toast({ kind: 'success', title: `Behavior: ${value}` })
          mutate(STATUS_KEY(channelSlug))
        } else {
          toast({ kind: 'error', title: `Failed to set behavior (${res.status})` })
        }
      } finally {
        setBusy(null)
      }
    },
    [channelSlug, toast, mutate],
  )

  const applySequence = useCallback(
    async (steps: SequenceStep[], presetName?: string) => {
      setBusy(presetName ? `sequence:${presetName}` : 'sequence:custom')
      try {
        const res = await fetch(`/api/channels/${channelSlug}/sequence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steps, name: presetName }),
        })
        if (res.ok) {
          toast({ kind: 'success', title: presetName ? `Sequence: ${presetName}` : 'Custom sequence applied' })
          mutate(STATUS_KEY(channelSlug))
        } else {
          toast({ kind: 'error', title: `Failed to apply sequence (${res.status})` })
        }
      } finally {
        setBusy(null)
      }
    },
    [channelSlug, toast, mutate],
  )

  const applyConfig = useCallback(
    async (cfg: ApplyConfig) => {
      if (cfg.sequence && cfg.sequence.length > 0) {
        await applySequence(cfg.sequence, cfg.presetName)
        return
      }
      if (cfg.behavior) {
        const extra: Record<string, unknown> = {}
        if (cfg.delayMs !== undefined) extra.delayMs = cfg.delayMs
        if (cfg.statusCode !== undefined) extra.statusCode = cfg.statusCode
        await applyBehavior(cfg.behavior, extra)
      }
    },
    [applyBehavior, applySequence],
  )

  return { busy, applyBehavior, applySequence, applyConfig }
}

export type ChannelControls = ReturnType<typeof useChannelControls>
