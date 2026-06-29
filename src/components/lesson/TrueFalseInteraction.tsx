import { useEffect, useState } from 'react'
import type { ClaimCard } from '../../types/lesson'
import { MathText } from './MathText'
import './Interactions.css'

type TrueFalseInteractionProps = {
  cards: ClaimCard[]
  doneNote?: string
  onComplete: () => void
}

// Rapid-fire true/false. The learner judges a short deck one card at a time and
// gets the reason on each. A wrong tap reveals the reason but still lets them
// move on (this is a confidence check, not a gate); the step completes once the
// whole deck has been cleared. Answers are checked in code.
export function TrueFalseInteraction({ cards, doneNote, onComplete }: TrueFalseInteractionProps) {
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<{ choice: boolean; correct: boolean }>()
  const [correctRun, setCorrectRun] = useState(0)
  const card = cards[index]
  const done = index >= cards.length

  useEffect(() => {
    if (done) {
      onComplete()
    }
  }, [done, onComplete])

  function answer(choice: boolean) {
    if (answered) {
      return
    }
    const correct = choice === card.answer
    setAnswered({ choice, correct })
    setCorrectRun((run) => (correct ? run + 1 : 0))
  }

  function next() {
    setAnswered(undefined)
    setIndex((current) => current + 1)
  }

  if (done) {
    return (
      <div className="feedback-panel is-correct">
        <strong>Deck cleared</strong>
        <p>
          <MathText text={doneNote ?? 'That’s the whole deck.'} />
        </p>
      </div>
    )
  }

  return (
    <section className="claim-deck" aria-label="True or false">
      <div className="claim-deck__head">
        <span className="claim-deck__counter">
          Card {index + 1} of {cards.length}
        </span>
        {correctRun >= 2 && (
          <span className="claim-deck__streak" aria-live="polite">
            {correctRun} in a row
          </span>
        )}
      </div>

      <div className={answered ? 'claim-card is-answered' : 'claim-card'}>
        <p className="claim-card__statement">
          <MathText text={card.statement} />
        </p>
      </div>

      {!answered ? (
        <div className="claim-deck__choices">
          <button type="button" className="btn claim-btn claim-btn--true" onClick={() => answer(true)}>
            True
          </button>
          <button type="button" className="btn claim-btn claim-btn--false" onClick={() => answer(false)}>
            False
          </button>
        </div>
      ) : (
        <>
          <div className={answered.correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
            <strong>{answered.correct ? 'Correct' : `Actually ${card.answer ? 'true' : 'false'}`}</strong>
            {card.note && (
              <p>
                <MathText text={card.note} />
              </p>
            )}
          </div>
          <button type="button" className="btn btn--primary claim-deck__next" onClick={next}>
            {index === cards.length - 1 ? 'Finish deck' : 'Next card'}
          </button>
        </>
      )}
    </section>
  )
}
