import type { ReactNode } from 'react'
import {
  type Circle,
  type Point,
  angleArcPath,
  angleSectorPath,
  pointOnCircle,
} from '../../engine/geometry'
import './ProofDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 116,
}

type ProofDiagramProps = {
  revealed: number
  centralAngle: number
}

function unitVector(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// Places a label along the bisector of the angle formed at `vertex` by the rays
// toward `p1` and `p2`, at the given distance from the vertex.
function bisectorLabel(vertex: Point, p1: Point, p2: Point, distance: number): Point {
  const u = unitVector(vertex, p1)
  const v = unitVector(vertex, p2)
  const bx = u.x + v.x
  const by = u.y + v.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * distance, y: vertex.y + (by / length) * distance }
}

export function ProofDiagram({ revealed, centralAngle }: ProofDiagramProps) {
  const aDegrees = 90 + centralAngle / 2
  const bDegrees = 90 - centralAngle / 2
  const cDegrees = 270

  const a = pointOnCircle(circle, aDegrees)
  const b = pointOnCircle(circle, bDegrees)
  const c = pointOnCircle(circle, cDegrees)
  const o = circle.center

  const inscribed = centralAngle / 2 // 60
  const half = inscribed / 2 // 30
  const apex = 180 - 2 * half // 120 (angle AOC / BOC)
  const central = centralAngle // 120 (angle AOB)

  const acoLabel = bisectorLabel(c, a, o, 56)
  const bcoLabel = bisectorLabel(c, b, o, 56)
  const caoLabel = bisectorLabel(a, c, o, 32)
  const cboLabel = bisectorLabel(b, c, o, 32)
  const aocLabel = bisectorLabel(o, a, c, 32)
  const bocLabel = bisectorLabel(o, b, c, 32)
  const aobLabel = bisectorLabel(o, a, b, 26)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label={`Proof figure: a central angle of ${central} degrees is twice the inscribed angle of ${inscribed} degrees`}
    >
      <circle className="diagram__circle" cx={o.x} cy={o.y} r={circle.radius} />

      {/* Inscribed angle fill sits behind the chords so they stay crisp */}
      <path className="proof-inscribed-fill" d={angleSectorPath(c, a, b, 40)} />

      <line className="diagram__chord" x1={c.x} y1={c.y} x2={a.x} y2={a.y} />
      <line className="diagram__chord" x1={c.x} y1={c.y} x2={b.x} y2={b.y} />

      {revealed >= 2 && (
        <g className="proof-in">
          <polygon className="proof-triangle" points={`${o.x},${o.y} ${a.x},${a.y} ${c.x},${c.y}`} />
          <polygon className="proof-triangle" points={`${o.x},${o.y} ${b.x},${b.y} ${c.x},${c.y}`} />
        </g>
      )}

      {revealed >= 1 && (
        <g className={revealed >= 2 ? 'proof-radii is-equal' : 'proof-radii'}>
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={a.x} y2={a.y} />
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={b.x} y2={b.y} />
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={c.x} y2={c.y} />
        </g>
      )}

      {/* Inscribed angle outline at C */}
      <path className="proof-inscribed" d={angleArcPath(c, a, b, 40)} />

      {/* Central angle at O (revealed in stage 4) */}
      {revealed >= 4 && (
        <g className="proof-in">
          <path className="proof-central-fill" d={angleSectorPath(o, a, b, 44)} />
          <path className="proof-central" d={angleArcPath(o, a, b, 44)} />
        </g>
      )}

      <ProofPoint x={a.x} y={a.y} label="A" dx={-16} dy={6} />
      <ProofPoint x={b.x} y={b.y} label="B" dx={16} dy={6} />
      <ProofPoint x={c.x} y={c.y} label="C" dx={0} dy={-14} />
      {revealed >= 1 && <ProofPoint x={o.x} y={o.y} label="O" dx={-5} dy={-12} accent />}

      {/* Stage 3: the inscribed angle is bisected into 30 + 30, and the
          isosceles base angles are 30 too. */}
      {revealed >= 3 && (
        <g>
          <AngleValue point={acoLabel} tone="accent" delay={0}>
            {half}&deg;
          </AngleValue>
          <AngleValue point={bcoLabel} tone="accent" delay={0.18}>
            {half}&deg;
          </AngleValue>
          <AngleValue point={caoLabel} tone="accent" delay={0.5}>
            {half}&deg;
          </AngleValue>
          <AngleValue point={cboLabel} tone="accent" delay={0.68}>
            {half}&deg;
          </AngleValue>
        </g>
      )}

      {/* Stage 4: triangle angle sums give 120, then the central angle is 120. */}
      {revealed >= 4 && (
        <g>
          <AngleValue point={aocLabel} tone="arc" delay={0}>
            {apex}&deg;
          </AngleValue>
          <AngleValue point={bocLabel} tone="arc" delay={0.18}>
            {apex}&deg;
          </AngleValue>
          <AngleValue point={aobLabel} tone="arc" delay={0.55} emphatic>
            {central}&deg;
          </AngleValue>
        </g>
      )}

      {revealed >= 5 && (
        <text className="proof-conclusion proof-in" x={180} y={344} textAnchor="middle">
          {inscribed}&deg; = &frac12; &times; {central}&deg;
        </text>
      )}
    </svg>
  )
}

function AngleValue({
  point,
  tone,
  delay,
  emphatic = false,
  children,
}: {
  point: Point
  tone: 'accent' | 'arc'
  delay: number
  emphatic?: boolean
  children: ReactNode
}) {
  return (
    <text
      className={`proof-value proof-value--${tone}${emphatic ? ' is-emphatic' : ''}`}
      x={point.x}
      y={point.y}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </text>
  )
}

function ProofPoint({
  x,
  y,
  label,
  dx,
  dy,
  accent = false,
}: {
  x: number
  y: number
  label: string
  dx: number
  dy: number
  accent?: boolean
}) {
  return (
    <g className={accent ? 'diagram__point is-accent' : 'diagram__point'} transform={`translate(${x} ${y})`}>
      <circle r={accent ? 5 : 7} />
      <text x={dx} y={dy}>
        {label}
      </text>
    </g>
  )
}
