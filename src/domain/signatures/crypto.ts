import { createHmac, timingSafeEqual } from 'node:crypto'

export function hmacHex(secret: string | Buffer, data: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('hex')
}

export function hmacBase64(secret: string | Buffer, data: string): string {
  return createHmac('sha256', secret).update(data, 'utf8').digest('base64')
}

/** Constant-time string comparison; false (never throws) on length mismatch. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Case-insensitive single-value header lookup. */
export function header(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const target = name.toLowerCase()
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return Array.isArray(value) ? value[0] : value
  }
  return undefined
}

export function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}
