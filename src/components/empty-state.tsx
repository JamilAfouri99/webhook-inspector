export function WorkspaceEmptyState() {
  return (
    <div
      className="bg-[var(--card)] rounded-lg border border-dashed border-[var(--card-border-strong)] p-10 text-center"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="w-16 h-16 mx-auto rounded-full bg-[var(--accent-soft)] flex items-center justify-center mb-4">
        <svg className="w-7 h-7 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--heading)] mb-1">Build your first webhook channel</h3>
      <p className="text-sm text-[var(--muted)] max-w-md mx-auto mb-6">
        Each channel is an isolated endpoint with its own behavior, sequence, and history. Point any producer at it
        and use the live inspector to verify, replay, and debug.
      </p>
      <ol className="text-sm text-left max-w-md mx-auto space-y-2.5">
        <Step n={1} title="Create a channel" text="Pick a slug (e.g. payments-staging). The unique URL becomes your test endpoint." />
        <Step n={2} title="Send a webhook" text="POST to /api/webhook/{slug} from your producer, curl, or the built-in Send Test composer." />
        <Step n={3} title="Inspect & debug" text="Switch behaviors instantly, replay attempts, diff retries, and copy a curl reproduction." />
      </ol>
    </div>
  )
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--accent)] text-white text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <div>
        <div className="text-[var(--heading)] font-medium">{title}</div>
        <div className="text-[var(--muted)] text-xs mt-0.5">{text}</div>
      </div>
    </li>
  )
}
