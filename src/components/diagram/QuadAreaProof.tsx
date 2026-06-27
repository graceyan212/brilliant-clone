import './ProofDiagram.css'
import './CircleDiagram.css'

// Shear proof: slice the right triangle off one end of a parallelogram and slide
// it to the other end. The result is a rectangle with the same base and height,
// so the parallelogram's area is base x height (and a triangle is half of that).
export function QuadAreaProof({ revealed }: { revealed: number }) {
  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A parallelogram with base b and perpendicular height h. A right triangle is cut from the left end and slid to the right end, turning the parallelogram into a rectangle of the same base and height, so its area is b times h."
    >
      {/* Center the figure in the box; the conclusion line stays centered on its
          own at the bottom (it must not shift with the figure). */}
      <g transform="translate(-15 -25)">
        {revealed <= 2 && (
          <>
            <polygon className="proof-triangle" points="70,270 250,270 320,120 140,120" />

            {revealed >= 2 && (
              <polygon className="proof-central-fill proof-in" points="140,120 70,270 140,270" />
            )}

            <line className="diagram__chord" x1={70} y1={270} x2={250} y2={270} />
            <line className="diagram__chord" x1={250} y1={270} x2={320} y2={120} />
            <line className="diagram__chord" x1={320} y1={120} x2={140} y2={120} />
            <line className="diagram__chord" x1={140} y1={120} x2={70} y2={270} />

            <line className="diagram__base" x1={140} y1={120} x2={140} y2={270} />
            <path className="diagram__chord" fill="none" d="M 154 270 L 154 256 L 140 256" />

            <text className="proof-value proof-value--arc" x={160} y={290} textAnchor="middle" dominantBaseline="middle">
              b
            </text>
            <text className="proof-value proof-value--arc" x={122} y={195} textAnchor="middle" dominantBaseline="middle">
              h
            </text>
          </>
        )}

        {revealed >= 3 && (
          <>
            <polygon className="proof-triangle" points="140,270 250,270 320,120 140,120" />
            <polygon className="proof-central-fill proof-in" points="250,270 320,270 320,120" />

            <line className="diagram__base" x1={250} y1={270} x2={320} y2={120} />

            <rect className="diagram__chord" fill="none" x={140} y={120} width={180} height={150} />
            <path className="diagram__chord" fill="none" d="M 306 270 L 306 256 L 320 256" />

            <text className="proof-value proof-value--arc" x={230} y={290} textAnchor="middle" dominantBaseline="middle">
              b
            </text>
            <text className="proof-value proof-value--arc" x={124} y={195} textAnchor="middle" dominantBaseline="middle">
              h
            </text>
          </>
        )}
      </g>

      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={332} textAnchor="middle">
          Area = <tspan className="proof-value--arc">b</tspan> &times;{' '}
          <tspan className="proof-value--arc">h</tspan>
        </text>
      )}
    </svg>
  )
}
