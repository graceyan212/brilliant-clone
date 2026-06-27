import {
  type Circle,
  type Point,
  angleArcPath,
  angleSectorPath,
  arcPath,
  pointOnCircle,
} from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 112,
}

// Tangent point T at the bottom; chord T-A cuts off a 100 deg arc, so the
// tangent-chord angle is half of it = 50 deg.
const tDeg = 90
const aDeg = 190
const arcTA = 100
const tangentChordAngle = 50

const t: Point = pointOnCircle(circle, tDeg)
const a: Point = pointOnCircle(circle, aDeg)
const o = circle.center
const leftTangent: Point = { x: t.x - 70, y: t.y }
const rightTangent: Point = { x: t.x + 70, y: t.y }

export function TangentChordProof({ revealed }: { revealed: number }) {
  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A tangent touches a circle at T and a chord runs from T to A. Using the radius OT perpendicular to the tangent and the isosceles triangle OTA, the central angle TOA is twice the tangent-chord angle, so that angle equals half of arc TA."
    >
      <circle className="diagram__circle" cx={o.x} cy={o.y} r={circle.radius} />

      {/* Stage 4: central angle TOA (teal) standing on arc TA */}
      {revealed >= 4 && (
        <g className="proof-in">
          <path className="proof-central-fill" d={angleSectorPath(o, t, a, 26)} />
          <path className="proof-central" d={arcPath(circle, tDeg, arcTA)} />
          <path className="proof-central" d={angleArcPath(o, t, a, 26)} />
        </g>
      )}

      {/* The tangent line and the chord */}
      <line className="diagram__chord" x1={leftTangent.x} y1={leftTangent.y} x2={rightTangent.x} y2={rightTangent.y} />
      <line className="diagram__chord" x1={t.x} y1={t.y} x2={a.x} y2={a.y} />

      {/* Stage 2-3: radii OT and OA */}
      {revealed >= 2 && (
        <line className="diagram__radius" x1={o.x} y1={o.y} x2={t.x} y2={t.y} />
      )}
      {revealed >= 3 && (
        <line className="diagram__radius" x1={o.x} y1={o.y} x2={a.x} y2={a.y} />
      )}

      {/* Stage 2: tangent is perpendicular to the radius at T */}
      {revealed >= 2 && (
        <path
          className="diagram__chord"
          fill="none"
          d={`M ${t.x} ${t.y - 14} L ${t.x + 14} ${t.y - 14} L ${t.x + 14} ${t.y}`}
        />
      )}

      {/* Stage 1: the tangent-chord angle at T (accent) */}
      {revealed >= 1 && (
        <>
          <path className="proof-inscribed-fill" d={angleSectorPath(t, leftTangent, a, 30)} />
          <path className="proof-inscribed" d={angleArcPath(t, leftTangent, a, 30)} />
        </>
      )}

      {/* Stage 3: equal base angles of isosceles triangle OTA (teal) */}
      {revealed >= 3 && (
        <g className="proof-in">
          <path className="proof-central" d={angleArcPath(t, o, a, 16)} />
          <path className="proof-central" d={angleArcPath(a, o, t, 16)} />
        </g>
      )}

      <g className="diagram__center">
        <circle cx={o.x} cy={o.y} r={4} />
        <text x={o.x - 13} y={o.y - 4}>
          O
        </text>
      </g>

      <ProofPoint x={t.x} y={t.y} label="T" dx={-4} dy={22} accent />
      <ProofPoint x={a.x} y={a.y} label="A" dx={-16} dy={-6} />

      {revealed >= 1 && (
        <text
          className="proof-value proof-value--accent"
          x={t.x - 26}
          y={t.y - 20}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {tangentChordAngle}&deg;
        </text>
      )}
      {revealed >= 4 && (
        <text
          className="proof-value proof-value--arc"
          x={148}
          y={206}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {arcTA}&deg;
        </text>
      )}

      {revealed >= 5 && (
        <text className="proof-conclusion proof-in" x={180} y={28} textAnchor="middle">
          <tspan className="proof-value--accent">{tangentChordAngle}&deg;</tspan> = ½ &times;{' '}
          <tspan className="proof-value--arc">{arcTA}&deg;</tspan>
        </text>
      )}
    </svg>
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
