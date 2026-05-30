/**
 * Hookscope mark: an oscilloscope-style signal pulse inside an accent badge —
 * the brand metaphor is scoping a webhook's signal. The badge uses
 * `currentColor` so it tracks the theme accent; set color on the wrapper.
 */
export function LogoMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M5 17.5h4.3l2.3-9 3.5 14.4 2.4-7.7 1.7 2.8h7.1"
        stroke="#fff"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({
  wordmark = true,
  mark = 'w-5 h-5',
  className = '',
}: {
  wordmark?: boolean
  mark?: string
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-[var(--accent)] inline-flex">
        <LogoMark className={mark} />
      </span>
      {wordmark && (
        <span className="font-semibold text-[var(--heading)] tracking-tight">Hookscope</span>
      )}
    </span>
  )
}
