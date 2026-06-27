import {
  type KeyboardEvent,
  type PointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  type Point,
  angleArcPath,
  angleBetweenPoints,
  distance,
  triangleArea,
} from '../../engine/geometry'
import { type TokenColor, tokenColorVar } from '../lesson/palette'
import './CircleDiagram.css'
import './TriangleDiagram.css'

export type TrianglePointId = 'a' | 'b' | 'c'
export type TriangleVertices = Record<TrianglePointId, Point>

/** Exterior-angle figure: extend one side beyond a vertex and mark the outside angle. */
export type TriangleExterior = {
  /** Vertex at which the exterior angle is drawn. */
  at: TrianglePointId
  /** The side running from this vertex into `at` is the one extended beyond `at`. */
  from: TrianglePointId
  label?: string
  /** Optional palette colour for the exterior angle arc + label (e.g. "magenta"). */
  color?: TokenColor
}

export type TriangleDiagramProps = {
  /** Interactive mode: three draggable vertices with live angle readouts. */
  interactive?: boolean
  /** Draw each interior-angle arc and value (interactive). */
  showAngles?: boolean
  /** Label each side with its (scaled) length (interactive). */
  showSides?: boolean
  /** Add an Area readout (interactive). */
  showArea?: boolean
  /** Render the live readout panel (interactive). */
  showReadout?: boolean
  onInteract?: () => void
  /** Show a square marker at a right angle: auto-detected (interactive) or `rightAngleAt` (static). */
  showRightAngle?: boolean
  /** Static vertex positions in the 0..360 viewBox (falls back to a default triangle). */
  vertices?: TriangleVertices
  /** Per-vertex point labels (default A, B, C). */
  vertexLabels?: Partial<Record<TrianglePointId, string>>
  /** Static angle labels keyed by vertex (free text: "45\u00b0", "x", "?", ...). */
  angleLabels?: Partial<Record<TrianglePointId, string>>
  /** Static side labels keyed by the opposite vertex (side a is opposite A = BC). */
  sideLabels?: Partial<Record<TrianglePointId, string>>
  /**
   * Colour each side (the edge line + its label) by palette token, keyed by the
   * OPPOSITE vertex (e.g. `{ a: 'blue', b: 'orange', c: 'green' }` colours sides
   * a/b/c). Omitted sides keep the default ink stroke, so it is backward compatible.
   */
  sideColors?: Partial<Record<TrianglePointId, TokenColor>>
  /** Colour each interior angle (arc + value) by palette token, keyed by vertex. */
  angleColors?: Partial<Record<TrianglePointId, TokenColor>>
  /** Colour the right-angle box by palette token (e.g. "green"). */
  rightAngleColor?: TokenColor
  /** Force a right-angle marker at this vertex (static). */
  rightAngleAt?: TrianglePointId
  /** Draw an exterior angle (static). */
  exterior?: TriangleExterior
  /** Overlay a similar triangle scaled by this factor about the centroid (static). */
  overlayScale?: number
  /** Label placed beside the similarity overlay. */
  overlayLabel?: string
  /** Colour the similarity overlay (outline + its label) by palette token, e.g. "orange". */
  overlayColor?: TokenColor
}

const bounds = { min: 40, max: 320 }
const minSeparation = 56
const keyboardStep = 4
const rightAngleTolerance = 1.5
const rightAngleSize = 16
const angleArcRadius = 30
const displayScale = 40

const defaultVertices: TriangleVertices = {
  a: { x: 180, y: 64 },
  b: { x: 70, y: 292 },
  c: { x: 300, y: 256 },
}

const pointIds: TrianglePointId[] = ['a', 'b', 'c']
const defaultLabels: Record<TrianglePointId, string> = { a: 'A', b: 'B', c: 'C' }

function clampToBounds(value: number): number {
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function centroid(v: TriangleVertices): Point {
  return { x: (v.a.x + v.b.x + v.c.x) / 3, y: (v.a.y + v.b.y + v.c.y) / 3 }
}

function interiorAngles(v: TriangleVertices): Record<TrianglePointId, number> {
  return {
    a: angleBetweenPoints(v.a, v.b, v.c),
    b: angleBetweenPoints(v.b, v.c, v.a),
    c: angleBetweenPoints(v.c, v.a, v.b),
  }
}

// Round each angle but keep the integer readouts summing to exactly 180 by
// folding the rounding residue into the largest angle (least visible there).
function roundAnglesToSum(raw: Record<TrianglePointId, number>): Record<TrianglePointId, number> {
  const rounded: Record<TrianglePointId, number> = {
    a: Math.round(raw.a),
    b: Math.round(raw.b),
    c: Math.round(raw.c),
  }
  const residue = 180 - (rounded.a + rounded.b + rounded.c)
  if (residue !== 0) {
    const largest = pointIds.reduce((max, id) => (raw[id] > raw[max] ? id : max), pointIds[0])
    rounded[largest] += residue
  }
  return rounded
}

// Square that sits inside a right-angle corner at `vertex`.
function rightAnglePath(vertex: Point, toward1: Point, toward2: Point, size: number): string {
  const u = unit(vertex, toward1)
  const w = unit(vertex, toward2)
  const c1 = { x: vertex.x + u.x * size, y: vertex.y + u.y * size }
  const c2 = { x: vertex.x + (u.x + w.x) * size, y: vertex.y + (u.y + w.y) * size }
  const c3 = { x: vertex.x + w.x * size, y: vertex.y + w.y * size }
  return `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y} L ${c3.x} ${c3.y}`
}

// Position along the interior bisector at `vertex`, used to place angle values.
function angleLabelPos(vertex: Point, toward1: Point, toward2: Point, dist: number): Point {
  const u = unit(vertex, toward1)
  const w = unit(vertex, toward2)
  const bx = u.x + w.x
  const by = u.y + w.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * dist, y: vertex.y + (by / length) * dist }
}

// Midpoint of a side nudged outward (away from the centroid) for a side label.
function sideLabelPos(p1: Point, p2: Point, away: Point, offset: number): Point {
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const dir = unit(away, mid)
  return { x: mid.x + dir.x * offset, y: mid.y + dir.y * offset }
}

function outwardPos(vertex: Point, center: Point, dist: number): Point {
  const dir = unit(center, vertex)
  return { x: vertex.x + dir.x * dist, y: vertex.y + dir.y * dist }
}

function scaleAbout(v: TriangleVertices, center: Point, factor: number): TriangleVertices {
  const apply = (p: Point): Point => ({
    x: center.x + (p.x - center.x) * factor,
    y: center.y + (p.y - center.y) * factor,
  })
  return { a: apply(v.a), b: apply(v.b), c: apply(v.c) }
}

// Reject a move that would collapse the triangle (vertices too close together).
function placeVertex(current: TriangleVertices, id: TrianglePointId, target: Point): TriangleVertices {
  for (const other of pointIds) {
    if (other !== id && distance(target, current[other]) < minSeparation) {
      return current
    }
  }
  return { ...current, [id]: target }
}

// Smallest centered square viewBox that holds every point plus `pad` on all
// sides, never smaller than the standard 360 box so figures keep a consistent
// scale. Used to frame static figures around their own content so any vertex
// set sits centered with even margins instead of drifting toward one edge.
function fitViewBox(points: Point[], pad: number): string {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const half = Math.max((maxX - minX) / 2, (maxY - minY) / 2) + pad
  const size = Math.max(360, half * 2)
  return `${cx - size / 2} ${cy - size / 2} ${size} ${size}`
}

export function TriangleDiagram({
  interactive = false,
  showAngles = true,
  showSides = false,
  showArea = false,
  showReadout = true,
  onInteract,
  showRightAngle = true,
  vertices: verticesProp,
  vertexLabels,
  angleLabels,
  sideLabels,
  sideColors,
  angleColors,
  rightAngleColor,
  rightAngleAt,
  exterior,
  overlayScale,
  overlayLabel,
  overlayColor,
}: TriangleDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragVertices, setDragVertices] = useState<TriangleVertices>(verticesProp ?? defaultVertices)
  const [active, setActive] = useState<TrianglePointId | null>(null)
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
  const pendingRef = useRef<{ id: TrianglePointId; clientX: number; clientY: number } | null>(null)

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  const vertices = interactive ? dragVertices : verticesProp ?? defaultVertices
  const labels = {
    a: vertexLabels?.a ?? defaultLabels.a,
    b: vertexLabels?.b ?? defaultLabels.b,
    c: vertexLabels?.c ?? defaultLabels.c,
  }

  const geometry = useMemo(() => {
    const raw = interiorAngles(vertices)
    return { raw, rounded: roundAnglesToSum(raw), center: centroid(vertices) }
  }, [vertices])

  const adjacent: Record<TrianglePointId, [Point, Point]> = {
    a: [vertices.b, vertices.c],
    b: [vertices.c, vertices.a],
    c: [vertices.a, vertices.b],
  }

  const sides: { id: TrianglePointId; p1: Point; p2: Point }[] = [
    { id: 'a', p1: vertices.b, p2: vertices.c },
    { id: 'b', p1: vertices.c, p2: vertices.a },
    { id: 'c', p1: vertices.a, p2: vertices.b },
  ]

  const rightAngleVertex: TrianglePointId | null = !showRightAngle
    ? null
    : interactive
      ? pointIds.find((id) => Math.abs(geometry.raw[id] - 90) <= rightAngleTolerance) ?? null
      : rightAngleAt ?? null

  const overlay =
    !interactive && overlayScale !== undefined ? scaleAbout(vertices, geometry.center, overlayScale) : null

  const exteriorGeom = (() => {
    if (interactive || !exterior) {
      return null
    }
    const vertex = vertices[exterior.at]
    const fromPoint = vertices[exterior.from]
    const thirdId = pointIds.filter((id) => id !== exterior.at && id !== exterior.from)[0]
    const thirdPoint = vertices[thirdId]
    const dir = unit(fromPoint, vertex)
    const end = { x: vertex.x + dir.x * 78, y: vertex.y + dir.y * 78 }
    return { vertex, end, thirdPoint, labelPos: angleLabelPos(vertex, end, thirdPoint, 40) }
  })()

  function moveActiveTo(id: TrianglePointId, clientX: number, clientY: number) {
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
    setDragVertices((current) => placeVertex(current, id, target))
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

  function nudge(id: TrianglePointId, event: KeyboardEvent<SVGGElement>) {
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
    setDragVertices((current) =>
      placeVertex(current, id, {
        x: clampToBounds(current[id].x + delta.x),
        y: clampToBounds(current[id].y + delta.y),
      }),
    )
    reportInteraction()
  }

  const trianglePoints = `${vertices.a.x},${vertices.a.y} ${vertices.b.x},${vertices.b.y} ${vertices.c.x},${vertices.c.y}`
  const angleSum = geometry.rounded.a + geometry.rounded.b + geometry.rounded.c
  const area = (triangleArea(vertices.a, vertices.b, vertices.c) / (displayScale * displayScale)).toFixed(1)

  const staticAriaLabel = `Triangle ${labels.a}${labels.b}${labels.c}${
    rightAngleVertex ? ` with a right angle at ${labels[rightAngleVertex]}` : ''
  }${overlay ? ', shown with a scaled similar triangle' : ''}`

  const svgModeProps: SVGProps<SVGSVGElement> = interactive
    ? { onPointerMove: handlePointerMove, onPointerUp: endDrag, onPointerCancel: endDrag }
    : { role: 'img', 'aria-label': staticAriaLabel }

  // The interactive figure keeps the fixed box so dragging never re-pans the
  // view; static figures frame themselves around their content (triangle plus
  // any overlay/exterior marks) so they stay centered for any vertex set.
  const framePoints: Point[] = [vertices.a, vertices.b, vertices.c]
  if (overlay) {
    framePoints.push(overlay.a, overlay.b, overlay.c)
  }
  if (exteriorGeom) {
    framePoints.push(exteriorGeom.end, exteriorGeom.labelPos)
  }
  const frameBox = interactive ? '0 0 360 360' : fitViewBox(framePoints, 36)

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className={interactive ? 'diagram__svg is-interactive' : 'diagram__svg'}
        viewBox={frameBox}
        {...svgModeProps}
      >
        <polygon className="triangle__fill" points={trianglePoints} />

        {overlay && (
          <polygon
            className="triangle__overlay"
            style={overlayColor ? { stroke: tokenColorVar(overlayColor) } : undefined}
            points={`${overlay.a.x},${overlay.a.y} ${overlay.b.x},${overlay.b.y} ${overlay.c.x},${overlay.c.y}`}
          />
        )}

        {sides.map(({ id, p1, p2 }) => {
          const color = sideColors?.[id]
          return (
            <line
              key={`edge-${id}`}
              className="diagram__chord"
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              style={color ? { stroke: tokenColorVar(color) } : undefined}
            />
          )
        })}

        {exteriorGeom && (
          <g>
            <line
              className="diagram__base"
              x1={exteriorGeom.vertex.x}
              y1={exteriorGeom.vertex.y}
              x2={exteriorGeom.end.x}
              y2={exteriorGeom.end.y}
            />
            <path
              className="diagram__angle"
              d={angleArcPath(exteriorGeom.vertex, exteriorGeom.end, exteriorGeom.thirdPoint, angleArcRadius)}
              style={exterior?.color ? { stroke: tokenColorVar(exterior.color) } : undefined}
            />
            {exterior?.label && (
              <text
                className="diagram__value is-angle"
                style={exterior?.color ? { fill: tokenColorVar(exterior.color) } : undefined}
                x={exteriorGeom.labelPos.x}
                y={exteriorGeom.labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {exterior.label}
              </text>
            )}
          </g>
        )}

        {interactive &&
          showAngles &&
          pointIds.map((id) => {
            const [p1, p2] = adjacent[id]
            const vertex = vertices[id]
            const labelPos = angleLabelPos(vertex, p1, p2, 36)
            const color = angleColors?.[id]
            return (
              <g key={`angle-${id}`}>
                {id !== rightAngleVertex && (
                  <path
                    className="diagram__angle"
                    d={angleArcPath(vertex, p1, p2, angleArcRadius)}
                    style={color ? { stroke: tokenColorVar(color) } : undefined}
                  />
                )}
                <text
                  className="diagram__value is-angle"
                  style={color ? { fill: tokenColorVar(color) } : undefined}
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {geometry.rounded[id]}&deg;
                </text>
              </g>
            )
          })}

        {!interactive &&
          angleLabels &&
          pointIds.map((id) => {
            const label = angleLabels[id]
            if (!label) {
              return null
            }
            const [p1, p2] = adjacent[id]
            const vertex = vertices[id]
            const labelPos = angleLabelPos(vertex, p1, p2, 34)
            const color = angleColors?.[id]
            return (
              <g key={`angle-${id}`}>
                {id !== rightAngleVertex && (
                  <path
                    className="diagram__angle"
                    d={angleArcPath(vertex, p1, p2, angleArcRadius)}
                    style={color ? { stroke: tokenColorVar(color) } : undefined}
                  />
                )}
                <text
                  className="diagram__value is-angle"
                  style={color ? { fill: tokenColorVar(color) } : undefined}
                  x={labelPos.x}
                  y={labelPos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {label}
                </text>
              </g>
            )
          })}

        {sides.map(({ id, p1, p2 }) => {
          const text = interactive
            ? showSides
              ? (distance(p1, p2) / displayScale).toFixed(1)
              : null
            : sideLabels?.[id] ?? null
          if (text === null) {
            return null
          }
          const pos = sideLabelPos(p1, p2, geometry.center, 18)
          const color = sideColors?.[id]
          return (
            <text
              key={`side-${id}`}
              className="diagram__value is-central"
              style={color ? { fill: tokenColorVar(color) } : undefined}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {text}
            </text>
          )
        })}

        {rightAngleVertex && (
          <path
            className="triangle__right-angle"
            style={rightAngleColor ? { stroke: tokenColorVar(rightAngleColor) } : undefined}
            d={rightAnglePath(
              vertices[rightAngleVertex],
              adjacent[rightAngleVertex][0],
              adjacent[rightAngleVertex][1],
              rightAngleSize,
            )}
          />
        )}

        {overlay && overlayLabel && (
          <text
            className="diagram__value is-central"
            style={overlayColor ? { fill: tokenColorVar(overlayColor) } : undefined}
            {...outwardPos(overlay.a, geometry.center, 16)}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {overlayLabel}
          </text>
        )}

        {pointIds.map((id) => {
          const vertex = vertices[id]
          const label = labels[id]

          if (!interactive) {
            const pos = outwardPos(vertex, geometry.center, 18)
            return (
              <g key={id} className="diagram__point" transform={`translate(${vertex.x} ${vertex.y})`}>
                <circle r={6} />
                <text x={pos.x - vertex.x} y={pos.y - vertex.y + 4}>
                  {label}
                </text>
              </g>
            )
          }

          return (
            <g
              key={id}
              className="diagram__handle"
              transform={`translate(${vertex.x} ${vertex.y})`}
              tabIndex={0}
              aria-label={`Vertex ${label}, drag or use arrow keys to move`}
              onKeyDown={(event) => nudge(id, event)}
              onPointerDown={(event) => {
                setActive(id)
                svgRef.current?.setPointerCapture(event.pointerId)
                moveActiveTo(id, event.clientX, event.clientY)
              }}
            >
              <circle className="diagram__hit" r={24} />
              <circle r={14} />
              <text y={5}>{label}</text>
            </g>
          )
        })}
      </svg>

      {interactive && showReadout && (
        <>
          <dl className="diagram__readout" aria-live="polite">
            <div>
              <dt>&ang;{labels.a}</dt>
              <dd className="is-angle">{geometry.rounded.a}&deg;</dd>
            </div>
            <div>
              <dt>&ang;{labels.b}</dt>
              <dd className="is-angle">{geometry.rounded.b}&deg;</dd>
            </div>
            <div>
              <dt>&ang;{labels.c}</dt>
              <dd className="is-angle">{geometry.rounded.c}&deg;</dd>
            </div>
            <div>
              <dt>Sum</dt>
              <dd className="is-sum">{angleSum}&deg;</dd>
            </div>
          </dl>
          {showArea && (
            <dl className="diagram__readout" aria-live="polite">
              <div>
                <dt>Area</dt>
                <dd className="is-central">{area}</dd>
              </div>
            </dl>
          )}
        </>
      )}
    </div>
  )
}
