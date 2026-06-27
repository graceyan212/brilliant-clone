import { type Point, angleArcPath, angleSectorPath } from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

const topY = 120
const botY = 250
const lineX0 = 30
const lineX1 = 330
const O: Point = { x: 180, y: 185 }
const tilt = -20
const t = (tilt * Math.PI) / 180
const U: Point = { x: Math.sin(t), y: -Math.cos(t) }
const D: Point = { x: -U.x, y: -U.y }
const hRight: Point = { x: 1, y: 0 }
const hLeft: Point = { x: -1, y: 0 }
const wedgeR = 28

// Where the leaning transversal crosses a horizontal line at height `y`.
function intersect(y: number): Point {
  const s = (O.y - y) / Math.cos(t)
  return { x: O.x + s * Math.sin(t), y }
}

function addRay(p: Point, dir: Point, r: number): Point {
  return { x: p.x + dir.x * r, y: p.y + dir.y * r }
}

// Steps `dist` from the vertex along the bisector of two unit directions.
function bisectorPos(vertex: Point, dirA: Point, dirB: Point, dist: number): Point {
  const bx = dirA.x + dirB.x
  const by = dirA.y + dirB.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * dist, y: vertex.y + (by / length) * dist }
}

const T = intersect(topY)
const B = intersect(botY)
const transStart: Point = { x: O.x + 125 * U.x, y: O.y + 125 * U.y }
const transEnd: Point = { x: O.x - 125 * U.x, y: O.y - 125 * U.y }

export function ParallelAnglesProof({ revealed }: { revealed: number }) {
  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A transversal crossing two parallel lines; corresponding angles are equal, so alternate interior angles are equal and co-interior angles are supplementary."
    >
      {/* Two parallel lines plus the leaning transversal, with the crossings marked */}
      <line className="diagram__chord" x1={lineX0} y1={topY} x2={lineX1} y2={topY} />
      <line className="diagram__chord" x1={lineX0} y1={botY} x2={lineX1} y2={botY} />
      <line className="diagram__chord" x1={transStart.x} y1={transStart.y} x2={transEnd.x} y2={transEnd.y} />

      <g className="diagram__point" transform={`translate(${T.x} ${T.y})`}>
        <circle r={5} />
      </g>
      <g className="diagram__point" transform={`translate(${B.x} ${B.y})`}>
        <circle r={5} />
      </g>

      {/* Stage 1: interior-right angle at T */}
      {revealed >= 1 && <Wedge vertex={T} dirA={hRight} dirB={D} label="70°" tone="accent" />}

      {/* Stage 2: corresponding angle (lower-right at B) */}
      {revealed >= 2 && <Wedge vertex={B} dirA={hRight} dirB={D} label="70°" tone="accent" />}

      {/* Stage 3: vertical to A2, so alternate-interior to A1 (upper-left at B) */}
      {revealed >= 3 && <Wedge vertex={B} dirA={hLeft} dirB={U} label="70°" tone="accent" />}

      {/* Stage 4: interior-right at B, co-interior with A1 (supplementary) */}
      {revealed >= 4 && <Wedge vertex={B} dirA={hRight} dirB={U} label="110°" tone="arc" />}

      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={344} textAnchor="middle">
          <tspan className="proof-value--accent">70°</tspan> ={' '}
          <tspan className="proof-value--accent">70°</tspan>
        </text>
      )}
    </svg>
  )
}

function Wedge({
  vertex,
  dirA,
  dirB,
  label,
  tone,
}: {
  vertex: Point
  dirA: Point
  dirB: Point
  label: string
  tone: 'accent' | 'arc'
}) {
  const a = addRay(vertex, dirA, wedgeR)
  const b = addRay(vertex, dirB, wedgeR)
  const labelPos = bisectorPos(vertex, dirA, dirB, 34)
  const fillClass = tone === 'accent' ? 'proof-inscribed-fill' : 'proof-central-fill'
  const outlineClass = tone === 'accent' ? 'proof-inscribed' : 'proof-central'
  const labelClass = tone === 'accent' ? 'proof-value proof-value--accent' : 'proof-value proof-value--arc'

  return (
    <g className="proof-in">
      <path className={fillClass} d={angleSectorPath(vertex, a, b, wedgeR)} />
      <path className={outlineClass} d={angleArcPath(vertex, a, b, wedgeR)} />
      <text
        className={labelClass}
        x={labelPos.x}
        y={labelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {label}
      </text>
    </g>
  )
}
