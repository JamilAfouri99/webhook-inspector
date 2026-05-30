import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { statusPillClass } from '@/lib/status'
import { Logo } from '@/components/logo'

function jsonPretty(v: unknown): string {
  if (v === undefined || v === null) return ''
  try { return JSON.stringify(v, null, 2) } catch { return String(v) }
}

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await prisma.webhook.findUnique({
    where: { id },
    include: { channel: { select: { slug: true, name: true } } },
  })
  if (!row) return notFound()

  const event = (row.body as { event?: string } | null)?.event ?? 'unknown'
  const eventId = (row.body as { eventId?: string } | null)?.eventId ?? '—'
  const headers = (row.headers as Record<string, unknown>) || {}

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <header className="h-12 bg-[var(--card)] border-b border-[var(--card-border)] flex items-center px-6 gap-3">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo mark="w-[18px] h-[18px]" />
        </Link>
        <span className="text-[var(--muted)]">/</span>
        <span className="text-xs text-[var(--muted)]">Shared webhook</span>
        <span className="ml-auto text-[10px] text-[var(--muted)] font-mono">read-only</span>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-semibold text-[var(--heading)]">{event}</h1>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold border ${statusPillClass(row.respondedStatusCode)}`}>
              {row.respondedStatusCode === 0 ? 'HANG' : row.respondedStatusCode}
            </span>
          </div>
          <div className="text-xs text-[var(--muted)]">
            Channel <Link className="text-[var(--accent)] hover:underline" href={`/c/${row.channel.slug}`}>{row.channel.name}</Link>
            <span className="mx-2">·</span>
            <span className="font-mono">{eventId}</span>
            <span className="mx-2">·</span>
            {row.receivedAt.toLocaleString()}
          </div>
        </div>

        <Card title="Delivery">
          <Field label="Status code" value={String(row.respondedStatusCode)} />
          <Field label="Behavior" value={row.respondedBehavior} mono />
          <Field label="Delay applied" value={`${row.respondedDelayMs}ms`} />
          <Field label="Method" value={row.method} mono />
          <Field label="Path" value={row.path} mono />
        </Card>

        <Card title="Payload">
          <pre className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] p-3 font-mono text-[11px] leading-relaxed text-[var(--heading)] overflow-auto max-h-[420px]">
            {jsonPretty(row.body)}
          </pre>
        </Card>

        <Card title={`Headers (${Object.keys(headers).length})`}>
          <div className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] p-3 space-y-1 max-h-[280px] overflow-y-auto">
            {Object.entries(headers).map(([key, value]) => (
              <div key={key} className="flex gap-2 text-[11px] font-mono">
                <span className="text-[var(--accent)] shrink-0">{key}:</span>
                <span className="text-[var(--heading)] break-all">{String(value)}</span>
              </div>
            ))}
          </div>
        </Card>

        {row.signatureHeader && (
          <Card title="Signature">
            <div className="space-y-2">
              {row.signatureValid === true && <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--success-soft)] text-[var(--success-text)] border border-[var(--success-border)]">Valid</span>}
              {row.signatureValid === false && <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--error-soft)] text-[var(--error-text)] border border-[var(--error-border)]">Invalid</span>}
              {row.signatureValid === null && <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--neutral-soft)] text-[var(--muted)] border border-[var(--neutral-border)]">Not verified</span>}
              {row.signatureError && <div className="text-[11px] text-[var(--error-text)] bg-[var(--error-soft)] border border-[var(--error-border)] rounded p-2">{row.signatureError}</div>}
              <pre className="rounded-md border border-[var(--card-border)] bg-[var(--muted-soft)] p-3 font-mono text-[10px] break-all overflow-auto">
                {row.signatureHeader}
              </pre>
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-[var(--card)] rounded-lg border border-[var(--card-border)] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="px-4 py-2.5 border-b border-[var(--card-border)]">
        <h2 className="text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">{title}</h2>
      </div>
      <div className="p-4 space-y-1.5">{children}</div>
    </section>
  )
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 text-[11px]">
      <span className="text-[var(--muted)] w-32 shrink-0">{label}</span>
      <span className={`text-[var(--heading)] flex-1 min-w-0 break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}
