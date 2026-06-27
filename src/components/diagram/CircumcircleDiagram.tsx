import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { type Circle, type Point, distance, pointOnCircle } from '../../engine/geometry'
import { tokenColorVar } from '../lesson/palette'
import './CircleDiagram.css'

// Colour-matched (tint) styles: the equal radii OA = OB = OC = green, and the
// three perpendicular bisectors = orange.
const tintRadius = { stroke: tokenColorVar('green') }
const tintRadiusText = { fill: tokenColorVar('green') }
const tintBisector = { stroke: tokenColorVar('orange') }

type CircumcircleDiagramProps = {
  interactive?: boolean
  showReadout?: boolean
  kind?: 'general' | 'right'
  hypLabel?: string
  radiusLabel?: string
  /** Colour-match: the equal radii OA = OB = OC = green, perpendicular bisectors = orange. */
  tint?: boolean
  onInteract?: () => void
}

type PointId = 'a' | 'b' | 'c'
type Vertices = Record<PointId, Point>

const bounds = { min: 40, max: 320 }
const minSeparation = 56
const keyboardStep = 4
const bisectorHalfLength = 240
const displayScale = 40
const placeholder = '\u2013'

const pointIds: PointId[] = ['a', 'b', 'c']
const vertexLabels: Record<PointId, string> = { a: 'A', b: 'B', c: 'C' }

const initialVertices: Vertices = {
  a: { x: 180, y: 70 },
  b: { x: 90, y: 250 },
  c: { x: 285, y: 240 },
}

const staticCircle: Circle = { center: { x: 180, y: 185 }, radius: 120 }

function clampToBounds(value: number): number {
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function midpoint(p: Point, q: Point): Point {
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
}

// Place a label just outside `point`, pushing away from `center`.
function outwardPos(point: Point, center: Point, dist: number): Point {
  const dir = unit(center, point)
  return { x: point.x + dir.x * dist, y: point.y + dir.y * dist }
}

// Circumcircle through the three points, or null when they are collinear.
function circumcircleOf(a: Point, b: Point, c: Point): { center: Point; radius: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-9) {
    return null
  }
  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d
  const center = { x: ux, y: uy }
  return { center, radius: distance(center, a) }
}

// Keep a near-degenerate triangle from drawing an enormous off-screen circle.
function isSaneCircle(circ: { center: Point; radius: number }): boolean {
  return (
    Number.isFinite(circ.radius) &&
    circ.radius < 6000 &&
    Math.abs(circ.center.x) < 6000 &&
    Math.abs(circ.center.y) < 6000
  )
}

// Long segment along the perpendicular bisector of P-Q, centered on its midpoint.
function perpendicularBisector(p: Point, q: Point, half: number): { from: Point; to: Point } {
  const mid = midpoint(p, q)
  const dir = unit(p, q)
  const perp = { x: -dir.y, y: dir.x }
  return {
    from: { x: mid.x - perp.x * half, y: mid.y - perp.y * half },
    to: { x: mid.x + perp.x * half, y: mid.y + perp.y * half },
  }
}

// Small square tucked into the right-angle corner at `vertex`.
function rightAnglePath(vertex: Point, toward1: Point, toward2: Point, size: number): string {
  const u = unit(vertex, toward1)
  const w = unit(vertex, toward2)
  const c1 = { x: vertex.x + u.x * size, y: vertex.y + u.y * size }
  const c2 = { x: vertex.x + (u.x + w.x) * size, y: vertex.y + (u.y + w.y) * size }
  const c3 = { x: vertex.x + w.x * size, y: vertex.y + w.y * size }
  return `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y} L ${c3.x} ${c3.y}`
}

// Reject a move that would push two vertices closer than the minimum separation.
function placeVertex(current: Vertices, id: PointId, target: Point): Vertices {
  for (const other of pointIds) {
    if (other !== id && distance(target, current[other]) < minSeparation) {
      return current
    }
  }
  return { ...current, [id]: target }
}

export function CircumcircleDiagram({
  interactive = false,
  showReadout = true,
  kind = 'general',
  hypLabel,
  radiusLabel,
  tint = false,
  onInteract,
}: CircumcircleDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [vertices, setVertices] = useState<Vertices>(initialVertices)
  const [active, setActive] = useState<PointId | null>(null)
  const hasInteracted = useRef(false)
  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<{ id: PointId; clientX: number; clientY: number } | null>(null)

  const reportInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  // Throttle pointer-driven updates to one per animation frame so dragging stays
  // smooth even when pointermove fires faster than the display refreshes.
  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  function moveActiveTo(id: PointId, clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()
    if (!svg || !screenMatrix) {
      return
    }
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor = svgPoint.matrixTransform(screenMatrix.inverse())
    const target = { x: Math.round(clampToBounds(cursor.x)), y: Math.round(clampToBounds(cursor.y)) }
    setVertices((current) => placeVertex(current, id, target))
  }

  function flushMove() {
    frameRef.current = null
    const pending = pendingRef.current
    if (pending) {
      moveActiveTo(pending.id, pending.clientX, pending.clientY)
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!active) {
      return
    }
    pendingRef.current = { id: active, clientX: event.clientX, clientY: event.clientY }
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
      moveActiveTo(pendingRef.current.id, pendingRef.current.clientX, pendingRef.current.clientY)
      pendingRef.current = null
    }
    setActive(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function nudge(id: PointId, event: KeyboardEvent<SVGGElement>) {
    const delta = { x: 0, y: 0 }
    switch (event.key) {
      case 'ArrowRight':
        delta.x = keyboardStep
        break
      case 'ArrowLeft':
        delta.x = -keyboardStep
        break
      case 'ArrowUp':
        delta.y = -keyboardStep
        break
      case 'ArrowDown':
        delta.y = keyboardStep
        break
      default:
        return
    }
    event.preventDefault()
    setVertices((current) =>
      placeVertex(current, id, {
        x: clampToBounds(current[id].x + delta.x),
        y: clampToBounds(current[id].y + delta.y),
      }),
    )
    reportInteraction()
  }

  if (!interactive) {
    const center = staticCircle.center

    if (kind === 'right') {
      const a = { x: center.x - staticCircle.radius, y: center.y }
      const b = { x: center.x + staticCircle.radius, y: center.y }
      const c = pointOnCircle(staticCircle, 305)
      const verts: Vertices = { a, b, c }
      const hypMid = midpoint(a, b)
      const radiusMid = midpoint(center, c)
      const ariaLabel =
        'Right triangle ABC inscribed in a circle. Its hypotenuse AB is a diameter through the center O, and the right angle sits at C, so the circumradius is half the hypotenuse.'

      return (
        <div className="diagram">
          <svg className="diagram__svg" viewBox="0 0 360 360" role="img" aria-label={ariaLabel}>
            <polygon
              className="diagram__central-fill"
              points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
            />
            <circle className="diagram__circle" cx={center.x} cy={center.y} r={staticCircle.radius} />

            <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line className="diagram__chord" x1={b.x} y1={b.y} x2={c.x} y2={c.y} />
            <line className="diagram__chord" x1={c.x} y1={c.y} x2={a.x} y2={a.y} />

            <line className="diagram__radius" style={tint ? tintRadius : undefined} x1={center.x} y1={center.y} x2={c.x} y2={c.y} />
            <path className="diagram__chord" fill="none" d={rightAnglePath(c, a, b, 16)} />

            <g className="diagram__point" transform={`translate(${center.x} ${center.y})`}>
              <circle r={6} />
              <text x={-14} y={-6}>
                O
              </text>
            </g>

            {pointIds.map((id) => {
              const v = verts[id]
              const pos = outwardPos(v, center, 18)
              return (
                <g key={id} className="diagram__point" transform={`translate(${v.x} ${v.y})`}>
                  <circle r={6} />
                  <text x={pos.x - v.x} y={pos.y - v.y + 4}>
                    {vertexLabels[id]}
                  </text>
                </g>
              )
            })}

            {hypLabel && (
              <text
                className="diagram__value is-central"
                x={hypMid.x}
                y={hypMid.y + 22}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {hypLabel}
              </text>
            )}

            {radiusLabel && (
              <text
                className="diagram__value is-central"
                style={tint ? tintRadiusText : undefined}
                x={radiusMid.x + 10}
                y={radiusMid.y - 2}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {radiusLabel}
              </text>
            )}
          </svg>
        </div>
      )
    }

    const verts: Vertices = {
      a: pointOnCircle(staticCircle, 250),
      b: pointOnCircle(staticCircle, 330),
      c: pointOnCircle(staticCircle, 110),
    }
    const radiusMid = midpoint(center, verts.b)
    const ariaLabel =
      'Acute triangle ABC with all three vertices on its circumscribed circle. The circumcenter O lies inside the triangle, equidistant from A, B, and C.'

    return (
      <div className="diagram">
        <svg className="diagram__svg" viewBox="0 0 360 360" role="img" aria-label={ariaLabel}>
          <polygon
            className="diagram__central-fill"
            points={`${verts.a.x},${verts.a.y} ${verts.b.x},${verts.b.y} ${verts.c.x},${verts.c.y}`}
          />
          <circle className="diagram__circle" cx={center.x} cy={center.y} r={staticCircle.radius} />

          <line className="diagram__chord" x1={verts.a.x} y1={verts.a.y} x2={verts.b.x} y2={verts.b.y} />
          <line className="diagram__chord" x1={verts.b.x} y1={verts.b.y} x2={verts.c.x} y2={verts.c.y} />
          <line className="diagram__chord" x1={verts.c.x} y1={verts.c.y} x2={verts.a.x} y2={verts.a.y} />

          {pointIds.map((id) => (
            <line
              key={`radius-${id}`}
              className="diagram__radius"
              style={tint ? tintRadius : undefined}
              x1={center.x}
              y1={center.y}
              x2={verts[id].x}
              y2={verts[id].y}
            />
          ))}

          <g className="diagram__point" transform={`translate(${center.x} ${center.y})`}>
            <circle r={6} />
            <text x={13} y={4}>
              O
            </text>
          </g>

          {pointIds.map((id) => {
            const v = verts[id]
            const pos = outwardPos(v, center, 18)
            return (
              <g key={id} className="diagram__point" transform={`translate(${v.x} ${v.y})`}>
                <circle r={6} />
                <text x={pos.x - v.x} y={pos.y - v.y + 4}>
                  {vertexLabels[id]}
                </text>
              </g>
            )
          })}

          {radiusLabel && (
            <text
              className="diagram__value is-central"
              style={tint ? tintRadiusText : undefined}
              x={radiusMid.x + 6}
              y={radiusMid.y - 8}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {radiusLabel}
            </text>
          )}
        </svg>
      </div>
    )
  }

  const circ = circumcircleOf(vertices.a, vertices.b, vertices.c)
  const showCircle = circ !== null && isSaneCircle(circ)
  const trianglePoints = `${vertices.a.x},${vertices.a.y} ${vertices.b.x},${vertices.b.y} ${vertices.c.x},${vertices.c.y}`
  const sides: { id: string; p: Point; q: Point }[] = [
    { id: 'ab', p: vertices.a, q: vertices.b },
    { id: 'bc', p: vertices.b, q: vertices.c },
    { id: 'ca', p: vertices.c, q: vertices.a },
  ]
  const readout =
    showCircle && circ
      ? {
          a: (distance(circ.center, vertices.a) / displayScale).toFixed(1),
          b: (distance(circ.center, vertices.b) / displayScale).toFixed(1),
          c: (distance(circ.center, vertices.c) / displayScale).toFixed(1),
        }
      : { a: placeholder, b: placeholder, c: placeholder }

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
        <polygon className="diagram__central-fill" points={trianglePoints} />

        {showCircle && circ && (
          <circle className="diagram__circle" cx={circ.center.x} cy={circ.center.y} r={circ.radius} />
        )}

        <line className="diagram__chord" x1={vertices.a.x} y1={vertices.a.y} x2={vertices.b.x} y2={vertices.b.y} />
        <line className="diagram__chord" x1={vertices.b.x} y1={vertices.b.y} x2={vertices.c.x} y2={vertices.c.y} />
        <line className="diagram__chord" x1={vertices.c.x} y1={vertices.c.y} x2={vertices.a.x} y2={vertices.a.y} />

        {showCircle && circ && (
          <>
            {sides.map((side) => {
              const pb = perpendicularBisector(side.p, side.q, bisectorHalfLength)
              return (
                <line
                  key={`bisector-${side.id}`}
                  className="diagram__base"
                  style={tint ? tintBisector : undefined}
                  x1={pb.from.x}
                  y1={pb.from.y}
                  x2={pb.to.x}
                  y2={pb.to.y}
                />
              )
            })}

            {pointIds.map((id) => (
              <line
                key={`radius-${id}`}
                className="diagram__radius"
                style={tint ? tintRadius : undefined}
                x1={circ.center.x}
                y1={circ.center.y}
                x2={vertices[id].x}
                y2={vertices[id].y}
              />
            ))}

            <g className="diagram__point" transform={`translate(${circ.center.x} ${circ.center.y})`}>
              <circle r={6} />
              <text x={12} y={4}>
                O
              </text>
            </g>
          </>
        )}

        {pointIds.map((id) => (
          <g
            key={id}
            className="diagram__handle"
            transform={`translate(${vertices[id].x} ${vertices[id].y})`}
            tabIndex={0}
            role="button"
            aria-label={`Vertex ${vertexLabels[id]}, drag or use arrow keys to move`}
            onKeyDown={(event) => nudge(id, event)}
            onPointerDown={(event) => {
              setActive(id)
              svgRef.current?.setPointerCapture(event.pointerId)
              moveActiveTo(id, event.clientX, event.clientY)
            }}
          >
            <circle className="diagram__hit" r={24} />
            <circle r={14} />
            <text y={5}>{vertexLabels[id]}</text>
          </g>
        ))}
      </svg>

      {showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>O{vertexLabels.a}</dt>
            <dd className="is-central">{readout.a}</dd>
          </div>
          <div>
            <dt>O{vertexLabels.b}</dt>
            <dd className="is-central">{readout.b}</dd>
          </div>
          <div>
            <dt>O{vertexLabels.c}</dt>
            <dd className="is-central">{readout.c}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
