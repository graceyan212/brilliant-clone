import {
  type KeyboardEvent,
  type PointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  type Circle,
  type Point,
  angleArcPath,
  angleBetweenPoints,
  angleFromCenter,
  angleSectorPath,
  arcPath,
  lineIntersection,
  normalizeDegrees,
  pointOnCircle,
} from '../../engine/geometry'
import { tokenColorVar } from '../lesson/palette'
import './CircleDiagram.css'

// Colour-matched (tint) styles: arc AC = teal, arc BD = orange, angle at P = magenta.
const tintArcAC = { stroke: tokenColorVar('teal') }
const tintArcBD = { stroke: tokenColorVar('orange') }
const tintAngleStroke = { stroke: tokenColorVar('magenta') }
const tintAngleFill = { fill: tokenColorVar('magenta'), fillOpacity: 0.45 }
const tintAngleText = { fill: tokenColorVar('magenta') }
const tintArcACText = { fill: tokenColorVar('teal') }
const tintArcBDText = { fill: tokenColorVar('orange') }

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

const keyboardStep = 2

// Keep the draggable points this far (deg) clear of the chord-AB endpoints so the
// two chords always cross strictly inside the circle.
const arcMargin = 8

type DragKey = 'c' | 'd'

// Interactive figure: A and B are the fixed chord-AB endpoints; the rim order is
// A(120) C(190) B(260) D(350) so chord AB and chord CD alternate and cross at P.
const anchorAngles = { a: 120, b: 260 }
const initialAngles: Record<DragKey, number> = { c: 190, d: 350 }

// Static figure: A sits here, then C, B, D follow from the two intercepted arcs.
const staticAStart = 205

const wedgeRadius = 26
const arcLabelOffset = 16
const vertexLabelOffset = 18
const pLabelOffset = 30

function snapToEven(degrees: number) {
  return normalizeDegrees(Math.round(degrees / 2) * 2)
}

// Copied from CircleDiagram: clamp a desired angle so the point stays on the same
// arc of chord AB it currently sits on (it can't be dragged past A or B).
function constrainToArc(desired: number, a: number, b: number, c: number, margin: number) {
  const span = normalizeDegrees(b - a)
  const cRelative = normalizeDegrees(c - a)
  const cOnArcAB = cRelative > 0 && cRelative < span

  const start = cOnArcAB ? a : b
  const arcLength = cOnArcAB ? span : 360 - span
  const desiredRelative = normalizeDegrees(desired - start)
  const lo = margin
  const hi = arcLength - margin

  if (desiredRelative >= lo && desiredRelative <= hi) {
    return normalizeDegrees(start + desiredRelative)
  }
  if (desiredRelative < lo) {
    return normalizeDegrees(start + lo)
  }
  if (desiredRelative <= arcLength) {
    return normalizeDegrees(start + hi)
  }
  // In the forbidden arc: snap to whichever boundary is closer.
  return desiredRelative - arcLength <= 360 - desiredRelative
    ? normalizeDegrees(start + hi)
    : normalizeDegrees(start + lo)
}

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// A point pushed `extra` px beyond the rim at `degrees`, for labels outside the circle.
function outward(degrees: number, extra: number): Point {
  return pointOnCircle({ center: circle.center, radius: circle.radius + extra }, degrees)
}

// A point offset from `vertex` along the bisector of the angle toward A and B.
function bisectorPos(vertex: Point, towardA: Point, towardB: Point, offset: number): Point {
  const u1 = unit(vertex, towardA)
  const u2 = unit(vertex, towardB)
  let bx = u1.x + u2.x
  let by = u1.y + u2.y
  const length = Math.hypot(bx, by) || 1
  bx /= length
  by /= length
  return { x: vertex.x + bx * offset, y: vertex.y + by * offset }
}

type ChordAngleDiagramProps = {
  interactive?: boolean
  showReadout?: boolean
  arc1?: number
  arc2?: number
  unknown?: 'angle' | 'arc1' | 'arc2'
  /** Colour-match the marks: arc AC = teal, arc BD = orange, angle at P = magenta. */
  tint?: boolean
  onInteract?: () => void
}

export function ChordAngleDiagram({
  interactive = false,
  showReadout = true,
  arc1 = 70,
  arc2 = 90,
  unknown,
  tint = false,
  onInteract,
}: ChordAngleDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [angles, setAngles] = useState(initialAngles)
  const [active, setActive] = useState<DragKey | null>(null)
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
  const pendingRef = useRef<{ key: DragKey; clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  // Static angles: A fixed, C = A + arc1, then the remaining two arcs are equal so
  // arc AC = arc1, arc BD = arc2, and arc CB = arc DA = q.
  const q = (360 - arc1 - arc2) / 2
  const staticAngles = {
    a: normalizeDegrees(staticAStart),
    c: normalizeDegrees(staticAStart + arc1),
    b: normalizeDegrees(staticAStart + arc1 + q),
    d: normalizeDegrees(staticAStart + arc1 + q + arc2),
  }

  const angleDegrees = interactive
    ? { a: anchorAngles.a, b: anchorAngles.b, c: angles.c, d: angles.d }
    : staticAngles

  const { a: aDeg, b: bDeg, c: cDeg, d: dDeg } = angleDegrees
  const a = pointOnCircle(circle, aDeg)
  const b = pointOnCircle(circle, bDeg)
  const c = pointOnCircle(circle, cDeg)
  const d = pointOnCircle(circle, dDeg)
  const p = lineIntersection(a, b, c, d)

  // The two arcs intercepted by the angle at P (and by its vertical angle).
  const arcAC = normalizeDegrees(cDeg - aDeg)
  const arcBD = normalizeDegrees(dDeg - bDeg)

  function resolveAngle(key: DragKey, desired: number, current: typeof initialAngles) {
    return constrainToArc(desired, anchorAngles.a, anchorAngles.b, current[key], arcMargin)
  }

  function moveActiveTo(key: DragKey, clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()

    if (!svg || !screenMatrix) {
      return
    }

    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor = svgPoint.matrixTransform(screenMatrix.inverse())

    setAngles((current) => {
      const desired = snapToEven(angleFromCenter(circle, cursor))
      return { ...current, [key]: resolveAngle(key, desired, current) }
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

  function nudge(key: DragKey, event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setAngles((current) => ({
        ...current,
        [key]: resolveAngle(key, snapToEven(current[key] + keyboardStep), current),
      }))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setAngles((current) => ({
        ...current,
        [key]: resolveAngle(key, snapToEven(current[key] - keyboardStep), current),
      }))
      reportInteraction()
    }
  }

  const angleAtP = p ? Math.round(angleBetweenPoints(p, a, c)) : 0
  const roundedArcAC = Math.round(arcAC)
  const roundedArcBD = Math.round(arcBD)
  const halfSum = Math.round((arcAC + arcBD) / 2)

  const vertices: { key: 'a' | 'b' | 'c' | 'd'; label: string; point: Point; angle: number }[] = [
    { key: 'a', label: 'A', point: a, angle: aDeg },
    { key: 'c', label: 'C', point: c, angle: cDeg },
    { key: 'b', label: 'B', point: b, angle: bDeg },
    { key: 'd', label: 'D', point: d, angle: dDeg },
  ]

  const angleLabelPos = p ? bisectorPos(p, a, c, pLabelOffset) : null
  const arcACLabelPos = outward(aDeg + arcAC / 2, arcLabelOffset)
  const arcBDLabelPos = outward(bDeg + arcBD / 2, arcLabelOffset)

  const ariaLabel = `Two chords AB and CD of a circle crossing at an interior point P, where the angle at P (${halfSum} degrees) equals half the sum of the intercepted arcs AC (${roundedArcAC} degrees) and BD (${roundedArcBD} degrees).`

  const svgModeProps: SVGProps<SVGSVGElement> = interactive
    ? { onPointerMove: handlePointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }
    : { role: 'img', 'aria-label': ariaLabel }

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className={interactive ? 'diagram__svg is-interactive' : 'diagram__svg'}
        viewBox="0 0 360 360"
        {...svgModeProps}
      >
        <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

        {p && (
          <path
            className="diagram__angle-fill"
            style={tint ? tintAngleFill : undefined}
            d={angleSectorPath(p, a, c, wedgeRadius)}
          />
        )}

        <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line className="diagram__chord" x1={c.x} y1={c.y} x2={d.x} y2={d.y} />

        <path className="diagram__central" style={tint ? tintArcAC : undefined} d={arcPath(circle, aDeg, arcAC)} />
        <path className="diagram__central" style={tint ? tintArcBD : undefined} d={arcPath(circle, bDeg, arcBD)} />

        {p && (
          <path
            className="diagram__angle"
            style={tint ? tintAngleStroke : undefined}
            d={angleArcPath(p, a, c, wedgeRadius)}
          />
        )}

        {p && (
          <g className="diagram__point" transform={`translate(${p.x} ${p.y})`}>
            <circle r={5} />
            {interactive && (
              <text x={0} y={-13}>
                P
              </text>
            )}
          </g>
        )}

        {vertices.map(({ key, label, point, angle }) => {
          const draggable = interactive && (key === 'c' || key === 'd')

          if (draggable) {
            const dragKey = key as DragKey
            return (
              <g
                key={key}
                className="diagram__handle is-accent"
                transform={`translate(${point.x} ${point.y})`}
                tabIndex={0}
                role="slider"
                aria-label={`Point ${label} position`}
                aria-valuemin={0}
                aria-valuemax={360}
                aria-valuenow={Math.round(angle)}
                onKeyDown={(event) => nudge(dragKey, event)}
                onPointerDown={(event) => {
                  setActive(dragKey)
                  svgRef.current?.setPointerCapture(event.pointerId)
                  moveActiveTo(dragKey, event.clientX, event.clientY)
                }}
              >
                <circle className="diagram__hit" r={24} />
                <circle r={14} />
                <text y={5}>{label}</text>
              </g>
            )
          }

          const labelPoint = outward(angle, vertexLabelOffset)
          return (
            <g key={key} className="diagram__point" transform={`translate(${point.x} ${point.y})`}>
              <circle r={6} />
              <text x={labelPoint.x - point.x} y={labelPoint.y - point.y + 4}>
                {label}
              </text>
            </g>
          )
        })}

        {!interactive && (
          <>
            {angleLabelPos && (
              <text
                className="diagram__value is-angle"
                style={tint ? tintAngleText : undefined}
                x={angleLabelPos.x}
                y={angleLabelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {unknown === 'angle' ? '?' : `${(arc1 + arc2) / 2}\u00B0`}
              </text>
            )}
            <text
              className="diagram__value is-central"
              style={tint ? tintArcACText : undefined}
              x={arcACLabelPos.x}
              y={arcACLabelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {unknown === 'arc1' ? '?' : `${arc1}\u00B0`}
            </text>
            <text
              className="diagram__value is-central"
              style={tint ? tintArcBDText : undefined}
              x={arcBDLabelPos.x}
              y={arcBDLabelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {unknown === 'arc2' ? '?' : `${arc2}\u00B0`}
            </text>
          </>
        )}
      </svg>

      {interactive && showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>&ang;APC</dt>
            <dd className="is-angle">{angleAtP}&deg;</dd>
          </div>
          <div>
            <dt>arc AC</dt>
            <dd className="is-central">{roundedArcAC}&deg;</dd>
          </div>
          <div>
            <dt>arc BD</dt>
            <dd className="is-central">{roundedArcBD}&deg;</dd>
          </div>
          <div>
            <dt>{'\u00BD (sum)'}</dt>
            <dd className="is-sum">{halfSum}&deg;</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
