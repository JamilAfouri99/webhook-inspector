import { describe, it, expect } from 'vitest'
import { toCurl } from '@/lib/curl'

describe('toCurl', () => {
  it('renders method and url', () => {
    const out = toCurl({ method: 'post', url: 'https://x.test/hook' })
    expect(out).toContain("curl -X POST")
    expect(out).toContain("'https://x.test/hook'")
  })

  it('emits one -H per header', () => {
    const out = toCurl({
      method: 'POST',
      url: 'https://x.test',
      headers: { 'content-type': 'application/json', 'x-id': 'abc' },
    })
    expect(out).toContain("-H 'content-type: application/json'")
    expect(out).toContain("-H 'x-id: abc'")
  })

  it('emits a separate -H for each value of a multi-value header', () => {
    const out = toCurl({
      method: 'POST',
      url: 'https://x.test',
      headers: { 'set-cookie': ['a=1', 'b=2'] },
    })
    expect(out).toContain("-H 'set-cookie: a=1'")
    expect(out).toContain("-H 'set-cookie: b=2'")
    expect(out).not.toContain('a=1, b=2')
  })

  it('skips hop-by-hop / host headers', () => {
    const out = toCurl({
      method: 'GET',
      url: 'https://x.test',
      headers: { host: 'x.test', 'content-length': '10', 'x-keep': 'yes' },
    })
    expect(out).not.toContain('host:')
    expect(out).not.toContain('content-length:')
    expect(out).toContain("-H 'x-keep: yes'")
  })

  it('skips undefined header values', () => {
    const out = toCurl({ method: 'GET', url: 'https://x.test', headers: { 'x-a': undefined } })
    expect(out).not.toContain('x-a')
  })

  it('escapes single quotes in headers, body, and url', () => {
    const out = toCurl({
      method: 'POST',
      url: "https://x.test/it's",
      headers: { 'x-q': "a'b" },
      body: "it's",
    })
    expect(out).toContain(`'\\''`)
    // round-trips: the escaped sequence closes/reopens the quote
    expect(out).toContain("x-q: a'\\''b")
  })

  it('pretty-prints object bodies and passes string bodies through', () => {
    const obj = toCurl({ method: 'POST', url: 'https://x.test', body: { a: 1 } })
    expect(obj).toContain('-d ')
    expect(obj).toContain('"a": 1')

    const str = toCurl({ method: 'POST', url: 'https://x.test', body: 'raw' })
    expect(str).toContain("-d 'raw'")
  })

  it('omits -d for null/undefined bodies', () => {
    expect(toCurl({ method: 'GET', url: 'https://x.test' })).not.toContain('-d ')
    expect(toCurl({ method: 'GET', url: 'https://x.test', body: null })).not.toContain('-d ')
  })
})
