import {
  type KeyboardEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { type Point, angleArcPath, angleSectorPath } from '../../engine/geometry'
import './CircleDiagram.css'
import './AnglesDiagram.css'

export type AnglesHighlight =
  | 'vertical'
  | 'supplementary'
  | 'corresponding'
  | 'alternate'
  | 'cointerior'
  | 'rules'

export type AnglesDiagramProps = {
  interactive?: boolean
  /** Transversal tilt from vertical, degrees, clamped to [-52, 52]. Default 28. */
  angle?: number
  /** Which relationship to highlight. Default 'corresponding'. */
  highlight?: AnglesHighlight
  /** Static only: text drawn on the primary (given) wedge, e.g. "130°". Overrides the computed value. */
  markedLabel?: string
  /** Static only: text drawn on the partner (target) wedge, e.g. "?". Overrides the computed value. */
  partnerLabel?: string
  /** Static only: when no label override is given, show computed degree numbers on the wedges. Default true. */
  showValues?: boolean
  /** Interactive only: render the live readout panel. Default true. */
  showReadout?: boolean
  onInteract?: () => void
}

const O: Point = { x: 180, y: 180 }
const topY = 116
const botY = 244
const lineX0 = 24
const lineX1 = 336
const maxTilt = 52
const wedgeR = 26
const keyboardStep = 2

// `tone` selects the colour key: 'accent' (orange) and 'arc' (soft teal) are the
// shared highlight colours; 'vertical' (purple) and 'corresponding' (blue) give
// those two relationships their own colour wherever they appear.
type WedgeTone = 'accent' | 'arc' | 'vertical' | 'corresponding'

type Wedge = {
  id: string
  vertex: Point
  dirA: Point
  dirB: Point
  value: number
  tone: WedgeTone
}

function wedgeClass(tone: WedgeTone): string {
  switch (tone) {
    case 'arc':
      return 'angles__wedge is-arc'
    case 'vertical':
      return 'angles__wedge is-vertical'
    case 'corresponding':
      return 'angles__wedge is-corresponding'
    case 'accent':
      return 'angles__wedge'
  }
}

function arcClass(tone: WedgeTone): string {
  switch (tone) {
    case 'arc':
      return 'angles__arc is-arc'
    case 'vertical':
      return 'angles__arc is-vertical'
    case 'corresponding':
      return 'angles__arc is-corresponding'
    case 'accent':
      return 'angles__arc'
  }
}

function valueClass(tone: WedgeTone): string {
  switch (tone) {
    case 'arc':
      return 'diagram__value is-central'
    case 'vertical':
      return 'diagram__value is-vertical'
    case 'corresponding':
      return 'diagram__value is-corresponding'
    case 'accent':
      return 'diagram__value is-angle'
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function addRay(p: Point, dir: Point, r: number): Point {
  return { x: p.x + dir.x * r, y: p.y + dir.y * r }
}

// Step `dist` from the vertex along the bisector of the two directions; fall
// back to the vertex when the directions cancel out (sum length ~0).
function bisectorPos(vertex: Point, dirA: Point, dirB: Point, dist: number): Point {
  const sumX = dirA.x + dirB.x
  const sumY = dirA.y + dirB.y
  const length = Math.hypot(sumX, sumY)
  if (length < 1e-9) {
    return vertex
  }
  return { x: vertex.x + (sumX / length) * dist, y: vertex.y + (sumY / length) * dist }
}

export function AnglesDiagram({
  interactive = false,
  angle,
  highlight = 'corresponding',
  markedLabel,
  partnerLabel,
  showValues,
  showReadout,
  onInteract,
}: AnglesDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [tiltState, setTiltState] = useState(() => clamp(angle ?? 28, -maxTilt, maxTilt))
  const [active, setActive] = useState(false)
  const hasInteracted = useRef(false)

  // Interactive drives the tilt from state; static renders the given angle.
  const tiltDeg = interactive ? tiltState : clamp(angle ?? 28, -maxTilt, maxTilt)

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

  const t = (tiltDeg * Math.PI) / 180
  const up: Point = { x: Math.sin(t), y: -Math.cos(t) }
  const down: Point = { x: -up.x, y: -up.y }
  const hRight: Point = { x: 1, y: 0 }
  const hLeft: Point = { x: -1, y: 0 }

  // Where the transversal through O crosses the horizontal line y = lineY.
  function intersect(lineY: number): Point {
    const s = (O.y - lineY) / Math.cos(t)
    return { x: O.x + s * Math.sin(t), y: lineY }
  }

  const top = intersect(topY)
  const bottom = intersect(botY)

  const segTop: Point = { x: O.x + 150 * up.x, y: O.y + 150 * up.y }
  const segBottom: Point = { x: O.x - 150 * up.x, y: O.y - 150 * up.y }
  const handle: Point = { x: O.x + 132 * up.x, y: O.y + 132 * up.y }

  const gamma = 90 - tiltDeg

  function getWedges(): Wedge[] {
    switch (highlight) {
      case 'vertical':
        return [
          { id: 'marked', vertex: top, dirA: hRight, dirB: up, value: gamma, tone: 'vertical' },
          { id: 'partner', vertex: top, dirA: hLeft, dirB: down, value: gamma, tone: 'vertical' },
        ]
      case 'supplementary':
        return [
          { id: 'marked', vertex: top, dirA: hRight, dirB: up, value: gamma, tone: 'accent' },
          { id: 'partner', vertex: top, dirA: up, dirB: hLeft, value: 180 - gamma, tone: 'arc' },
        ]
      case 'corresponding':
        return [
          { id: 'marked', vertex: top, dirA: hRight, dirB: up, value: gamma, tone: 'corresponding' },
          { id: 'partner', vertex: bottom, dirA: hRight, dirB: up, value: gamma, tone: 'corresponding' },
        ]
      case 'alternate':
        return [
          { id: 'marked', vertex: top, dirA: hLeft, dirB: down, value: gamma, tone: 'accent' },
          { id: 'partner', vertex: bottom, dirA: hRight, dirB: up, value: gamma, tone: 'accent' },
        ]
      case 'cointerior':
        return [
          { id: 'marked', vertex: top, dirA: hRight, dirB: down, value: 180 - gamma, tone: 'accent' },
          { id: 'partner', vertex: bottom, dirA: hRight, dirB: up, value: gamma, tone: 'arc' },
        ]
      case 'rules':
        // The angle-rules summary: the corresponding pair (same upper-right corner
        // at both crossings, blue) and the vertical pair (the opposite UL/LR wedges
        // at the top crossing, purple). Kept disjoint so each colour owns its wedges.
        return [
          { id: 'corr-top', vertex: top, dirA: hRight, dirB: up, value: gamma, tone: 'corresponding' },
          { id: 'corr-bottom', vertex: bottom, dirA: hRight, dirB: up, value: gamma, tone: 'corresponding' },
          { id: 'vert-a', vertex: top, dirA: up, dirB: hLeft, value: 180 - gamma, tone: 'vertical' },
          { id: 'vert-b', vertex: top, dirA: down, dirB: hRight, value: 180 - gamma, tone: 'vertical' },
        ]
    }
  }

  const wedges = getWedges()

  function getReadoutCells() {
    switch (highlight) {
      case 'vertical':
        return [
          { id: 'a1', term: <>&ang;1</>, value: gamma, cls: 'is-vertical' },
          { id: 'a2', term: <>&ang;2 vertical</>, value: gamma, cls: 'is-vertical' },
        ]
      case 'corresponding':
        return [
          { id: 'a1', term: <>&ang;1</>, value: gamma, cls: 'is-corresponding' },
          { id: 'a2', term: <>&ang;2 corresp.</>, value: gamma, cls: 'is-corresponding' },
        ]
      case 'rules':
        // Static-only composite; the live readout is never rendered for it, but the
        // switch stays exhaustive. Report one angle from each coloured pair.
        return [
          { id: 'corr', term: <>&ang; corresp.</>, value: gamma, cls: 'is-corresponding' },
          { id: 'vert', term: <>&ang; vertical</>, value: 180 - gamma, cls: 'is-vertical' },
        ]
      case 'alternate':
        return [
          { id: 'a1', term: <>&ang;1</>, value: gamma, cls: 'is-angle' },
          { id: 'a2', term: <>&ang;2 alt.</>, value: gamma, cls: 'is-angle' },
        ]
      case 'supplementary':
        return [
          { id: 'a1', term: <>&ang;1</>, value: gamma, cls: 'is-angle' },
          { id: 'a2', term: <>&ang;2 straight</>, value: 180 - gamma, cls: 'is-central' },
          { id: 'sum', term: <>Sum</>, value: 180, cls: 'is-sum' },
        ]
      case 'cointerior':
        return [
          { id: 'a1', term: <>&ang;1</>, value: 180 - gamma, cls: 'is-angle' },
          { id: 'a2', term: <>&ang;2 co-int.</>, value: gamma, cls: 'is-central' },
          { id: 'sum', term: <>Sum</>, value: 180, cls: 'is-sum' },
        ]
    }
  }

  function moveToPointer(clientX: number, clientY: number) {
    const svg = svgRef.current
    const screenMatrix = svg?.getScreenCTM()

    if (!svg || !screenMatrix) {
      return
    }

    const svgPoint = svg.createSVGPoint()
    svgPoint.x = clientX
    svgPoint.y = clientY
    const cursor = svgPoint.matrixTransform(screenMatrix.inverse())
    const rawTilt = (Math.atan2(cursor.x - O.x, -(cursor.y - O.y)) * 180) / Math.PI
    const snapped = Math.round(clamp(rawTilt, -maxTilt, maxTilt) / 2) * 2

    setTiltState(snapped)
  }

  function flushMove() {
    frameRef.current = null
    const pending = pendingRef.current
    if (pending) {
      moveToPointer(pending.clientX, pending.clientY)
    }
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!active) {
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
      moveToPointer(pendingRef.current.clientX, pendingRef.current.clientY)
      pendingRef.current = null
    }
    setActive(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function nudge(event: KeyboardEvent<SVGGElement>) {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      setTiltState((current) => clamp(current + keyboardStep, -maxTilt, maxTilt))
      reportInteraction()
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      setTiltState((current) => clamp(current - keyboardStep, -maxTilt, maxTilt))
      reportInteraction()
    }
  }

  const figureLabel =
    highlight === 'rules'
      ? 'Two parallel lines cut by a transversal, with the corresponding-angle pair and the vertical-angle pair highlighted in separate colours'
      : `Two parallel lines cut by a transversal, highlighting ${highlight} angles`

  return (
    <div className="diagram">
      <svg
        ref={svgRef}
        className={`diagram__svg${interactive ? ' is-interactive' : ''}`}
        viewBox="0 0 360 360"
        role={interactive ? undefined : 'img'}
        aria-label={interactive ? undefined : figureLabel}
        onPointerMove={interactive ? handlePointerMove : undefined}
        onPointerUp={interactive ? endDrag : undefined}
        onPointerCancel={interactive ? endDrag : undefined}
      >
        <line className="angles__line" x1={lineX0} y1={topY} x2={lineX1} y2={topY} />
        <line className="angles__line" x1={lineX0} y1={botY} x2={lineX1} y2={botY} />

        {wedges.map((wedge) => (
          <path
            key={wedge.id}
            className={wedgeClass(wedge.tone)}
            d={angleSectorPath(
              wedge.vertex,
              addRay(wedge.vertex, wedge.dirA, wedgeR),
              addRay(wedge.vertex, wedge.dirB, wedgeR),
              wedgeR,
            )}
          />
        ))}

        <line
          className="angles__transversal"
          x1={segTop.x}
          y1={segTop.y}
          x2={segBottom.x}
          y2={segBottom.y}
        />

        {wedges.map((wedge) => (
          <path
            key={wedge.id}
            className={arcClass(wedge.tone)}
            d={angleArcPath(
              wedge.vertex,
              addRay(wedge.vertex, wedge.dirA, wedgeR),
              addRay(wedge.vertex, wedge.dirB, wedgeR),
              wedgeR,
            )}
          />
        ))}

        <g className="diagram__point" transform={`translate(${top.x} ${top.y})`}>
          <circle r={4} />
        </g>
        <g className="diagram__point" transform={`translate(${bottom.x} ${bottom.y})`}>
          <circle r={4} />
        </g>

        {!interactive &&
          wedges.map((wedge) => {
            const override =
              wedge.id === 'marked' ? markedLabel : wedge.id === 'partner' ? partnerLabel : undefined
            const label = override ?? (showValues !== false ? `${Math.round(wedge.value)}\u00B0` : null)
            if (label === null) {
              return null
            }
            const position = bisectorPos(wedge.vertex, wedge.dirA, wedge.dirB, 30)
            return (
              <text
                key={wedge.id}
                className={valueClass(wedge.tone)}
                x={position.x}
                y={position.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {label}
              </text>
            )
          })}

        {interactive ? (
          <g
            className="diagram__handle"
            transform={`translate(${handle.x} ${handle.y})`}
            tabIndex={0}
            role="slider"
            aria-label="Transversal angle"
            aria-valuemin={-maxTilt}
            aria-valuemax={maxTilt}
            aria-valuenow={Math.round(tiltDeg)}
            onKeyDown={nudge}
            onPointerDown={(event) => {
              setActive(true)
              svgRef.current?.setPointerCapture(event.pointerId)
              moveToPointer(event.clientX, event.clientY)
            }}
          >
            <circle className="diagram__hit" r={24} />
            <circle r={14} />
          </g>
        ) : null}
      </svg>

      {interactive && showReadout !== false ? (
        <dl className="diagram__readout" aria-live="polite">
          {getReadoutCells().map((cell) => (
            <div key={cell.id}>
              <dt>{cell.term}</dt>
              <dd className={cell.cls}>{Math.round(cell.value)}&deg;</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  )
}
