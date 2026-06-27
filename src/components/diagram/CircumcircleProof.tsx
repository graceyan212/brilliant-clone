import { type Point, distance } from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

// A fixed acute triangle whose circumcenter sits comfortably inside the view.
const A: Point = { x: 87, y: 116 }
const B: Point = { x: 277, y: 108 }
const C: Point = { x: 185, y: 305 }

const bisectorHalfLength = 200

function circumcircle(a: Point, b: Point, c: Point): { center: Point; radius: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-9) {
    return null
  }
  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
  const center = { x: ux, y: uy }
  return { center, radius: distance(center, a) }
}

// Endpoints of a long segment along the perpendicular bisector of P-Q, for display.
function perpBisector(p: Point, q: Point, half: number): { x1: number; y1: number; x2: number; y2: number } {
  const mid = { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  const dx = q.x - p.x
  const dy = q.y - p.y
  const length = Math.hypot(dx, dy) || 1
  const nx = -dy / length
  const ny = dx / length
  return {
    x1: mid.x - nx * half,
    y1: mid.y - ny * half,
    x2: mid.x + nx * half,
    y2: mid.y + ny * half,
  }
}

export function CircumcircleProof({ revealed }: { revealed: number }) {
  const circ = circumcircle(A, B, C)
  const o = circ?.center ?? { x: 185, y: 185 }
  const abBisector = perpBisector(A, B, bisectorHalfLength)
  const bcBisector = perpBisector(B, C, bisectorHalfLength)
  const caBisector = perpBisector(C, A, bisectorHalfLength)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Triangle ABC. The perpendicular bisectors of its sides meet at one point O, which is equidistant from all three vertices, so a single circumscribed circle passes through A, B, and C."
    >
      {/* Stage 5: the circumscribed circle */}
      {revealed >= 5 && circ && (
        <circle className="diagram__circle proof-in" cx={o.x} cy={o.y} r={circ.radius} />
      )}

      {/* Stage 2-3 and 5: perpendicular bisectors (dashed) */}
      {revealed >= 2 && (
        <line className="diagram__base proof-in" x1={abBisector.x1} y1={abBisector.y1} x2={abBisector.x2} y2={abBisector.y2} />
      )}
      {revealed >= 3 && (
        <line className="diagram__base proof-in" x1={bcBisector.x1} y1={bcBisector.y1} x2={bcBisector.x2} y2={bcBisector.y2} />
      )}
      {revealed >= 5 && (
        <line className="diagram__base proof-in" x1={caBisector.x1} y1={caBisector.y1} x2={caBisector.x2} y2={caBisector.y2} />
      )}

      {/* Stage 4: equal radii O to each vertex */}
      {revealed >= 4 && (
        <g className="proof-in">
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={A.x} y2={A.y} />
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={B.x} y2={B.y} />
          <line className="proof-radius" pathLength={1} x1={o.x} y1={o.y} x2={C.x} y2={C.y} />
        </g>
      )}

      {/* The triangle */}
      <line className="diagram__chord" x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
      <line className="diagram__chord" x1={B.x} y1={B.y} x2={C.x} y2={C.y} />
      <line className="diagram__chord" x1={C.x} y1={C.y} x2={A.x} y2={A.y} />

      <ProofPoint x={A.x} y={A.y} label="A" dx={-15} dy={-4} />
      <ProofPoint x={B.x} y={B.y} label="B" dx={14} dy={-4} />
      <ProofPoint x={C.x} y={C.y} label="C" dx={0} dy={22} />

      {revealed >= 4 && (
        <g className="diagram__center proof-in">
          <circle cx={o.x} cy={o.y} r={4} />
          <text x={o.x + 10} y={o.y + 4}>
            O
          </text>
        </g>
      )}

      {revealed >= 5 && (
        <text className="proof-conclusion proof-in" x={180} y={26} textAnchor="middle">
          OA = OB = OC
        </text>
      )}
    </svg>
  )
}

function ProofPoint({ x, y, label, dx, dy }: { x: number; y: number; label: string; dx: number; dy: number }) {
  return (
    <g className="diagram__point" transform={`translate(${x} ${y})`}>
      <circle r={7} />
      <text x={dx} y={dy}>
        {label}
      </text>
    </g>
  )
}
