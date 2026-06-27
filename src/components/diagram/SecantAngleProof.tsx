import {
  type Circle,
  type Point,
  angleArcPath,
  angleSectorPath,
  arcPath,
  lineIntersection,
  pointOnCircle,
} from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

// Circle pushed left so the external point P lands inside the viewBox on the
// right. Two secants from P cut a far arc AB (120 deg) and a near arc MN
// (40 deg); the angle at P is half their difference = 40 deg.
const circle: Circle = {
  center: { x: 160, y: 180 },
  radius: 96,
}

const mDeg = 340 // near point, upper secant
const aDeg = 240 // far point, upper secant
const nDeg = 20 // near point, lower secant
const bDeg = 120 // far point, lower secant
const farArc = 120
const nearArc = 40

function outward(deg: number, extra: number): Point {
  return pointOnCircle({ center: circle.center, radius: circle.radius + extra }, deg)
}

export function SecantAngleProof({ revealed }: { revealed: number }) {
  const m = pointOnCircle(circle, mDeg)
  const a = pointOnCircle(circle, aDeg)
  const n = pointOnCircle(circle, nDeg)
  const b = pointOnCircle(circle, bDeg)
  const p = lineIntersection(m, a, n, b) ?? { x: 340, y: 180 }

  const farMid = outward(180, 18)
  const nearMid = outward(0, 18)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Two secants from an external point P cut a circle. Drawing chord AN makes angle ANB an exterior angle of triangle PAN, showing the angle at P equals half the difference of the far arc AB and the near arc MN."
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      {/* Stage 2: triangle PAN, lightly filled */}
      {revealed >= 2 && (
        <g className="proof-in">
          <polygon className="proof-triangle" points={`${p.x},${p.y} ${a.x},${a.y} ${n.x},${n.y}`} />
        </g>
      )}

      {/* Stage 1: the external angle at P (headline) */}
      {revealed >= 1 && <path className="proof-inscribed-fill" d={angleSectorPath(p, a, b, 30)} />}
      {/* Stage 3: inscribed angle ANB at N (accent, with far arc AB) */}
      {revealed >= 3 && <path className="proof-inscribed-fill" d={angleSectorPath(n, a, b, 26)} />}
      {/* Stage 4: inscribed angle NAM at A (teal, with near arc MN) */}
      {revealed >= 4 && <path className="proof-central-fill" d={angleSectorPath(a, n, m, 26)} />}

      <line className="diagram__chord" x1={p.x} y1={p.y} x2={a.x} y2={a.y} />
      <line className="diagram__chord" x1={p.x} y1={p.y} x2={b.x} y2={b.y} />

      {/* Stage 2: construction chord AN */}
      {revealed >= 2 && (
        <g className="proof-radii proof-in">
          <line className="proof-radius" pathLength={1} x1={a.x} y1={a.y} x2={n.x} y2={n.y} />
        </g>
      )}

      {revealed >= 1 && <path className="proof-inscribed" d={angleArcPath(p, a, b, 30)} />}
      {revealed >= 3 && (
        <g className="proof-in">
          <path className="proof-inscribed" d={arcPath(circle, bDeg, farArc)} />
          <path className="proof-inscribed" d={angleArcPath(n, a, b, 26)} />
        </g>
      )}
      {revealed >= 4 && (
        <g className="proof-in">
          <path className="proof-central" d={arcPath(circle, mDeg, nearArc)} />
          <path className="proof-central" d={angleArcPath(a, n, m, 26)} />
        </g>
      )}

      <ProofPoint x={a.x} y={a.y} label="A" dx={-15} dy={-6} />
      <ProofPoint x={b.x} y={b.y} label="B" dx={-15} dy={14} />
      <ProofPoint x={m.x} y={m.y} label="M" dx={14} dy={-8} />
      <ProofPoint x={n.x} y={n.y} label="N" dx={14} dy={14} />
      <ProofPoint x={p.x} y={p.y} label="P" dx={12} dy={-10} accent />

      {revealed >= 1 && (
        <text
          className="proof-value proof-value--accent"
          x={p.x - 42}
          y={p.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          40&deg;
        </text>
      )}
      {revealed >= 3 && (
        <text
          className="proof-value proof-value--accent"
          x={farMid.x}
          y={farMid.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {farArc}&deg;
        </text>
      )}
      {revealed >= 4 && (
        <text
          className="proof-value proof-value--arc"
          x={nearMid.x}
          y={nearMid.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {nearArc}&deg;
        </text>
      )}

      {revealed >= 5 && (
        <text className="proof-conclusion proof-in" x={180} y={348} textAnchor="middle">
          40&deg; = ½ (<tspan className="proof-value--accent">{farArc}&deg;</tspan> &minus;{' '}
          <tspan className="proof-value--arc">{nearArc}&deg;</tspan>)
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
