import { useEffect, useMemo, useState } from 'react'
import type { CategorizeBucket, CategorizeItem } from '../../types/lesson'
import { MathText } from './MathText'
import { hashSeed, seededShuffle } from './shuffle'
import './Interactions.css'

type CategorizeInteractionProps = {
  buckets: CategorizeBucket[]
  items: CategorizeItem[]
  doneNote?: string
  onComplete: () => void
}

// Tap-to-sort: pick a chip, then tap the group it belongs in. A correct drop
// locks the chip into that column; a wrong one bounces back with a nudge. No
// dragging, so it works with touch, keyboard, and reduced motion. Every check
// happens here in code against each item's authored `bucket`.
export function CategorizeInteraction({
  buckets,
  items,
  doneNote,
  onComplete,
}: CategorizeInteractionProps) {
  const [placed, setPlaced] = useState<Record<string, string>>({})
  const [selectedId, setSelectedId] = useState<string>()
  const [wrongBucket, setWrongBucket] = useState<string>()
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()

  const tray = useMemo(
    () => seededShuffle(items, hashSeed(items.map((item) => item.id).join('|'))),
    [items],
  )

  const placedCount = Object.keys(placed).length
  const done = placedCount === items.length

  useEffect(() => {
    if (done) {
      onComplete()
    }
  }, [done, onComplete])

  function chooseItem(id: string) {
    if (placed[id]) {
      return
    }
    setWrongBucket(undefined)
    setSelectedId((current) => (current === id ? undefined : id))
  }

  function dropInBucket(bucketId: string) {
    if (!selectedId) {
      setStatus({ correct: false, text: 'Tap a card first, then tap its group.' })
      return
    }
    const item = items.find((candidate) => candidate.id === selectedId)
    if (!item) {
      return
    }
    if (item.bucket === bucketId) {
      // The chip visibly moves into the bucket, so no extra "correct" message is
      // needed — keep the panel quiet on success.
      setPlaced((current) => ({ ...current, [item.id]: bucketId }))
      setSelectedId(undefined)
      setWrongBucket(undefined)
      setStatus(undefined)
    } else {
      setWrongBucket(bucketId)
      setStatus({ correct: false, text: `Not there — try a different group for ${item.label}.` })
    }
  }

  return (
    <section className="categorize" aria-label="Sort each card into its group">
      <p className="interaction__progress" aria-live="polite">
        {done && doneNote ? doneNote : `${placedCount} of ${items.length} sorted`}
      </p>

      {!done && (
        <div className="categorize__tray" role="group" aria-label="Cards to sort">
          {tray
            .filter((item) => !placed[item.id])
            .map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedId === item.id ? 'chip is-selected' : 'chip'}
                aria-pressed={selectedId === item.id}
                onClick={() => chooseItem(item.id)}
              >
                <MathText text={item.label} />
              </button>
            ))}
        </div>
      )}

      <div className="categorize__buckets">
        {buckets.map((bucket) => {
          const contents = items.filter((item) => placed[item.id] === bucket.id)
          return (
            <button
              key={bucket.id}
              type="button"
              className={
                wrongBucket === bucket.id ? 'categorize__bucket is-wrong' : 'categorize__bucket'
              }
              onClick={() => dropInBucket(bucket.id)}
              aria-label={`Place card in ${bucket.label}`}
            >
              <span className="categorize__bucket-label">
                <MathText text={bucket.label} />
              </span>
              <span className="categorize__bucket-items">
                {contents.map((item) => (
                  <span key={item.id} className="chip is-placed">
                    <span className="chip__check" aria-hidden="true">
                      &#10003;
                    </span>
                    <MathText text={item.label} />
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      {status && !done && (
        <div className="feedback-panel is-incorrect" aria-live="polite">
          <strong>Not quite</strong>
          <p>
            <MathText text={status.text} />
          </p>
        </div>
      )}
    </section>
  )
}
