import {
  type Point,
  angleArcPath,
  angleBetweenPoints,
  angleSectorPath,
} from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

const A: Point = { x: 165, y: 84 }
const B: Point = { x: 64, y: 286 }
const C: Point = { x: 296, y: 286 }

const lineX0 = 26
const lineX1 = 334
const wedgeR = 30

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function addRay(point: Point, direction: Point, radius: number): Point {
  return { x: point.x + direction.x * radius, y: point.y + direction.y * radius }
}

// Steps `distance` along the bisector of the two directions, away from `vertex`.
function bisectorPos(vertex: Point, dirA: Point, dirB: Point, distance: number): Point {
  const bx = dirA.x + dirB.x
  const by = dirA.y + dirB.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * distance, y: vertex.y + (by / length) * distance }
}

export function TriangleAngleSumProof({ revealed }: { revealed: number }) {
  const aDeg = Math.round(angleBetweenPoints(A, B, C))
  const bDeg = Math.round(angleBetweenPoints(B, C, A))
  const cDeg = 180 - aDeg - bDeg

  const dirAB = unit(A, B)
  const dirAC = unit(A, C)
  const dirBA = unit(B, A)
  const dirBC = unit(B, C)
  const dirCA = unit(C, A)
  const dirCB = unit(C, B)
  const hLeft: Point = { x: -1, y: 0 }
  const hRight: Point = { x: 1, y: 0 }

  const aLabel = bisectorPos(A, dirAB, dirAC, 34)
  const bLabel = bisectorPos(B, dirBA, dirBC, 30)
  const cLabel = bisectorPos(C, dirCA, dirCB, 30)
  const leftLabel = bisectorPos(A, hLeft, dirAB, 40)
  const rightLabel = bisectorPos(A, hRight, dirAC, 40)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A triangle with a line drawn through the top vertex parallel to the base; the two base angles reappear at the top, and the three angles there form a straight line of 180 degrees."
    >
      <polygon className="proof-triangle" points={`${A.x},${A.y} ${B.x},${B.y} ${C.x},${C.y}`} />

      <line className="diagram__chord" x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
      <line className="diagram__chord" x1={B.x} y1={B.y} x2={C.x} y2={C.y} />
      <line className="diagram__chord" x1={C.x} y1={C.y} x2={A.x} y2={A.y} />

      {revealed >= 1 && (
        <g className="proof-in">
          <path
            className="identify-wedge"
            d={angleSectorPath(A, addRay(A, dirAB, wedgeR), addRay(A, dirAC, wedgeR), wedgeR)}
          />
          <path
            className="proof-central-fill"
            d={angleSectorPath(B, addRay(B, dirBA, wedgeR), addRay(B, dirBC, wedgeR), wedgeR)}
          />
          <path
            className="proof-inscribed-fill"
            d={angleSectorPath(C, addRay(C, dirCA, wedgeR), addRay(C, dirCB, wedgeR), wedgeR)}
          />

          <path
            className="identify-arc"
            d={angleArcPath(A, addRay(A, dirAB, wedgeR), addRay(A, dirAC, wedgeR), wedgeR)}
          />
          <path
            className="proof-central"
            d={angleArcPath(B, addRay(B, dirBA, wedgeR), addRay(B, dirBC, wedgeR), wedgeR)}
          />
          <path
            className="proof-inscribed"
            d={angleArcPath(C, addRay(C, dirCA, wedgeR), addRay(C, dirCB, wedgeR), wedgeR)}
          />

          <text className="proof-value" x={aLabel.x} y={aLabel.y} textAnchor="middle" dominantBaseline="middle">
            {aDeg}&deg;
          </text>
          <text
            className="proof-value proof-value--arc"
            x={bLabel.x}
            y={bLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {bDeg}&deg;
          </text>
          <text
            className="proof-value proof-value--accent"
            x={cLabel.x}
            y={cLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {cDeg}&deg;
          </text>
        </g>
      )}

      {revealed >= 2 && (
        <g className="proof-in">
          <line className="diagram__base" x1={lineX0} y1={A.y} x2={lineX1} y2={A.y} />
        </g>
      )}

      {revealed >= 3 && (
        <g className="proof-in">
          <path
            className="proof-central-fill"
            d={angleSectorPath(A, addRay(A, hLeft, wedgeR), addRay(A, dirAB, wedgeR), wedgeR)}
          />
          <path
            className="proof-inscribed-fill"
            d={angleSectorPath(A, addRay(A, hRight, wedgeR), addRay(A, dirAC, wedgeR), wedgeR)}
          />

          <path
            className="proof-central"
            d={angleArcPath(A, addRay(A, hLeft, wedgeR), addRay(A, dirAB, wedgeR), wedgeR)}
          />
          <path
            className="proof-inscribed"
            d={angleArcPath(A, addRay(A, hRight, wedgeR), addRay(A, dirAC, wedgeR), wedgeR)}
          />

          <text
            className="proof-value proof-value--arc"
            x={leftLabel.x}
            y={leftLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {bDeg}&deg;
          </text>
          <text
            className="proof-value proof-value--accent"
            x={rightLabel.x}
            y={rightLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {cDeg}&deg;
          </text>
        </g>
      )}

      <g className="diagram__point" transform={`translate(${A.x} ${A.y})`}>
        <circle r={5} />
      </g>
      <g className="diagram__point" transform={`translate(${B.x} ${B.y})`}>
        <circle r={5} />
      </g>
      <g className="diagram__point" transform={`translate(${C.x} ${C.y})`}>
        <circle r={5} />
      </g>

      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={40} textAnchor="middle">
          <tspan className="proof-value--arc">{bDeg}&deg;</tspan> + {aDeg}&deg; +{' '}
          <tspan className="proof-value--accent">{cDeg}&deg;</tspan> = 180&deg;
        </text>
      )}
    </svg>
  )
}
