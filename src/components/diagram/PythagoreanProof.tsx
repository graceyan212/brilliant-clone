import './ProofDiagram.css'
import './CircleDiagram.css'

export function PythagoreanProof({ revealed }: { revealed: number }) {
  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="A square-dissection proof of the Pythagorean theorem: four identical right triangles tile a large square, first leaving a tilted square of area c squared, then rearranged to leave two upright squares of areas a squared and b squared, showing a squared plus b squared equals c squared."
    >
      {/* Stage 1 and stage 2 are mutually exclusive views; the dissection
          becomes cumulative from stage 3 onward. */}
      {revealed === 1 && (
        <g className="proof-in">
          <polygon className="proof-triangle" points="120,250 240,250 120,90" />

          <line className="diagram__chord" x1={120} y1={250} x2={240} y2={250} />
          <line className="diagram__chord" x1={120} y1={250} x2={120} y2={90} />
          <line className="diagram__chord" x1={240} y1={250} x2={120} y2={90} />

          <path className="diagram__chord" fill="none" d="M 134 250 L 134 236 L 120 236" />

          <text
            className="proof-value proof-value--arc"
            x={180}
            y={270}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            a
          </text>
          <text
            className="proof-value proof-value--arc"
            x={100}
            y={170}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            b
          </text>
          <text
            className="proof-value proof-value--accent"
            x={192}
            y={162}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            c
          </text>
        </g>
      )}

      {revealed === 2 && (
        <g className="proof-in">
          <polygon className="proof-triangle" points="40,40 160,40 40,200" />
          <polygon className="proof-triangle" points="320,40 320,160 160,40" />
          <polygon className="proof-triangle" points="320,320 200,320 320,160" />
          <polygon className="proof-triangle" points="40,320 40,200 200,320" />

          <polygon className="proof-inscribed-fill" points="160,40 320,160 200,320 40,200" />
          <polygon className="proof-inscribed" fill="none" points="160,40 320,160 200,320 40,200" />

          <text
            className="proof-value proof-value--accent is-emphatic"
            x={180}
            y={180}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            c²
          </text>
        </g>
      )}

      {revealed >= 3 && (
        <g className="proof-in">
          <polygon className="proof-central-fill" points="40,40 160,40 160,160 40,160" />
          <polygon className="proof-central-fill" points="160,160 320,160 320,320 160,320" />

          <polygon className="proof-triangle" points="160,40 320,40 320,160" />
          <polygon className="proof-triangle" points="160,40 320,160 160,160" />
          <polygon className="proof-triangle" points="40,160 160,160 160,320" />
          <polygon className="proof-triangle" points="40,160 160,320 40,320" />

          <polygon className="proof-central" fill="none" points="40,40 160,40 160,160 40,160" />
          <polygon className="proof-central" fill="none" points="160,160 320,160 320,320 160,320" />

          <line className="diagram__chord" x1={160} y1={40} x2={320} y2={160} />
          <line className="diagram__chord" x1={40} y1={160} x2={160} y2={320} />

          <text
            className="proof-value proof-value--arc is-emphatic"
            x={100}
            y={100}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            a²
          </text>
          <text
            className="proof-value proof-value--arc is-emphatic"
            x={240}
            y={240}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            b²
          </text>
        </g>
      )}

      {/* Drawn after the dissection so the outer square reads as a crisp frame
          over the lighter triangle and square fills. */}
      {revealed >= 2 && (
        <g className="proof-in">
          <rect className="diagram__chord" fill="none" x={40} y={40} width={280} height={280} />
        </g>
      )}

      {revealed >= 4 && (
        <text className="proof-conclusion proof-in" x={180} y={348} textAnchor="middle">
          <tspan className="proof-value--arc">a²</tspan> + <tspan className="proof-value--arc">b²</tspan> ={' '}
          <tspan className="proof-value--accent">c²</tspan>
        </text>
      )}
    </svg>
  )
}
