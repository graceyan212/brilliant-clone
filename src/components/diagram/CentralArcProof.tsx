import { type Circle, arcPath, centerSectorPath, pointOnCircle } from '../../engine/geometry'
import './ProofDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 116,
}

// Inner radius for the central-angle marker drawn at the center O.
const markerRadius = 46

type CentralArcProofProps = {
  revealed: number
  centralAngle?: number
}

// A three-stage figure for why a central angle equals its arc and the whole
// circle is 360 deg. Stage 1 draws the two radii, stage 2 ties the angle at O to
// the arc on the rim (same teal, same number), stage 3 sweeps the full circle.
export function CentralArcProof({ revealed, centralAngle = 120 }: CentralArcProofProps) {
  const half = centralAngle / 2
  const aDegrees = 270 - half
  const bDegrees = 270 + half
  const a = pointOnCircle(circle, aDegrees)
  const b = pointOnCircle(circle, bDegrees)
  const o = circle.center
  const marker: Circle = { center: o, radius: markerRadius }
  const angleLabel = pointOnCircle({ center: o, radius: 76 }, 270)
  const arcLabel = pointOnCircle({ center: o, radius: circle.radius + 22 }, 270)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label={`Proof figure: a central angle of ${centralAngle} degrees cuts off an arc of ${centralAngle} degrees in a 360 degree circle`}
    >
      <circle className="diagram__circle" cx={o.x} cy={o.y} r={circle.radius} />

      {revealed >= 1 && (
        <g className="proof-in">
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={a.x} y2={a.y} />
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={b.x} y2={b.y} />
        </g>
      )}

      {revealed >= 2 && (
        <g className="proof-in">
          <path className="proof-central-fill" d={centerSectorPath(marker, aDegrees, centralAngle)} />
          <path className="proof-central" d={arcPath(marker, aDegrees, centralAngle)} />
          <path className="proof-central" d={arcPath(circle, aDegrees, centralAngle)} />
          <text
            className="proof-value proof-value--arc is-emphatic"
            x={angleLabel.x}
            y={angleLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {centralAngle}&deg;
          </text>
          <text
            className="proof-value proof-value--arc is-emphatic"
            x={arcLabel.x}
            y={arcLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {centralAngle}&deg;
          </text>
        </g>
      )}

      {revealed >= 3 && (
        <g className="proof-in">
          <circle className="proof-central" cx={o.x} cy={o.y} r={circle.radius} fill="none" />
          <text className="proof-conclusion" x={180} y={346} textAnchor="middle">
            whole circle = 360&deg;
          </text>
        </g>
      )}

      <ProofPoint x={a.x} y={a.y} label="A" dx={-16} dy={6} />
      <ProofPoint x={b.x} y={b.y} label="B" dx={16} dy={6} />
      <ProofPoint x={o.x} y={o.y} label="O" dx={-6} dy={18} accent />
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
