import type { ReactNode } from 'react'
import './SceneGraphic.css'

// Reusable, decorative "real-world" illustrations that hook a concept before the
// math starts. Each scene is deterministic inline SVG coloured from the shared
// palette, so Phase 2 lessons can drop one in by name. Add new scenes here.

type SceneProps = { name: string; caption?: string }

type Pt = { x: number; y: number }

// Small deterministic geometry helpers shared by the scenes below. Angles use
// 0deg = east and increase clockwise (SVG y-down), matching pointOnCircle.
function polar(cx: number, cy: number, r: number, deg: number): Pt {
  const a = (deg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

// Stroked arc from startDeg to endDeg along a circle.
function arcD(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, endDeg)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  const sweep = endDeg > startDeg ? 1 : 0
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`
}

// Always the minor (<180deg) arc between two headings — handy for angle marks.
function smallArc(cx: number, cy: number, r: number, fromDeg: number, toDeg: number): string {
  let diff = toDeg - fromDeg
  while (diff <= -180) diff += 360
  while (diff > 180) diff -= 360
  const s = polar(cx, cy, r, fromDeg)
  const e = polar(cx, cy, r, fromDeg + diff)
  return `M ${s.x} ${s.y} A ${r} ${r} 0 0 ${diff >= 0 ? 1 : 0} ${e.x} ${e.y}`
}

// Filled pie wedge from startDeg to endDeg.
function wedgeD(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const s = polar(cx, cy, r, startDeg)
  const e = polar(cx, cy, r, endDeg)
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0
  const sweep = endDeg > startDeg ? 1 : 0
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y} Z`
}

// Pointy-top regular hexagon centred at (cx, cy).
function hexD(cx: number, cy: number, r: number): string {
  const pts = [30, 90, 150, 210, 270, 330].map((d) => polar(cx, cy, r, d))
  return `M ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} Z`
}

function angleOf(from: Pt, to: Pt): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI
}

function along(from: Pt, to: Pt, dist: number): Pt {
  const a = (angleOf(from, to) * Math.PI) / 180
  return { x: from.x + Math.cos(a) * dist, y: from.y + Math.sin(a) * dist }
}

// Intersection of line AB with line CD (assumes they are not parallel).
function intersect(a: Pt, b: Pt, c: Pt, d: Pt): Pt {
  const a1 = b.y - a.y
  const b1 = a.x - b.x
  const c1 = a1 * a.x + b1 * a.y
  const a2 = d.y - c.y
  const b2 = c.x - d.x
  const c2 = a2 * c.x + b2 * c.y
  const det = a1 * b2 - a2 * b1 || 1
  return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det }
}

// The two points where the ray from `from` in direction `dir` meets a circle,
// ordered near-then-far, or null if it misses.
function lineCircle(from: Pt, dir: Pt, center: Pt, r: number): [Pt, Pt] | null {
  const fx = from.x - center.x
  const fy = from.y - center.y
  const a = dir.x * dir.x + dir.y * dir.y
  const b = 2 * (fx * dir.x + fy * dir.y)
  const cc = fx * fx + fy * fy - r * r
  const disc = b * b - 4 * a * cc
  if (disc < 0) {
    return null
  }
  const root = Math.sqrt(disc)
  const t1 = (-b - root) / (2 * a)
  const t2 = (-b + root) / (2 * a)
  return [
    { x: from.x + dir.x * t1, y: from.y + dir.y * t1 },
    { x: from.x + dir.x * t2, y: from.y + dir.y * t2 },
  ]
}

// A simple house glyph for the three-towns scene.
function House({ x, y }: { x: number; y: number }): ReactNode {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-11} y={-2} width={22} height={17} rx="1.5" fill="#fff" stroke="var(--tok-slate)" strokeWidth="2" />
      <path d="M-14,-2 L0,-15 L14,-2 Z" fill="var(--tok-amber)" stroke="var(--tok-slate)" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x={-3.5} y={5} width={7} height={10} fill="var(--tok-slate)" />
    </g>
  )
}

function ParallelRoads(): ReactNode {
  // Two parallel roads crossed by a diagonal one — the angle-chasing setup.
  return (
    <svg viewBox="0 0 320 180" role="img" aria-label="Two parallel roads crossed by a diagonal road">
      <rect x="0" y="0" width="320" height="180" rx="14" fill="color-mix(in srgb, var(--tok-green) 10%, var(--surface))" />
      {/* parallel roads */}
      <g>
        <rect x="-10" y="46" width="340" height="26" fill="var(--tok-slate)" />
        <rect x="-10" y="112" width="340" height="26" fill="var(--tok-slate)" />
        <line x1="0" y1="59" x2="320" y2="59" stroke="#fff" strokeWidth="2" strokeDasharray="14 12" />
        <line x1="0" y1="125" x2="320" y2="125" stroke="#fff" strokeWidth="2" strokeDasharray="14 12" />
      </g>
      {/* diagonal transversal road */}
      <g transform="rotate(34 160 92)">
        <rect x="150" y="-30" width="26" height="250" fill="var(--tok-orange)" />
        <line x1="163" y1="-30" x2="163" y2="220" stroke="#fff" strokeWidth="2" strokeDasharray="12 12" />
      </g>
      {/* angle marks at the two crossings */}
      <circle cx="120" cy="59" r="13" fill="none" stroke="var(--tok-purple)" strokeWidth="3" />
      <circle cx="186" cy="125" r="13" fill="none" stroke="var(--tok-blue)" strokeWidth="3" />
    </svg>
  )
}

function Pizza(): ReactNode {
  // A pizza cut into slices with one slice pulled out — sectors & arcs.
  const cx = 160
  const cy = 96
  const r = 78
  const slices = 8
  const cuts = Array.from({ length: slices }, (_, index) => {
    const angle = (index / slices) * Math.PI * 2 - Math.PI / 2
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) }
  })
  const pepperoni = [
    { x: 150, y: 70 },
    { x: 185, y: 92 },
    { x: 140, y: 110 },
    { x: 178, y: 122 },
    { x: 120, y: 88 },
  ]
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A pizza cut into equal slices with one slice pulled out">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-amber) 10%, var(--surface))" />
      {/* crust + cheese */}
      <circle cx={cx} cy={cy} r={r + 6} fill="var(--tok-amber)" />
      <circle cx={cx} cy={cy} r={r} fill="color-mix(in srgb, var(--tok-amber) 28%, #fff)" />
      {/* cut lines */}
      {cuts.map((point, index) => (
        <line key={index} x1={cx} y1={cy} x2={point.x} y2={point.y} stroke="var(--tok-amber)" strokeWidth="2" />
      ))}
      {pepperoni.map((point, index) => (
        <circle key={index} cx={point.x} cy={point.y} r="7" fill="var(--tok-red)" />
      ))}
      {/* one slice pulled out and highlighted */}
      <g transform="translate(64 -2)">
        <path
          d={`M ${cx} ${cy} L ${cx + r * Math.cos(-Math.PI / 2)} ${cy + r * Math.sin(-Math.PI / 2)} A ${r} ${r} 0 0 1 ${
            cx + r * Math.cos(-Math.PI / 2 + (Math.PI * 2) / slices)
          } ${cy + r * Math.sin(-Math.PI / 2 + (Math.PI * 2) / slices)} Z`}
          fill="color-mix(in srgb, var(--tok-teal) 30%, #fff)"
          stroke="var(--tok-teal)"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx={cx + 4} cy={cy - 34} r="6" fill="var(--tok-red)" />
      </g>
    </svg>
  )
}

function Clock(): ReactNode {
  // A clock face with two hands making an angle — central angles / arcs.
  const cx = 160
  const cy = 100
  const r = 80
  const ticks = Array.from({ length: 12 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2
    return {
      x1: cx + (r - 10) * Math.cos(angle),
      y1: cy + (r - 10) * Math.sin(angle),
      x2: cx + r * Math.cos(angle),
      y2: cy + r * Math.sin(angle),
    }
  })
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A clock with two hands forming an angle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-blue) 8%, var(--surface))" />
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="var(--tok-slate)" strokeWidth="4" />
      {ticks.map((tick, index) => (
        <line key={index} x1={tick.x1} y1={tick.y1} x2={tick.x2} y2={tick.y2} stroke="var(--tok-slate)" strokeWidth="2" />
      ))}
      <path d={`M ${cx} ${cy} L ${cx} ${cy - 54} A 54 54 0 0 1 ${cx + 54 * Math.cos(Math.PI / 6)} ${cy - 54 * Math.sin(Math.PI / 6) + 0} Z`} fill="color-mix(in srgb, var(--tok-teal) 22%, transparent)" />
      <line x1={cx} y1={cy} x2={cx} y2={cy - 58} stroke="var(--tok-teal)" strokeWidth="5" strokeLinecap="round" />
      <line x1={cx} y1={cy} x2={cx + 66} y2={cy - 24} stroke="var(--tok-purple)" strokeWidth="5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="var(--ink)" />
    </svg>
  )
}

function Ladder(): ReactNode {
  // A ladder leaning on a wall — the classic right-triangle / Pythagoras hook.
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A ladder leaning against a wall, forming a right triangle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-blue) 8%, var(--surface))" />
      {/* ground + wall */}
      <line x1="40" y1="170" x2="280" y2="170" stroke="var(--tok-slate)" strokeWidth="4" />
      <line x1="80" y1="30" x2="80" y2="170" stroke="var(--tok-slate)" strokeWidth="4" />
      {/* right-angle marker */}
      <path d="M80 154 L96 154 L96 170" fill="none" stroke="var(--tok-green)" strokeWidth="3" />
      {/* the triangle */}
      <line x1="80" y1="50" x2="80" y2="170" stroke="var(--tok-blue)" strokeWidth="5" strokeLinecap="round" />
      <line x1="80" y1="170" x2="230" y2="170" stroke="var(--tok-orange)" strokeWidth="5" strokeLinecap="round" />
      {/* the ladder (hypotenuse) */}
      <line x1="80" y1="50" x2="230" y2="170" stroke="var(--tok-green)" strokeWidth="6" strokeLinecap="round" />
      {Array.from({ length: 5 }, (_, index) => {
        const t = (index + 1) / 6
        return (
          <line
            key={index}
            x1={80 + (230 - 80) * t - 10}
            y1={50 + (170 - 50) * t - 8}
            x2={80 + (230 - 80) * t + 10}
            y2={50 + (170 - 50) * t + 8}
            stroke="var(--tok-green)"
            strokeWidth="3"
          />
        )
      })}
    </svg>
  )
}

function Wheel(): ReactNode {
  // A cart wheel on a road — every round thing has the same parts.
  const cx = 158
  const cy = 94
  const r = 70
  const spokes = Array.from({ length: 12 }, (_, index) => polar(cx, cy, r - 8, index * 30))
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A cart wheel resting on a road">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-blue) 8%, var(--surface))" />
      <line x1="14" y1={cy + r + 6} x2="306" y2={cy + r + 6} stroke="var(--tok-teal)" strokeWidth="6" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r + 6} fill="none" stroke="var(--tok-slate)" strokeWidth="10" />
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="var(--tok-slate)" strokeWidth="2" />
      {spokes.map((p, index) => (
        <line key={index} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="var(--tok-purple)" strokeWidth="2.5" />
      ))}
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--tok-orange)" strokeWidth="5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="11" fill="var(--tok-slate)" />
      <circle cx={cx} cy={cy} r="4" fill="#fff" />
    </svg>
  )
}

function TriangleTear(): ReactNode {
  // Tear off the three corners and they line up into a straight angle.
  const cx = 160
  const baseY = 172
  const r = 52
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="The three torn corners of a paper triangle lined up to make a straight line">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-orange) 8%, var(--surface))" />
      <polygon points="160,26 100,98 222,98" fill="#fff" stroke="var(--tok-slate)" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="160" cy="42" r="8" fill="var(--tok-blue)" />
      <circle cx="113" cy="92" r="8" fill="var(--tok-orange)" />
      <circle cx="209" cy="92" r="8" fill="var(--tok-green)" />
      <line x1="58" y1={baseY} x2="262" y2={baseY} stroke="var(--tok-slate)" strokeWidth="3" strokeLinecap="round" />
      <path d={wedgeD(cx, baseY, r, 180, 240)} fill="var(--tok-blue)" opacity="0.8" />
      <path d={wedgeD(cx, baseY, r, 240, 300)} fill="var(--tok-orange)" opacity="0.8" />
      <path d={wedgeD(cx, baseY, r, 300, 360)} fill="var(--tok-green)" opacity="0.8" />
    </svg>
  )
}

function SetSquare(): ReactNode {
  // A 45 degree drafting set square — equal legs, a square corner.
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A 45 degree set-square drafting triangle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-green) 8%, var(--surface))" />
      <polygon points="74,52 74,166 222,166" fill="color-mix(in srgb, var(--tok-green) 12%, #fff)" stroke="var(--tok-slate)" strokeWidth="2" strokeLinejoin="round" />
      <polygon points="100,96 100,150 154,150" fill="color-mix(in srgb, var(--tok-green) 7%, var(--surface))" stroke="var(--tok-slate)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="74" y1="52" x2="74" y2="166" stroke="var(--tok-orange)" strokeWidth="5" strokeLinecap="round" />
      <line x1="74" y1="166" x2="222" y2="166" stroke="var(--tok-blue)" strokeWidth="5" strokeLinecap="round" />
      <line x1="74" y1="52" x2="222" y2="166" stroke="var(--tok-green)" strokeWidth="5" strokeLinecap="round" />
      <path d="M74,150 L90,150 L90,166" fill="none" stroke="var(--tok-green)" strokeWidth="2.5" />
      <text x="190" y="158" fill="var(--tok-slate)" fontFamily="var(--mono)" fontSize="13" fontWeight="700" textAnchor="middle">
        45&deg;
      </text>
    </svg>
  )
}

function PhotoEnlarge(): ReactNode {
  // Blow up a small photo from a shared corner — same shape, scaled by 2.
  const corner = { x: 86, y: 162 }
  const small = { w: 62, h: 42 }
  const big = { w: 124, h: 84 }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A small photo enlarged to twice its size from a shared corner">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-blue) 8%, var(--surface))" />
      <line x1={corner.x} y1={corner.y} x2={corner.x + big.w} y2={corner.y - big.h} stroke="var(--tok-slate)" strokeWidth="1.5" strokeDasharray="5 5" />
      <line x1={corner.x + small.w} y1={corner.y} x2={corner.x + big.w} y2={corner.y} stroke="var(--tok-slate)" strokeWidth="1.5" strokeDasharray="5 5" />
      <line x1={corner.x} y1={corner.y - small.h} x2={corner.x} y2={corner.y - big.h} stroke="var(--tok-slate)" strokeWidth="1.5" strokeDasharray="5 5" />
      <rect x={corner.x} y={corner.y - big.h} width={big.w} height={big.h} rx="4" fill="#fff" stroke="var(--tok-orange)" strokeWidth="3" />
      <rect x={corner.x} y={corner.y - small.h} width={small.w} height={small.h} rx="3" fill="#fff" stroke="var(--tok-blue)" strokeWidth="3" />
      <circle cx={corner.x + 17} cy={corner.y - small.h + 13} r="6" fill="var(--tok-amber)" />
      <path d={`M${corner.x + 3},${corner.y - 3} L${corner.x + 24},${corner.y - 24} L${corner.x + 45},${corner.y - 3} Z`} fill="var(--tok-green)" opacity="0.7" />
      <text x={corner.x + big.w - 18} y={corner.y - big.h + 22} fill="var(--tok-orange)" fontFamily="var(--mono)" fontSize="15" fontWeight="700" textAnchor="middle">
        &times;2
      </text>
    </svg>
  )
}

function Tiles(): ReactNode {
  // A floor of hexagons that fit together with no gaps.
  const R = 27
  const dx = Math.sqrt(3) * R
  const dy = 1.5 * R
  const tints = ['teal', 'blue', 'green']
  const hexes: { x: number; y: number; tint: string }[] = []
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      const x = 26 + col * dx + (row % 2 ? dx / 2 : 0)
      const y = 38 + row * dy
      if (x < 304 && y < 188) {
        hexes.push({ x, y, tint: tints[(row + col) % 3] })
      }
    }
  }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A floor tiled with hexagons that fit together with no gaps">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-blue) 6%, var(--surface))" />
      {hexes.map((h, index) => (
        <path
          key={index}
          d={hexD(h.x, h.y, R)}
          fill={`color-mix(in srgb, var(--tok-${h.tint}) 22%, #fff)`}
          stroke={`var(--tok-${h.tint})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

function Sail(): ReactNode {
  // A sail: a base, two slanted sides, and a straight-down (perpendicular) height.
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A sailboat whose sail shows a base, slanted sides, and a straight-down height">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-teal) 8%, var(--surface))" />
      <path d="M0,178 Q40,170 80,178 T160,178 T240,178 T320,178 L320,200 L0,200 Z" fill="color-mix(in srgb, var(--tok-blue) 20%, var(--surface))" />
      <line x1="110" y1="40" x2="110" y2="172" stroke="var(--tok-slate)" strokeWidth="3" strokeLinecap="round" />
      <polygon points="110,150 210,150 240,60 140,60" fill="color-mix(in srgb, var(--tok-orange) 12%, #fff)" />
      <line x1="110" y1="150" x2="140" y2="60" stroke="var(--tok-slate)" strokeWidth="2.5" />
      <line x1="210" y1="150" x2="240" y2="60" stroke="var(--tok-slate)" strokeWidth="2.5" />
      <line x1="110" y1="150" x2="210" y2="150" stroke="var(--tok-blue)" strokeWidth="5" strokeLinecap="round" />
      <line x1="140" y1="60" x2="140" y2="150" stroke="var(--tok-orange)" strokeWidth="3" strokeDasharray="6 5" />
      <path d="M140,136 L154,136 L154,150" fill="none" stroke="var(--tok-orange)" strokeWidth="2" />
      <path d="M86,170 L234,170 L214,188 L106,188 Z" fill="var(--tok-slate)" />
    </svg>
  )
}

function GoalAngle(): ReactNode {
  // A goalkeeper's view: from any spot on the circle the goal subtends the same angle.
  const cx = 162
  const cy = 120
  const r = 84
  const a = polar(cx, cy, r, 235)
  const b = polar(cx, cy, r, 305)
  const p = polar(cx, cy, r, 90)
  const o = { x: cx, y: cy }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A goalkeeper's view of the goal from a spot on a circle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-green) 8%, var(--surface))" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tok-slate)" strokeWidth="1.5" strokeDasharray="4 5" />
      <rect x={a.x} y={a.y - 18} width={b.x - a.x} height={18} fill="none" stroke="var(--tok-slate)" strokeWidth="2" />
      {[0.25, 0.5, 0.75].map((t, index) => (
        <line key={index} x1={a.x + (b.x - a.x) * t} y1={a.y - 18} x2={a.x + (b.x - a.x) * t} y2={a.y} stroke="var(--tok-slate)" strokeWidth="1" />
      ))}
      <line x1={a.x} y1={a.y - 9} x2={b.x} y2={b.y - 9} stroke="var(--tok-slate)" strokeWidth="1" />
      <path d={wedgeD(o.x, o.y, 34, 235, 305)} fill="color-mix(in srgb, var(--tok-teal) 28%, transparent)" />
      <line x1={o.x} y1={o.y} x2={a.x} y2={a.y} stroke="var(--tok-teal)" strokeWidth="2.5" />
      <line x1={o.x} y1={o.y} x2={b.x} y2={b.y} stroke="var(--tok-teal)" strokeWidth="2.5" />
      <circle cx={o.x} cy={o.y} r="4" fill="var(--ink)" />
      <line x1={p.x} y1={p.y} x2={a.x} y2={a.y} stroke="var(--tok-red)" strokeWidth="2.5" />
      <line x1={p.x} y1={p.y} x2={b.x} y2={b.y} stroke="var(--tok-red)" strokeWidth="2.5" />
      <path d={smallArc(p.x, p.y, 30, angleOf(p, a), angleOf(p, b))} fill="none" stroke="var(--tok-red)" strokeWidth="3" />
      <circle cx={p.x} cy={p.y} r="7" fill="var(--tok-red)" />
      <circle cx={polar(cx, cy, r, 150).x} cy={polar(cx, cy, r, 150).y} r="4" fill="color-mix(in srgb, var(--tok-red) 55%, transparent)" />
    </svg>
  )
}

function Ferris(): ReactNode {
  // Four friends in the cabins of a Ferris wheel all sit on one circle.
  const cx = 160
  const cy = 90
  const r = 70
  const seats = [
    { deg: 60, tint: 'magenta', label: 'A' },
    { deg: 150, tint: 'orange', label: 'B' },
    { deg: 240, tint: 'magenta', label: 'C' },
    { deg: 330, tint: 'orange', label: 'D' },
  ].map((s) => ({ ...s, p: polar(cx, cy, r, s.deg) }))
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Four cabins on a Ferris wheel marking four points on a circle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-magenta) 6%, var(--surface))" />
      <line x1="120" y1="182" x2={cx} y2={cy} stroke="var(--tok-slate)" strokeWidth="4" />
      <line x1="200" y1="182" x2={cx} y2={cy} stroke="var(--tok-slate)" strokeWidth="4" />
      <line x1="92" y1="182" x2="228" y2="182" stroke="var(--tok-slate)" strokeWidth="4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tok-slate)" strokeWidth="3" />
      {seats.map((s, index) => (
        <line key={index} x1={cx} y1={cy} x2={s.p.x} y2={s.p.y} stroke="var(--tok-slate)" strokeWidth="1.5" />
      ))}
      <polygon
        points={seats.map((s) => `${s.p.x},${s.p.y}`).join(' ')}
        fill="none"
        stroke="color-mix(in srgb, var(--tok-slate) 55%, transparent)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle cx={cx} cy={cy} r="6" fill="var(--tok-slate)" />
      {seats.map((s, index) => (
        <g key={`cabin-${index}`}>
          <circle
            cx={s.p.x}
            cy={s.p.y}
            r="14"
            fill={`color-mix(in srgb, var(--tok-${s.tint}) 28%, #fff)`}
            stroke={`var(--tok-${s.tint})`}
            strokeWidth="3"
          />
          <text x={s.p.x} y={s.p.y + 4} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="700" fill={`var(--tok-${s.tint})`}>
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

function XCross(): ReactNode {
  // Two chords crossing inside a circle like a railroad diamond.
  const cx = 160
  const cy = 100
  const r = 82
  const a = polar(cx, cy, r, 195)
  const b = polar(cx, cy, r, 35)
  const c = polar(cx, cy, r, 315)
  const d = polar(cx, cy, r, 145)
  const p = intersect(a, b, c, d)
  const ties = (from: Pt, to: Pt) => {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    return [0.28, 0.44, 0.6, 0.76].map((t) => {
      const mx = from.x + dx * t
      const my = from.y + dy * t
      return { x1: mx - nx * 6, y1: my - ny * 6, x2: mx + nx * 6, y2: my + ny * 6 }
    })
  }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Two chords crossing inside a circle like a railroad diamond">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-magenta) 6%, var(--surface))" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tok-slate)" strokeWidth="2.5" />
      <path d={arcD(cx, cy, r, 195, 315)} fill="none" stroke="var(--tok-teal)" strokeWidth="6" strokeLinecap="round" />
      <path d={arcD(cx, cy, r, 35, 145)} fill="none" stroke="var(--tok-orange)" strokeWidth="6" strokeLinecap="round" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--tok-slate)" strokeWidth="3" />
      <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="var(--tok-slate)" strokeWidth="3" />
      {[...ties(a, b), ...ties(c, d)].map((t, index) => (
        <line key={index} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="var(--tok-slate)" strokeWidth="1.5" />
      ))}
      <line x1={p.x} y1={p.y} x2={along(p, a, 30).x} y2={along(p, a, 30).y} stroke="var(--tok-magenta)" strokeWidth="3" />
      <line x1={p.x} y1={p.y} x2={along(p, c, 30).x} y2={along(p, c, 30).y} stroke="var(--tok-magenta)" strokeWidth="3" />
      <path d={smallArc(p.x, p.y, 21, angleOf(p, a), angleOf(p, c))} fill="none" stroke="var(--tok-magenta)" strokeWidth="3" />
      <circle cx={p.x} cy={p.y} r="4" fill="var(--ink)" />
    </svg>
  )
}

function Slingshot(): ReactNode {
  // Two secant lines from an outside point, aimed at a circle like a slingshot.
  const cx = 210
  const cy = 104
  const r = 72
  const p = { x: 48, y: 104 }
  const theta = 17
  const upper = lineCircle(p, { x: Math.cos((-theta * Math.PI) / 180), y: Math.sin((-theta * Math.PI) / 180) }, { x: cx, y: cy }, r)
  const lower = lineCircle(p, { x: Math.cos((theta * Math.PI) / 180), y: Math.sin((theta * Math.PI) / 180) }, { x: cx, y: cy }, r)
  const center = { x: cx, y: cy }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Two secant lines from an outside point aimed at a circle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-magenta) 6%, var(--surface))" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tok-slate)" strokeWidth="2.5" />
      {upper && lower && (
        <>
          <path
            d={smallArc(cx, cy, r, angleOf(center, upper[1]), angleOf(center, lower[1]))}
            fill="none"
            stroke="var(--tok-orange)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d={smallArc(cx, cy, r, angleOf(center, upper[0]), angleOf(center, lower[0]))}
            fill="none"
            stroke="var(--tok-teal)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <line x1={p.x} y1={p.y} x2={upper[1].x} y2={upper[1].y} stroke="var(--tok-slate)" strokeWidth="2.5" />
          <line x1={p.x} y1={p.y} x2={lower[1].x} y2={lower[1].y} stroke="var(--tok-slate)" strokeWidth="2.5" />
          <path
            d={smallArc(p.x, p.y, 30, angleOf(p, upper[1]), angleOf(p, lower[1]))}
            fill="none"
            stroke="var(--tok-magenta)"
            strokeWidth="3"
          />
          {[upper[0], upper[1], lower[0], lower[1]].map((pt, index) => (
            <circle key={index} cx={pt.x} cy={pt.y} r="4" fill="var(--ink)" />
          ))}
        </>
      )}
      <line x1="24" y1="104" x2={p.x} y2={p.y} stroke="var(--tok-slate)" strokeWidth="5" strokeLinecap="round" />
      <line x1={p.x} y1={p.y} x2="74" y2="86" stroke="var(--tok-slate)" strokeWidth="5" strokeLinecap="round" />
      <line x1={p.x} y1={p.y} x2="74" y2="122" stroke="var(--tok-slate)" strokeWidth="5" strokeLinecap="round" />
      <circle cx={p.x} cy={p.y} r="6" fill="var(--tok-amber)" />
    </svg>
  )
}

function TangentRoad(): ReactNode {
  // A wheel touching a road: the radius to the contact point is perpendicular.
  const cx = 160
  const cy = 84
  const r = 58
  const contact = { x: cx, y: cy + r }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A wheel touching a road, with the radius meeting the road at a right angle">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-orange) 6%, var(--surface))" />
      <line x1="14" y1={contact.y} x2="306" y2={contact.y} stroke="var(--tok-orange)" strokeWidth="6" strokeLinecap="round" />
      <line x1="20" y1={contact.y} x2="300" y2={contact.y} stroke="#fff" strokeWidth="2" strokeDasharray="14 14" />
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="var(--tok-slate)" strokeWidth="6" />
      {[0, 60, 120, 180, 240, 300].map((deg, index) => {
        const spoke = polar(cx, cy, r - 6, deg)
        return <line key={index} x1={cx} y1={cy} x2={spoke.x} y2={spoke.y} stroke="color-mix(in srgb, var(--tok-slate) 35%, transparent)" strokeWidth="1.5" />
      })}
      <line x1={cx} y1={cy} x2={contact.x} y2={contact.y} stroke="var(--tok-blue)" strokeWidth="4" />
      <path d={`M${contact.x - 14},${contact.y} L${contact.x - 14},${contact.y - 14} L${contact.x},${contact.y - 14}`} fill="none" stroke="var(--tok-green)" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r="6" fill="var(--tok-slate)" />
      <circle cx={contact.x} cy={contact.y} r="4" fill="var(--tok-blue)" />
    </svg>
  )
}

function CrossingStrings(): ReactNode {
  // Two strings stretched across a hoop, crossing at an inside point.
  const cx = 160
  const cy = 100
  const r = 84
  const a = polar(cx, cy, r, 205)
  const b = polar(cx, cy, r, 340)
  const c = polar(cx, cy, r, 250)
  const d = polar(cx, cy, r, 60)
  const p = intersect(a, b, c, d)
  const knots: [Pt, string][] = [
    [a, 'blue'],
    [b, 'blue'],
    [c, 'orange'],
    [d, 'orange'],
  ]
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="Two strings crossing inside a hoop, forming four segments">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-blue) 6%, var(--surface))" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tok-slate)" strokeWidth="3" />
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--tok-blue)" strokeWidth="4" strokeLinecap="round" />
      <line x1={c.x} y1={c.y} x2={d.x} y2={d.y} stroke="var(--tok-orange)" strokeWidth="4" strokeLinecap="round" />
      {knots.map(([pt, tint], index) => (
        <circle key={index} cx={pt.x} cy={pt.y} r="6" fill={`var(--tok-${tint})`} stroke="#fff" strokeWidth="2" />
      ))}
      <circle cx={p.x} cy={p.y} r="5" fill="var(--ink)" />
      <text x={p.x + 10} y={p.y - 9} fill="var(--ink-2)" fontFamily="var(--mono)" fontSize="13" fontWeight="700">
        P
      </text>
    </svg>
  )
}

function ThreeTowns(): ReactNode {
  // One tower placed the same distance from three towns — the centre of their circle.
  const cx = 158
  const cy = 106
  const r = 76
  const towns = [polar(cx, cy, r, 270), polar(cx, cy, r, 30), polar(cx, cy, r, 150)]
  const o = { x: cx, y: cy }
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label="A signal tower placed at equal distance from three towns">
      <rect x="0" y="0" width="320" height="200" rx="14" fill="color-mix(in srgb, var(--tok-green) 6%, var(--surface))" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--tok-slate)" strokeWidth="1.5" strokeDasharray="4 5" />
      {towns.map((t, index) => (
        <line key={index} x1={o.x} y1={o.y} x2={t.x} y2={t.y} stroke="var(--tok-green)" strokeWidth="3" />
      ))}
      {towns.map((t, index) => (
        <House key={`town-${index}`} x={t.x} y={t.y} />
      ))}
      <path d={arcD(o.x, o.y - 14, 16, 208, 332)} fill="none" stroke="var(--tok-orange)" strokeWidth="2" />
      <path d={arcD(o.x, o.y - 14, 10, 208, 332)} fill="none" stroke="var(--tok-orange)" strokeWidth="2" />
      <path d={`M${o.x - 7},${o.y + 10} L${o.x},${o.y - 16} L${o.x + 7},${o.y + 10} Z`} fill="var(--tok-slate)" />
      <circle cx={o.x} cy={o.y} r="4" fill="var(--ink)" />
    </svg>
  )
}

const SCENES: Record<string, () => ReactNode> = {
  'parallel-roads': ParallelRoads,
  pizza: Pizza,
  clock: Clock,
  ladder: Ladder,
  wheel: Wheel,
  'triangle-tear': TriangleTear,
  'set-square': SetSquare,
  'photo-enlarge': PhotoEnlarge,
  tiles: Tiles,
  sail: Sail,
  'goal-angle': GoalAngle,
  ferris: Ferris,
  'x-cross': XCross,
  slingshot: Slingshot,
  'tangent-road': TangentRoad,
  'crossing-strings': CrossingStrings,
  'three-towns': ThreeTowns,
}

export function SceneGraphic({ name, caption }: SceneProps) {
  const render = SCENES[name]
  if (!render) {
    return null
  }
  return (
    <figure className="scene">
      <div className="scene__svg">{render()}</div>
      {caption && <figcaption className="scene__caption">{caption}</figcaption>}
    </figure>
  )
}
