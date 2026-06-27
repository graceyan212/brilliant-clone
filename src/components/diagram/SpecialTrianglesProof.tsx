import './ProofDiagram.css'
import './CircleDiagram.css'

export function SpecialTrianglesProof({ revealed }: { revealed: number }) {
  return (
    <svg
      className="diagram__svg proof-diagram"
      viewBox="0 0 360 360"
      role="img"
      aria-label="Two staged geometry proofs: a square split by its diagonal into 45-45-90 right triangles with side ratio 1 to 1 to root 2, and an equilateral triangle split by its altitude into 30-60-90 right triangles with side ratio 1 to root 3 to 2."
    >
      {revealed <= 2 && (
        <g transform="translate(0 12)">
          <polygon className="proof-triangle" points="90,70 270,250 90,250" />

          <polygon className="diagram__chord" fill="none" points="90,70 270,70 270,250 90,250" />
          <line className="diagram__base" x1={90} y1={70} x2={270} y2={250} />
          <path className="diagram__chord" fill="none" d="M 104 250 L 104 236 L 90 236" />

          <text className="proof-value" x={76} y={160} textAnchor="middle" dominantBaseline="middle">
            1
          </text>
          <text className="proof-value" x={180} y={266} textAnchor="middle" dominantBaseline="middle">
            1
          </text>
          <text className="proof-value" x={122} y={104} textAnchor="middle" dominantBaseline="middle">
            45°
          </text>
          <text className="proof-value" x={236} y={222} textAnchor="middle" dominantBaseline="middle">
            45°
          </text>

          {revealed === 2 && (
            <g className="proof-in">
              <text
                className="proof-value proof-value--accent"
                x={198}
                y={148}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                √2
              </text>
              <text className="proof-conclusion proof-in" x={180} y={326} textAnchor="middle">
                1 : 1 : √2
              </text>
            </g>
          )}
        </g>
      )}

      {revealed >= 3 && (
        <g transform="translate(0 -21)">
          <polygon className="proof-triangle" points="80,280 280,280 180,107" />

          <polygon className="diagram__chord" fill="none" points="80,280 280,280 180,107" />
          <line className="diagram__base" x1={180} y1={107} x2={180} y2={280} />
          <path className="diagram__chord" fill="none" d="M 194 280 L 194 266 L 180 266" />

          <text className="proof-value" x={108} y={266} textAnchor="middle" dominantBaseline="middle">
            60°
          </text>
          <text className="proof-value" x={252} y={266} textAnchor="middle" dominantBaseline="middle">
            60°
          </text>
          <text className="proof-value" x={130} y={296} textAnchor="middle" dominantBaseline="middle">
            1
          </text>
          <text className="proof-value" x={230} y={296} textAnchor="middle" dominantBaseline="middle">
            1
          </text>

          {revealed === 3 && (
            <text className="proof-value" x={180} y={150} textAnchor="middle" dominantBaseline="middle">
              60°
            </text>
          )}

          {revealed >= 4 && (
            <g className="proof-in">
              <polygon className="proof-triangle" points="180,107 180,280 280,280" />
              <text
                className="proof-value proof-value--accent"
                x={196}
                y={195}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                √3
              </text>
              <text className="proof-value" x={238} y={186} textAnchor="middle" dominantBaseline="middle">
                2
              </text>
              <text className="proof-value" x={192} y={150} textAnchor="middle" dominantBaseline="middle">
                30°
              </text>
              <text className="proof-conclusion proof-in" x={180} y={326} textAnchor="middle">
                1 : √3 : 2
              </text>
            </g>
          )}
        </g>
      )}
    </svg>
  )
}
