import {
  type Circle,
  angleArcPath,
  angleSectorPath,
  lineIntersection,
  pointOnCircle,
} from '../../engine/geometry'
import './ProofDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 116,
}

// Cyclic order around the circle is D, A, C, B, so chords A–B and C–D cross at an
// interior point P, and the construction segments A–C and D–B become the outer
// sides of triangles PAC (left) and PDB (right).
const aDeg = 120
const cDeg = 200
const bDeg = 300
const dDeg = 40

export function PowerOfPointProof({ revealed }: { revealed: number }) {
  const a = pointOnCircle(circle, aDeg)
  const c = pointOnCircle(circle, cDeg)
  const b = pointOnCircle(circle, bDeg)
  const d = pointOnCircle(circle, dDeg)
  const p = lineIntersection(a, b, c, d) ?? circle.center

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Two chords AB and CD crossing at P. Joining A to C and D to B makes similar triangles PAC and PDB, proving PA times PB equals PC times PD."
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      {/* Stage 2: the two triangles, lightly filled */}
      {revealed >= 2 && (
        <g className="proof-in">
          <polygon className="proof-triangle" points={`${p.x},${p.y} ${a.x},${a.y} ${c.x},${c.y}`} />
          <polygon className="proof-triangle" points={`${p.x},${p.y} ${d.x},${d.y} ${b.x},${b.y}`} />
        </g>
      )}

      {/* Stage 3: vertically-opposite angles at P (accent = equal) */}
      {revealed >= 3 && (
        <g className="proof-in">
          <path className="proof-inscribed-fill" d={angleSectorPath(p, a, c, 24)} />
          <path className="proof-inscribed-fill" d={angleSectorPath(p, d, b, 24)} />
        </g>
      )}

      {/* Stage 4: equal inscribed angles at A and D (teal = equal) */}
      {revealed >= 4 && (
        <g className="proof-in">
          <path className="proof-central-fill" d={angleSectorPath(a, b, c, 30)} />
          <path className="proof-central-fill" d={angleSectorPath(d, c, b, 30)} />
        </g>
      )}

      <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line className="diagram__chord" x1={c.x} y1={c.y} x2={d.x} y2={d.y} />

      {/* Stage 2: construction segments A–C and D–B (grey dashed) */}
      {revealed >= 2 && (
        <g className="proof-radii proof-in">
          <line className="proof-radius" pathLength={1} x1={a.x} y1={a.y} x2={c.x} y2={c.y} />
          <line className="proof-radius" pathLength={1} x1={d.x} y1={d.y} x2={b.x} y2={b.y} />
        </g>
      )}

      {/* Stage 3/4: angle outlines drawn over the fills */}
      {revealed >= 3 && (
        <g className="proof-in">
          <path className="proof-inscribed" d={angleArcPath(p, a, c, 24)} />
          <path className="proof-inscribed" d={angleArcPath(p, d, b, 24)} />
        </g>
      )}
      {revealed >= 4 && (
        <g className="proof-in">
          <path className="proof-central" d={angleArcPath(a, b, c, 30)} />
          <path className="proof-central" d={angleArcPath(d, c, b, 30)} />
        </g>
      )}

      <ProofPoint x={a.x} y={a.y} label="A" dx={-16} dy={14} />
      <ProofPoint x={c.x} y={c.y} label="C" dx={-16} dy={-8} />
      <ProofPoint x={b.x} y={b.y} label="B" dx={14} dy={-10} />
      <ProofPoint x={d.x} y={d.y} label="D" dx={16} dy={16} />
      <ProofPoint x={p.x} y={p.y} label="P" dx={6} dy={20} accent />

      {revealed >= 5 && (
        <text className="proof-conclusion proof-in" x={180} y={346} textAnchor="middle">
          <tspan className="proof-value--accent">PA &times; PB</tspan> ={' '}
          <tspan className="proof-value--arc">PC &times; PD</tspan>
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
