// A tiny deterministic shuffle so option/chip order is stable across re-renders
// (seeded from the content's ids) yet never echoes the authored order — which
// could otherwise leak the answer. Shared by the interaction components.

export function hashSeed(seed: string): number {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = items.slice()
  let state = seed || 1
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    const swap = result[i]
    result[i] = result[j]
    result[j] = swap
  }
  return result
}
