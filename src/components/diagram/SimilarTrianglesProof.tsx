import { type Point, angleArcPath, angleSectorPath } from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

const A1: Point = { x: 40, y: 270 }
const B1: Point = { x: 136, y: 270 }
const C1: Point = { x: 68, y: 194 }
const A2: Point = { x: 190, y: 270 }
const B2: Point = { x: 346, y: 270 }
const C2: Point = { x: 236, y: 147 }

const wedgeRadius = 20

function unitToward(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function bisectorLabelPos(vertex: Point, toward1: Point, toward2: Point, dist: number): Point {
  const d1 = unitToward(vertex, toward1)
  const d2 = unitToward(vertex, toward2)
  const bx = d1.x + d2.x
  const by = d1.y + d2.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * dist, y: vertex.y + (by / length) * dist }
}

export function SimilarTrianglesProof({ revealed }: { revealed: number }) {
  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Two triangles share two pairs of equal angles, so by AA they are similar: corresponding sides scale by a single factor k and their areas scale by k squared."
    >
      {/* Center the two triangles in the box; the conclusion sits on its own,
          centered at the bottom (it must not shift with the figure). */}
      <g transform="translate(-9 -33)">
        {revealed >= 1 && (
          <>
            <polygon className="proof-triangle" points={`${A1.x},${A1.y} ${B1.x},${B1.y} ${C1.x},${C1.y}`} />
            <polygon className="proof-triangle" points={`${A2.x},${A2.y} ${B2.x},${B2.y} ${C2.x},${C2.y}`} />

            <line className="diagram__chord" x1={A1.x} y1={A1.y} x2={B1.x} y2={B1.y} />
            <line className="diagram__chord" x1={B1.x} y1={B1.y} x2={C1.x} y2={C1.y} />
            <line className="diagram__chord" x1={C1.x} y1={C1.y} x2={A1.x} y2={A1.y} />

            <line className="diagram__chord" x1={A2.x} y1={A2.y} x2={B2.x} y2={B2.y} />
            <line className="diagram__chord" x1={B2.x} y1={B2.y} x2={C2.x} y2={C2.y} />
            <line className="diagram__chord" x1={C2.x} y1={C2.y} x2={A2.x} y2={A2.y} />
          </>
        )}

        {revealed >= 2 && (
          <g className="proof-in">
            <AngleWedge vertex={A1} toward1={B1} toward2={C1} tone="accent" label="α" />
            <AngleWedge vertex={A2} toward1={B2} toward2={C2} tone="accent" label="α" />
          </g>
        )}

        {revealed >= 3 && (
          <g className="proof-in">
            <AngleWedge vertex={B1} toward1={A1} toward2={C1} tone="teal" label="β" />
            <AngleWedge vertex={B2} toward1={A2} toward2={C2} tone="teal" label="β" />
          </g>
        )}

        {revealed >= 1 && (
          <>
            <ProofPoint x={A1.x} y={A1.y} label="A" dx={-14} dy={10} />
            <ProofPoint x={B1.x} y={B1.y} label="B" dx={12} dy={12} />
            <ProofPoint x={C1.x} y={C1.y} label="C" dx={-6} dy={-10} />
            <ProofPoint x={A2.x} y={A2.y} label="D" dx={-14} dy={10} />
            <ProofPoint x={B2.x} y={B2.y} label="E" dx={6} dy={16} />
            <ProofPoint x={C2.x} y={C2.y} label="F" dx={8} dy={-8} />
          </>
        )}

        {revealed >= 4 && (
          <g className="proof-in">
            <text className="proof-value" x={88} y={288} textAnchor="middle">
              s
            </text>
            <text className="proof-value" x={268} y={288} textAnchor="middle">
              k·s
            </text>
          </g>
        )}
      </g>

      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={344} textAnchor="middle">
          sides ×k → area ×k²
        </text>
      )}
    </svg>
  )
}

function AngleWedge({
  vertex,
  toward1,
  toward2,
  tone,
  label,
}: {
  vertex: Point
  toward1: Point
  toward2: Point
  tone: 'accent' | 'teal'
  label: string
}) {
  const fillClass = tone === 'accent' ? 'proof-inscribed-fill' : 'proof-central-fill'
  const outlineClass = tone === 'accent' ? 'proof-inscribed' : 'proof-central'
  const labelClass = tone === 'accent' ? 'proof-value proof-value--accent' : 'proof-value proof-value--arc'
  const labelPos = bisectorLabelPos(vertex, toward1, toward2, wedgeRadius + 16)

  return (
    <>
      <path className={fillClass} d={angleSectorPath(vertex, toward1, toward2, wedgeRadius)} />
      <path className={outlineClass} d={angleArcPath(vertex, toward1, toward2, wedgeRadius)} />
      <text
        className={labelClass}
        x={labelPos.x}
        y={labelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </>
  )
}

function ProofPoint({
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
      <circle r={5} />
      <text x={dx} y={dy}>
        {label}
      </text>
    </g>
  )
}
