import {
  type KeyboardEvent,
  type PointerEvent,
  type SVGProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { Point } from '../../engine/geometry'
import { type TokenColor, tokenColorVar } from '../lesson/palette'
import './CircleDiagram.css'
import './TriangleDiagram.css'

export type QuadAreaShape = 'triangle' | 'equilateral' | 'parallelogram' | 'trapezoid' | 'kite'

export type QuadAreaDiagramProps = {
  /** Which area figure to draw. Default 'parallelogram'. */
  shape?: QuadAreaShape
  /** Interactive mode: a parallelogram you can shear / raise to watch base x height. */
  interactive?: boolean
  /** Static dimension label on the base (e.g. "8"). */
  base?: string
  /** Static dimension label on the perpendicular height. */
  height?: string
  /** Static dimension label on the second (top) base of a trapezoid. */
  base2?: string
  /** Static dimension label on the side of an equilateral triangle. */
  side?: string
  /** Static dimension label on a kite's first (horizontal) diagonal. */
  diag1?: string
  /** Static dimension label on a kite's second (vertical) diagonal. */
  diag2?: string
  /**
   * Colour-match the marks to the prose tokens: base = blue, perpendicular
   * height = a dashed orange plumb line (visually distinct from the slant), and
   * the slant sides = slate. Defaults off (the original neutral appearance).
   */
  tint?: boolean
  /** Render the live readout panel (interactive). */
  showReadout?: boolean
  onInteract?: () => void
}

const displayScale = 40

// Inline stroke overrides for the colour-matched (tint) figure. The height keeps
// its dashed pattern from .diagram__base but turns orange, so the plumb line
// reads as clearly different from the solid slant sides.
const tintBaseStroke = { stroke: tokenColorVar('blue'), strokeWidth: 3 }
const tintSlantStroke = { stroke: tokenColorVar('slate') }
const tintHeightStroke = { stroke: tokenColorVar('orange'), strokeWidth: 2.5 }
const tintMarkStroke = { stroke: tokenColorVar('orange') }

// Interactive parallelogram: a fixed-length base on the bottom and one draggable
// top-left handle. The top edge stays parallel to the base, so the height is the
// vertical drop everywhere; sliding sideways shears it without changing the area.
const baseY = 290
const baseLeftX = 90
const baseLen = 160
const handleBounds = { minX: 90, maxX: 190, minY: 40, maxY: 250 }
const keyboardStep = 4
const rightAngleSize = 14

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// Square tucked into a right-angle corner at `vertex`, opening toward two points.
function rightAngleMark(vertex: Point, toward1: Point, toward2: Point, size: number): string {
  const u = unit(vertex, toward1)
  const w = unit(vertex, toward2)
  const c1 = { x: vertex.x + u.x * size, y: vertex.y + u.y * size }
  const c2 = { x: vertex.x + (u.x + w.x) * size, y: vertex.y + (u.y + w.y) * size }
  const c3 = { x: vertex.x + w.x * size, y: vertex.y + w.y * size }
  return `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y} L ${c3.x} ${c3.y}`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function DimensionText({
  x,
  y,
  color,
  children,
}: {
  x: number
  y: number
  color?: TokenColor
  children: string
}) {
  return (
    <text
      className="diagram__value is-central"
      style={color ? { fill: tokenColorVar(color) } : undefined}
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {children}
    </text>
  )
}

function InteractiveParallelogram({
  showReadout,
  tint = false,
  onInteract,
}: {
  showReadout: boolean
  tint?: boolean
  onInteract?: () => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [handle, setHandle] = useState<Point>({ x: 140, y: 150 })
  const [dragging, setDragging] = useState(false)
  const hasInteracted = useRef(false)
  const frameRef = useRef<number | null>(null)
  const pendingRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const reportInteraction = useCallback(() => {
    if (!hasInteracted.current) {
      hasInteracted.current = true
      onInteract?.()
    }
  }, [onInteract])

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])

  function moveTo(clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()
    if (!svg || !screenMatrix) {
      return
    }
    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor = svgPoint.matrixTransform(screenMatrix.inverse())
    setHandle({
      x: Math.round(clamp(cursor.x, handleBounds.minX, handleBounds.maxX)),
      y: Math.round(clamp(cursor.y, handleBounds.minY, handleBounds.maxY)),
    })
  }

  function flushMove() {
    frameRef.current = null
    const pending = pendingRef.current
    if (pending) {
      moveTo(pending.clientX, pending.clientY)
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
    setHandle((current) => ({
      x: clamp(current.x + delta.x, handleBounds.minX, handleBounds.maxX),
      y: clamp(current.y + delta.y, handleBounds.minY, handleBounds.maxY),
    }))
    reportInteraction()
  }

  const b0: Point = { x: baseLeftX, y: baseY }
  const b1: Point = { x: baseLeftX + baseLen, y: baseY }
  const tl: Point = handle
  const tr: Point = { x: handle.x + baseLen, y: handle.y }
  const foot: Point = { x: handle.x, y: baseY }

  const baseUnits = baseLen / displayScale
  const heightUnits = (baseY - handle.y) / displayScale
  const areaUnits = baseUnits * heightUnits

  const svgModeProps: SVGProps<SVGSVGElement> = {
    onPointerMove: handlePointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  }

  return (
    <div className="diagram">
      <svg ref={svgRef} className="diagram__svg is-interactive" viewBox="0 0 360 360" {...svgModeProps}>
        <polygon
          className="triangle__fill"
          points={`${b0.x},${b0.y} ${b1.x},${b1.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`}
        />

        <line
          className="diagram__base"
          x1={foot.x}
          y1={foot.y}
          x2={tl.x}
          y2={tl.y}
          style={tint ? tintHeightStroke : undefined}
        />
        <path
          className="diagram__chord"
          fill="none"
          d={rightAngleMark(foot, b1, tl, rightAngleSize)}
          style={tint ? tintMarkStroke : undefined}
        />

        <line className="diagram__chord" x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} style={tint ? tintBaseStroke : undefined} />
        <line className="diagram__chord" x1={b1.x} y1={b1.y} x2={tr.x} y2={tr.y} style={tint ? tintSlantStroke : undefined} />
        <line className="diagram__chord" x1={tr.x} y1={tr.y} x2={tl.x} y2={tl.y} style={tint ? tintSlantStroke : undefined} />
        <line className="diagram__chord" x1={tl.x} y1={tl.y} x2={b0.x} y2={b0.y} style={tint ? tintSlantStroke : undefined} />

        <DimensionText x={(b0.x + b1.x) / 2} y={baseY + 22} color={tint ? 'blue' : undefined}>
          b
        </DimensionText>
        <DimensionText x={foot.x - 16} y={(baseY + handle.y) / 2} color={tint ? 'orange' : undefined}>
          h
        </DimensionText>

        <g
          className="diagram__handle is-accent"
          transform={`translate(${tl.x} ${tl.y})`}
          tabIndex={0}
          role="slider"
          aria-label="Drag to reshape the parallelogram"
          aria-valuetext={`base ${baseUnits.toFixed(1)}, height ${heightUnits.toFixed(1)}`}
          onKeyDown={nudge}
          onPointerDown={(event) => {
            setDragging(true)
            svgRef.current?.setPointerCapture(event.pointerId)
            reportInteraction()
          }}
        >
          <circle className="diagram__hit" r={24} />
          <circle r={13} />
        </g>
      </svg>

      {showReadout && (
        <dl className="diagram__readout" aria-live="polite">
          <div>
            <dt>Base</dt>
            <dd className="is-sum">{baseUnits.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Height</dt>
            <dd className="is-sum">{heightUnits.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Area</dt>
            <dd className="is-angle">{areaUnits.toFixed(1)}</dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function TriangleArea({ base, height, tint }: { base?: string; height?: string; tint?: boolean }) {
  const b0: Point = { x: 70, y: 285 }
  const b1: Point = { x: 290, y: 285 }
  const apex: Point = { x: 165, y: 110 }
  const foot: Point = { x: apex.x, y: b0.y }
  return (
    <>
      <polygon className="triangle__fill" points={`${b0.x},${b0.y} ${b1.x},${b1.y} ${apex.x},${apex.y}`} />
      <line className="diagram__base" x1={apex.x} y1={apex.y} x2={foot.x} y2={foot.y} style={tint ? tintHeightStroke : undefined} />
      <path className="diagram__chord" fill="none" d={rightAngleMark(foot, b1, apex, rightAngleSize)} style={tint ? tintMarkStroke : undefined} />
      <line className="diagram__chord" x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} style={tint ? tintBaseStroke : undefined} />
      <line className="diagram__chord" x1={b1.x} y1={b1.y} x2={apex.x} y2={apex.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={apex.x} y1={apex.y} x2={b0.x} y2={b0.y} style={tint ? tintSlantStroke : undefined} />
      {base && (
        <DimensionText x={(b0.x + b1.x) / 2} y={b0.y + 22} color={tint ? 'blue' : undefined}>
          {base}
        </DimensionText>
      )}
      {height && (
        <DimensionText x={foot.x - 16} y={(apex.y + foot.y) / 2} color={tint ? 'orange' : undefined}>
          {height}
        </DimensionText>
      )}
    </>
  )
}

function EquilateralArea({ side, tint }: { side?: string; tint?: boolean }) {
  const b0: Point = { x: 95, y: 280 }
  const b1: Point = { x: 275, y: 280 }
  const apex: Point = { x: 185, y: 124 }
  const foot: Point = { x: apex.x, y: b0.y }
  return (
    <>
      <polygon className="triangle__fill" points={`${b0.x},${b0.y} ${b1.x},${b1.y} ${apex.x},${apex.y}`} />
      <line className="diagram__base" x1={apex.x} y1={apex.y} x2={foot.x} y2={foot.y} style={tint ? tintHeightStroke : undefined} />
      <path className="diagram__chord" fill="none" d={rightAngleMark(foot, b1, apex, rightAngleSize)} style={tint ? tintMarkStroke : undefined} />
      <line className="diagram__chord" x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} style={tint ? tintBaseStroke : undefined} />
      <line className="diagram__chord" x1={b1.x} y1={b1.y} x2={apex.x} y2={apex.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={apex.x} y1={apex.y} x2={b0.x} y2={b0.y} style={tint ? tintSlantStroke : undefined} />
      {side && (
        <>
          <DimensionText x={(b0.x + b1.x) / 2} y={b0.y + 22} color={tint ? 'blue' : undefined}>
            {side}
          </DimensionText>
          <DimensionText x={(b0.x + apex.x) / 2 - 16} y={(b0.y + apex.y) / 2} color={tint ? 'slate' : undefined}>
            {side}
          </DimensionText>
          <DimensionText x={(b1.x + apex.x) / 2 + 16} y={(b1.y + apex.y) / 2} color={tint ? 'slate' : undefined}>
            {side}
          </DimensionText>
        </>
      )}
    </>
  )
}

function ParallelogramArea({ base, height, tint }: { base?: string; height?: string; tint?: boolean }) {
  const b0: Point = { x: 80, y: 280 }
  const b1: Point = { x: 260, y: 280 }
  const tl: Point = { x: 140, y: 120 }
  const tr: Point = { x: 320, y: 120 }
  const foot: Point = { x: tl.x, y: b0.y }
  return (
    <>
      <polygon className="triangle__fill" points={`${b0.x},${b0.y} ${b1.x},${b1.y} ${tr.x},${tr.y} ${tl.x},${tl.y}`} />
      <line className="diagram__base" x1={foot.x} y1={foot.y} x2={tl.x} y2={tl.y} style={tint ? tintHeightStroke : undefined} />
      <path className="diagram__chord" fill="none" d={rightAngleMark(foot, b1, tl, rightAngleSize)} style={tint ? tintMarkStroke : undefined} />
      <line className="diagram__chord" x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} style={tint ? tintBaseStroke : undefined} />
      <line className="diagram__chord" x1={b1.x} y1={b1.y} x2={tr.x} y2={tr.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={tr.x} y1={tr.y} x2={tl.x} y2={tl.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={tl.x} y1={tl.y} x2={b0.x} y2={b0.y} style={tint ? tintSlantStroke : undefined} />
      {base && (
        <DimensionText x={(b0.x + b1.x) / 2} y={b0.y + 22} color={tint ? 'blue' : undefined}>
          {base}
        </DimensionText>
      )}
      {height && (
        <DimensionText x={foot.x - 16} y={(foot.y + tl.y) / 2} color={tint ? 'orange' : undefined}>
          {height}
        </DimensionText>
      )}
    </>
  )
}

function TrapezoidArea({
  base,
  base2,
  height,
  tint,
}: {
  base?: string
  base2?: string
  height?: string
  tint?: boolean
}) {
  const b0: Point = { x: 60, y: 280 }
  const b1: Point = { x: 300, y: 280 }
  const t0: Point = { x: 120, y: 130 }
  const t1: Point = { x: 240, y: 130 }
  const foot: Point = { x: t0.x, y: b0.y }
  return (
    <>
      <polygon className="triangle__fill" points={`${b0.x},${b0.y} ${b1.x},${b1.y} ${t1.x},${t1.y} ${t0.x},${t0.y}`} />
      <line className="diagram__base" x1={t0.x} y1={t0.y} x2={foot.x} y2={foot.y} style={tint ? tintHeightStroke : undefined} />
      <path className="diagram__chord" fill="none" d={rightAngleMark(foot, b1, t0, rightAngleSize)} style={tint ? tintMarkStroke : undefined} />
      <line className="diagram__chord" x1={b0.x} y1={b0.y} x2={b1.x} y2={b1.y} style={tint ? tintBaseStroke : undefined} />
      <line className="diagram__chord" x1={b1.x} y1={b1.y} x2={t1.x} y2={t1.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={t1.x} y1={t1.y} x2={t0.x} y2={t0.y} style={tint ? tintBaseStroke : undefined} />
      <line className="diagram__chord" x1={t0.x} y1={t0.y} x2={b0.x} y2={b0.y} style={tint ? tintSlantStroke : undefined} />
      {base && (
        <DimensionText x={(b0.x + b1.x) / 2} y={b0.y + 22} color={tint ? 'blue' : undefined}>
          {base}
        </DimensionText>
      )}
      {base2 && (
        <DimensionText x={(t0.x + t1.x) / 2} y={t0.y - 16} color={tint ? 'blue' : undefined}>
          {base2}
        </DimensionText>
      )}
      {height && (
        <DimensionText x={foot.x - 16} y={(foot.y + t0.y) / 2} color={tint ? 'orange' : undefined}>
          {height}
        </DimensionText>
      )}
    </>
  )
}

function KiteArea({ diag1, diag2, tint }: { diag1?: string; diag2?: string; tint?: boolean }) {
  const top: Point = { x: 180, y: 80 }
  const bottom: Point = { x: 180, y: 300 }
  const left: Point = { x: 90, y: 175 }
  const right: Point = { x: 270, y: 175 }
  const center: Point = { x: 180, y: 175 }
  return (
    <>
      <polygon
        className="triangle__fill"
        points={`${top.x},${top.y} ${right.x},${right.y} ${bottom.x},${bottom.y} ${left.x},${left.y}`}
      />
      <line className="diagram__base" x1={left.x} y1={left.y} x2={right.x} y2={right.y} style={tint ? tintBaseStroke : undefined} />
      <line className="diagram__base" x1={top.x} y1={top.y} x2={bottom.x} y2={bottom.y} style={tint ? tintHeightStroke : undefined} />
      <path className="diagram__chord" fill="none" d={rightAngleMark(center, right, top, rightAngleSize)} style={tint ? tintMarkStroke : undefined} />
      <line className="diagram__chord" x1={top.x} y1={top.y} x2={right.x} y2={right.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={right.x} y1={right.y} x2={bottom.x} y2={bottom.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={bottom.x} y1={bottom.y} x2={left.x} y2={left.y} style={tint ? tintSlantStroke : undefined} />
      <line className="diagram__chord" x1={left.x} y1={left.y} x2={top.x} y2={top.y} style={tint ? tintSlantStroke : undefined} />
      {diag1 && (
        <DimensionText x={(left.x + center.x) / 2} y={center.y - 14} color={tint ? 'blue' : undefined}>
          {diag1}
        </DimensionText>
      )}
      {diag2 && (
        <DimensionText x={center.x + 16} y={(top.y + center.y) / 2} color={tint ? 'orange' : undefined}>
          {diag2}
        </DimensionText>
      )}
    </>
  )
}

const shapeLabels: Record<QuadAreaShape, string> = {
  triangle: 'A triangle with its base and perpendicular height marked',
  equilateral: 'An equilateral triangle with its equal sides marked',
  parallelogram: 'A parallelogram with its base and perpendicular height marked',
  trapezoid: 'A trapezoid with its two parallel bases and perpendicular height marked',
  kite: 'A kite with its two perpendicular diagonals marked',
}

// Each static shape is drawn anchored to a low baseline, so on the default
// 0 0 360 360 box it sits low (and the parallelogram leans right). These offset
// the viewBox per shape so the drawing — including its dimension labels — sits
// centered with even breathing room, matching the original figures.
const shapeViewBoxes: Record<QuadAreaShape, string> = {
  triangle: '0 28 360 360',
  equilateral: '5 33 360 360',
  parallelogram: '20 31 360 360',
  trapezoid: '0 28 360 360',
  kite: '0 10 360 360',
}

export function QuadAreaDiagram({
  shape = 'parallelogram',
  interactive = false,
  base,
  height,
  base2,
  side,
  diag1,
  diag2,
  tint = false,
  showReadout = true,
  onInteract,
}: QuadAreaDiagramProps) {
  if (interactive) {
    return <InteractiveParallelogram showReadout={showReadout} tint={tint} onInteract={onInteract} />
  }

  return (
    <div className="diagram">
      <svg className="diagram__svg" viewBox={shapeViewBoxes[shape]} role="img" aria-label={shapeLabels[shape]}>
        {shape === 'triangle' && <TriangleArea base={base} height={height} tint={tint} />}
        {shape === 'equilateral' && <EquilateralArea side={side} tint={tint} />}
        {shape === 'parallelogram' && <ParallelogramArea base={base} height={height} tint={tint} />}
        {shape === 'trapezoid' && <TrapezoidArea base={base} base2={base2} height={height} tint={tint} />}
        {shape === 'kite' && <KiteArea diag1={diag1} diag2={diag2} tint={tint} />}
      </svg>
    </div>
  )
}
