import { type Circle, type Point, arcPath, pointOnCircle } from '../engine/geometry'
import './HeroIllustration.css'

// A decorative emblem, not a lesson figure: a triangle inscribed in the rim with
// its hypotenuse on the diameter, so Thales' theorem forces a right angle at the
// apex. The teal radius + rim arc nod to the central/inscribed-angle theorems the
// course is built around. Mirror the brand mark's vocabulary (ink ring, accent
// angle, teal arc) at a larger, composed scale.
const circle: Circle = { center: { x: 100, y: 104 }, radius: 74 }

// Diameter endpoints (the hypotenuse) and the apex on the upper-left rim. The
// apex sits off-centre so the right triangle reads as intentional, not generic.
const left = pointOnCircle(circle, 180)
const right = pointOnCircle(circle, 0)
const apex = pointOnCircle(circle, 240)

// Rim arc subtended between the diameter end A and the apex C — the arc the teal
// radius "opens onto", echoing how lessons shade an intercepted arc.
const subtendedArc = arcPath(circle, 180, 60)

const rightAngleSize = 14

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  return { x: dx / length, y: dy / length }
}

// Square tucked into the right-angle corner at `vertex`, opening toward the two
// adjacent points.
function rightAnglePath(vertex: Point, toward1: Point, toward2: Point, size: number): string {
  const u = unit(vertex, toward1)
  const w = unit(vertex, toward2)
  const c1 = { x: vertex.x + u.x * size, y: vertex.y + u.y * size }
  const c2 = { x: vertex.x + (u.x + w.x) * size, y: vertex.y + (u.y + w.y) * size }
  const c3 = { x: vertex.x + w.x * size, y: vertex.y + w.y * size }
  return `M ${c1.x} ${c1.y} L ${c2.x} ${c2.y} L ${c3.x} ${c3.y}`
}

export function HeroIllustration() {
  const face = `${left.x},${left.y} ${apex.x},${apex.y} ${right.x},${right.y}`

  return (
    <svg
      className="hero-emblem"
      viewBox="0 0 200 200"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <polygon className="hero-emblem__face" points={face} />

      <path className="hero-emblem__arc" d={subtendedArc} />

      <circle
        className="hero-emblem__circle"
        cx={circle.center.x}
        cy={circle.center.y}
        r={circle.radius}
      />

      <line className="hero-emblem__edge" x1={left.x} y1={left.y} x2={right.x} y2={right.y} />
      <line className="hero-emblem__edge" x1={apex.x} y1={apex.y} x2={left.x} y2={left.y} />
      <line className="hero-emblem__edge" x1={apex.x} y1={apex.y} x2={right.x} y2={right.y} />

      <line
        className="hero-emblem__radius"
        x1={circle.center.x}
        y1={circle.center.y}
        x2={apex.x}
        y2={apex.y}
      />

      <path className="hero-emblem__right-angle" d={rightAnglePath(apex, left, right, rightAngleSize)} />

      <circle className="hero-emblem__dot" cx={left.x} cy={left.y} r={4} />
      <circle className="hero-emblem__dot" cx={right.x} cy={right.y} r={4} />
      <circle className="hero-emblem__dot" cx={circle.center.x} cy={circle.center.y} r={3.5} />
      <circle className="hero-emblem__dot hero-emblem__dot--accent" cx={apex.x} cy={apex.y} r={4} />
    </svg>
  )
}
