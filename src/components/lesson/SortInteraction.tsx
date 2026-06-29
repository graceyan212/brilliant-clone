import { useMemo, useState } from 'react'
import type { SortItem } from '../../types/lesson'
import { MathText } from './MathText'
import { hashSeed, seededShuffle } from './shuffle'
import './Interactions.css'

type SortInteractionProps = {
  instruction?: string
  /** Items in their CORRECT order. */
  items: SortItem[]
  doneNote?: string
  onComplete: () => void
}

// Put-in-order. The shuffled items start in a "bank"; the learner taps them in
// the target order and each correct tap locks into the sequence. A wrong tap
// (an item that isn't next) bounces with a nudge. The authored array is the
// correct order, so grading is entirely in code. Distinct from `categorize`,
// which sorts into named buckets rather than a single sequence.
export function SortInteraction({ instruction, items, doneNote, onComplete }: SortInteractionProps) {
  const bankStart = useMemo(() => {
    const indices = items.map((_, index) => index)
    const seed = hashSeed(items.map((item) => item.id).join('|'))
    const shuffled = seededShuffle(indices, seed)
    // A shuffle that lands on the authored order would make the task trivial.
    return shuffled.every((value, position) => value === position) ? shuffled.reverse() : shuffled
  }, [items])

  const [bank, setBank] = useState<number[]>(bankStart)
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongIndex, setWrongIndex] = useState<number>()
  const done = placed.length === items.length

  function choose(index: number) {
    if (index === placed.length) {
      setWrongIndex(undefined)
      const nextPlaced = [...placed, index]
      setPlaced(nextPlaced)
      setBank((current) => current.filter((item) => item !== index))
      if (nextPlaced.length === items.length) {
        onComplete()
      }
    } else {
      setWrongIndex(index)
    }
  }

  return (
    <section className="sortable" aria-label="Put in order">
      {instruction && (
        <p className="sortable__instruction">
          <MathText text={instruction} />
        </p>
      )}

      {placed.length > 0 && (
        <ol className="sortable__placed">
          {placed.map((index, position) => (
            <li key={index} className="sortable__slot">
              <span className="sortable__rank">{position + 1}</span>
              <MathText text={items[index].label} />
            </li>
          ))}
        </ol>
      )}

      {done ? (
        <div className="feedback-panel is-correct">
          <strong>In order</strong>
          <p>
            <MathText text={doneNote ?? 'That’s the right order.'} />
          </p>
        </div>
      ) : (
        <>
          <div className="sortable__bank">
            {bank.map((index) => (
              <button
                key={index}
                type="button"
                className={index === wrongIndex ? 'sortable__chip is-wrong' : 'sortable__chip'}
                onClick={() => choose(index)}
              >
                <MathText text={items[index].label} />
              </button>
            ))}
          </div>
          {wrongIndex !== undefined && (
            <div className="feedback-panel is-incorrect">
              <strong>Not next</strong>
              <p>That one comes later — what belongs in this position?</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
