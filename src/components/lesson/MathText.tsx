import { Fragment, type ReactNode } from 'react'
import type { LegendItem } from '../../types/lesson'
import { isTokenColor } from './palette'
import './tokens.css'

// ---------------------------------------------------------------------------
// Legacy angle tokens. Before the data-driven `[label](color)` syntax existed,
// four phrases were auto-coloured everywhere. Keeping this pass means all the
// older lessons stay colour-coded without any edits (central = teal/arc,
// inscribed = accent/red, vertical = purple, corresponding = blue).
// ---------------------------------------------------------------------------
const LEGACY_SPLIT =
  /(\u2220AOB|\u2220ACB|central angles?|inscribed angles?|vertical angles?|corresponding angles?)/i
const isCentralToken = /^(?:\u2220AOB|central angles?)$/i
const isInscribedToken = /^(?:\u2220ACB|inscribed angles?)$/i
const isVerticalToken = /^vertical angles?$/i
const isCorrespondingToken = /^corresponding angles?$/i

function renderLegacy(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  text.split(LEGACY_SPLIT).forEach((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (isCentralToken.test(part)) {
      out.push(
        <span key={key} className="angle-text is-central">
          {part}
        </span>,
      )
    } else if (isInscribedToken.test(part)) {
      out.push(
        <span key={key} className="angle-text is-inscribed">
          {part}
        </span>,
      )
    } else if (isVerticalToken.test(part)) {
      out.push(
        <span key={key} className="angle-text is-vertical">
          {part}
        </span>,
      )
    } else if (isCorrespondingToken.test(part)) {
      out.push(
        <span key={key} className="angle-text is-corresponding">
          {part}
        </span>,
      )
    } else {
      // Whatever the colour passes didn't claim is plain prose — hand it to the
      // math typesetter so inline formulas get set in the math face.
      out.push(...renderMath(part, key))
    }
  })
  return out
}

// ---------------------------------------------------------------------------
// Math typesetting. Formulas are detected inside plain prose and re-set in the
// math face (--mono) with colour-coded roles, so every lesson's equations stand
// out from Space Grotesk prose without re-authoring any content. Authors can
// also promote a key equation to a featured block with the `[expr](formula)`
// token (the same bracket syntax as the colour tokens above).
//
// Roles — colour reinforces, but never carries, the meaning (the glyph and the
// math face already say "this is math"; quantities are letters, values are
// digits):
//   variables / symbols  (a, x, ∠AOB, π, √x, ?, segment names) → --accent-ink
//   numbers / values     (3, 25, 120°, ½, √2)                  → --ink
//   operators / relations(+ − × ÷ = : < > …)                   → --ink-2
// ---------------------------------------------------------------------------
const SUP = '[\\u00B2\\u00B3\\u00B9\\u2070\\u2074-\\u2079\\u207F]'
const GREEK = '[\\u0391-\\u03A9\\u03B1-\\u03C9]'
const FRAC = '[\\u00BC\\u00BD\\u00BE\\u2153\\u2154\\u2155-\\u215E]'
const REL = '[=\\u2260\\u2248\\u2245<>\\u2264\\u2265\\u221D\\u2192:]'
const ARITH = '[+\\u2212\\u00D7\\u00F7\\u00B7\\u00B1/]'
const OP = '(?:' + REL + '|' + ARITH + ')'
// A parenthesised group only counts as a math operand when it actually holds a
// math operator (so "(short : long : hypotenuse)" stays prose); ':' is excluded.
const PAREN_OP = '[+\\u2212\\u00D7\\u00F7\\u00B7/=<>\\u2264\\u2265]'

// One math operand. Order matters: more specific forms (radicals, superscripts,
// degrees) come before the bare number/letter fallbacks. Single letters and
// numbers use look-arounds so we never carve a token out of a prose word.
const OPERAND =
  '(?:' +
  '\\u2220[A-Z]{1,3}\\d?' + // ∠AOB
  '|' +
  FRAC + // ½ ¼ ¾
  '|\\u221A\\([^()]*\\)' +
  SUP +
  '*' + // √(…)
  '|\\([^()]*\\)' +
  SUP +
  '+' + // (…)²
  '|\\([^()]*' +
  PAREN_OP +
  '[^()]*\\)' +
  SUP +
  '*' + // (a ÷ b)
  '|\\d+(?:\\.\\d+)?\\u221A\\d+(?:\\.\\d+)?' +
  SUP +
  '*' + // 5√2
  '|\\u221A\\d+(?:\\.\\d+)?' +
  SUP +
  '*' + // √2
  '|\\u221A[A-Za-z]' +
  SUP +
  '*' + // √x
  '|\\d*' +
  GREEK +
  '[A-Za-z]?' +
  SUP +
  '*' + // π, 2π, πr²
  '|\\d+[A-Za-z](?![A-Za-z])' +
  SUP +
  '*' + // 2c², 3x (coefficient × variable)
  '|\\d+(?:\\.\\d+)?' +
  SUP +
  '+\\u00B0?' + // 6², 2²
  '|\\d+(?:\\.\\d+)?\\u00B0' + // 90°
  '|(?<![A-Za-z])[A-Za-z]' +
  SUP +
  '+' + // r², x²
  '|(?<![A-Za-z\\d])\\d+(?:\\.\\d+)?(?![A-Za-z])' + // 25
  '|(?<![A-Za-z])[A-Z]{2,3}(?![A-Za-z])' + // PA, ABC
  '|(?<![A-Za-z])[A-Za-z](?![A-Za-z])' + // a, x
  '|\\?' + // unknown
  ')'

// A run is one operand, optionally chained to more by infix operators. Bare
// candidates (a lone number or letter) are matched too, then dropped by
// `isFormula`, which keeps only runs that carry an operator or a math signal.
const MATH_RUN = new RegExp(OPERAND + '(?:\\s*' + OP + '\\s*' + OPERAND + ')*', 'g')
const MATH_TOKEN = new RegExp('(' + OPERAND + ')|(' + REL + ')|(' + ARITH + ')', 'g')
const HAS_OP = new RegExp(OP)
const HAS_SIGNAL = new RegExp(
  '[\\u00B2\\u00B3\\u00B9\\u2070\\u2074-\\u2079\\u207F\\u00B0\\u221A\\u2220\\u00BC\\u00BD\\u00BE\\u2153-\\u215E]|' +
    GREEK,
)
const IS_VAR = new RegExp('[A-Za-z\\u0391-\\u03A9\\u03B1-\\u03C9\\u2220?]')

// Keep a run only if it is genuinely a formula: it has an operator binding
// operands, or a lone operand that carries a math signal (superscript, degree,
// radical, ∠, fraction, Greek). A bare "5" or "x" is left as prose.
function isFormula(run: string): boolean {
  return HAS_OP.test(run) || HAS_SIGNAL.test(run)
}

// Split a known-formula string into colour-coded atoms. Shared by inline runs
// and featured blocks; any non-math characters (e.g. a word inside a featured
// formula) pass through as plain text.
function mathAtoms(run: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of run.matchAll(MATH_TOKEN)) {
    const start = match.index ?? 0
    if (start > last) {
      out.push(<Fragment key={`${keyPrefix}-x${index}`}>{run.slice(last, start)}</Fragment>)
    }
    if (match[1] !== undefined) {
      out.push(
        <span key={`${keyPrefix}-a${index}`} className={IS_VAR.test(match[1]) ? 'mathx__var' : 'mathx__num'}>
          {match[1]}
        </span>,
      )
    } else {
      out.push(
        <span key={`${keyPrefix}-o${index}`} className="mathx__op">
          {match[0]}
        </span>,
      )
    }
    last = start + match[0].length
    index += 1
  }
  if (last < run.length) {
    out.push(<Fragment key={`${keyPrefix}-x${index}`}>{run.slice(last)}</Fragment>)
  }
  return out
}

// Detect inline formulas in a plain-prose slice and wrap each in the math face.
// Prose between (and around) formulas is returned untouched.
function renderMath(text: string, keyPrefix: string): ReactNode[] {
  if (!text) {
    return []
  }
  const out: ReactNode[] = []
  let last = 0
  let index = 0
  for (const match of text.matchAll(MATH_RUN)) {
    const run = match[0]
    if (!isFormula(run)) {
      continue
    }
    const start = match.index ?? 0
    if (start > last) {
      out.push(<Fragment key={`${keyPrefix}-p${index}`}>{text.slice(last, start)}</Fragment>)
    }
    out.push(
      <span key={`${keyPrefix}-m${index}`} className="mathx">
        {mathAtoms(run, `${keyPrefix}-m${index}`)}
      </span>,
    )
    last = start + run.length
    index += 1
  }
  if (last < text.length) {
    out.push(<Fragment key={`${keyPrefix}-p${index}`}>{text.slice(last)}</Fragment>)
  }
  return out
}

// Explicit, data-driven colour syntax: [visible text](color). Any lesson can
// colour an inline reference to match its diagram, e.g. "[side a](blue)" or
// "[arc AB](teal)". Unknown colours fall back to the plain (still legacy-parsed)
// text so authors never see stray brackets.
const EXPLICIT_TOKEN = /\[([^\]]+)\]\(([a-z]+)\)/gi

/**
 * Renders lesson prose with colour-coded references and typeset math.
 *
 * Layers, applied in order, each on the text the previous one left untouched:
 *  1. `[label](formula)` → a featured math block (a key equation as a focal point).
 *  2. `[label](color)` tokens → a coloured span using the shared palette.
 *  3. Legacy auto-colouring of the four original angle phrases, so every
 *     pre-existing lesson keeps its colours with zero changes.
 *  4. Inline math auto-detection on the remaining prose → equations set in the
 *     math face with colour-coded variables, values, and operators.
 *
 * This is the single highlighter used across prompts, options, statements,
 * proofs, hints, and the interaction types.
 */
export function MathText({ text }: { text: string }) {
  if (!text) {
    return null
  }

  const nodes: ReactNode[] = []
  let lastIndex = 0
  let matchIndex = 0

  for (const match of text.matchAll(EXPLICIT_TOKEN)) {
    const start = match.index ?? 0
    if (start > lastIndex) {
      nodes.push(...renderLegacy(text.slice(lastIndex, start), `pre-${matchIndex}`))
    }
    const label = match[1]
    const color = match[2].toLowerCase()
    if (color === 'formula') {
      // Featured block: the author's chosen key equation, set as a focal point.
      nodes.push(
        <span key={`tok-${matchIndex}`} className="mathx mathx--block">
          {mathAtoms(label, `fml-${matchIndex}`)}
        </span>,
      )
    } else if (isTokenColor(color)) {
      nodes.push(
        <span key={`tok-${matchIndex}`} className={`tok tok--${color}`}>
          {label}
        </span>,
      )
    } else {
      // Unknown colour: keep the visible label, dropping the markup.
      nodes.push(...renderLegacy(label, `unk-${matchIndex}`))
    }
    lastIndex = start + match[0].length
    matchIndex += 1
  }

  if (lastIndex < text.length) {
    nodes.push(...renderLegacy(text.slice(lastIndex), `post-${matchIndex}`))
  }

  return <>{nodes}</>
}

// Backwards-compatible alias. The renderer historically imported `AngleText`;
// new code should prefer `MathText`.
export const AngleText = MathText

/**
 * A small, visible colour key. Diagrams and prompts can show it so a learner
 * can see what each colour stands for. The label text is tinted with its own
 * colour and paired with a solid swatch, reinforcing the mapping.
 */
export function Legend({ items }: { items?: LegendItem[] }) {
  if (!items || items.length === 0) {
    return null
  }
  return (
    <ul className="legend" aria-label="Colour key">
      {items.map((item, index) => (
        <li key={`${item.color}-${index}`} className="legend__item">
          <span className={`legend__swatch tok-bg--${item.color}`} aria-hidden="true" />
          <span className={`legend__label tok--${item.color}`}>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
