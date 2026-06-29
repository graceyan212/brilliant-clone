import { type FormEvent, useEffect, useState } from 'react'
import type { WalkthroughPart, WalkthroughStep } from '../../types/lesson'
import { MathText } from './MathText'
import './Interactions.css'

type WalkthroughInteractionProps = {
  step: WalkthroughStep
  onComplete: () => void
}

// A guided, multi-step solve. The learner works one part at a time; each part
// unlocks the next only when it is right, so a hard problem becomes a short
// chain of small wins. Every answer is checked in code (numeric tolerance or a
// choice id) — never by the AI.
export function WalkthroughInteraction({ step, onComplete }: WalkthroughInteractionProps) {
  const parts = step.parts
  const [solvedCount, setSolvedCount] = useState(0)
  const done = solvedCount >= parts.length
  const current = parts[solvedCount]

  useEffect(() => {
    if (done) {
      onComplete()
    }
  }, [done, onComplete])

  function solveCurrent() {
    setSolvedCount((count) => count + 1)
  }

  return (
    <section className="walkthrough" aria-label="Guided solution">
      {step.intro && (
        <p className="walkthrough__intro">
          <MathText text={step.intro} />
        </p>
      )}

      <ol className="walkthrough__chain">
        {parts.slice(0, solvedCount).map((part, index) => (
          <li key={index} className="walkthrough__part is-solved">
            <p className="walkthrough__prompt">
              <MathText text={part.prompt} />
            </p>
            {part.note && (
              <p className="walkthrough__note">
                <MathText text={part.note} />
              </p>
            )}
          </li>
        ))}

        {current && (
          <li className="walkthrough__part is-current">
            <p className="walkthrough__prompt">
              <span className="walkthrough__step-tag">Step {solvedCount + 1}</span>
              <MathText text={current.prompt} />
            </p>
            <WalkthroughInput key={solvedCount} part={current} onSolved={solveCurrent} />
          </li>
        )}
      </ol>

      {done && (
        <div className="feedback-panel is-correct">
          <strong>Solved</strong>
          <p>
            <MathText text={step.doneNote ?? 'Nice — you worked the whole thing through.'} />
          </p>
        </div>
      )}
    </section>
  )
}

function WalkthroughInput({ part, onSolved }: { part: WalkthroughPart; onSolved: () => void }) {
  if (part.kind === 'choice') {
    return <ChoicePart part={part} onSolved={onSolved} />
  }
  return <NumericPart part={part} onSolved={onSolved} />
}

function NumericPart({
  part,
  onSolved,
}: {
  part: Extract<WalkthroughPart, { kind: 'numeric' }>
  onSolved: () => void
}) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<string>()

  function check(event: FormEvent) {
    event.preventDefault()
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed)) {
      setFeedback('Enter a number to check.')
      return
    }
    if (Math.abs(parsed - part.answer) <= (part.tolerance ?? 0)) {
      onSolved()
      return
    }
    const direction = parsed > part.answer ? 'Too high.' : 'Too low.'
    setFeedback(`${direction} ${part.hint ?? 'Check the figure and the rule from this lesson.'}`)
  }

  return (
    <form className="numeric" onSubmit={check}>
      <div className="numeric__row">
        <div className="numeric__entry">
          <input
            className="numeric__input"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (feedback) {
                setFeedback(undefined)
              }
            }}
          />
          {part.unit && <span className="numeric__unit">{part.unit}</span>}
        </div>
        <button type="submit" className="btn btn--primary" disabled={value.trim() === ''}>
          Check
        </button>
      </div>
      {feedback && (
        <div className="feedback-panel is-incorrect">
          <strong>Not quite</strong>
          <p>
            <MathText text={feedback} />
          </p>
        </div>
      )}
    </form>
  )
}

function ChoicePart({
  part,
  onSolved,
}: {
  part: Extract<WalkthroughPart, { kind: 'choice' }>
  onSolved: () => void
}) {
  const [wrongId, setWrongId] = useState<string>()

  function choose(id: string) {
    if (id === part.answer) {
      setWrongId(undefined)
      onSolved()
    } else {
      setWrongId(id)
    }
  }

  return (
    <>
      <div className="answer-list">
        {part.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={option.id === wrongId ? 'answer-option is-wrong' : 'answer-option'}
            onClick={() => choose(option.id)}
          >
            <MathText text={option.label} />
          </button>
        ))}
      </div>
      {wrongId !== undefined && (
        <div className="feedback-panel is-incorrect">
          <strong>Not quite</strong>
          <p>
            <MathText
              text={
                part.options.find((option) => option.id === wrongId)?.feedback ??
                part.hint ??
                'Re-read the step and look again at the figure.'
              }
            />
          </p>
        </div>
      )}
    </>
  )
}
