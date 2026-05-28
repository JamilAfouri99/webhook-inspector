'use client'

import { useEffect } from 'react'

type HotkeyHandler = (event: KeyboardEvent) => void
type HotkeyMap = Record<string, HotkeyHandler>

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function keyOf(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey) parts.push('meta')
  if (e.ctrlKey) parts.push('ctrl')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

export function useHotkeys(map: HotkeyMap, opts: { allowInInputs?: string[] } = {}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = keyOf(e)
      const handler = map[key]
      if (!handler) return
      if (isTypingTarget(e.target) && !opts.allowInInputs?.includes(key)) return
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [map, opts.allowInInputs])
}
