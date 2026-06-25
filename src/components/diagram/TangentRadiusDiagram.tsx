import {
  type Circle,
  type Point,
  angleArcPath,
  angleSectorPath,
  pointOnCircle,
} from '../../engine/geometry'
import './CircleDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

const arcRadius = 26
const labelDistance = 42
const rayLength = 105
const markerLeg = 12

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

type TangentRadiusDiagramProps = {
  rayAngle?: number
  showTangentValue?: boolean
  showRadiusValue?: boolean
  showRightAngle?: boolean
}

export function TangentRadiusDiagram({
  rayAngle,
  showTangentValue = false,
  showRadiusValue = false,
  showRightAngle = true,
}: TangentRadiusDiagramProps) {
  const o = circle.center
  const p = pointOnCircle(circle, 270)

  const tangentStart: Point = { x: 70, y: p.y }
  const tangentEnd: Point = { x: 290, y: p.y }

  const hasRay = rayAngle !== undefined
  const radians = ((rayAngle ?? 0) * Math.PI) / 180
  // PR points (cos, sin) from P: rayAngle=0 lies along the tangent, 90 along the radius.
  const r: Point = {
    x: p.x + rayLength * Math.cos(radians),
    y: p.y + rayLength * Math.sin(radians),
  }
  // A reference point along the rightward tangent for the tangent-side angle.
  const tangentRef: Point = { x: p.x + 40, y: p.y }

  const tangentLabel = bisector(p, tangentRef, r, labelDistance)
  const radiusLabel = bisector(p, r, o, labelDistance)

  // Right-angle square nested in the quadrant between rightward and downward.
  const markerPath = `M ${p.x + markerLeg} ${p.y} L ${p.x + markerLeg} ${p.y + markerLeg} L ${p.x} ${p.y + markerLeg}`

  return (
    <div className="diagram">
      <svg
        className="diagram__svg"
        viewBox="0 0 360 360"
        role="img"
        aria-label="A circle with a tangent line meeting the radius at the point of contact"
      >
        <circle className="diagram__circle" cx={o.x} cy={o.y} r={circle.radius} />

        {hasRay && (
          <>
            <path className="diagram__angle-fill" d={angleSectorPath(p, tangentRef, r, arcRadius)} />
            <path className="diagram__central-fill" d={angleSectorPath(p, r, o, arcRadius)} />
          </>
        )}

        <line
          className="diagram__chord"
          x1={tangentStart.x}
          y1={tangentStart.y}
          x2={tangentEnd.x}
          y2={tangentEnd.y}
        />
        <line className="diagram__radius" x1={o.x} y1={o.y} x2={p.x} y2={p.y} />

        {hasRay && <line className="diagram__chord" x1={p.x} y1={p.y} x2={r.x} y2={r.y} />}

        {hasRay && (
          <>
            <path className="diagram__angle" d={angleArcPath(p, tangentRef, r, arcRadius)} />
            <path className="diagram__central" d={angleArcPath(p, r, o, arcRadius)} />
          </>
        )}

        {showRightAngle && !hasRay && (
          <path d={markerPath} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} />
        )}

        <g className="diagram__point" transform={`translate(${o.x} ${o.y})`}>
          <circle r={6} />
          <text x={-15} y={6}>
            O
          </text>
        </g>
        <g className="diagram__point" transform={`translate(${p.x} ${p.y})`}>
          <circle r={6} />
          <text x={-12} y={-12}>
            P
          </text>
        </g>

        {hasRay && (
          <>
            <text
              className="diagram__value is-angle"
              x={tangentLabel.x}
              y={tangentLabel.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {showTangentValue ? `${rayAngle}\u00B0` : '?'}
            </text>
            <text
              className="diagram__value is-central"
              x={radiusLabel.x}
              y={radiusLabel.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {showRadiusValue ? `${90 - (rayAngle ?? 0)}\u00B0` : '?'}
            </text>
          </>
        )}
      </svg>
    </div>
  )
}
