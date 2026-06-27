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

// Colour-matched (tint) styles: tangent = orange, radius = blue, chord = magenta, arc = teal.
const tintTangent = { stroke: tokenColorVar('orange') }
const tintRadius = { stroke: tokenColorVar('blue') }
const tintChord = { stroke: tokenColorVar('magenta') }
const tintArc = { stroke: tokenColorVar('teal') }

// Radius/chord static figures and the interactive figure share this circle.
const mainCircle: Circle = {
  center: { x: 180, y: 180 },
  radius: 110,
}

// The two-tangent static figure uses a smaller circle pushed up so the external
// point P (always straight below by symmetry) stays inside the viewBox.
const pairCircle: Circle = {
  center: { x: 180, y: 146 },
  radius: 84,
}

const viewSize = 360
const margin = 16
// P must sit this far outside the rim so two real tangents always exist.
const minGap = 12
const nudgeStep = 6

// Render lengths as if the radius were ten units, so the live tangent lengths
// read as friendly one-decimal numbers instead of raw pixels.
const displayRadius = 10
const lengthScale = mainCircle.radius / displayRadius

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function unitToward(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// Heading of the ray from `from` to `to`, in the same 0deg=right, 90deg=down
// convention as pointOnCircle, so labels can be placed along the ray.
function directionDegrees(from: Point, to: Point): number {
  return normalizeDegrees((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI)
}

// L-shaped square corner marking a right angle, with its vertex at `corner` and
// its legs running toward the two (perpendicular) points.
function rightAngleMarker(corner: Point, toward1: Point, toward2: Point, size: number): string {
  const u1 = unitToward(corner, toward1)
  const u2 = unitToward(corner, toward2)
  const p1 = { x: corner.x + u1.x * size, y: corner.y + u1.y * size }
  const p2 = { x: corner.x + (u1.x + u2.x) * size, y: corner.y + (u1.y + u2.y) * size }
  const p3 = { x: corner.x + u2.x * size, y: corner.y + u2.y * size }
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
}

type ExternalTangents = {
  t1: Point
  t2: Point
  base: number
  spread: number
}

// The two points where tangents from an external point touch the circle. With
// d = |OP| > r, both touch points sit at angleFromCenter(P) +/- acos(r/d).
function externalTangentPoints(circle: Circle, external: Point): ExternalTangents | null {
  const d = distance(circle.center, external)
  if (d <= circle.radius) {
    return null
  }
  const base = angleFromCenter(circle, external)
  const spread = (Math.acos(circle.radius / d) * 180) / Math.PI
  return {
    t1: pointOnCircle(circle, base + spread),
    t2: pointOnCircle(circle, base - spread),
    base,
    spread,
  }
}

type TangentDiagramProps = {
  interactive?: boolean
  showReadout?: boolean
  kind?: 'radius' | 'chord' | 'pair'
  arc?: number
  unknown?: 'angle' | 'arc'
  /** Colour-match the marks: tangent = orange, radius = blue, chord = magenta, arc = teal. */
  tint?: boolean
  onInteract?: () => void
}

export function TangentDiagram({
  interactive = false,
  showReadout = true,
  kind = 'chord',
  arc = 120,
  unknown,
  tint = false,
  onInteract,
}: TangentDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [external, setExternal] = useState<Point>({ x: 180, y: 320 })
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

  // Keep P inside the viewBox but always outside the rim; project inward moves
  // back out onto the minimum-gap circle so it slides along the boundary.
  const clampExternal = useCallback((point: Point): Point => {
    const x = clamp(point.x, margin, viewSize - margin)
    const y = clamp(point.y, margin, viewSize - margin)
    const o = mainCircle.center
    const dx = x - o.x
    const dy = y - o.y
    const d = Math.hypot(dx, dy)
    const minDistance = mainCircle.radius + minGap
    if (d < minDistance) {
      const ux = d < 1e-6 ? 0 : dx / d
      const uy = d < 1e-6 ? 1 : dy / d
      return { x: Math.round(o.x + ux * minDistance), y: Math.round(o.y + uy * minDistance) }
    }
    return { x: Math.round(x), y: Math.round(y) }
  }, [])

  const moveTo = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      const matrix = svg?.getScreenCTM()
      if (!svg || !matrix) {
        return
      }
      const svgPoint = svg.createSVGPoint()
      svgPoint.x = clientX
      svgPoint.y = clientY
      const cursor = svgPoint.matrixTransform(matrix.inverse())
      setExternal(clampExternal({ x: cursor.x, y: cursor.y }))
    },
    [clampExternal],
  )

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
    const offsets: Record<string, Point> = {
      ArrowUp: { x: 0, y: -nudgeStep },
      ArrowDown: { x: 0, y: nudgeStep },
      ArrowLeft: { x: -nudgeStep, y: 0 },
      ArrowRight: { x: nudgeStep, y: 0 },
    }
    const offset = offsets[event.key]
    if (!offset) {
      return
    }
    event.preventDefault()
    setExternal((current) => clampExternal({ x: current.x + offset.x, y: current.y + offset.y }))
    reportInteraction()
  }

  if (!interactive) {
    if (kind === 'radius') {
      return <RadiusFigure tint={tint} />
    }
    if (kind === 'pair') {
      return <PairFigure arc={arc} unknown={unknown} tint={tint} />
    }
    return <ChordFigure arc={arc} unknown={unknown} tint={tint} />
  }

  const tangents = externalTangentPoints(mainCircle, external)
  const pt1 = tangents ? distance(external, tangents.t1) : 0
  const pt2 = tangents ? distance(external, tangents.t2) : 0
  const angleAtP = tangents ? angleBetweenPoints(external, tangents.t1, tangents.t2) : 0
  const nearArcAngle = tangents ? angleBetweenPoints(mainCircle.center, tangents.t1, tangents.t2) : 0
  const t1Label = tangents
    ? pointOnCircle({ center: mainCircle.center, radius: mainCircle.radius + 18 }, tangents.base + tangents.spread)
    : mainCircle.center
  const t2Label = tangents
    ? pointOnCircle({ center: mainCircle.center, radius: mainCircle.radius + 18 }, tangents.base - tangents.spread)
    : mainCircle.center

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
        <circle
          className="diagram__circle"
          cx={mainCircle.center.x}
          cy={mainCircle.center.y}
          r={mainCircle.radius}
        />

        {tangents && (
          <>
            <path
              className="diagram__angle-fill"
              d={angleSectorPath(external, tangents.t1, tangents.t2, 40)}
            />

            <line
              className="diagram__radius"
              style={tint ? tintRadius : undefined}
              x1={mainCircle.center.x}
              y1={mainCircle.center.y}
              x2={tangents.t1.x}
              y2={tangents.t1.y}
            />
            <line
              className="diagram__radius"
              style={tint ? tintRadius : undefined}
              x1={mainCircle.center.x}
              y1={mainCircle.center.y}
              x2={tangents.t2.x}
              y2={tangents.t2.y}
            />

            <line
              className="diagram__chord"
              style={tint ? tintTangent : undefined}
              x1={external.x}
              y1={external.y}
              x2={tangents.t1.x}
              y2={tangents.t1.y}
            />
            <line
              className="diagram__chord"
              style={tint ? tintTangent : undefined}
              x1={external.x}
              y1={external.y}
              x2={tangents.t2.x}
              y2={tangents.t2.y}
            />

            <path
              className="diagram__central"
              style={tint ? tintArc : undefined}
              d={arcPath(mainCircle, tangents.base - tangents.spread, tangents.spread * 2)}
            />

            <path
              className="diagram__angle"
              d={angleArcPath(external, tangents.t1, tangents.t2, 40)}
            />

            <path
              className="diagram__chord"
              fill="none"
              d={rightAngleMarker(tangents.t1, mainCircle.center, external, 10)}
            />
            <path
              className="diagram__chord"
              fill="none"
              d={rightAngleMarker(tangents.t2, mainCircle.center, external, 10)}
            />
          </>
        )}

        <g className="diagram__center">
          <circle cx={mainCircle.center.x} cy={mainCircle.center.y} r={4} />
          <text x={mainCircle.center.x - 13} y={mainCircle.center.y - 4}>
            O
          </text>
        </g>

        {tangents && (
          <>
            <g className="diagram__point" transform={`translate(${tangents.t1.x} ${tangents.t1.y})`}>
              <circle r={6} />
              <text x={t1Label.x - tangents.t1.x} y={t1Label.y - tangents.t1.y + 4}>
                {'T\u2081'}
              </text>
            </g>
            <g className="diagram__point" transform={`translate(${tangents.t2.x} ${tangents.t2.y})`}>
              <circle r={6} />
              <text x={t2Label.x - tangents.t2.x} y={t2Label.y - tangents.t2.y + 4}>
                {'T\u2082'}
              </text>
            </g>
          </>
        )}

        <g
          className="diagram__handle is-accent"
          transform={`translate(${external.x} ${external.y})`}
          tabIndex={0}
          role="slider"
          aria-label="External point P"
          aria-valuemin={0}
          aria-valuemax={180}
          aria-valuenow={Math.round(angleAtP)}
          aria-valuetext={`${Math.round(angleAtP)} degrees between the tangents`}
          onKeyDown={nudge}
          onPointerDown={(event) => {
            setDragging(true)
            svgRef.current?.setPointerCapture(event.pointerId)
            moveTo(event.clientX, event.clientY)
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
            <dt>{'PT\u2081'}</dt>
            <dd className="is-central">{(pt1 / lengthScale).toFixed(1)}</dd>
          </div>
          <div>
            <dt>{'PT\u2082'}</dt>
            <dd className="is-central">{(pt2 / lengthScale).toFixed(1)}</dd>
          </div>
          <div>
            <dt>angle at P</dt>
            <dd className="is-angle">{Math.round(angleAtP)}&deg;</dd>
          </div>
          <div>
            <dt>near arc</dt>
            <dd className="is-central">{Math.round(nearArcAngle)}&deg;</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function RadiusFigure({ tint = false }: { tint?: boolean }) {
  const circle = mainCircle
  const t = pointOnCircle(circle, 90)
  const marker = rightAngleMarker(t, circle.center, { x: t.x + 20, y: t.y }, 15)

  return (
    <svg
      className="diagram__svg"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A radius drawn to the point of tangency T, meeting the tangent line at a right angle."
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      <line className="diagram__radius" style={tint ? tintRadius : undefined} x1={circle.center.x} y1={circle.center.y} x2={t.x} y2={t.y} />
      <line className="diagram__chord" style={tint ? tintTangent : undefined} x1={70} y1={t.y} x2={290} y2={t.y} />
      <path className="diagram__chord" fill="none" d={marker} />

      <g className="diagram__center">
        <circle cx={circle.center.x} cy={circle.center.y} r={4} />
        <text x={circle.center.x - 13} y={circle.center.y - 4}>
          O
        </text>
      </g>

      <text className="diagram__term" style={tint ? { fill: tokenColorVar('blue') } : undefined} x={216} y={239} textAnchor="middle">
        radius
      </text>
      <text className="diagram__term" style={tint ? { fill: tokenColorVar('orange') } : undefined} x={246} y={312} textAnchor="middle">
        tangent
      </text>

      <g className="diagram__point" transform={`translate(${t.x} ${t.y})`}>
        <circle r={6} />
        <text x={0} y={24}>
          T
        </text>
      </g>
    </svg>
  )
}

function ChordFigure({ arc, unknown, tint = false }: { arc: number; unknown?: 'angle' | 'arc'; tint?: boolean }) {
  const circle = mainCircle
  const t = pointOnCircle(circle, 90)
  const aDegrees = 90 + arc
  const a = pointOnCircle(circle, aDegrees)
  // The tangent ray opening toward arc TA runs left from T; the wedge between it
  // and the chord is the tangent-chord angle, equal to half of arc TA.
  const tangentRayPoint = { x: t.x - 50, y: t.y }
  const wedgeRadius = 34
  const chordDegrees = directionDegrees(t, a)
  const bisectorDegrees = (180 + chordDegrees) / 2
  const angleLabelPos = pointOnCircle({ center: t, radius: wedgeRadius + 22 }, bisectorDegrees)
  const arcLabelPos = pointOnCircle({ center: circle.center, radius: circle.radius + 22 }, 90 + arc / 2)
  const aLabelPos = pointOnCircle({ center: circle.center, radius: circle.radius + 18 }, aDegrees)
  const angleText = unknown === 'angle' ? '?' : `${arc / 2}\u00B0`
  const arcText = unknown === 'arc' ? '?' : `${arc}\u00B0`

  return (
    <svg
      className="diagram__svg"
      viewBox="0 0 360 360"
      role="img"
      aria-label={`A tangent-chord angle at the point of tangency T, equal to half of its intercepted arc of ${arc} degrees.`}
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      <path className="diagram__angle-fill" d={angleSectorPath(t, tangentRayPoint, a, wedgeRadius)} />

      <line className="diagram__chord" style={tint ? tintTangent : undefined} x1={70} y1={t.y} x2={290} y2={t.y} />
      <line className="diagram__chord" style={tint ? tintChord : undefined} x1={t.x} y1={t.y} x2={a.x} y2={a.y} />

      <path className="diagram__central" style={tint ? tintArc : undefined} d={arcPath(circle, 90, arc)} />
      <path className="diagram__angle" d={angleArcPath(t, tangentRayPoint, a, wedgeRadius)} />

      <g className="diagram__center">
        <circle cx={circle.center.x} cy={circle.center.y} r={4} />
        <text x={circle.center.x - 13} y={circle.center.y - 4}>
          O
        </text>
      </g>

      <g className="diagram__point" transform={`translate(${t.x} ${t.y})`}>
        <circle r={6} />
        <text x={0} y={24}>
          T
        </text>
      </g>
      <g className="diagram__point" transform={`translate(${a.x} ${a.y})`}>
        <circle r={6} />
        <text x={aLabelPos.x - a.x} y={aLabelPos.y - a.y + 4}>
          A
        </text>
      </g>

      <text
        className="diagram__value is-angle"
        x={angleLabelPos.x}
        y={angleLabelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {angleText}
      </text>
      <text
        className="diagram__value is-central"
        x={arcLabelPos.x}
        y={arcLabelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {arcText}
      </text>
    </svg>
  )
}

function PairFigure({ arc, unknown, tint = false }: { arc: number; unknown?: 'angle' | 'arc'; tint?: boolean }) {
  const circle = pairCircle
  const deg1 = 90 - arc / 2
  const deg2 = 90 + arc / 2
  const t1 = pointOnCircle(circle, deg1)
  const t2 = pointOnCircle(circle, deg2)
  // Each tangent is perpendicular to its radius; the external point is where the
  // two tangent lines cross.
  const apex = lineIntersection(
    t1,
    pointOnCircle({ center: t1, radius: 140 }, deg1 + 90),
    t2,
    pointOnCircle({ center: t2, radius: 140 }, deg2 + 90),
  )
  const wedgeRadius = 42
  const angleText = unknown === 'angle' ? '?' : `${180 - arc}\u00B0`
  const arcText = unknown === 'arc' ? '?' : `${arc}\u00B0`
  const t1Label = pointOnCircle({ center: circle.center, radius: circle.radius + 18 }, deg1)
  const t2Label = pointOnCircle({ center: circle.center, radius: circle.radius + 18 }, deg2)
  const arcLabelPos = pointOnCircle({ center: circle.center, radius: circle.radius - 22 }, 90)
  const angleLabelPos = apex
    ? pointOnCircle({ center: apex, radius: wedgeRadius + 24 }, directionDegrees(apex, circle.center))
    : circle.center

  return (
    <svg
      className="diagram__svg"
      viewBox="0 0 360 360"
      role="img"
      aria-label={`Two tangents from an external point P meeting at ${180 - arc} degrees, with a near arc of ${arc} degrees between the points of tangency.`}
    >
      <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

      {apex && (
        <path className="diagram__angle-fill" d={angleSectorPath(apex, t1, t2, wedgeRadius)} />
      )}

      <path className="diagram__central" style={tint ? tintArc : undefined} d={arcPath(circle, deg1, arc)} />

      {apex && (
        <>
          <line className="diagram__chord" style={tint ? tintTangent : undefined} x1={apex.x} y1={apex.y} x2={t1.x} y2={t1.y} />
          <line className="diagram__chord" style={tint ? tintTangent : undefined} x1={apex.x} y1={apex.y} x2={t2.x} y2={t2.y} />
          <path className="diagram__angle" d={angleArcPath(apex, t1, t2, wedgeRadius)} />
        </>
      )}

      <g className="diagram__center">
        <circle cx={circle.center.x} cy={circle.center.y} r={4} />
        <text x={circle.center.x - 13} y={circle.center.y - 4}>
          O
        </text>
      </g>

      <g className="diagram__point" transform={`translate(${t1.x} ${t1.y})`}>
        <circle r={6} />
        <text x={t1Label.x - t1.x} y={t1Label.y - t1.y + 4}>
          {'T\u2081'}
        </text>
      </g>
      <g className="diagram__point" transform={`translate(${t2.x} ${t2.y})`}>
        <circle r={6} />
        <text x={t2Label.x - t2.x} y={t2Label.y - t2.y + 4}>
          {'T\u2082'}
        </text>
      </g>

      {apex && (
        <g className="diagram__point" transform={`translate(${apex.x} ${apex.y})`}>
          <circle r={6} />
          <text x={0} y={22}>
            P
          </text>
        </g>
      )}

      <text
        className="diagram__value is-central"
        x={arcLabelPos.x}
        y={arcLabelPos.y}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {arcText}
      </text>
      {apex && (
        <text
          className="diagram__value is-angle"
          x={angleLabelPos.x}
          y={angleLabelPos.y}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {angleText}
        </text>
      )}
    </svg>
  )
}
