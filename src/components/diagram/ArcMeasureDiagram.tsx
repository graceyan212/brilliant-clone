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
import './ArcMeasureDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

// Inner radius for the small central-angle marker drawn at the center O.
const markerRadius = 46

const keyboardStep = 2

// Keep the two points at least this far apart (degrees) so neither arc collapses.
const separationMargin = 12

type PointKey = 'a' | 'b'

const initialAngles: Record<PointKey, number> = { a: 230, b: 310 }

function snapToEven(degrees: number) {
  return normalizeDegrees(Math.round(degrees / 2) * 2)
}

// The minor arc (<= 180 deg) between the two points: where it starts and how far
// it sweeps counter-clockwise. That sweep is exactly the central angle AOB.
function minorArc(a: number, b: number) {
  const ccw = normalizeDegrees(b - a)
  return ccw <= 180 ? { start: a, sweep: ccw } : { start: b, sweep: 360 - ccw }
}

// A point on the rim pushed `extra` px further out, used to place labels clear
// of the circle.
function outward(degrees: number, extra: number): Point {
  return pointOnCircle({ center: circle.center, radius: circle.radius + extra }, degrees)
}

type ArcMeasureDiagramProps = {
  /** Static figure: the central angle (= its arc) to draw, centered at the top. */
  centralAngle?: number
  showCentralValue?: boolean
  showArcValue?: boolean
  /** Static: also draw the major arc the other way around (360 - centralAngle). */
  highlightRemaining?: boolean
  showRemainingValue?: boolean
  /** Interactive: drag A and B with a live readout instead of fixed values. */
  interactive?: boolean
  showReadout?: boolean
  onInteract?: () => void
}

export function ArcMeasureDiagram({
  centralAngle = 120,
  showCentralValue = false,
  showArcValue = false,
  highlightRemaining = false,
  showRemainingValue = false,
  interactive = false,
  showReadout = true,
  onInteract,
}: ArcMeasureDiagramProps) {
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

  // Throttle pointer-driven updates to one per animation frame so dragging stays
  // smooth even when pointermove fires faster than the display refreshes.
  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<{ key: PointKey; clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  // Static figure derives A and B from the given central angle, centered on top.
  const staticAngles = useMemo<Record<PointKey, number>>(() => {
    const half = centralAngle / 2
    return { a: normalizeDegrees(270 - half), b: normalizeDegrees(270 + half) }
  }, [centralAngle])

  const current = interactive ? angles : staticAngles

  const geometry = useMemo(() => {
    const pa = pointOnCircle(circle, current.a)
    const pb = pointOnCircle(circle, current.b)
    const arc = minorArc(current.a, current.b)
    const marker: Circle = { center: circle.center, radius: markerRadius }
    const remStart = normalizeDegrees(arc.start + arc.sweep)
    const remSweep = 360 - arc.sweep
    const arcMidDeg = arc.start + arc.sweep / 2
    const remMidDeg = remStart + remSweep / 2

    return {
      pa,
      pb,
      sweep: arc.sweep,
      wedge: centerSectorPath(marker, arc.start, arc.sweep),
      angleArc: arcPath(marker, arc.start, arc.sweep),
      rimArc: arcPath(circle, arc.start, arc.sweep),
      remArc: arcPath(circle, remStart, remSweep),
      angleLabel: pointOnCircle({ center: circle.center, radius: 74 }, arcMidDeg),
      arcLabel: outward(arcMidDeg, 24),
      remLabel: outward(remMidDeg, 24),
    }
  }, [current.a, current.b])

  function resolveAngle(key: PointKey, desired: number, source: Record<PointKey, number>) {
    const other = key === 'a' ? source.b : source.a
    const gap = normalizeDegrees(desired - other)
    if (gap < separationMargin) {
      return normalizeDegrees(other + separationMargin)
    }
    if (gap > 360 - separationMargin) {
      return normalizeDegrees(other - separationMargin)
    }
    return desired
  }

  function moveActiveTo(key: PointKey, clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()

    if (!svg || !screenMatrix) {
      return
    }

    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor: Point = svgPoint.matrixTransform(screenMatrix.inverse())

    setAngles((source) => {
      const desired = snapToEven(angleFromCenter(circle, cursor))
      return { ...source, [key]: resolveAngle(key, desired, source) }
    })
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
      setAngles((source) => ({
        ...source,
        [key]: resolveAngle(key, snapToEven(source[key] + keyboardStep), source),
      }))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setAngles((source) => ({
        ...source,
        [key]: resolveAngle(key, snapToEven(source[key] - keyboardStep), source),
      }))
      reportInteraction()
    }
  }

  const centralValue = Math.round(geometry.sweep)
  const remainingValue = 360 - centralValue

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className={`diagram__svg${interactive ? ' is-interactive' : ''}`}
        viewBox="0 0 360 360"
        role={interactive ? undefined : 'img'}
        aria-label={
          interactive
            ? undefined
            : `A circle with a central angle of ${centralValue} degrees opening onto an arc of ${centralValue} degrees`
        }
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

        <path className="arcm-wedge" d={geometry.wedge} />

        <line
          className="diagram__radius"
          x1={circle.center.x}
          y1={circle.center.y}
          x2={geometry.pa.x}
          y2={geometry.pa.y}
        />
        <line
          className="diagram__radius"
          x1={circle.center.x}
          y1={circle.center.y}
          x2={geometry.pb.x}
          y2={geometry.pb.y}
        />

        {highlightRemaining && <path className="arcm-arc is-major" d={geometry.remArc} />}

        <path className="arcm-arc" d={geometry.rimArc} />
        <path className="arcm-angle" d={geometry.angleArc} />

        <g className="diagram__center">
          <circle cx={circle.center.x} cy={circle.center.y} r={4} />
          <text x={circle.center.x - 13} y={circle.center.y - 4}>
            O
          </text>
        </g>

        {!interactive && showCentralValue && (
          <text
            className="diagram__value is-central"
            x={geometry.angleLabel.x}
            y={geometry.angleLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {`${centralValue}\u00B0`}
          </text>
        )}
        {!interactive && showArcValue && (
          <text
            className="diagram__value is-central"
            x={geometry.arcLabel.x}
            y={geometry.arcLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {`${centralValue}\u00B0`}
          </text>
        )}
        {!interactive && highlightRemaining && showRemainingValue && (
          <text
            className="diagram__value is-angle"
            x={geometry.remLabel.x}
            y={geometry.remLabel.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {`${remainingValue}\u00B0`}
          </text>
        )}

        {interactive
          ? (['a', 'b'] as PointKey[]).map((key) => {
              const position = key === 'a' ? geometry.pa : geometry.pb
              const label = key.toUpperCase()
              return (
                <g
                  key={key}
                  className="diagram__handle"
                  transform={`translate(${position.x} ${position.y})`}
                  tabIndex={0}
                  role="slider"
                  aria-label={`Point ${label} position`}
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={Math.round(current[key])}
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
            })
          : (
              <>
                <StaticPoint position={geometry.pa} degrees={current.a} label="A" />
                <StaticPoint position={geometry.pb} degrees={current.b} label="B" />
              </>
            )}
      </svg>

      {interactive && showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>&ang;AOB (central)</dt>
            <dd className="is-central">{centralValue}&deg;</dd>
          </div>
          <div>
            <dt>arc AB</dt>
            <dd className="is-central">{centralValue}&deg;</dd>
          </div>
          <div>
            <dt>whole circle</dt>
            <dd className="is-sum">360&deg;</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function StaticPoint({ position, degrees, label }: { position: Point; degrees: number; label: string }) {
  const labelPoint = outward(degrees, 18)
  return (
    <g className="diagram__point">
      <circle cx={position.x} cy={position.y} r={7} />
      <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  )
}
