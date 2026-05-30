export type BehaviorPreset = { value: string; label: string; code: string; pill: string }

export const BEHAVIORS: BehaviorPreset[] = [
  { value: 'success',           label: 'Success',         code: '200',   pill: 'bg-[#cdf2e0] text-[#0e6245] border-[#b6e8c8]' },
  { value: 'server-error',      label: 'Server Error',    code: '500',   pill: 'bg-[#fde2e7] text-[#a41c4e] border-[#fac5cf]' },
  { value: 'timeout',           label: 'Timeout',         code: 'HANG',  pill: 'bg-[#f3e8ff] text-[#6a2790] border-[#e8d5fa]' },
  { value: 'slow',              label: 'Slow',            code: 'SLOW',  pill: 'bg-[#ffedb0] text-[#793200] border-[#fae079]' },
  { value: 'client-error',      label: 'Bad Request',     code: '400',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'unauthorized',      label: 'Unauthorized',    code: '401',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'not-found',         label: 'Not Found',       code: '404',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'rate-limited',      label: 'Rate Limited',    code: '429',   pill: 'bg-[#ffe5d2] text-[#983705] border-[#fac4a4]' },
  { value: 'redirect',          label: 'Redirect',        code: '302',   pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'large-response',    label: 'Large Response',  code: '1.5MB', pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'empty-response',    label: 'Empty Body',      code: '200',   pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'non-json-response', label: 'Non-JSON',        code: 'TEXT',  pill: 'bg-[#d6ecff] text-[#134c92] border-[#bcdaf7]' },
  { value: 'custom',            label: 'Custom Code',     code: '???',   pill: 'bg-[#ebeef1] text-[#425466] border-[#d8dee4]' },
]

export type SequenceStep = { behavior: string; delayMs?: number; statusCode?: number }

export type SequencePreset = {
  name: string
  label: string
  description: string
  steps: SequenceStep[]
}

export const SEQUENCE_PRESETS: SequencePreset[] = [
  {
    name: 'flap-500-200',
    label: 'Flap (500, 200, …)',
    description: 'Alternates failure and success on each request.',
    steps: [{ behavior: 'server-error' }, { behavior: 'success' }],
  },
  {
    name: 'recover-after-2-fails',
    label: 'Recover after 2 fails',
    description: 'Two 500s then a 200 — verifies last-attempt success.',
    steps: [{ behavior: 'server-error' }, { behavior: 'server-error' }, { behavior: 'success' }],
  },
  {
    name: 'mixed-errors',
    label: 'Mixed errors (500, 400, 200)',
    description: 'Retryable, non-retryable, success — hits different policies.',
    steps: [{ behavior: 'server-error' }, { behavior: 'client-error' }, { behavior: 'success' }],
  },
]

export type ApplyConfig = {
  behavior?: string
  delayMs?: number
  statusCode?: number
  sequence?: SequenceStep[]
  presetName?: string
}

export type PlaybookStep =
  | ({ kind: 'apply'; note?: string } & ApplyConfig)
  | ({ kind: 'switch'; note: string } & ApplyConfig)
  | { kind: 'do'; text: string }
  | { kind: 'observe'; text: string }

export type Playbook = {
  name: string
  label: string
  intent: string
  question: string
  steps: PlaybookStep[]
}

export function configSummary(cfg: ApplyConfig): string {
  if (cfg.sequence && cfg.sequence.length > 0) {
    if (cfg.presetName) return cfg.presetName
    return cfg.sequence.map((s) => s.behavior).join(' → ')
  }
  if (cfg.behavior) {
    const extras: string[] = []
    if (cfg.delayMs) extras.push(`delay=${cfg.delayMs}ms`)
    if (cfg.statusCode) extras.push(`status=${cfg.statusCode}`)
    return extras.length === 0 ? cfg.behavior : `${cfg.behavior} (${extras.join(', ')})`
  }
  return '—'
}
