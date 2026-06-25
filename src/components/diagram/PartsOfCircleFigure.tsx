import type { KeyboardEvent } from 'react'
import { type Circle, type Point, pointOnCircle } from '../../engine/geometry'
import './CircleDiagram.css'
import './PartsOfCircleFigure.css'

export type CirclePartId = 'radius' | 'chord' | 'diameter' | 'secant' | 'tangent'

type PartsOfCircleFigureProps = {
  foundIds?: string[]
  onTap?: (id: CirclePartId) => void
  showAll?: boolean
}

type PartConfig = {
  id: CirclePartId
  name: string
  a: Point
  b: Point
  labelDistance: number
  arrows: boolean
  hitLabel: string
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function unitVector(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function shift(point: Point, direction: Point, distance: number): Point {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance }
}

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 120,
}

// Secant: enters and exits the circle at two points, then overshoots both.
const secantEntry = pointOnCircle(circle, 165)
const secantExit = pointOnCircle(circle, 60)
const secantDirection = unitVector(secantEntry, secantExit)

// Tangent: touches at one point; its line runs perpendicular to that radius.
const tangentTouch = pointOnCircle(circle, 350)
const tangentDirection = unitVector(circle.center, pointOnCircle(circle, 350 + 90))

const SECANT_OVERSHOOT = 42
const TANGENT_OVERSHOOT = 78

const parts: PartConfig[] = [
  {
    id: 'radius',
    name: 'radius',
    a: circle.center,
    b: pointOnCircle(circle, 312),
    labelDistance: -18,
    arrows: false,
    hitLabel: 'Identify the line from the center to the edge',
  },
  {
    id: 'chord',
    name: 'chord',
    a: pointOnCircle(circle, 215),
    b: pointOnCircle(circle, 262),
    labelDistance: 16,
    arrows: false,
    hitLabel: 'Identify the line joining two points on the circle',
  },
  {
    id: 'diameter',
    name: 'diameter',
    a: pointOnCircle(circle, 192),
    b: pointOnCircle(circle, 12),
    labelDistance: 26,
    arrows: false,
    hitLabel: 'Identify the line through the center joining two edges',
  },
  {
    id: 'secant',
    name: 'secant',
    a: shift(secantEntry, secantDirection, -SECANT_OVERSHOOT),
    b: shift(secantExit, secantDirection, SECANT_OVERSHOOT),
    labelDistance: -16,
    arrows: true,
    hitLabel: 'Identify the line that cuts across the circle at two points',
  },
  {
    id: 'tangent',
    name: 'tangent',
    a: shift(tangentTouch, tangentDirection, -TANGENT_OVERSHOOT),
    b: shift(tangentTouch, tangentDirection, TANGENT_OVERSHOOT),
    labelDistance: 30,
    arrows: true,
    hitLabel: 'Identify the line that touches the circle at one point',
  },
]

function arrowMarkerId(part: PartConfig, revealed: boolean): string | undefined {
  if (!part.arrows) return undefined
  if (!revealed) return 'parts-arrow-grey'
  return part.id === 'secant' ? 'parts-arrow-secant' : 'parts-arrow-tangent'
}

// Labels sit at the midpoint, nudged perpendicular to the line so they clear the
// stroke. They stay horizontal regardless of the line's angle.
function labelPosition(part: PartConfig): Point {
  const direction = unitVector(part.a, part.b)
  const normal = { x: -direction.y, y: direction.x }
  return shift(midpoint(part.a, part.b), normal, part.labelDistance)
}

export function PartsOfCircleFigure(props: PartsOfCircleFigureProps) {
  const { foundIds = [], onTap, showAll = false } = props

  return (
    <svg
      className="diagram__svg"
      viewBox="0 0 360 360"
      role="group"
      aria-label="A circle showing its radius, chord, diameter, secant, and tangent"
    >
      <defs>
        <ArrowMarker id="parts-arrow-grey" className="part-arrow is-grey" />
        <ArrowMarker id="parts-arrow-secant" className="part-arrow is-secant" />
        <ArrowMarker id="parts-arrow-tangent" className="part-arrow is-tangent" />
      </defs>

      <circle
        className="diagram__circle"
        cx={circle.center.x}
        cy={circle.center.y}
        r={circle.radius}
      />

      {parts.map((part) => {
        const revealed = showAll || foundIds.includes(part.id)
        const markerId = arrowMarkerId(part, revealed)
        const markerUrl = markerId ? `url(#${markerId})` : undefined
        return (
          <line
            key={part.id}
            className={`part-line ${revealed ? `is-${part.id}` : 'is-unfound'}`}
            x1={part.a.x}
            y1={part.a.y}
            x2={part.b.x}
            y2={part.b.y}
            markerStart={markerUrl}
            markerEnd={markerUrl}
          />
        )
      })}

      {!showAll &&
        onTap &&
        parts.map((part) => {
          if (foundIds.includes(part.id)) return null
          return (
            <PartHit
              key={`hit-${part.id}`}
              a={part.a}
              b={part.b}
              ariaLabel={part.hitLabel}
              onActivate={() => onTap(part.id)}
            />
          )
        })}

      <g className="diagram__center">
        <circle cx={circle.center.x} cy={circle.center.y} r={4} />
        <text x={circle.center.x - 13} y={circle.center.y - 4}>
          O
        </text>
      </g>

      {parts.map((part) => {
        const revealed = showAll || foundIds.includes(part.id)
        if (!revealed) return null
        const position = labelPosition(part)
        return (
          <text
            key={`label-${part.id}`}
            className={`part-label is-${part.id}`}
            x={position.x}
            y={position.y}
            textAnchor="middle"
          >
            {part.name}
          </text>
        )
      })}
    </svg>
  )
}

function ArrowMarker({ id, className }: { id: string; className: string }) {
  return (
    <marker
      id={id}
      markerUnits="userSpaceOnUse"
      markerWidth={13}
      markerHeight={13}
      viewBox="0 0 12 12"
      refX={9}
      refY={6}
      orient="auto-start-reverse"
    >
      <path className={className} d="M1 1 L11 6 L1 11 Z" />
    </marker>
  )
}

function PartHit({
  a,
  b,
  ariaLabel,
  onActivate,
}: {
  a: Point
  b: Point
  ariaLabel: string
  onActivate: () => void
}) {
  function handleKeyDown(event: KeyboardEvent<SVGLineElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate()
    }
  }

  return (
    <line
      className="part-hit"
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="transparent"
      strokeWidth={26}
      strokeLinecap="round"
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    />
  )
}
