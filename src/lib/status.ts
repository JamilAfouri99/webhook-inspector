export type StatusKind = 'pending' | 'success' | 'warning' | 'error'

/** Classify an HTTP status code (0 = simulated hang/timeout) into a UI tone. */
export function statusKind(code: number): StatusKind {
  if (code === 0) return 'pending'
  if (code >= 200 && code < 300) return 'success'
  if (code >= 400 && code < 500) return 'warning'
  return 'error'
}

/** Tailwind classes for a status pill, by tone. Single source of truth for the palette. */
export const STATUS_PILL_CLASS: Record<StatusKind, string> = {
  pending: 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]',
  success: 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]',
  warning: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]',
  error: 'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]',
}

export function statusPillClass(code: number): string {
  return STATUS_PILL_CLASS[statusKind(code)]
}
