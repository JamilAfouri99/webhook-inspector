type Headers = Record<string, string | string[] | undefined>

const SKIP_HEADERS = new Set([
  'host', 'content-length', 'connection', 'keep-alive', 'transfer-encoding',
])

function escapeSingleQuotes(s: string): string {
  return s.replace(/'/g, `'\\''`)
}

export function toCurl(opts: {
  method: string
  url: string
  headers?: Headers
  body?: unknown
}): string {
  const parts: string[] = [`curl -X ${opts.method.toUpperCase()}`]

  if (opts.headers) {
    for (const [key, value] of Object.entries(opts.headers)) {
      if (SKIP_HEADERS.has(key.toLowerCase())) continue
      if (value === undefined) continue
      const v = Array.isArray(value) ? value.join(', ') : value
      parts.push(`  -H '${escapeSingleQuotes(key)}: ${escapeSingleQuotes(v)}'`)
    }
  }

  if (opts.body !== undefined && opts.body !== null) {
    const bodyStr = typeof opts.body === 'string'
      ? opts.body
      : JSON.stringify(opts.body, null, 2)
    parts.push(`  -d '${escapeSingleQuotes(bodyStr)}'`)
  }

  parts.push(`  '${escapeSingleQuotes(opts.url)}'`)
  return parts.join(' \\\n')
}
