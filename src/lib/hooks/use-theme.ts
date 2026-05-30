'use client'

import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const listeners = new Set<() => void>()

function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem('theme', theme)
  } catch {
    // localStorage unavailable (private mode) — theme just won't persist.
  }
  for (const l of listeners) l()
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

/**
 * Current theme, read from the document class (set pre-paint by the inline
 * script in the root layout). Uses useSyncExternalStore so SSR/hydration is
 * stable and toggling re-renders consumers without a setState-in-effect.
 */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light'),
    () => 'light',
  )
  return { theme, toggle: () => applyTheme(theme === 'dark' ? 'light' : 'dark') }
}
