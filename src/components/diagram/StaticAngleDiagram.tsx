import {
  type Circle,
  angleArcPath,
  angleSectorPath,
  arcPath,
  centerSectorPath,
  pointOnCircle,
} from '../../engine/geometry'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

const centralCircle: Circle = {
  center: circle.center,
  radius: 40,
}

type StaticAngleDiagramProps = {
  centralAngle: number
  showCentralValue?: boolean
  showAngleValue?: boolean
  showNames?: boolean
}

export function StaticAngleDiagram({
  centralAngle,
  showCentralValue = true,
  showAngleValue = false,
  showNames = false,
}: StaticAngleDiagramProps) {
  const aDegrees = 90 + centralAngle / 2
  const bDegrees = 90 - centralAngle / 2
  const cDegrees = 270

  const pointA = pointOnCircle(circle, aDegrees)
  const pointB = pointOnCircle(circle, bDegrees)
  const pointC = pointOnCircle(circle, cDegrees)
  const o = circle.center
  const inscribed = centralAngle / 2

  return (
    <svg
      className="diagram__svg"
      viewBox="0 0 360 360"
      role="img"
      aria-label={`Circle with a central angle of ${centralAngle} degrees and an inscribed angle of ${inscribed} degrees`}
    >
      <circle className="diagram__circle" cx={o.x} cy={o.y} r={circle.radius} />

      <path className="diagram__central-fill" d={centerSectorPath(centralCircle, bDegrees, centralAngle)} />
      <path className="diagram__angle-fill" d={angleSectorPath(pointC, pointA, pointB, 40)} />

      <line className="diagram__radius" x1={o.x} y1={o.y} x2={pointA.x} y2={pointA.y} />
      <line className="diagram__radius" x1={o.x} y1={o.y} x2={pointB.x} y2={pointB.y} />

      <line className="diagram__chord" x1={pointC.x} y1={pointC.y} x2={pointA.x} y2={pointA.y} />
      <line className="diagram__chord" x1={pointC.x} y1={pointC.y} x2={pointB.x} y2={pointB.y} />

      <path className="diagram__central" d={arcPath(centralCircle, bDegrees, centralAngle)} />
      <path className="diagram__angle" d={angleArcPath(pointC, pointA, pointB, 40)} />

      <g className="diagram__center">
        <circle cx={o.x} cy={o.y} r={4} />
        <text x={o.x - 13} y={o.y - 4}>
          O
        </text>
      </g>

      <Point x={pointA.x} y={pointA.y} label="A" dx={-16} dy={6} />
      <Point x={pointB.x} y={pointB.y} label="B" dx={16} dy={6} />
      <Point x={pointC.x} y={pointC.y} label="C" dx={0} dy={-16} />

      {showNames ? (
        <>
          <text className="diagram__term is-angle" x={180} y={26} textAnchor="middle">
            Inscribed angle
          </text>
          <text className="diagram__label is-angle" x={180} y={122} textAnchor="middle">
            {'\u2220ACB'}
          </text>
          <text className="diagram__label is-central" x={180} y={206} textAnchor="middle">
            {'\u2220AOB'}
          </text>
          <text className="diagram__term is-central" x={180} y={262} textAnchor="middle">
            Central angle
          </text>
        </>
      ) : (
        <>
          <text className="diagram__label is-angle" x={180} y={120} textAnchor="middle">
            {showAngleValue ? `${inscribed}\u00B0` : '?'}
          </text>
          <text className="diagram__label is-central" x={180} y={210} textAnchor="middle">
            {showCentralValue ? `${centralAngle}\u00B0` : '?'}
          </text>
        </>
      )}
    </svg>
  )
}

function Point({
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
      <circle r={7} />
      <text x={dx} y={dy}>
        {label}
      </text>
    </g>
  )
}
