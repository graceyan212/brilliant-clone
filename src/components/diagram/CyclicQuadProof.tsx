import type { ReactNode } from 'react'
import {
  type Circle,
  type Point,
  angleArcPath,
  angleBetweenPoints,
  angleSectorPath,
  arcPath,
  normalizeDegrees,
  pointOnCircle,
} from '../../engine/geometry'
import './ProofDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 116,
}

// Fixed, intentionally asymmetric quadrilateral so ∠A ≠ ∠C.
const A = 250
const B = 330
const C = 60
const D = 160

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function bisector(vertex: Point, p1: Point, p2: Point, distance: number): Point {
  const u = unit(vertex, p1)
  const v = unit(vertex, p2)
  const bx = u.x + v.x
  const by = u.y + v.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * distance, y: vertex.y + (by / length) * distance }
}

export function CyclicQuadProof({ revealed }: { revealed: number }) {
  const a = pointOnCircle(circle, A)
  const b = pointOnCircle(circle, B)
  const c = pointOnCircle(circle, C)
  const d = pointOnCircle(circle, D)

  const angleA = Math.round(angleBetweenPoints(a, d, b)) // 95
  const angleC = Math.round(angleBetweenPoints(c, b, d)) // 85
  const arcBCD = Math.round(normalizeDegrees(D - B)) // 190 (B→C→D)
  const arcBAD = 360 - arcBCD // 170 (B→A→D)

  const aLabel = bisector(a, d, b, 40)
  const cLabel = bisector(c, b, d, 40)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label={`Cyclic quadrilateral ABCD. Angle A is ${angleA} degrees opening onto a ${arcBCD} degree arc; angle C is ${angleC} degrees opening onto a ${arcBAD} degree arc; the arcs sum to 360 degrees so the angles sum to 180.`}
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      {/* Highlighted arcs on the circle */}
      {revealed >= 1 && <path className="proof-inscribed proof-in" d={arcPath(circle, B, arcBCD)} />}
      {revealed >= 2 && <path className="proof-central proof-in" d={arcPath(circle, D, arcBAD)} />}

      {/* Angle wedges at A and C */}
      {revealed >= 1 && <path className="proof-inscribed-fill" d={angleSectorPath(a, d, b, 30)} />}
      {revealed >= 2 && <path className="proof-central-fill" d={angleSectorPath(c, b, d, 30)} />}

      <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line className="diagram__chord" x1={b.x} y1={b.y} x2={c.x} y2={c.y} />
      <line className="diagram__chord" x1={c.x} y1={c.y} x2={d.x} y2={d.y} />
      <line className="diagram__chord" x1={d.x} y1={d.y} x2={a.x} y2={a.y} />

      {revealed >= 1 && <path className="proof-inscribed" d={angleArcPath(a, d, b, 30)} />}
      {revealed >= 2 && <path className="proof-central" d={angleArcPath(c, b, d, 30)} />}

      <QuadPoint x={a.x} y={a.y} label="A" dx={-15} dy={-6} />
      <QuadPoint x={b.x} y={b.y} label="B" dx={14} dy={-6} />
      <QuadPoint x={c.x} y={c.y} label="C" dx={14} dy={14} />
      <QuadPoint x={d.x} y={d.y} label="D" dx={-15} dy={14} />

      {revealed >= 1 && (
        <Value point={aLabel} tone="accent">
          {angleA}&deg;
        </Value>
      )}
      {revealed >= 2 && (
        <Value point={cLabel} tone="arc">
          {angleC}&deg;
        </Value>
      )}

      {/* The arc measures are color-keyed to their inscribed angle (accent = ∠A,
          teal = ∠C), so no on-arc labels are needed. */}
      {revealed >= 3 && (
        <text className="proof-conclusion proof-in" x={180} y={24} textAnchor="middle">
          <tspan className="proof-value--accent">{arcBCD}&deg;</tspan> +{' '}
          <tspan className="proof-value--arc">{arcBAD}&deg;</tspan> = 360&deg;
        </text>
      )}
      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={346} textAnchor="middle">
          <tspan className="proof-value--accent">{angleA}&deg;</tspan> +{' '}
          <tspan className="proof-value--arc">{angleC}&deg;</tspan> = 180&deg;
        </text>
      )}
    </svg>
  )
}

function Value({ point, tone, children }: { point: Point; tone: 'accent' | 'arc'; children: ReactNode }) {
  return (
    <text
      className={`proof-value proof-value--${tone}`}
      x={point.x}
      y={point.y}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {children}
    </text>
  )
}

function QuadPoint({
  x,
  y,
  label,
  dx,
  dy,
}: {
  x: number
  y: number
  label: string
  dx: number
  dy: number
}) {
  return (
    <g className="diagram__point" transform={`translate(${x} ${y})`}>
      <circle r={6} />
      <text x={dx} y={dy}>
        {label}
      </text>
    </g>
  )
}
