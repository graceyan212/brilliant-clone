import { useCallback, useMemo, useRef, useState } from 'react'
import {
  type Circle,
  type Point,
  angleArcPath,
  polygonArea,
  polygonInteriorAngleSum,
  regularPolygonInteriorAngle,
  regularPolygonPoints,
} from '../../engine/geometry'
import { type TokenColor, tokenColorVar } from '../lesson/palette'
import './CircleDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 132,
}

const defaultMinSides = 3
const defaultMaxSides = 12
const displayScale = 40

export type PolygonDiagramProps = {
  /** Number of sides; the starting value in interactive mode. */
  sides?: number
  /** Let the learner change n with the +/- stepper. */
  interactive?: boolean
  minSides?: number
  maxSides?: number
  /** Mark one interior angle ((n-2)*180/n) on the figure and in the readout. */
  showInteriorAngle?: boolean
  /** Show the interior-angle sum (n-2)*180 in the readout. */
  showAngleSum?: boolean
  /** Show the (scaled) area in the readout. */
  showArea?: boolean
  /** Render the readout panel. */
  showReadout?: boolean
  /** Optional caption (e.g. "Octagon"). */
  name?: string
  /** Colour the marked interior angle (arc + value) by palette token, e.g. "blue". */
  interiorAngleColor?: TokenColor
  /** Draw the (n-2)-triangle fan of diagonals from the marked corner. */
  showTriangleFan?: boolean
  /** Colour the triangle fan (default green). */
  triangleFanColor?: TokenColor
  /** Draw the exterior angle at the marked corner (extend a side + mark the turn). */
  showExteriorAngle?: boolean
  /** Colour the exterior angle (default orange). */
  exteriorAngleColor?: TokenColor
  onInteract?: () => void
}

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function formatDegrees(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

export function PolygonDiagram({
  sides = 6,
  interactive = false,
  minSides = defaultMinSides,
  maxSides = defaultMaxSides,
  showInteriorAngle = true,
  showAngleSum = true,
  showArea = false,
  showReadout = true,
  name,
  interiorAngleColor,
  showTriangleFan = false,
  triangleFanColor = 'green',
  showExteriorAngle = false,
  exteriorAngleColor = 'orange',
  onInteract,
}: PolygonDiagramProps) {
  const [dragSides, setDragSides] = useState(sides)
  const hasInteracted = useRef(false)

  const reportInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const sideCount = interactive ? dragSides : sides

  const geometry = useMemo(() => {
    const points = regularPolygonPoints(circle, sideCount)
    const path = `${points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')} Z`
    return {
      points,
      path,
      interiorAngle: regularPolygonInteriorAngle(sideCount),
      angleSum: polygonInteriorAngleSum(sideCount),
      area: polygonArea(points),
    }
  }, [sideCount])

  function changeSides(delta: number) {
    setDragSides((current) => Math.min(maxSides, Math.max(minSides, current + delta)))
    reportInteraction()
  }

  // The interior-angle bisector of a regular polygon points at the center, so the
  // value sits on the segment from the marked vertex toward the middle.
  const markVertex = geometry.points[0]
  const towardCenter = unit(markVertex, circle.center)
  const anglePos = { x: markVertex.x + towardCenter.x * 42, y: markVertex.y + towardCenter.y * 42 }
  const neighbors: [Point, Point] = [
    geometry.points[1 % sideCount],
    geometry.points[(sideCount - 1) % sideCount],
  ]

  // Diagonals from the marked corner to every non-adjacent corner split a convex
  // n-gon into n - 2 triangles (the visual behind the angle-sum rule).
  const fanDiagonals = showTriangleFan
    ? Array.from({ length: Math.max(0, sideCount - 3) }, (_, k) => geometry.points[k + 2])
    : []

  // Exterior angle at the marked corner: extend the incoming side past the vertex
  // and mark the turn between that extension and the outgoing side.
  const exterior = (() => {
    if (!showExteriorAngle) {
      return null
    }
    const prev = geometry.points[(sideCount - 1) % sideCount]
    const next = geometry.points[1 % sideCount]
    const dir = unit(prev, markVertex)
    const extEnd = { x: markVertex.x + dir.x * 46, y: markVertex.y + dir.y * 46 }
    const u = unit(markVertex, extEnd)
    const w = unit(markVertex, next)
    const bis = { x: u.x + w.x, y: u.y + w.y }
    const blen = Math.hypot(bis.x, bis.y) || 1
    const labelPos = { x: markVertex.x + (bis.x / blen) * 34, y: markVertex.y + (bis.y / blen) * 34 }
    return { next, extEnd, labelPos }
  })()

  return (
    <div className="diagram">
      <svg
        className="diagram__svg"
        viewBox="0 0 360 360"
        role="img"
        aria-label={`A regular polygon with ${sideCount} sides`}
      >
        {name && (
          <text className="diagram__value is-sum" x={180} y={22} textAnchor="middle" dominantBaseline="middle">
            {name}
          </text>
        )}

        <path className="diagram__circle" d={geometry.path} />

        {fanDiagonals.map((point, index) => (
          <line
            key={`fan-${index}`}
            x1={markVertex.x}
            y1={markVertex.y}
            x2={point.x}
            y2={point.y}
            stroke={tokenColorVar(triangleFanColor)}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}

        {exterior && (
          <g>
            <line
              x1={markVertex.x}
              y1={markVertex.y}
              x2={exterior.extEnd.x}
              y2={exterior.extEnd.y}
              stroke={tokenColorVar(exteriorAngleColor)}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
            />
            <path
              className="diagram__angle"
              style={{ stroke: tokenColorVar(exteriorAngleColor) }}
              d={angleArcPath(markVertex, exterior.extEnd, exterior.next, 22)}
            />
            <text
              className="diagram__value is-angle"
              style={{ fill: tokenColorVar(exteriorAngleColor) }}
              x={exterior.labelPos.x}
              y={exterior.labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatDegrees(180 - geometry.interiorAngle)}&deg;
            </text>
          </g>
        )}

        {showInteriorAngle && (
          <>
            <path
              className="diagram__angle"
              style={interiorAngleColor ? { stroke: tokenColorVar(interiorAngleColor) } : undefined}
              d={angleArcPath(markVertex, neighbors[0], neighbors[1], 26)}
            />
            <text
              className="diagram__value is-angle"
              style={interiorAngleColor ? { fill: tokenColorVar(interiorAngleColor) } : undefined}
              x={anglePos.x}
              y={anglePos.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {formatDegrees(geometry.interiorAngle)}&deg;
            </text>
          </>
        )}
      </svg>

      {interactive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ minHeight: 40, padding: '0 18px' }}
            onClick={() => changeSides(-1)}
            disabled={sideCount <= minSides}
            aria-label="Fewer sides"
          >
            {'\u2212'}
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, minWidth: 96, textAlign: 'center' }}>
            {sideCount} sides
          </span>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ minHeight: 40, padding: '0 18px' }}
            onClick={() => changeSides(1)}
            disabled={sideCount >= maxSides}
            aria-label="More sides"
          >
            +
          </button>
        </div>
      )}

      {showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>Sides</dt>
            <dd className="is-sum">{sideCount}</dd>
          </div>
          {showInteriorAngle && (
            <div>
              <dt>Interior &ang;</dt>
              <dd className="is-angle">{formatDegrees(geometry.interiorAngle)}&deg;</dd>
            </div>
          )}
          {showAngleSum && (
            <div>
              <dt>Angle sum</dt>
              <dd className="is-central">{geometry.angleSum}&deg;</dd>
            </div>
          )}
          {showArea && (
            <div>
              <dt>Area</dt>
              <dd className="is-sum">{(geometry.area / (displayScale * displayScale)).toFixed(1)}</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  )
}
