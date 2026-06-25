import type { KeyboardEvent } from 'react'
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

type IdentifyFigureProps = {
  centralAngle: number
  foundCentral: boolean
  foundInscribed: boolean
  onTap: (id: 'central' | 'inscribed') => void
}

// The two angles start as plain grey wedges, so the learner has to find each by
// where its vertex sits. A correct tap fills it with its theme color and names it.
export function IdentifyFigure({
  centralAngle,
  foundCentral,
  foundInscribed,
  onTap,
}: IdentifyFigureProps) {
  const aDegrees = 90 + centralAngle / 2
  const bDegrees = 90 - centralAngle / 2
  const a = pointOnCircle(circle, aDegrees)
  const b = pointOnCircle(circle, bDegrees)
  const c = pointOnCircle(circle, 270)
  const o = circle.center

  return (
    <svg
      className="diagram__svg"
      viewBox="0 0 360 360"
      role="group"
      aria-label="A circle with a central angle at O and an inscribed angle at C"
    >
      <circle className="diagram__circle" cx={o.x} cy={o.y} r={circle.radius} />

      <path
        className={foundCentral ? 'diagram__central-fill' : 'identify-wedge'}
        d={centerSectorPath(centralCircle, bDegrees, centralAngle)}
      />
      <path
        className={foundInscribed ? 'diagram__angle-fill' : 'identify-wedge'}
        d={angleSectorPath(c, a, b, 40)}
      />

      <line className="diagram__radius" x1={o.x} y1={o.y} x2={a.x} y2={a.y} />
      <line className="diagram__radius" x1={o.x} y1={o.y} x2={b.x} y2={b.y} />
      <line className="diagram__chord" x1={c.x} y1={c.y} x2={a.x} y2={a.y} />
      <line className="diagram__chord" x1={c.x} y1={c.y} x2={b.x} y2={b.y} />

      <path
        className={foundCentral ? 'diagram__central' : 'identify-arc'}
        d={arcPath(centralCircle, bDegrees, centralAngle)}
      />
      <path
        className={foundInscribed ? 'diagram__angle' : 'identify-arc'}
        d={angleArcPath(c, a, b, 40)}
      />

      <g className="diagram__center">
        <circle cx={o.x} cy={o.y} r={4} />
        <text x={o.x - 13} y={o.y - 4}>
          O
        </text>
      </g>

      <Point x={a.x} y={a.y} label="A" dx={-16} dy={6} />
      <Point x={b.x} y={b.y} label="B" dx={16} dy={6} />
      <Point x={c.x} y={c.y} label="C" dx={0} dy={-16} />

      {foundInscribed && (
        <text className="diagram__term is-angle" x={180} y={26} textAnchor="middle">
          Inscribed angle
        </text>
      )}
      {foundCentral && (
        <text className="diagram__term is-central" x={180} y={262} textAnchor="middle">
          Central angle
        </text>
      )}

      {!foundCentral && (
        <TapTarget cx={o.x} cy={o.y} r={48} label="Angle at the center O" onTap={() => onTap('central')} />
      )}
      {!foundInscribed && (
        <TapTarget cx={c.x} cy={c.y} r={42} label="Angle at point C on the circle" onTap={() => onTap('inscribed')} />
      )}
    </svg>
  )
}

function TapTarget({
  cx,
  cy,
  r,
  label,
  onTap,
}: {
  cx: number
  cy: number
  r: number
  label: string
  onTap: () => void
}) {
  function handleKeyDown(event: KeyboardEvent<SVGCircleElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onTap()
    }
  }

  return (
    <circle
      className="identify-hit"
      cx={cx}
      cy={cy}
      r={r}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onTap}
      onKeyDown={handleKeyDown}
    />
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
