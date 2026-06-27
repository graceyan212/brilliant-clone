import {
  type KeyboardEvent,
  type PointerEvent,
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
  distance,
  lineIntersection,
  normalizeDegrees,
  pointOnCircle,
} from '../../engine/geometry'
import { tokenColorVar } from '../lesson/palette'
import './CircleDiagram.css'

// Colour-matched (tint) styles: far arc = orange, near arc = teal, angle at P = magenta.
const tintFar = { stroke: tokenColorVar('orange') }
const tintNear = { stroke: tokenColorVar('teal') }
const tintAngleStroke = { stroke: tokenColorVar('magenta') }
const tintAngleFill = { fill: tokenColorVar('magenta'), fillOpacity: 0.45 }
const tintFarText = { fill: tokenColorVar('orange') }
const tintNearText = { fill: tokenColorVar('teal') }
const tintAngleText = { fill: tokenColorVar('magenta') }

// Interactive circle: P is dragged on the right, the two secants always run
// through the fixed left-side pivots, so they stay genuine secants.
const baseCircle: Circle = {
  center: { x: 200, y: 180 },
  radius: 104,
}

const wedgeRadius = 30
const keyboardStep = 6

// The two far points the secants always pass through (120 deg apart, so the far
// arc reads ~120 deg); only the near points move as P is dragged.
const pivotUpper = pointOnCircle(baseCircle, 240)
const pivotLower = pointOnCircle(baseCircle, 120)

const initialP: Point = { x: 332, y: 180 }

const minClearance = baseCircle.radius + 12
const pMinX = baseCircle.center.x + baseCircle.radius + 8
const pMaxX = 348
const pMinY = 16
const pMaxY = 344

// Static-figure layout: fit the circle + external point P inside the viewBox.
const staticMargin = 22
const staticMaxRadius = 112
const staticCenterY = 180

type Secant = {
  near: Point
  far: Point
}

function unitVector(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// A point `dist` from `vertex` along the bisector of the rays to A and B, used
// to drop the angle label into the throat of the wedge.
function bisectorPoint(vertex: Point, towardA: Point, towardB: Point, dist: number): Point {
  const a = unitVector(vertex, towardA)
  const b = unitVector(vertex, towardB)
  const sumX = a.x + b.x
  const sumY = a.y + b.y
  const length = Math.hypot(sumX, sumY)
  if (length < 1e-9) {
    return vertex
  }
  return { x: vertex.x + (sumX / length) * dist, y: vertex.y + (sumY / length) * dist }
}

// Of a secant's two points on the circle, the one closer to P is "near".
function classifySecant(first: Point, second: Point, fromP: Point): Secant {
  return distance(first, fromP) <= distance(second, fromP)
    ? { near: first, far: second }
    : { near: second, far: first }
}

// Given `through` on the circle and any `other` point, the line through both
// meets the circle a second time; return that point. t = 0 is `through`, so the
// second crossing is the quadratic's other root. Null when the line only grazes
// the circle (tangent at `through`).
function secondCircleIntersection(c: Circle, through: Point, other: Point): Point | null {
  const dx = other.x - through.x
  const dy = other.y - through.y
  const a = dx * dx + dy * dy
  if (a < 1e-9) {
    return null
  }
  const fx = through.x - c.center.x
  const fy = through.y - c.center.y
  const b = 2 * (fx * dx + fy * dy)
  const cc = fx * fx + fy * fy - c.radius * c.radius
  const discriminant = b * b - 4 * a * cc
  if (discriminant <= 1e-6) {
    return null
  }
  const root = Math.sqrt(discriminant)
  const t1 = (-b + root) / (2 * a)
  const t2 = (-b - root) / (2 * a)
  const t = Math.abs(t1) > Math.abs(t2) ? t1 : t2
  if (Math.abs(t) < 1e-6) {
    return null
  }
  return { x: through.x + t * dx, y: through.y + t * dy }
}

function clampToFrame(p: Point): Point {
  return {
    x: Math.min(pMaxX, Math.max(pMinX, p.x)),
    y: Math.min(pMaxY, Math.max(pMinY, p.y)),
  }
}

// Keep P inside the frame and outside the circle; reject moves that would land
// inside by returning the previous position.
function constrainP(candidate: Point, previous: Point): Point {
  const framed = clampToFrame(candidate)
  if (distance(framed, baseCircle.center) <= minClearance) {
    return previous
  }
  return framed
}

// For the symmetric two-secant figure, P sits on the axis a fixed multiple of the
// radius beyond the center. Find that multiple on a unit circle, then size and
// place a real circle so both the left rim and P stay inside the viewBox.
function fitStaticCircle(alpha: number, beta: number): { circle: Circle; p: Point } {
  const ref: Circle = { center: { x: 0, y: 0 }, radius: 1 }
  const nU = pointOnCircle(ref, normalizeDegrees(-alpha))
  const nL = pointOnCircle(ref, alpha)
  const fU = pointOnCircle(ref, 180 + beta)
  const fL = pointOnCircle(ref, 180 - beta)
  const pRef = lineIntersection(nU, fU, nL, fL)
  const px = pRef ? Math.max(1.1, pRef.x) : 2
  const radius = Math.min(staticMaxRadius, (360 - 2 * staticMargin) / (1 + px))
  const cx = staticMargin + radius
  const circle: Circle = { center: { x: cx, y: staticCenterY }, radius }
  return { circle, p: { x: cx + radius * px, y: staticCenterY } }
}

type SecantDiagramProps = {
  interactive?: boolean
  showReadout?: boolean
  farArc?: number
  nearArc?: number
  unknown?: 'angle' | 'far' | 'near'
  /** Colour-match the marks: far arc = orange, near arc = teal, angle at P = magenta. */
  tint?: boolean
  onInteract?: () => void
}

export function SecantDiagram({
  interactive = false,
  showReadout = true,
  farArc = 120,
  nearArc = 40,
  unknown,
  tint = false,
  onInteract,
}: SecantDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [pointP, setPointP] = useState<Point>(initialP)
  const [dragging, setDragging] = useState(false)
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
  const pendingRef = useRef<{ clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const moveTo = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) {
      return
    }
    const pt = svg.createSVGPoint()
    pt.x = clientX
    pt.y = clientY
    const cursor = pt.matrixTransform(matrix.inverse())
    setPointP((previous) => constrainP({ x: cursor.x, y: cursor.y }, previous))
  }, [])

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
    let dx = 0
    let dy = 0
    if (event.key === 'ArrowRight') {
      dx = keyboardStep
    } else if (event.key === 'ArrowLeft') {
      dx = -keyboardStep
    } else if (event.key === 'ArrowUp') {
      dy = -keyboardStep
    } else if (event.key === 'ArrowDown') {
      dy = keyboardStep
    } else {
      return
    }
    event.preventDefault()
    setPointP((previous) => constrainP({ x: previous.x + dx, y: previous.y + dy }, previous))
    reportInteraction()
  }

  if (!interactive) {
    return <SecantStaticFigure farArc={farArc} nearArc={nearArc} unknown={unknown} tint={tint} />
  }

  const rUpper = secondCircleIntersection(baseCircle, pivotUpper, pointP)
  const rLower = secondCircleIntersection(baseCircle, pivotLower, pointP)
  const upper = rUpper ? classifySecant(pivotUpper, rUpper, pointP) : null
  const lower = rLower ? classifySecant(pivotLower, rLower, pointP) : null

  const farMeasure = upper && lower ? angleBetweenPoints(baseCircle.center, upper.far, lower.far) : null
  const nearMeasure = upper && lower ? angleBetweenPoints(baseCircle.center, upper.near, lower.near) : null
  const angleAtP = upper && lower ? angleBetweenPoints(pointP, upper.far, lower.far) : null
  const halfDifference =
    farMeasure !== null && nearMeasure !== null ? (farMeasure - nearMeasure) / 2 : null

  const farArcPath = upper && lower ? minorArcPath(baseCircle, upper.far, lower.far) : null
  const nearArcPath = upper && lower ? minorArcPath(baseCircle, upper.near, lower.near) : null

  const dots: Point[] = []
  if (upper) {
    dots.push(upper.near, upper.far)
  }
  if (lower) {
    dots.push(lower.near, lower.far)
  }

  const sliderAngle = Math.round(angleAtP ?? 0)

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className="diagram__svg is-interactive"
        viewBox="0 0 360 360"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <circle className="diagram__circle" cx={baseCircle.center.x} cy={baseCircle.center.y} r={baseCircle.radius} />

        {upper && lower && (
          <path
            className="diagram__angle-fill"
            style={tint ? tintAngleFill : undefined}
            d={angleSectorPath(pointP, upper.far, lower.far, wedgeRadius)}
          />
        )}

        {upper && (
          <line className="diagram__chord" x1={pointP.x} y1={pointP.y} x2={upper.far.x} y2={upper.far.y} />
        )}
        {lower && (
          <line className="diagram__chord" x1={pointP.x} y1={pointP.y} x2={lower.far.x} y2={lower.far.y} />
        )}

        {farArcPath && <path className="diagram__central" style={tint ? tintFar : undefined} d={farArcPath} />}
        {nearArcPath && <path className="diagram__central" style={tint ? tintNear : undefined} d={nearArcPath} />}

        {upper && lower && (
          <path
            className="diagram__angle"
            style={tint ? tintAngleStroke : undefined}
            d={angleArcPath(pointP, upper.far, lower.far, wedgeRadius)}
          />
        )}

        {dots.map((dot) => (
          <g
            key={`${dot.x.toFixed(1)}:${dot.y.toFixed(1)}`}
            className="diagram__point"
            transform={`translate(${dot.x} ${dot.y})`}
          >
            <circle r={5} />
          </g>
        ))}

        <g
          className="diagram__handle is-accent"
          transform={`translate(${pointP.x} ${pointP.y})`}
          tabIndex={0}
          role="slider"
          aria-label="External point P"
          aria-valuemin={0}
          aria-valuemax={180}
          aria-valuenow={sliderAngle}
          aria-valuetext={`Angle at P ${sliderAngle} degrees`}
          onKeyDown={nudge}
          onPointerDown={(event) => {
            setDragging(true)
            svgRef.current?.setPointerCapture(event.pointerId)
            reportInteraction()
          }}
        >
          <circle className="diagram__hit" r={24} />
          <circle r={13} />
          <text y={5}>P</text>
        </g>
      </svg>

      {showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>{'\u2220P'}</dt>
            <dd className="is-angle">{formatDegrees(angleAtP)}</dd>
          </div>
          <div>
            <dt>far arc</dt>
            <dd className="is-central">{formatDegrees(farMeasure)}</dd>
          </div>
          <div>
            <dt>near arc</dt>
            <dd className="is-central">{formatDegrees(nearMeasure)}</dd>
          </div>
          <div>
            <dt>{'\u00BD(far \u2212 near)'}</dt>
            <dd className="is-sum">{formatDegrees(halfDifference)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

// The shorter arc between two points on the circle, as a drawable path.
function minorArcPath(c: Circle, p1: Point, p2: Point): string {
  const a1 = angleFromCenter(c, p1)
  const a2 = angleFromCenter(c, p2)
  const ccw = normalizeDegrees(a2 - a1)
  const start = ccw <= 180 ? a1 : a2
  const sweep = ccw <= 180 ? ccw : 360 - ccw
  return arcPath(c, start, sweep)
}

function formatDegrees(value: number | null): string {
  return value === null ? '\u2014' : `${Math.round(value)}\u00B0`
}

function SecantStaticFigure({
  farArc,
  nearArc,
  unknown,
  tint = false,
}: {
  farArc: number
  nearArc: number
  unknown?: 'angle' | 'far' | 'near'
  tint?: boolean
}) {
  const alpha = nearArc / 2
  const beta = farArc / 2
  const { circle, p: fitted } = fitStaticCircle(alpha, beta)

  const nUpper = pointOnCircle(circle, normalizeDegrees(-alpha))
  const nLower = pointOnCircle(circle, alpha)
  const fUpper = pointOnCircle(circle, 180 + beta)
  const fLower = pointOnCircle(circle, 180 - beta)
  const p = lineIntersection(nUpper, fUpper, nLower, fLower) ?? fitted

  const farArcPath = arcPath(circle, 180 - beta, 2 * beta)
  const nearArcPath = arcPath(circle, normalizeDegrees(-alpha), 2 * alpha)

  const angleText = unknown === 'angle' ? '?' : `${(farArc - nearArc) / 2}\u00B0`
  const farText = unknown === 'far' ? '?' : `${farArc}\u00B0`
  const nearText = unknown === 'near' ? '?' : `${nearArc}\u00B0`

  const angleLabelPos = bisectorPoint(p, fUpper, fLower, 26)
  const farLabelPos = pointOnCircle({ center: circle.center, radius: circle.radius - 26 }, 180)
  const nearLabelPos = pointOnCircle({ center: circle.center, radius: circle.radius - 26 }, 0)

  const dots = [nUpper, nLower, fUpper, fLower]
  const staticAngle = (farArc - nearArc) / 2
  const ariaLabel = `Two secants from an external point P to a circle. The far arc is ${farArc} degrees, the near arc is ${nearArc} degrees, and the angle at P is ${staticAngle} degrees, half their difference.`

  return (
    <div className="diagram">
      <svg className="diagram__svg" viewBox="0 0 360 360" role="img" aria-label={ariaLabel}>
        <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

        <path
          className="diagram__angle-fill"
          style={tint ? tintAngleFill : undefined}
          d={angleSectorPath(p, fUpper, fLower, wedgeRadius)}
        />

        <line className="diagram__chord" x1={p.x} y1={p.y} x2={fUpper.x} y2={fUpper.y} />
        <line className="diagram__chord" x1={p.x} y1={p.y} x2={fLower.x} y2={fLower.y} />

        <path className="diagram__central" style={tint ? tintFar : undefined} d={farArcPath} />
        <path className="diagram__central" style={tint ? tintNear : undefined} d={nearArcPath} />

        <path
          className="diagram__angle"
          style={tint ? tintAngleStroke : undefined}
          d={angleArcPath(p, fUpper, fLower, wedgeRadius)}
        />

        {dots.map((dot) => (
          <g
            key={`${dot.x.toFixed(1)}:${dot.y.toFixed(1)}`}
            className="diagram__point"
            transform={`translate(${dot.x} ${dot.y})`}
          >
            <circle r={5} />
          </g>
        ))}

        <g className="diagram__point" transform={`translate(${p.x} ${p.y})`}>
          <circle r={5} />
          <text x={10} y={-10}>
            P
          </text>
        </g>

        <text
          className="diagram__value is-angle"
          style={tint ? tintAngleText : undefined}
          x={angleLabelPos.x}
          y={angleLabelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {angleText}
        </text>
        <text
          className="diagram__value is-central"
          style={tint ? tintFarText : undefined}
          x={farLabelPos.x}
          y={farLabelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {farText}
        </text>
        <text
          className="diagram__value is-central"
          style={tint ? tintNearText : undefined}
          x={nearLabelPos.x}
          y={nearLabelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {nearText}
        </text>
      </svg>
    </div>
  )
}
