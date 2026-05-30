export function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-[11px] uppercase tracking-wider font-semibold text-[var(--muted)]">{title}</h3>
        {subtitle && <p className="text-[10px] text-[var(--muted)] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
