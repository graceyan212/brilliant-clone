import { useSyncExternalStore } from 'react'

// A user-facing switch for the optional AI surfaces (AI-generated extra practice
// and AI guided hints). It defaults ON, but turning it OFF forces both surfaces
// to behave exactly as if no API key were configured — the deterministic problem
// pool and the curated static hints. This makes the "works with AI off" guarantee
// verifiable directly in the app, not only via the server-side env fallback.

const KEY = 'angle-attack:ai-enabled'
const listeners = new Set<() => void>()

export function isAiEnabled(): boolean {
  try {
    // Default ON: only the explicit "off" value disables it.
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

export function setAiEnabled(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Storage unavailable — the toggle just won't persist across reloads.
  }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** React binding so the toggle UI re-renders when the preference changes. */
export function useAiEnabled(): boolean {
  return useSyncExternalStore(subscribe, isAiEnabled, () => true)
}
