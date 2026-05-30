'use client'

import { StatusBadge } from './ui'
import type { ReplayResult } from './use-replay'

export function ReplayCard({ result }: { result: ReplayResult }) {
  const ok = result.ok
  return (
    <div className={`rounded-md border p-3 text-xs animate-fade-in ${ok ? 'border-[var(--success-border)] bg-[var(--success-soft)]' : 'border-[var(--error-border)] bg-[var(--error-soft)]'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`font-semibold ${ok ? 'text-[var(--success-text)]' : 'text-[var(--error-text)]'}`}>
          {ok ? 'Replay succeeded' : 'Replay failed'}
        </span>
        {result.status !== undefined && <StatusBadge code={result.status} />}
        {result.durationMs !== undefined && <span className="text-[var(--muted)]">{result.durationMs}ms</span>}
      </div>
      {result.error && <div className="text-[var(--error-text)] mb-1">{result.error}</div>}
      {result.body !== undefined && result.body !== null && (
        <pre className="text-[10px] font-mono mt-1 max-h-32 overflow-auto text-[var(--heading)]">
          {typeof result.body === 'string' ? result.body : JSON.stringify(result.body, null, 2)}
        </pre>
      )}
    </div>
  )
}
