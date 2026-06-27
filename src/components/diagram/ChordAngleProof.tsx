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

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 116,
}

// Cyclic order A, C, B, D so chords A-B and C-D cross at an interior point P.
// Intercepted arcs of the angle at P are arc AC (60 deg) and arc BD (100 deg),
// so the angle is half their sum = 80 deg.
const aDeg = 140
const cDeg = 200
const bDeg = 290
const dDeg = 30
const arcAC = 60
const arcBD = 100

function outward(deg: number, extra: number): Point {
  return pointOnCircle({ center: circle.center, radius: circle.radius + extra }, deg)
}

export function ChordAngleProof({ revealed }: { revealed: number }) {
  const a = pointOnCircle(circle, aDeg)
  const c = pointOnCircle(circle, cDeg)
  const b = pointOnCircle(circle, bDeg)
  const d = pointOnCircle(circle, dDeg)
  const p = lineIntersection(a, b, c, d) ?? circle.center

  const arcBdMid = outward(bDeg + arcBD / 2, 20)
  const arcAcMid = outward(aDeg + arcAC / 2, 20)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Two chords AB and CD crossing at P inside a circle. Drawing chord AD makes the angle at P an exterior angle of triangle APD, equal to half the sum of arcs AC and BD."
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      {/* Stage 2: triangle APD, lightly filled */}
      {revealed >= 2 && (
        <g className="proof-in">
          <polygon className="proof-triangle" points={`${a.x},${a.y} ${p.x},${p.y} ${d.x},${d.y}`} />
        </g>
      )}

      {/* Stage 1: the angle at P (headline) */}
      {revealed >= 1 && <path className="proof-inscribed-fill" d={angleSectorPath(p, a, c, 26)} />}
      {/* Stage 3: inscribed angle DAB at A (accent, with arc BD) */}
      {revealed >= 3 && <path className="proof-inscribed-fill" d={angleSectorPath(a, d, b, 28)} />}
      {/* Stage 4: inscribed angle ADC at D (teal, with arc AC) */}
      {revealed >= 4 && <path className="proof-central-fill" d={angleSectorPath(d, a, c, 28)} />}

      <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
      <line className="diagram__chord" x1={c.x} y1={c.y} x2={d.x} y2={d.y} />

      {/* Stage 2: construction chord AD */}
      {revealed >= 2 && (
        <g className="proof-radii proof-in">
          <line className="proof-radius" pathLength={1} x1={a.x} y1={a.y} x2={d.x} y2={d.y} />
        </g>
      )}

      {revealed >= 1 && <path className="proof-inscribed" d={angleArcPath(p, a, c, 26)} />}
      {revealed >= 3 && (
        <g className="proof-in">
          <path className="proof-inscribed" d={arcPath(circle, bDeg, arcBD)} />
          <path className="proof-inscribed" d={angleArcPath(a, d, b, 28)} />
        </g>
      )}
      {revealed >= 4 && (
        <g className="proof-in">
          <path className="proof-central" d={arcPath(circle, aDeg, arcAC)} />
          <path className="proof-central" d={angleArcPath(d, a, c, 28)} />
        </g>
      )}

      <ProofPoint x={a.x} y={a.y} label="A" dx={-16} dy={6} />
      <ProofPoint x={c.x} y={c.y} label="C" dx={-16} dy={-8} />
      <ProofPoint x={b.x} y={b.y} label="B" dx={16} dy={-6} />
      <ProofPoint x={d.x} y={d.y} label="D" dx={16} dy={14} />
      <ProofPoint x={p.x} y={p.y} label="P" dx={4} dy={20} accent />

      {revealed >= 1 && (
        <text
          className="proof-value proof-value--accent"
          x={p.x - 30}
          y={p.y - 6}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          80&deg;
        </text>
      )}
      {revealed >= 3 && (
        <text
          className="proof-value proof-value--accent"
          x={arcBdMid.x}
          y={arcBdMid.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {arcBD}&deg;
        </text>
      )}
      {revealed >= 4 && (
        <text
          className="proof-value proof-value--arc"
          x={arcAcMid.x}
          y={arcAcMid.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {arcAC}&deg;
        </text>
      )}

      {revealed >= 5 && (
        <text className="proof-conclusion proof-in" x={180} y={348} textAnchor="middle">
          80&deg; = ½ (<tspan className="proof-value--arc">{arcAC}&deg;</tspan> +{' '}
          <tspan className="proof-value--accent">{arcBD}&deg;</tspan>)
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
