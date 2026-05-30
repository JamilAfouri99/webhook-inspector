'use client'

export type Shortcut = { keys: string[]; label: string }

export function ShortcutsHelp({
  open,
  onClose,
  shortcuts,
}: {
  open: boolean
  onClose: () => void
  shortcuts: Shortcut[]
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-sm mx-4 p-5"
        style={{ boxShadow: 'var(--shadow-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[var(--heading)] mb-3">Keyboard shortcuts</h3>
        <ul className="space-y-2">
          {shortcuts.map((s, i) => (
            <li key={i} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-[var(--foreground)]">{s.label}</span>
              <span className="flex gap-1 shrink-0">
                {s.keys.map((k, j) => (
                  <kbd
                    key={j}
                    className="px-1.5 py-0.5 rounded bg-[var(--muted-soft)] border border-[var(--card-border)] font-mono text-[11px] text-[var(--heading)]"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="text-xs px-3 py-1.5 rounded-md border border-[var(--card-border)] hover:bg-[var(--muted-soft)] text-[var(--heading)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
