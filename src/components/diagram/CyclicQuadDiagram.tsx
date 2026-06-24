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
  normalizeDegrees,
  pointOnCircle,
} from '../../engine/geometry'
import './CircleDiagram.css'

const circle: Circle = {
  center: { x: 180, y: 180 },
  radius: 118,
}

type VertexKey = 'a' | 'b' | 'c' | 'd'
type Angles = Record<VertexKey, number>

// A, B, C are fixed; D is dragged along the arc between C and A. The order
// A→B→C→D around the circle keeps the quadrilateral simple (non-crossing).
const canonical: Angles = { a: 250, b: 330, c: 60, d: 160 }
const dragMargin = 10
const arcRadius = 30

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

function bisector(vertex: Point, p1: Point, p2: Point, distance: number): Point {
  const u = unit(vertex, p1)
  const v = unit(vertex, p2)
  const bx = u.x + v.x
  const by = u.y + v.y
  const length = Math.hypot(bx, by) || 1
  return { x: vertex.x + (bx / length) * distance, y: vertex.y + (by / length) * distance }
}

// D can range over the arc strictly between C and A (the side away from B).
function constrainD(desired: number): number {
  const lo = canonical.c + dragMargin
  const hi = canonical.a - dragMargin
  const x = normalizeDegrees(desired)
  if (x >= lo && x <= hi) {
    return x
  }
  const toHi = Math.min(Math.abs(x - hi), 360 - Math.abs(x - hi))
  const toLo = Math.min(Math.abs(x - lo), 360 - Math.abs(x - lo))
  return toHi <= toLo ? hi : lo
}

function staticAngles(givenA: number | undefined, rotate: number): Angles {
  // ∠A = (arcBC + arcCD)/2. With A, B, C fixed, ∠A = (30 + D)/2, so D = 2∠A − 30.
  const d = givenA === undefined ? canonical.d : 2 * givenA - 30
  return {
    a: normalizeDegrees(canonical.a + rotate),
    b: normalizeDegrees(canonical.b + rotate),
    c: normalizeDegrees(canonical.c + rotate),
    d: normalizeDegrees(d + rotate),
  }
}

type CyclicQuadDiagramProps = {
  interactive?: boolean
  showReadout?: boolean
  givenA?: number
  show?: ('A' | 'C')[]
  rotate?: number
  onInteract?: () => void
}

export function CyclicQuadDiagram({
  interactive = false,
  showReadout = true,
  givenA,
  show = [],
  rotate = 0,
  onInteract,
}: CyclicQuadDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dragAngles, setDragAngles] = useState<Angles>(canonical)
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

  const angles = interactive ? dragAngles : staticAngles(givenA, rotate)

  const a = pointOnCircle(circle, angles.a)
  const b = pointOnCircle(circle, angles.b)
  const c = pointOnCircle(circle, angles.c)
  const d = pointOnCircle(circle, angles.d)
  const angleA = Math.round(angleBetweenPoints(a, d, b))
  const angleC = Math.round(angleBetweenPoints(c, b, d))
  const sum = angleA + angleC

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
    // Snap to even degrees: ∠A = (30 + D)/2, so an even D keeps ∠A a whole
    // number and ∠A + ∠C reads exactly 180, never 179 or 181 from rounding.
    const desired = Math.round(angleFromCenter(circle, cursor) / 2) * 2
    setDragAngles((current) => ({ ...current, d: constrainD(desired) }))
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
      setDragAngles((current) => ({ ...current, d: constrainD(current.d + 2) }))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setDragAngles((current) => ({ ...current, d: constrainD(current.d - 2) }))
      reportInteraction()
    }
  }

  const showValues = interactive ? showReadout : true

  const valueText = (vertex: 'A' | 'C') => {
    if (!showValues) {
      return null
    }
    const value = vertex === 'A' ? angleA : angleC
    if (interactive) {
      return `${value}\u00b0`
    }
    return show.includes(vertex) ? `${value}\u00b0` : '?'
  }

  const aLabelPos = bisector(a, d, b, 42)
  const cLabelPos = bisector(c, b, d, 42)
  const aTextValue = valueText('A')
  const cTextValue = valueText('C')

  const vertices: { key: VertexKey; label: string; point: Point; angle: number }[] = [
    { key: 'a', label: 'A', point: a, angle: angles.a },
    { key: 'b', label: 'B', point: b, angle: angles.b },
    { key: 'c', label: 'C', point: c, angle: angles.c },
    { key: 'd', label: 'D', point: d, angle: angles.d },
  ]

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className={interactive ? 'diagram__svg is-interactive' : 'diagram__svg'}
        viewBox="0 0 360 360"
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <circle className="diagram__circle" cx={circle.center.x} cy={circle.center.y} r={circle.radius} />

        <path className="diagram__angle-fill" d={angleSectorPath(a, d, b, arcRadius)} />
        <path className="diagram__central-fill" d={angleSectorPath(c, b, d, arcRadius)} />

        <line className="diagram__chord" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
        <line className="diagram__chord" x1={b.x} y1={b.y} x2={c.x} y2={c.y} />
        <line className="diagram__chord" x1={c.x} y1={c.y} x2={d.x} y2={d.y} />
        <line className="diagram__chord" x1={d.x} y1={d.y} x2={a.x} y2={a.y} />

        <path className="diagram__angle" d={angleArcPath(a, d, b, arcRadius)} />
        <path className="diagram__central" d={angleArcPath(c, b, d, arcRadius)} />

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
                aria-valuemin={Math.round(canonical.c + dragMargin)}
                aria-valuemax={Math.round(canonical.a - dragMargin)}
                aria-valuenow={Math.round(angles.d)}
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

        {aTextValue && (
          <text
            className="diagram__value is-angle"
            x={aLabelPos.x}
            y={aLabelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {aTextValue}
          </text>
        )}
        {cTextValue && (
          <text
            className="diagram__value is-central"
            x={cLabelPos.x}
            y={cLabelPos.y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {cTextValue}
          </text>
        )}
      </svg>

      {interactive && showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>&ang;A</dt>
            <dd className="is-angle">{angleA}&deg;</dd>
          </div>
          <div>
            <dt>&ang;C</dt>
            <dd className="is-central">{angleC}&deg;</dd>
          </div>
          <div>
            <dt>&ang;A + &ang;C</dt>
            <dd className="is-sum">{sum}&deg;</dd>
          </div>
        </dl>
      )}
    </div>
  )
}
