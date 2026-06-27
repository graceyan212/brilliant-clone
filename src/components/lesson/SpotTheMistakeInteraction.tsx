import { useState } from 'react'
import type { SolutionLine } from '../../types/lesson'
import { MathText } from './MathText'
import './Interactions.css'

type SpotTheMistakeInteractionProps = {
  lines: SolutionLine[]
  explanation: string
  hint?: string
  doneNote?: string
  onComplete: () => void
}

// Find-the-flaw: a worked solution is shown line by line and the learner taps
// the line they think is wrong. Tapping a sound line marks it "checks out" and
// nudges them on; tapping the flawed line reveals why. Grading is in code via
// each line's `wrong` flag.
export function SpotTheMistakeInteraction({
  lines,
  explanation,
  hint,
  doneNote,
  onComplete,
}: SpotTheMistakeInteractionProps) {
  const [foundId, setFoundId] = useState<string>()
  const [fine, setFine] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()
  const solved = foundId !== undefined

  function tap(line: SolutionLine) {
    if (solved || fine.has(line.id)) {
      return
    }
    if (line.wrong) {
      setFoundId(line.id)
      setStatus({ correct: true, text: doneNote ?? 'You found the slip.' })
      onComplete()
    } else {
      setFine((current) => new Set(current).add(line.id))
      setStatus({
        correct: false,
        text: hint ?? 'That line checks out — keep looking.',
      })
    }
  }

  return (
    <section className="spot" aria-label="Find the mistake in the worked solution">
      <ol className="spot__lines">
        {lines.map((line) => {
          const isFound = foundId === line.id
          const isFine = fine.has(line.id)
          const className = ['spot__line', isFound && 'is-wrong', isFine && 'is-fine']
            .filter(Boolean)
            .join(' ')
          return (
            <li key={line.id}>
              <button
                type="button"
                className={className}
                disabled={solved || isFine}
                onClick={() => tap(line)}
              >
                <span className="spot__mark" aria-hidden="true">
                  {isFound ? '\u2715' : isFine ? '\u2713' : ''}
                </span>
                <span className="spot__text">
                  <MathText text={line.text} />
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {status && !solved && (
        <p className="interaction__status is-wrong" aria-live="polite">
          {status.text}
        </p>
      )}

      {solved && (
        <div className="feedback-panel is-correct">
          <strong>That's the mistake</strong>
          <p>
            <MathText text={explanation} />
          </p>
        </div>
      )}
    </section>
  )
}
