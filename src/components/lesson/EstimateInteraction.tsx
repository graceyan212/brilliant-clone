import { useState } from 'react'
import type { EstimateStep } from '../../types/lesson'
import { MathText } from './MathText'
import './Interactions.css'

type EstimateInteractionProps = {
  step: EstimateStep
  onComplete: () => void
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

// A small angle that opens to the live value: two rays from a vertex with a
// shaded wedge between them. Lets the learner "feel" the size as they drag.
function AngleVisual({ value, answer, solved }: { value: number; answer: number; solved: boolean }) {
  const cx = 50
  const cy = 132
  const rRay = 138
  const rSec = 50
  const rad = (deg: number) => (deg * Math.PI) / 180
  const tip = (deg: number, r: number) => ({
    x: cx + r * Math.cos(rad(deg)),
    y: cy - r * Math.sin(rad(deg)),
  })

  const end1 = tip(0, rRay)
  const end2 = tip(value, rRay)
  const arcA = tip(0, rSec)
  const arcB = tip(value, rSec)
  const large = value > 180 ? 1 : 0
  const wedge = `M ${cx} ${cy} L ${arcA.x} ${arcA.y} A ${rSec} ${rSec} 0 ${large} 0 ${arcB.x} ${arcB.y} Z`
  const answerEnd = tip(answer, rRay)

  return (
    <svg className="estimate__svg" viewBox="0 0 220 160" role="img" aria-label={`Angle of about ${value} degrees`}>
      <path className="estimate__wedge" d={wedge} />
      {solved && (
        <line
          className="estimate__answer-ray"
          x1={cx}
          y1={cy}
          x2={answerEnd.x}
          y2={answerEnd.y}
        />
      )}
      <line className="estimate__ray" x1={cx} y1={cy} x2={end1.x} y2={end1.y} />
      <line className="estimate__ray" x1={cx} y1={cy} x2={end2.x} y2={end2.y} />
      <circle className="estimate__vertex" cx={cx} cy={cy} r={4} />
    </svg>
  )
}

// A proportion bar: the fill tracks where the value sits in [min, max].
function BarVisual({
  value,
  min,
  max,
  answer,
  solved,
}: {
  value: number
  min: number
  max: number
  answer: number
  solved: boolean
}) {
  const span = max - min || 1
  const pct = clamp(((value - min) / span) * 100, 0, 100)
  const answerPct = clamp(((answer - min) / span) * 100, 0, 100)
  return (
    <div className="estimate__bar" role="img" aria-label={`Fill at ${Math.round(pct)} percent`}>
      <div className="estimate__bar-fill" style={{ width: `${pct}%` }} />
      {solved && <div className="estimate__bar-answer" style={{ left: `${answerPct}%` }} />}
    </div>
  )
}

// Estimate-with-a-slider, then reveal. Drag to set a value and a figure responds
// live; Check grades it in code (within tolerance) and reveals the takeaway, or
// nudges Too high / Too low.
export function EstimateInteraction({ step, onComplete }: EstimateInteractionProps) {
  const min = step.min
  const max = step.max
  const stepSize = step.step ?? 1
  const tolerance = step.tolerance ?? 0
  const initial = step.start ?? Math.round((min + max) / 2)

  const [value, setValue] = useState<number>(clamp(initial, min, max))
  const [solved, setSolved] = useState(false)
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()

  function check() {
    if (Math.abs(value - step.answer) <= tolerance) {
      setSolved(true)
      setStatus({
        correct: true,
        text: step.revealText ?? step.feedback?.correct ?? 'Nice estimate.',
      })
      onComplete()
      return
    }
    const direction = value > step.answer ? 'Too high.' : 'Too low.'
    setStatus({
      correct: false,
      text: `${direction} ${step.feedback?.incorrect ?? 'Adjust the slider and check again.'}`,
    })
  }

  const unit = step.unit ?? ''

  return (
    <section className="estimate" aria-label="Estimate with the slider">
      {step.visual === 'angle' && <AngleVisual value={value} answer={step.answer} solved={solved} />}
      {step.visual === 'bar' && (
        <BarVisual value={value} min={min} max={max} answer={step.answer} solved={solved} />
      )}

      <p className="estimate__readout" aria-live="polite">
        Your estimate: <strong>{value}{unit}</strong>
        {solved && (
          <span className="estimate__answer-text">
            {' '}
            &middot; actual {step.answer}
            {unit}
          </span>
        )}
      </p>

      <input
        className="estimate__slider"
        type="range"
        min={min}
        max={max}
        step={stepSize}
        value={value}
        aria-label="Estimate"
        onChange={(event) => {
          setValue(Number(event.target.value))
          if (!solved) {
            setStatus(undefined)
          }
        }}
      />

      {!solved && (
        <button type="button" className="btn btn--primary estimate__check" onClick={check}>
          Check
        </button>
      )}

      {status && (
        <div className={status.correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
          <strong>{status.correct ? 'Correct' : 'Keep going'}</strong>
          <p>
            <MathText text={status.text} />
          </p>
        </div>
      )}
    </section>
  )
}
