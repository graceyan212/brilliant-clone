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
  angleFromCenter,
  distance,
  lineIntersection,
  normalizeDegrees,
  pointOnCircle,
} from '../../engine/geometry'
import './CircleDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

// Going around the circle the order is D(30), A(150), C(210), B(330), so chords
// A–B and C–D alternate and therefore cross at an interior point P.
const canonical = { a: 150, b: 330, c: 210, d: 30 }

// D is the only draggable point. It must stay on the arc from B to A that passes
// through 0° (the side away from C) so the chords keep crossing inside the
// circle; a margin off each end keeps the crossing point clear of the rim.
const dragMargin = 12
const dArcStart = normalizeDegrees(canonical.b + dragMargin)
const dArcSpan = normalizeDegrees(canonical.a - canonical.b) - dragMargin * 2

const labelOffset = 14

// Render lengths as if the radius were `displayRadius` units, so the live
// products are friendly two-digit numbers instead of raw pixel areas.
const displayRadius = 10
const scale = circle.radius / displayRadius

// Static figures place D off the diameter so the four segments look visibly
// different; the interactive figure starts symmetric at canonical.d.
const staticD = 75

type SegmentKey = 'pa' | 'pb' | 'pc' | 'pd'

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// Midpoint of the half-chord P→end, nudged perpendicular to the segment and away
// from the circle's center so the length label sits clear of the crossing lines.
function segmentLabelPos(from: Point, to: Point, offset: number): Point {
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const u = unit(from, to)
  let nx = -u.y
  let ny = u.x
  if (nx * (circle.center.x - mx) + ny * (circle.center.y - my) > 0) {
    nx = -nx
    ny = -ny
  }
  return { x: mx + nx * offset, y: my + ny * offset }
}

// Clamp D onto the allowed arc, normalising relative to the arc's start so the
// range can wrap across 0°. Outside the arc, snap to the nearer end.
function constrainD(desired: number): number {
  const rel = normalizeDegrees(desired - dArcStart)
  if (rel <= dArcSpan) {
    return normalizeDegrees(dArcStart + rel)
  }
  const clampedRel = rel - dArcSpan <= 360 - rel ? dArcSpan : 0
  return normalizeDegrees(dArcStart + clampedRel)
}

type PowerOfPointDiagramProps = {
  interactive?: boolean
  showReadout?: boolean
  pa?: number
  pb?: number
  pc?: number
  pd?: number
  unknown?: 'pa' | 'pb' | 'pc' | 'pd'
  onInteract?: () => void
}

export function PowerOfPointDiagram({
  interactive = false,
  showReadout = true,
  pa,
  pb,
  pc,
  pd,
  unknown,
  onInteract,
}: PowerOfPointDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dDegrees, setDDegrees] = useState(canonical.d)
  const [dragging, setDragging] = useState(false)
  const hasInteracted = useRef(false)

  const reportInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<{ clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const dAngle = interactive ? dDegrees : staticD
  const a = pointOnCircle(circle, canonical.a)
  const b = pointOnCircle(circle, canonical.b)
  const c = pointOnCircle(circle, canonical.c)
  const d = pointOnCircle(circle, dAngle)
  const p = lineIntersection(a, b, c, d)

  const lengths: Record<SegmentKey, number> | null = p
    ? { pa: distance(p, a), pb: distance(p, b), pc: distance(p, c), pd: distance(p, d) }
    : null
  // PA·PB and PC·PD are exactly equal by the power-of-a-point theorem (P is the
  // true intersection of the two chords), so both readouts format to the same
  // number. One decimal keeps them visibly equal and lets the segment labels
  // multiply through (whole-number labels round too coarsely to match).
  const productAB = lengths ? ((lengths.pa * lengths.pb) / (scale * scale)).toFixed(1) : '0.0'
  const productCD = lengths ? ((lengths.pc * lengths.pd) / (scale * scale)).toFixed(1) : '0.0'

  function moveTo(clientX: number, clientY: number) {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) {
      return
    }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const cursor = pt.matrixTransform(matrix.inverse())
    // Snap to even degrees so the live products stay visually stable.
    const desired = Math.round(angleFromCenter(circle, cursor) / 2) * 2
    setDDegrees(constrainD(desired))
  }

  function flushMove() {
    frameRef.current = null
    if (pendingRef.current) {
      moveTo(pendingRef.current.clientX, pendingRef.current.clientY)
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragging) {
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
      moveTo(pendingRef.current.clientX, pendingRef.current.clientY)
      pendingRef.current = null
    }
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function nudge(event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setDDegrees((current) => constrainD(current + 2))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setDDegrees((current) => constrainD(current - 2))
      reportInteraction()
    }
  }

  function segmentText(key: SegmentKey): string | null {
    if (interactive) {
      return lengths ? (lengths[key] / scale).toFixed(1) : null
    }
    if (unknown === key) {
      return '?'
    }
    const provided = key === 'pa' ? pa : key === 'pb' ? pb : key === 'pc' ? pc : pd
    return provided === undefined ? null : String(provided)
  }

  const segments: { key: SegmentKey; end: Point; tone: 'is-angle' | 'is-central' }[] = [
    { key: 'pa', end: a, tone: 'is-angle' },
    { key: 'pb', end: b, tone: 'is-angle' },
    { key: 'pc', end: c, tone: 'is-central' },
    { key: 'pd', end: d, tone: 'is-central' },
  ]

  const vertices: { key: 'a' | 'b' | 'c' | 'd'; label: string; point: Point; angle: number }[] = [
    { key: 'a', label: 'A', point: a, angle: canonical.a },
    { key: 'b', label: 'B', point: b, angle: canonical.b },
    { key: 'c', label: 'C', point: c, angle: canonical.c },
    { key: 'd', label: 'D', point: d, angle: dAngle },
  ]

  const ariaLabel =
    'Two chords of a circle, AB and CD, crossing at an interior point P, illustrating that PA times PB equals PC times PD.'

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

        <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line className="diagram__chord" x1={c.x} y1={c.y} x2={d.x} y2={d.y} />

        {p && (
          <g className="diagram__point" transform={`translate(${p.x} ${p.y})`}>
            <circle r={5} />
            <text x={0} y={-13}>
              P
            </text>
          </g>
        )}

        {vertices.map(({ key, label, point, angle }) => {
          const outward = pointOnCircle({ center: circle.center, radius: circle.radius + 18 }, angle)
          const draggable = interactive && key === 'd'

          if (draggable) {
            return (
              <g
                key={key}
                className="diagram__handle is-accent"
                transform={`translate(${point.x} ${point.y})`}
                tabIndex={0}
                role="slider"
                aria-label="Point D position"
                aria-valuemin={0}
                aria-valuemax={Math.round(dArcSpan)}
                aria-valuenow={Math.round(normalizeDegrees(dAngle - dArcStart))}
                onKeyDown={nudge}
                onPointerDown={(event) => {
                  setDragging(true)
                  svgRef.current?.setPointerCapture(event.pointerId)
                  moveTo(event.clientX, event.clientY)
                }}
              >
                <circle className="diagram__hit" r={24} />
                <circle r={13} />
                <text y={5}>{label}</text>
              </g>
            )
          }

          return (
            <g key={key} className="diagram__point" transform={`translate(${point.x} ${point.y})`}>
              <circle r={6} />
              <text x={outward.x - point.x} y={outward.y - point.y + 4}>
                {label}
              </text>
            </g>
          )
        })}

        {p &&
          segments.map(({ key, end, tone }) => {
            const text = segmentText(key)
            if (text === null) {
              return null
            }
            const pos = segmentLabelPos(p, end, labelOffset)
            return (
              <text
                key={key}
                className={`diagram__value ${tone}`}
                x={pos.x}
                y={pos.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {text}
              </text>
            )
          })}
      </svg>

      {interactive && showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>{'PA \u00d7 PB'}</dt>
            <dd className="is-angle">{productAB}</dd>
          </div>
          <div>
            <dt>{'PC \u00d7 PD'}</dt>
            <dd className="is-central">{productCD}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
