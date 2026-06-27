import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import './Confetti.css'

type ConfettiProps = {
  /** number of pieces; default 80 */
  count?: number
}

/** Inline style that also carries the per-piece CSS custom properties. */
type PieceStyle = CSSProperties & {
  [key: `--${string}`]: string
}

type Piece = {
  id: number
  round: boolean
  style: PieceStyle
}

/** Brand palette plus one warm accent-gold; pieces cycle through these. */
const COLORS = ['var(--accent)', 'var(--arc)', '#f4c84b']

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function Confetti({ count = 80 }: ConfettiProps) {
  const reduceMotion = useMemo(prefersReducedMotion, [])

  const pieces = useMemo<Piece[]>(() => {
    return Array.from({ length: count }, (_, id) => {
      const startOffset = randomBetween(-24, 24)
      const drift = randomBetween(-150, 150)
      const fall = randomBetween(220, 460)
      const rotation = randomBetween(-540, 540)
      const delay = Math.round(randomBetween(0, 150))
      const duration = Math.round(randomBetween(900, 1400))

      const style: PieceStyle = {
        '--sx': `${startOffset.toFixed(1)}px`,
        '--dx': `${drift.toFixed(1)}px`,
        '--dy': `${fall.toFixed(1)}px`,
        '--rot': `${rotation.toFixed(1)}deg`,
        '--delay': `${delay}ms`,
        '--duration': `${duration}ms`,
        '--color': COLORS[id % COLORS.length],
      }

      return { id, round: id % 3 === 1, style }
    })
  }, [count])

  if (reduceMotion) {
    return null
  }

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className={piece.round ? 'confetti__piece is-round' : 'confetti__piece'}
          style={piece.style}
        />
      ))}
    </div>
  )
}
