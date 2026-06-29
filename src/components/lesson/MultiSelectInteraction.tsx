import { useMemo, useState } from 'react'
import type { Feedback, MultiSelectOption } from '../../types/lesson'
import { MathText } from './MathText'
import { hashSeed, seededShuffle } from './shuffle'
import './Interactions.css'

type MultiSelectInteractionProps = {
  options: MultiSelectOption[]
  feedback?: Feedback
  doneNote?: string
  onComplete: () => void
}

// Select-all-that-apply. Toggle any number of options, then Check. Solved only
// when the chosen set exactly equals the correct set. A wrong check marks the
// picks that aren't true (an honest nudge) without revealing the ones still
// missing, so there's something left to reason about.
export function MultiSelectInteraction({
  options,
  feedback,
  doneNote,
  onComplete,
}: MultiSelectInteractionProps) {
  const order = useMemo(
    () => seededShuffle(options, hashSeed(options.map((option) => option.id).join('|'))),
    [options],
  )

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [wrongMarks, setWrongMarks] = useState<Set<string>>(new Set())
  const [solved, setSolved] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()

  function toggle(id: string) {
    if (solved) {
      return
    }
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setWrongMarks(new Set())
    setStatus(undefined)
  }

  function check() {
    const correctIds = options.filter((option) => option.correct).map((option) => option.id)
    const isSolved =
      selected.size === correctIds.length && correctIds.every((id) => selected.has(id))

    if (isSolved) {
      setSolved(true)
      setWrongMarks(new Set())
      setStatus({ correct: true, text: doneNote ?? feedback?.correct ?? 'Exactly right.' })
      onComplete()
      return
    }

    const correctSet = new Set(correctIds)
    const wrong = new Set([...selected].filter((id) => !correctSet.has(id)))
    const missing = correctIds.filter((id) => !selected.has(id)).length
    setWrongMarks(wrong)

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)

    const rule =
      feedback?.incorrect ??
      "Not the full set yet — clear anything that isn't true, and check for any you missed."
    // Escalate: 1st miss states the rule; 2nd adds a precise count of what's off;
    // 3rd+ shows the count AND the rule together, so each check reveals a bit more.
    const counts: string[] = []
    if (wrong.size > 0)
      counts.push(`${wrong.size} of your picks ${wrong.size === 1 ? 'is' : 'are'} wrong (marked)`)
    if (missing > 0) counts.push(`you're still missing ${missing}`)
    const diagnostic = counts.length ? `${counts.join(', and ')}.` : ''

    let text = rule
    if (nextAttempts === 2 && diagnostic) {
      text = diagnostic
    } else if (nextAttempts >= 3 && diagnostic) {
      text = `${diagnostic} ${rule}`
    }
    setStatus({ correct: false, text })
  }

  return (
    <section className="multi-select" aria-label="Select all that apply">
      <div className="multi-select__options">
        {order.map((option) => {
          const isSelected = selected.has(option.id)
          const isCorrectReveal = solved && option.correct
          const isWrong = wrongMarks.has(option.id)
          const className = [
            'multi-option',
            isSelected && 'is-selected',
            isCorrectReveal && 'is-correct',
            isWrong && 'is-wrong',
          ]
            .filter(Boolean)
            .join(' ')
          return (
            <button
              key={option.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              className={className}
              disabled={solved}
              onClick={() => toggle(option.id)}
            >
              <span className="multi-option__box" aria-hidden="true">
                {isWrong ? '\u2715' : isSelected || isCorrectReveal ? '\u2713' : ''}
              </span>
              <span className="multi-option__label">
                <MathText text={option.label} />
              </span>
            </button>
          )
        })}
      </div>

      {!solved && (
        <button
          type="button"
          className="btn btn--primary multi-select__check"
          disabled={selected.size === 0}
          onClick={check}
        >
          Check
        </button>
      )}

      {status && (
        <div className={status.correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
          <strong>{status.correct ? 'Correct' : 'Not quite'}</strong>
          <p>
            <MathText text={status.text} />
          </p>
        </div>
      )}
    </section>
  )
}
