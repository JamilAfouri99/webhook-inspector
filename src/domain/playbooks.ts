import type { BehaviorName } from './behavior'

export type SequenceStep = {
  behavior: BehaviorName
  delayMs?: number
  statusCode?: number
}

export type ApplyConfig = {
  behavior?: BehaviorName
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

export const PLAYBOOKS: Playbook[] = [
  {
    name: 'verify-retry-on-5xx',
    label: 'Verify producer retries on 5xx',
    intent: 'Confirm that your producer retries when the receiver returns 500.',
    question: 'Does my producer retry transient 5xx failures?',
    steps: [
      { kind: 'apply', behavior: 'server-error', note: 'Channel will reject every attempt with 500.' },
      { kind: 'do',     text: 'Send 1 webhook event from your producer (use any eventId).' },
      { kind: 'observe', text: 'The stream should show ≥ 2 attempts sharing the same eventId, each returning 500. The exact retry delay is producer-side — check the timing gaps in the inspector.' },
    ],
  },
  {
    name: 'verify-no-retry-on-4xx',
    label: 'Verify producer does NOT retry 4xx',
    intent: 'Confirm that your producer treats client errors as terminal.',
    question: 'Does my producer correctly skip retries on 4xx?',
    steps: [
      { kind: 'apply', behavior: 'client-error', note: 'Channel will reject every attempt with 400.' },
      { kind: 'do',     text: 'Send 1 webhook event from your producer.' },
      { kind: 'observe', text: 'Exactly 1 attempt should land in the stream. A second attempt for the same eventId means your producer retries 4xx — likely a bug.' },
    ],
  },
  {
    name: 'verify-retry-then-recover',
    label: 'Verify retry-then-recover',
    intent: 'Confirm that your producer succeeds on a retry after transient failure.',
    question: 'Does my producer eventually deliver after the receiver recovers?',
    steps: [
      { kind: 'apply',  behavior: 'server-error', note: 'Start with 500.' },
      { kind: 'do',      text: 'Send 1 webhook event. The first attempt records as 500.' },
      { kind: 'switch',  behavior: 'success', note: 'Before the producer’s next retry, flip the channel to healthy.' },
      { kind: 'observe', text: 'The next attempt for that eventId should return 200. The inspector’s “Diff with previous attempt” will show if anything in the payload changed between attempts.' },
    ],
  },
  {
    name: 'verify-timeout-handling',
    label: 'Verify producer handles timeouts',
    intent: 'Confirm that your producer enforces a request timeout and treats the timeout as a retryable failure.',
    question: 'Does my producer time out and retry when the receiver hangs?',
    steps: [
      { kind: 'apply', behavior: 'timeout', delayMs: 35_000, note: 'Channel will hold the connection for 35s, then return 504.' },
      { kind: 'do',     text: 'Send 1 webhook event. The recorded status will be 0 (HANG) until the connection finally closes.' },
      { kind: 'observe', text: 'Your producer should treat the timeout as a failure and retry. If it hangs alongside the receiver, you have a missing timeout configuration.' },
    ],
  },
  {
    name: 'verify-slow-tolerance',
    label: 'Verify producer tolerates slow responses',
    intent: 'Confirm that your producer waits for a slow (but successful) response instead of giving up early.',
    question: 'Does my producer wait long enough for a slow response to succeed?',
    steps: [
      { kind: 'apply', behavior: 'slow', delayMs: 10_000, note: 'Channel returns 200 after a 10-second delay.' },
      { kind: 'do',     text: 'Send 1 event.' },
      { kind: 'observe', text: 'Exactly 1 attempt, ending with 200. If you see two attempts, your producer’s timeout is shorter than 10 seconds.' },
    ],
  },
  {
    name: 'verify-rate-limit-handling',
    label: 'Verify producer behavior on 429',
    intent: 'Confirm whether your producer respects 429 Retry-After or retries unconditionally.',
    question: 'How does my producer handle rate-limit responses?',
    steps: [
      { kind: 'apply', behavior: 'rate-limited', note: 'Channel returns 429 with retryAfter:60 in the body.' },
      { kind: 'do',     text: 'Send 1 event.' },
      { kind: 'observe', text: '4xx-as-terminal producers stop after 1 attempt. Retry-Aware producers will wait ~60s and retry — visible as a single second attempt with a long gap.' },
    ],
  },
  {
    name: 'verify-redirect-rejection',
    label: 'Verify producer rejects redirects',
    intent: 'Confirm that your producer treats 302 as an error, not as a URL change.',
    question: 'Will my producer accidentally follow a redirect?',
    steps: [
      { kind: 'apply', behavior: 'redirect', note: 'Channel returns 302 to example.com.' },
      { kind: 'do',     text: 'Send 1 event.' },
      { kind: 'observe', text: 'A 302 in the stream is expected. Your producer should not follow it; any second attempt should be a retry against this same URL, not a hit on example.com.' },
    ],
  },
  {
    name: 'verify-signature',
    label: 'Verify webhook signature flow',
    intent: 'Confirm that your producer signs requests correctly and that this receiver validates them.',
    question: 'Are signed requests being validated end-to-end?',
    steps: [
      { kind: 'apply', behavior: 'success', note: 'Start clean.' },
      { kind: 'do',     text: 'Set a PEM public key on the channel via POST /api/channels/{slug}/public-key. The producer must sign payloads as JWT RS256 with the matching private key and put the JWT in X-Webhook-Signature.' },
      { kind: 'do',     text: 'Send a signed webhook from your producer.' },
      { kind: 'observe', text: 'In the inspector, the Signature section should read “Valid”. If it reads “Invalid”, the error message explains why (expired token, wrong key, malformed JWT, …).' },
    ],
  },
  {
    name: 'verify-large-payload',
    label: 'Verify large-payload handling',
    intent: 'Confirm that your producer handles or fails predictably on large responses.',
    question: 'Does my producer crash on a 1.5MB response?',
    steps: [
      { kind: 'apply', behavior: 'large-response', note: 'Channel returns a 1.5MB JSON body.' },
      { kind: 'do',     text: 'Send 1 event.' },
      { kind: 'observe', text: 'Sane producers cap response size and treat over-limit as failure (likely a retry). Crashing or hanging means your response-size policy is missing.' },
    ],
  },
  {
    name: 'verify-flap-resets-state',
    label: 'Verify intermittent success resets retry state',
    intent: 'Confirm your producer’s circuit-breaker / consecutive-failure logic resets after a successful attempt.',
    question: 'Does my producer reset retry state when a request succeeds mid-stream?',
    steps: [
      {
        kind: 'apply',
        sequence: [{ behavior: 'server-error' }, { behavior: 'success' }],
        presetName: 'flap-500-200',
        note: 'Channel alternates 500 → 200 on each request.',
      },
      { kind: 'do',     text: 'Send 10 events.' },
      { kind: 'observe', text: 'No circuit-breaker trip if your producer resets failure counters on success. If the producer treats every other 500 as a step toward tripping, you’ll see it open before 10 events finish.' },
    ],
  },
]

export const PLAYBOOK_BY_NAME = new Map(PLAYBOOKS.map((p) => [p.name, p]))
