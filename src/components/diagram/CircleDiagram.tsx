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
  angleArcPath,
  angleFromCenter,
  angleSectorPath,
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

const centralCircle: Circle = {
  center: circle.center,
  radius: 46,
}

const keyboardStep = 2

type PointKey = 'a' | 'b' | 'c'

const initialAngles: Record<PointKey, number> = { a: 150, b: 30, c: 270 }

function snapToEven(degrees: number) {
  return normalizeDegrees(Math.round(degrees / 2) * 2)
}

type CircleDiagramProps = {
  showAngle?: boolean
  showCentral?: boolean
  lockAnchors?: boolean
  onInteract?: () => void
}

export function CircleDiagram({
  showAngle = true,
  showCentral = false,
  lockAnchors = false,
  onInteract,
}: CircleDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [angles, setAngles] = useState(initialAngles)
  const [active, setActive] = useState<PointKey | null>(null)
  const hasInteracted = useRef(false)

  const reportInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  // Throttle pointer-driven updates to one per animation frame so dragging
  // stays smooth (60fps) even when pointermove fires faster than the display.
  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<{ key: PointKey; clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const geometry = useMemo(() => {
    const a = pointOnCircle(circle, angles.a)
    const b = pointOnCircle(circle, angles.b)
    const c = pointOnCircle(circle, angles.c)

    const ccw = normalizeDegrees(angles.b - angles.a)
    const cRelative = normalizeDegrees(angles.c - angles.a)
    const cOnCcwArc = cRelative > 0 && cRelative < ccw
    const arcStart = cOnCcwArc ? angles.b : angles.a
    const arcSweep = cOnCcwArc ? 360 - ccw : ccw

    return {
      a,
      b,
      c,
      inscribed: arcSweep / 2,
      central: arcSweep,
      centralSector: centerSectorPath(centralCircle, arcStart, arcSweep),
      centralArc: arcPath(centralCircle, arcStart, arcSweep),
      angleArc: angleArcPath(c, a, b, 42),
      angleSector: angleSectorPath(c, a, b, 42),
    }
  }, [angles])

  function moveActiveTo(key: PointKey, clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()

    if (!svg || !screenMatrix) {
      return
    }

    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor = svgPoint.matrixTransform(screenMatrix.inverse())

    setAngles((current) => ({ ...current, [key]: snapToEven(angleFromCenter(circle, cursor)) }))
  }

  function flushMove() {
    frameRef.current = null
    const pending = pendingRef.current
    if (pending) {
      moveActiveTo(pending.key, pending.clientX, pending.clientY)
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!active) {
      return
    }
    pendingRef.current = { key: active, clientX: event.clientX, clientY: event.clientY }
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
      moveActiveTo(pendingRef.current.key, pendingRef.current.clientX, pendingRef.current.clientY)
      pendingRef.current = null
    }
    setActive(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function nudge(key: PointKey, event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setAngles((current) => ({ ...current, [key]: snapToEven(current[key] + keyboardStep) }))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setAngles((current) => ({ ...current, [key]: snapToEven(current[key] - keyboardStep) }))
      reportInteraction()
    }
  }

  const roundedCentral = Math.round(geometry.central)
  const roundedInscribed = Math.round(geometry.inscribed)

  const points: {
    key: PointKey
    label: string
    position: typeof geometry.a
    accent: boolean
    draggable: boolean
  }[] = [
    { key: 'a', label: 'A', position: geometry.a, accent: false, draggable: !lockAnchors },
    { key: 'b', label: 'B', position: geometry.b, accent: false, draggable: !lockAnchors },
    { key: 'c', label: 'C', position: geometry.c, accent: true, draggable: true },
  ]

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className="diagram__svg"
        viewBox="0 0 360 360"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

        {showCentral && <path className="diagram__central-fill" d={geometry.centralSector} />}
        {showAngle && <path className="diagram__angle-fill" d={geometry.angleSector} />}

        {showCentral && (
          <>
            <line
              className="diagram__radius"
              x1={circle.center.x}
              y1={circle.center.y}
              x2={geometry.a.x}
              y2={geometry.a.y}
            />
            <line
              className="diagram__radius"
              x1={circle.center.x}
              y1={circle.center.y}
              x2={geometry.b.x}
              y2={geometry.b.y}
            />
          </>
        )}

        <line className="diagram__chord" x1={geometry.c.x} y1={geometry.c.y} x2={geometry.a.x} y2={geometry.a.y} />
        <line className="diagram__chord" x1={geometry.c.x} y1={geometry.c.y} x2={geometry.b.x} y2={geometry.b.y} />
        <line className="diagram__base" x1={geometry.a.x} y1={geometry.a.y} x2={geometry.b.x} y2={geometry.b.y} />

        {showCentral && <path className="diagram__central" d={geometry.centralArc} />}
        {showAngle && <path className="diagram__angle" d={geometry.angleArc} />}

        {showCentral && (
          <g className="diagram__center">
            <circle cx={circle.center.x} cy={circle.center.y} r={4} />
            <text x={circle.center.x} y={circle.center.y - 10}>
              O
            </text>
          </g>
        )}

        {points.map(({ key, label, position, accent, draggable }) => {
          const className = `diagram__handle${accent ? ' is-accent' : ''}${
            draggable ? '' : ' is-fixed'
          }`

          if (!draggable) {
            return (
              <g
                key={key}
                className={className}
                transform={`translate(${position.x} ${position.y})`}
                aria-label={`Point ${label} (fixed)`}
              >
                <circle r={14} />
                <text y={5}>{label}</text>
              </g>
            )
          }

          return (
            <g
              key={key}
              className={className}
              transform={`translate(${position.x} ${position.y})`}
              tabIndex={0}
              role="slider"
              aria-label={`Point ${label} position`}
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(angles[key])}
              onKeyDown={(event) => nudge(key, event)}
              onPointerDown={(event) => {
                setActive(key)
                svgRef.current?.setPointerCapture(event.pointerId)
                moveActiveTo(key, event.clientX, event.clientY)
              }}
            >
              <circle className="diagram__hit" r={24} />
              <circle r={14} />
              <text y={5}>{label}</text>
            </g>
          )
        })}
      </svg>

      <dl className="diagram__readout" aria-live="polite">
        <div>
          <dt>&ang;ACB (inscribed)</dt>
          <dd className="is-angle">{roundedInscribed}&deg;</dd>
        </div>
        {showCentral && (
          <div>
            <dt>&ang;AOB (center)</dt>
            <dd className="is-central">{roundedCentral}&deg;</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
