import { hasBehavior, behaviorNames } from '@/domain/behaviors'
import { HttpError } from '@/lib/api/handler'
import type { SequenceStep, ServerBehavior } from '@/lib/types'

const MAX_DELAY_MS = 60_000

export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object')
  }
  return body as Record<string, unknown>
}

/** Validate a behavior name against the behavior registry (single source of truth). */
export function parseBehaviorName(value: unknown, field = 'behavior'): ServerBehavior {
  if (typeof value !== 'string' || !hasBehavior(value)) {
    throw new HttpError(400, `Invalid ${field}`, { validBehaviors: behaviorNames() })
  }
  return value
}

export function parseBoundedInt(
  value: unknown,
  field: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
    throw new HttpError(400, `${field} must be a number between ${min} and ${max}`)
  }
  return value
}

export function parseSequenceSteps(value: unknown): SequenceStep[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, 'steps must be a non-empty array', {
      example: { steps: [{ behavior: 'server-error' }, { behavior: 'success' }] },
    })
  }
  return value.map((raw, i) => {
    const step = asObject(raw)
    return {
      behavior: parseBehaviorName(step.behavior, `steps[${i}].behavior`),
      delayMs: parseBoundedInt(step.delayMs, `steps[${i}].delayMs`, 0, MAX_DELAY_MS),
      statusCode: parseBoundedInt(step.statusCode, `steps[${i}].statusCode`, 100, 599),
    }
  })
}

/** Validate an optional `http(s)` forward/replay target URL. Returns the trimmed URL or null. */
export function parseTargetUrl(value: unknown, field = 'url'): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new HttpError(400, `${field} must be a string or null`)
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new HttpError(400, `${field} is not a valid URL`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new HttpError(400, `${field} must be http:// or https://`)
  }
  return value
}
