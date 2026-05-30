'use client'

import { useState } from 'react'

type Props = {
  behavior: string
  onClose: () => void
  onApply: (behavior: string, extra: Record<string, unknown>) => void
}

/** Modal for behaviors that need a parameter: a status code (custom) or a delay (slow/timeout). */
export function ConfigModal({ behavior, onClose, onApply }: Props) {
  const isCustom = behavior === 'custom'
  const [customCode, setCustomCode] = useState<number | undefined>(isCustom ? 418 : undefined)
  const [delayMs, setDelayMs] = useState<number>(behavior === 'timeout' ? 35000 : 10000)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-sm mx-4 p-5"
        style={{ boxShadow: 'var(--shadow-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[var(--heading)] mb-3">Configure {behavior}</h3>
        {isCustom ? (
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5">HTTP Status Code (100–599)</label>
            <input
              type="number"
              value={customCode ?? ''}
              onChange={(e) => setCustomCode(parseInt(e.target.value) || undefined)}
              className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1.5">Delay (milliseconds)</label>
            <input
              type="number"
              value={delayMs}
              onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-[var(--card-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)]"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="text-xs px-4 py-2 rounded-md border border-[var(--card-border)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
          >
            Cancel
          </button>
          <button
            onClick={() => onApply(behavior, isCustom ? { statusCode: customCode } : { delayMs })}
            className="text-xs px-4 py-2 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent-strong)]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  )
}
