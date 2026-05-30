'use client'

import type { DiffEntry } from '@/lib/json-diff'
import { jsonPretty } from './ui'

export function DiffCard({ diff, attemptN }: { diff: DiffEntry[]; attemptN: number }) {
  return (
    <div className="rounded-md border border-[var(--card-border)] bg-[var(--card)] p-3 text-xs animate-fade-in">
      <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)] mb-2">
        Diff with attempt {attemptN}
      </div>
      {diff.length === 0 ? (
        <div className="text-[var(--muted)] text-[11px]">Payload identical to previous attempt.</div>
      ) : (
        <ul className="space-y-1 max-h-[260px] overflow-y-auto">
          {diff.map((d, i) => (
            <li key={i} className="text-[11px] font-mono leading-snug">
              {d.kind === 'added' && (
                <span className="text-[var(--success-text)]">+ {d.path}: {String(jsonPretty(d.value))}</span>
              )}
              {d.kind === 'removed' && (
                <span className="text-[var(--error-text)]">− {d.path}: {String(jsonPretty(d.value))}</span>
              )}
              {d.kind === 'changed' && (
                <span>
                  <span className="text-[var(--muted)]">~ {d.path}: </span>
                  <span className="text-[var(--error-text)]">{String(d.before)}</span>
                  <span className="text-[var(--muted)]"> → </span>
                  <span className="text-[var(--success-text)]">{String(d.after)}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
