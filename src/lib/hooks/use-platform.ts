import { useSyncExternalStore } from 'react'

// Platform never changes during a session, so there is nothing to subscribe to.
const noopSubscribe = () => () => {}

/**
 * Whether the client runs on macOS, read without a setState-in-effect: the
 * server snapshot is `false` so SSR/hydration is stable, then the client
 * snapshot resolves the real value.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== 'undefined' && /mac/i.test(navigator.platform),
    () => false,
  )
}
