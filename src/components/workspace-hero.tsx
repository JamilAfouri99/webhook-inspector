import { LogoMark } from './logo'

type Capability = { title: string; desc: string; icon: React.ReactNode }

const CAPABILITIES: Capability[] = [
  {
    title: 'Live inspection',
    desc: 'Every delivery streams in over SSE — headers, body, timing.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12a7 7 0 0114 0M8.5 12a3.5 3.5 0 017 0M12 12h.01" />
    ),
  },
  {
    title: 'Simulate anything',
    desc: '200 · 500 · timeout · slow · sequences — flip behavior instantly.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7M18 12l3 3-3 3" />
    ),
  },
  {
    title: 'Replay & diff',
    desc: 'Re-fire any attempt and diff payloads across retries.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006 5.3L4 7m0 8a8 8 0 0014 3.7l2-1.7" />
    ),
  },
  {
    title: 'Verify signatures',
    desc: 'Stripe, GitHub, Shopify, Slack, Svix & generic HMAC.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3zM9 12l2 2 4-4" />
    ),
  },
]

export function WorkspaceHero() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--accent-soft)] via-[var(--card)] to-[var(--card)] p-6 sm:p-8">
      <div className="flex items-center gap-4">
        <span className="text-[var(--accent)] shrink-0">
          <LogoMark className="w-11 h-11" />
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-[var(--heading)] tracking-tight">Hookscope</h1>
          <p className="text-sm text-[var(--muted)] mt-0.5 max-w-2xl">
            A developer workbench for webhooks — inspect deliveries in real time, simulate any response or
            failure, replay and diff retries, and verify provider signatures. Self-hosted, zero config.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
        {CAPABILITIES.map((c) => (
          <div
            key={c.title}
            className="rounded-lg border border-[var(--card-border)] bg-[var(--card)]/70 backdrop-blur-sm p-3.5"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-7 h-7 rounded-md bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                  {c.icon}
                </svg>
              </span>
              <h3 className="text-[13px] font-semibold text-[var(--heading)]">{c.title}</h3>
            </div>
            <p className="text-[11px] text-[var(--muted)] leading-snug">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
