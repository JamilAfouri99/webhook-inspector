export type DiffEntry =
  | { path: string; kind: 'added'; value: unknown }
  | { path: string; kind: 'removed'; value: unknown }
  | { path: string; kind: 'changed'; before: unknown; after: unknown }

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function diffAt(before: unknown, after: unknown, path: string, out: DiffEntry[]): void {
  if (before === after) return

  if (isObject(before) && isObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const k of keys) {
      const next = path ? `${path}.${k}` : k
      if (!(k in before)) out.push({ path: next, kind: 'added', value: after[k] })
      else if (!(k in after)) out.push({ path: next, kind: 'removed', value: before[k] })
      else diffAt(before[k], after[k], next, out)
    }
    return
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const max = Math.max(before.length, after.length)
    for (let i = 0; i < max; i++) {
      const next = `${path}[${i}]`
      if (i >= before.length) out.push({ path: next, kind: 'added', value: after[i] })
      else if (i >= after.length) out.push({ path: next, kind: 'removed', value: before[i] })
      else diffAt(before[i], after[i], next, out)
    }
    return
  }

  if (before !== after) {
    if (before === undefined) out.push({ path, kind: 'added', value: after })
    else if (after === undefined) out.push({ path, kind: 'removed', value: before })
    else out.push({ path, kind: 'changed', before, after })
  }
}

export function jsonDiff(before: unknown, after: unknown): DiffEntry[] {
  const out: DiffEntry[] = []
  diffAt(before, after, '', out)
  return out
}
