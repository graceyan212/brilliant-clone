import { type Circle, type Point, regularPolygonPoints } from '../../engine/geometry'
import './ProofDiagram.css'
import './CircleDiagram.css'

// A regular hexagon is the worked case: fanning diagonals from one vertex splits
// any n-gon into (n - 2) triangles, so the interior angles total (n - 2) x 180.
const circle: Circle = { center: { x: 180, y: 180 }, radius: 130 }
const sides = 6
const triangleCount = sides - 2

function centroid(a: Point, b: Point, c: Point): Point {
  return { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 }
}

export function PolygonAngleSumProof({ revealed }: { revealed: number }) {
  const points = regularPolygonPoints(circle, sides)
  const hub = points[0]
  const outline = `${points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')} Z`

  // Diagonals run from the hub to every non-adjacent vertex (skip the two neighbors).
  const diagonals = points.slice(2, sides - 1)
  // Fan triangles: (hub, p[i+1], p[i+2]) for i = 0 .. n-3.
  const triangles = Array.from({ length: triangleCount }, (_, i) => [hub, points[i + 1], points[i + 2]] as const)

  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A regular hexagon split from one corner into four triangles by drawing every diagonal from that corner; each triangle holds 180 degrees, so the six interior angles total (6 minus 2) times 180, which is 720 degrees."
    >
      <path className="proof-triangle" d={outline} />
      <path className="diagram__chord" fill="none" d={outline} />

      {revealed >= 3 && (
        <g className="proof-in">
          {triangles.map(([a, b, c], i) => (
            <polygon
              key={i}
              className={i % 2 === 0 ? 'proof-triangle' : 'proof-central-fill'}
              points={`${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y}`}
            />
          ))}
        </g>
      )}

      {revealed >= 2 && (
        <g className="proof-in">
          {diagonals.map((p, i) => (
            <line key={i} className="diagram__base" x1={hub.x} y1={hub.y} x2={p.x} y2={p.y} />
          ))}
        </g>
      )}

      {revealed >= 3 && (
        <g className="proof-in">
          {triangles.map(([a, b, c], i) => {
            const mid = centroid(a, b, c)
            return (
              <text
                key={i}
                className="proof-value proof-value--accent"
                x={mid.x}
                y={mid.y}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                180&deg;
              </text>
            )
          })}
        </g>
      )}

      {points.map((p, i) => (
        <g
          key={i}
          className={i === 0 ? 'diagram__point is-accent' : 'diagram__point'}
          transform={`translate(${p.x} ${p.y})`}
        >
          <circle r={5} />
        </g>
      ))}

      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={344} textAnchor="middle">
          ({sides} &minus; 2) &times; 180&deg; = <tspan className="proof-value--accent">720&deg;</tspan>
        </text>
      )}
    </svg>
  )
}
