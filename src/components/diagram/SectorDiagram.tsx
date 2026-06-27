import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type Circle,
  type Point,
  angleFromCenter,
  arcPath,
  centerSectorPath,
  normalizeDegrees,
  pointOnCircle,
} from '../../engine/geometry'
import './CircleDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

// The angle readout sits along the wedge bisector, close to the center.
const labelCircle: Circle = {
  center: circle.center,
  radius: 56,
}

// pointOnCircle measures degrees with y pointing down, so 270 deg lands at the
// top of the circle (12 o'clock). Sweeping by a positive angle then runs
// clockwise across the screen, which is the direction the sector should open.
const sectorStartDegrees = 270

const snapStep = 30
const minAngle = 30
const maxAngle = 330
const fullCircle = 360

function clampSnap(degrees: number) {
  const snapped = Math.round(degrees / snapStep) * snapStep
  return Math.min(maxAngle, Math.max(minAngle, snapped))
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

// Express the central angle as the reduced fraction of the whole circle it covers.
function fractionOfCircle(degrees: number) {
  const divisor = gcd(degrees, fullCircle)
  const numerator = degrees / divisor
  const denominator = fullCircle / divisor
  return denominator === 1 ? `${numerator}` : `${numerator}/${denominator}`
}

type SectorDiagramProps = {
  interactive?: boolean
  angle?: number
  radiusLabel?: string
  showReadout?: boolean
  onInteract?: () => void
}

export function SectorDiagram({
  interactive = false,
  angle: angleProp = 90,
  radiusLabel,
  showReadout = true,
  onInteract,
}: SectorDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragAngle, setDragAngle] = useState(() => clampSnap(angleProp))
  const [active, setActive] = useState(false)
  const hasInteracted = useRef(false)

  // Interactive snaps to the 30 deg grid; static renders the angle as given.
  const angle = interactive ? dragAngle : angleProp

  const reportInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  // Throttle pointer-driven updates to one per animation frame so dragging stays
  // smooth even when pointermove fires faster than the display refreshes.
  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<{ clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const geometry = useMemo(() => {
    const start = pointOnCircle(circle, sectorStartDegrees)
    const end = pointOnCircle(circle, sectorStartDegrees + angle)
    const labelPoint = pointOnCircle(labelCircle, sectorStartDegrees + angle / 2)

    return {
      start,
      end,
      labelPoint,
      sector: centerSectorPath(circle, sectorStartDegrees, angle),
      rim: arcPath(circle, sectorStartDegrees, angle),
    }
  }, [angle])

  function moveActiveTo(clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()

    if (!svg || !screenMatrix) {
      return
    }

    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor: Point = svgPoint.matrixTransform(screenMatrix.inverse())
    const desired = normalizeDegrees(angleFromCenter(circle, cursor) - sectorStartDegrees)

    setDragAngle(clampSnap(desired))
  }

  function flushMove() {
    frameRef.current = null
    const pending = pendingRef.current
    if (pending) {
      moveActiveTo(pending.clientX, pending.clientY)
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!active) {
      return
    }
    pendingRef.current = { clientX: event.clientX, clientY: event.clientY }
    reportInteraction()
    if (frameRef.current === null) {
      frameRef.current = requestAnimationFrame(flushMove)
    }
  }

  function endDrag(event: PointerEvent<SVGSVGElement>) {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
    if (pendingRef.current) {
      moveActiveTo(pendingRef.current.clientX, pendingRef.current.clientY)
      pendingRef.current = null
    }
    setActive(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setDragAngle((current) => clampSnap(current + snapStep))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setDragAngle((current) => clampSnap(current - snapStep))
      reportInteraction()
    }
  }

  const fractionLabel = interactive ? fractionOfCircle(angle) : ''

  // Label one radius near its midpoint, nudged just outside it (perpendicular,
  // away from the sector) so the text stays clear of the line.
  const radiusMidpoint = pointOnCircle({ center: circle.center, radius: circle.radius / 2 }, sectorStartDegrees)
  const radiusOffset = pointOnCircle({ center: { x: 0, y: 0 }, radius: 18 }, sectorStartDegrees - 90)
  const radiusLabelPosition = {
    x: radiusMidpoint.x + radiusOffset.x,
    y: radiusMidpoint.y + radiusOffset.y,
  }

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className={`diagram__svg${interactive ? ' is-interactive' : ''}`}
        viewBox="0 0 360 360"
        role={interactive ? undefined : 'img'}
        aria-label={
          interactive ? undefined : `A sector of a circle with central angle ${angle} degrees`
        }
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

        <path className="diagram__central-fill" d={geometry.sector} />

        <line
          className="diagram__radius"
          style={{ stroke: 'var(--tok-blue)', strokeWidth: 2.5 }}
          x1={circle.center.x}
          y1={circle.center.y}
          x2={geometry.start.x}
          y2={geometry.start.y}
        />
        <line
          className="diagram__radius"
          style={{ stroke: 'var(--tok-blue)', strokeWidth: 2.5 }}
          x1={circle.center.x}
          y1={circle.center.y}
          x2={geometry.end.x}
          y2={geometry.end.y}
        />

        <path className="diagram__central" d={geometry.rim} />

        <g className="diagram__center">
          <circle cx={circle.center.x} cy={circle.center.y} r={4} />
          <text x={circle.center.x - 13} y={circle.center.y - 4}>
            O
          </text>
        </g>

        <text
          className="diagram__value is-central"
          x={geometry.labelPoint.x}
          y={geometry.labelPoint.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {`${angle}\u00B0`}
        </text>

        {!interactive && radiusLabel ? (
          <text
            className="diagram__value"
            style={{ fill: 'var(--tok-blue)' }}
            x={radiusLabelPosition.x}
            y={radiusLabelPosition.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {radiusLabel}
          </text>
        ) : null}

        {interactive ? (
          <g
            className="diagram__handle"
            transform={`translate(${geometry.end.x} ${geometry.end.y})`}
            tabIndex={0}
            role="slider"
            aria-label="Central angle"
            aria-valuemin={minAngle}
            aria-valuemax={maxAngle}
            aria-valuenow={angle}
            onKeyDown={handleKeyDown}
            onPointerDown={(event) => {
              setActive(true)
              svgRef.current?.setPointerCapture(event.pointerId)
              moveActiveTo(event.clientX, event.clientY)
            }}
          >
            <circle className="diagram__hit" r={24} />
            <circle r={11} />
          </g>
        ) : null}
      </svg>

      {interactive && showReadout ? (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>Central angle</dt>
            <dd className="is-central">{angle}&deg;</dd>
          </div>
          <div>
            <dt>of the circle</dt>
            <dd className="is-sum">{fractionLabel}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
