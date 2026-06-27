// The shared semantic colour palette. A token name maps to a --tok-<name> hue in
// index.css; the same name is used by prose (MathText), legend chips, and SVG
// diagram marks so a colour always means the same thing. Keep this in sync with
// tokens.css and the :root palette.

export const TOKEN_COLORS = [
  'blue',
  'orange',
  'green',
  'magenta',
  'teal',
  'purple',
  'amber',
  'red',
  'pink',
  'slate',
] as const

export type TokenColor = (typeof TOKEN_COLORS)[number]

const tokenColorSet = new Set<string>(TOKEN_COLORS)

export function isTokenColor(value: string): value is TokenColor {
  return tokenColorSet.has(value)
}

// CSS custom property for a token colour, e.g. for inline SVG style props.
export function tokenColorVar(color: TokenColor): string {
  return `var(--tok-${color})`
}
