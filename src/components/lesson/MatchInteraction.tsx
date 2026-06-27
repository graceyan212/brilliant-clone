import { useEffect, useMemo, useRef, useState } from 'react'
import type { MatchPair } from '../../types/lesson'
import './MatchInteraction.css'

type MatchInteractionProps = {
  pairs: MatchPair[]
  leftHeading?: string
  rightHeading?: string
  doneNote?: string
  onComplete: () => void
}

// A tiny deterministic PRNG so the answer pool is shuffled the same way on
// every render (no churn, no hydration surprises) while never echoing the
// authored pair order. The seed comes only from the pair ids, not the answers.
function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function shuffle<T>(items: T[], seed: number): T[] {
  const result = items.slice()
  let state = seed || 1
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const j = state % (i + 1)
    const swap = result[i]
    result[i] = result[j]
    result[j] = swap
  }
  return result
}

// Tap-to-pair matching: pick a term and a meaning (in either order) and they are
// checked here in code. A correct pair LOCKS into a combined row that shows the
// term and its meaning side by side, joined by a check, and both halves leave the
// pools below — so it is always unambiguous what matched with what. The pools of
// still-unmatched terms/meanings shrink as you go. A wrong pair shakes, surfaces
// an adaptive hint, and clears the selection so the learner can retry. No
// dragging, so it is touch-, keyboard-, and reduced-motion-friendly.
export function MatchInteraction({
  pairs,
  leftHeading,
  rightHeading,
  doneNote,
  onComplete,
}: MatchInteractionProps) {
  // Ids in the order they were matched, so freshly locked rows appear last.
  const [matchedOrder, setMatchedOrder] = useState<string[]>([])
  const [selectedLeft, setSelectedLeft] = useState<string>()
  const [selectedRight, setSelectedRight] = useState<string>()
  const [status, setStatus] = useState<{ correct: boolean; text: string }>()
  const [wrong, setWrong] = useState<{ left: string; right: string }>()
  // How many times each term has been linked to a wrong meaning, so hints can
  // escalate. Cleared per term once that term is correctly matched.
  const [wrongCounts, setWrongCounts] = useState<Record<string, number>>({})
  // The last wrong meaning tried for each term, so a repeated mistake can be
  // acknowledged ("still that one's description"). A ref because only the derived
  // hint text needs it, not the render.
  const lastWrongMeaning = useRef<Record<string, string>>({})
  // Latest onComplete + a one-shot guard, kept in refs so the completion effect
  // depends only on `allMatched` and can never loop on an unstable callback.
  const onCompleteRef = useRef(onComplete)
  const hasCompleted = useRef(false)

  const answerOrder = useMemo(
    () => shuffle(pairs, hashSeed(pairs.map((pair) => pair.id).join('|'))),
    [pairs],
  )

  const matchedSet = useMemo(() => new Set(matchedOrder), [matchedOrder])
  const matchedPairs = matchedOrder
    .map((id) => pairs.find((pair) => pair.id === id))
    .filter((pair): pair is MatchPair => pair !== undefined)
  const unmatchedLeft = pairs.filter((pair) => !matchedSet.has(pair.id))
  const unmatchedRight = answerOrder.filter((pair) => !matchedSet.has(pair.id))

  const matchedCount = matchedOrder.length
  const total = pairs.length
  const allMatched = total > 0 && matchedCount === total

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Fire completion exactly once, the moment every pair is matched. We read
  // onComplete from a ref and depend ONLY on `allMatched`, so an inline callback
  // from a parent can never turn this into a render loop.
  useEffect(() => {
    if (allMatched && !hasCompleted.current) {
      hasCompleted.current = true
      onCompleteRef.current()
    }
  }, [allMatched])

  function evaluate(leftId: string, rightId: string) {
    setSelectedLeft(undefined)
    setSelectedRight(undefined)
    if (leftId === rightId) {
      const pair = pairs.find((item) => item.id === leftId)
      setMatchedOrder((current) => (current.includes(leftId) ? current : [...current, leftId]))
      setWrong(undefined)
      // The term is locked now, so stop escalating hints against it.
      delete lastWrongMeaning.current[leftId]
      setWrongCounts((current) => {
        if (current[leftId] === undefined) {
          return current
        }
        const next = { ...current }
        delete next[leftId]
        return next
      })
      setStatus({ correct: true, text: pair?.note ?? `Matched ${pair?.left}.` })
    } else {
      const term = pairs.find((item) => item.id === leftId)
      // The wrong meaning belongs to exactly one term (its owner); the hint names
      // that specific mistake instead of a generic "not a match".
      const wrongOwner = pairs.find((item) => item.id === rightId)
      const attempt = (wrongCounts[leftId] ?? 0) + 1
      const repeated = lastWrongMeaning.current[leftId] === rightId
      lastWrongMeaning.current[leftId] = rightId
      setWrongCounts((current) => ({ ...current, [leftId]: attempt }))
      setWrong({ left: leftId, right: rightId })
      setStatus({ correct: false, text: wrongHint(term, wrongOwner, attempt, repeated) })
    }
  }

  function chooseLeft(id: string) {
    if (matchedSet.has(id)) {
      return
    }
    setWrong(undefined)
    if (selectedRight !== undefined) {
      evaluate(id, selectedRight)
    } else {
      setSelectedLeft((current) => (current === id ? undefined : id))
    }
  }

  function chooseRight(id: string) {
    if (matchedSet.has(id)) {
      return
    }
    setWrong(undefined)
    if (selectedLeft !== undefined) {
      evaluate(selectedLeft, id)
    } else {
      setSelectedRight((current) => (current === id ? undefined : id))
    }
  }

  return (
    <section className="match" aria-label="Match each term to its meaning">
      <p className="match__progress" aria-live="polite">
        {allMatched && doneNote ? doneNote : `${matchedCount} of ${total} matched`}
      </p>

      {status && !allMatched && (
        <p
          className={status.correct ? 'match__status is-correct' : 'match__status is-wrong'}
          aria-live="polite"
        >
          {status.text}
        </p>
      )}

      {matchedPairs.length > 0 && (
        <ul className="match__pairs" aria-label="Matched pairs">
          {matchedPairs.map((pair) => (
            <li key={pair.id} className="match__pair">
              <span className="match__pair-term">{pair.left}</span>
              <span className="match__sr"> is matched with </span>
              <span className="match__pair-join" aria-hidden="true">
                <span className="match__pair-rule" />
                <span className="match__pair-check">&#10003;</span>
                <span className="match__pair-rule" />
              </span>
              <span className="match__pair-def">{pair.right}</span>
            </li>
          ))}
        </ul>
      )}

      {!allMatched && (
        <div className="match__pools">
          <ul className="match__col">
            {leftHeading && (
              <li className="match__heading" aria-hidden="true">
                {leftHeading}
              </li>
            )}
            {unmatchedLeft.map((pair) => {
              const isSelected = selectedLeft === pair.id
              const isWrong = wrong?.left === pair.id
              return (
                <li key={pair.id}>
                  <button
                    type="button"
                    className={chipClass(isSelected, isWrong)}
                    aria-pressed={isSelected}
                    onClick={() => chooseLeft(pair.id)}
                  >
                    {pair.left}
                  </button>
                </li>
              )
            })}
          </ul>

          <ul className="match__col">
            {rightHeading && (
              <li className="match__heading" aria-hidden="true">
                {rightHeading}
              </li>
            )}
            {unmatchedRight.map((pair) => {
              const isSelected = selectedRight === pair.id
              const isWrong = wrong?.right === pair.id
              return (
                <li key={pair.id}>
                  <button
                    type="button"
                    className={chipClass(isSelected, isWrong)}
                    aria-pressed={isSelected}
                    onClick={() => chooseRight(pair.id)}
                  >
                    {pair.right}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}

function chipClass(isSelected: boolean, isWrong: boolean): string {
  return ['match__chip', isSelected && 'is-selected', isWrong && 'is-wrong'].filter(Boolean).join(' ')
}

// Adaptive miss feedback, derived entirely from the pair data already on hand so
// it is deterministic and never depends on the network. It references the
// SPECIFIC wrong meaning (which belongs to `wrongOwner`) and escalates with the
// number of misses against this term:
//   1st  gentle + names what was actually picked.
//   2nd  more guidance: nudges toward the term's own meaning, or acknowledges a
//        repeated wrong pick.
//   3rd+ near-reveal: shows the opening of the correct meaning so nobody stalls.
function wrongHint(
  term: MatchPair | undefined,
  wrongOwner: MatchPair | undefined,
  attempt: number,
  repeated: boolean,
): string {
  const termLabel = term?.left ?? 'this term'
  if (!wrongOwner) {
    return 'Not a match \u2014 try again.'
  }
  if (attempt <= 1) {
    return `Not quite \u2014 that's the description of "${wrongOwner.left}". Try matching "${termLabel}" to a different one.`
  }
  if (attempt === 2) {
    if (repeated) {
      return `Still "${wrongOwner.left}"'s description \u2014 keep looking for what "${termLabel}" matches.`
    }
    return `That meaning belongs to "${wrongOwner.left}". Think about what "${termLabel}" literally refers to.`
  }
  if (!term) {
    return `Keep looking for the meaning that fits "${termLabel}".`
  }
  return `"${termLabel}" matches: "${firstWords(term.right, 6)}"`
}

// First `count` words of `text`, with an ellipsis when it was truncated, so a
// near-reveal hint shows the start of the answer without always dumping all of it.
function firstWords(text: string, count: number): string {
  const words = text.trim().split(/\s+/)
  if (words.length <= count) {
    return text.trim()
  }
  return `${words.slice(0, count).join(' ')}\u2026`
}
