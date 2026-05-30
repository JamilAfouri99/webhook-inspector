import { describe, it, expect } from 'vitest'
import { jsonDiff } from '@/lib/json-diff'

describe('jsonDiff', () => {
  it('returns no entries for equal primitives', () => {
    expect(jsonDiff(1, 1)).toEqual([])
    expect(jsonDiff('a', 'a')).toEqual([])
    expect(jsonDiff(null, null)).toEqual([])
  })

  it('reports a changed primitive', () => {
    expect(jsonDiff(1, 2)).toEqual([{ path: '', kind: 'changed', before: 1, after: 2 }])
  })

  it('reports added and removed object keys', () => {
    const diff = jsonDiff({ a: 1 }, { a: 1, b: 2 })
    expect(diff).toContainEqual({ path: 'b', kind: 'added', value: 2 })

    const diff2 = jsonDiff({ a: 1, b: 2 }, { a: 1 })
    expect(diff2).toContainEqual({ path: 'b', kind: 'removed', value: 2 })
  })

  it('recurses into nested objects with dotted paths', () => {
    const diff = jsonDiff({ a: { b: 1 } }, { a: { b: 2 } })
    expect(diff).toEqual([{ path: 'a.b', kind: 'changed', before: 1, after: 2 }])
  })

  it('diffs arrays by index, including length changes', () => {
    const diff = jsonDiff([1, 2], [1, 3, 4])
    expect(diff).toContainEqual({ path: '[1]', kind: 'changed', before: 2, after: 3 })
    expect(diff).toContainEqual({ path: '[2]', kind: 'added', value: 4 })

    const shorter = jsonDiff([1, 2, 3], [1])
    expect(shorter).toContainEqual({ path: '[1]', kind: 'removed', value: 2 })
    expect(shorter).toContainEqual({ path: '[2]', kind: 'removed', value: 3 })
  })

  it('treats a type change (object vs array vs primitive) as a single change', () => {
    expect(jsonDiff({ a: 1 }, [1])).toEqual([{ path: '', kind: 'changed', before: { a: 1 }, after: [1] }])
    expect(jsonDiff({ a: 1 }, 'str')).toEqual([{ path: '', kind: 'changed', before: { a: 1 }, after: 'str' }])
  })

  it('handles nested arrays inside objects', () => {
    const diff = jsonDiff({ items: [{ id: 1 }] }, { items: [{ id: 2 }] })
    expect(diff).toEqual([{ path: 'items[0].id', kind: 'changed', before: 1, after: 2 }])
  })
})
