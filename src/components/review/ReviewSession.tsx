import { type FormEvent, type ReactNode, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import {
  applyAttempt,
  buildReviewSession,
  dueTopics,
  INTERVALS,
  loadReviews,
  saveReview,
  todayISO,
  type ReviewItem,
  type ReviewMap,
} from '../../lib/review'
import type { NumericProblem, PracticeTopic } from '../../types/lesson'
import { lessons } from '../../content/lessons'
import { DiagramView } from '../lesson/StepRenderer'
import { MathText } from '../lesson/MathText'
import './ReviewSession.css'

const conceptTitle = new Map(lessons.filter((l) => l.concept).map((l) => [l.concept!, l.title]))

type Phase = 'loading' | 'active' | 'summary' | 'empty'
type Outcome = { topic: PracticeTopic; firstTry: boolean }

// The spaced-repetition + interleaving session. Pulls every concept that's due,
// mixes one fresh problem from each in random order (so the learner must pick the
// right rule, not repeat the last one), and folds each result back into the
// schedule — correct pushes the next review out, wrong brings it back tomorrow.
export function ReviewSession() {
  const { user } = useAuth()
  const today = todayISO()
  const [phase, setPhase] = useState<Phase>('loading')
  const [reviews, setReviews] = useState<ReviewMap>({})
  const [items, setItems] = useState<ReviewItem[]>([])
  const [index, setIndex] = useState(0)
  const [outcomes, setOutcomes] = useState<Outcome[]>([])

  useEffect(() => {
    let active = true
    loadReviews(user?.id ?? null).then((map) => {
      if (!active) {
        return
      }
      setReviews(map)
      const due = dueTopics(map, today)
      if (due.length === 0) {
        setPhase('empty')
        return
      }
      setItems(buildReviewSession(due))
      setPhase('active')
    })
    return () => {
      active = false
    }
  }, [user, today])

  function handleSolved(firstTry: boolean) {
    const item = items[index]
    const next = applyAttempt(reviews[item.topic], item.topic, { correct: true, firstTry }, today)
    setReviews((map) => ({ ...map, [item.topic]: next }))
    void saveReview(user?.id ?? null, next)
    setOutcomes((list) => [...list, { topic: item.topic, firstTry }])
    if (index + 1 >= items.length) {
      setPhase('summary')
    } else {
      setIndex((i) => i + 1)
    }
  }

  if (phase === 'loading') {
    return <Shell><p className="review__muted">Loading your review…</p></Shell>
  }

  if (phase === 'empty') {
    return (
      <Shell>
        <div className="review__done">
          <div className="review__badge" aria-hidden="true">✓</div>
          <h1>Nothing due — nice.</h1>
          <p className="review__muted">
            Your concepts are still fresh. Finish more lessons and they’ll come back here on a
            spaced schedule, with anything you missed resurfacing first.
          </p>
          <Link className="btn btn--primary" to="/">Back home</Link>
        </div>
      </Shell>
    )
  }

  if (phase === 'summary') {
    const firstTry = outcomes.filter((o) => o.firstTry).length
    return (
      <Shell>
        <div className="review__done">
          <div className="review__badge" aria-hidden="true">★</div>
          <h1>Review complete</h1>
          <p className="review__muted">
            {firstTry} of {outcomes.length} recalled on the first try. Here’s when each concept comes
            back:
          </p>
          <ul className="review__schedule">
            {outcomes.map((o, i) => {
              const r = reviews[o.topic]
              const days = r ? INTERVALS[r.box] : 0
              return (
                <li key={`${o.topic}-${i}`}>
                  <span className="review__schedule-topic">{conceptTitle.get(o.topic) ?? o.topic}</span>
                  <span className={o.firstTry ? 'review__chip is-up' : 'review__chip is-flat'}>
                    {o.firstTry ? `next in ${days} day${days === 1 ? '' : 's'}` : 'first try missed'}
                  </span>
                </li>
              )
            })}
          </ul>
          <Link className="btn btn--primary" to="/">Back home</Link>
        </div>
      </Shell>
    )
  }

  const item = items[index]
  // Desirable difficulty / fading: once a concept is well-known (box ≥ 2) the
  // figure is withheld so recall is cold; early on the figure still scaffolds.
  const showFigure = (reviews[item.topic]?.box ?? 0) < 2

  return (
    <Shell>
      <div className="review__head">
        <span className="review__counter">Review {index + 1} of {items.length}</span>
        <span className="review__topic-tag">{conceptTitle.get(item.topic) ?? item.topic}</span>
      </div>
      <ReviewCard
        key={index}
        problem={item.problem}
        showFigure={showFigure}
        onSolved={handleSolved}
      />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="app-shell review-shell">
      <header className="top-nav">
        <Link className="brand" to="/"><span className="brand__name">Angle Attack</span></Link>
        <Link className="nav-link" to="/">Exit review</Link>
      </header>
      <section className="review">{children}</section>
    </main>
  )
}

// A single review item. No hints, no walkthrough — retrieval under desirable
// difficulty — but a wrong answer still gets explanatory feedback (the targeted
// misconception when the value matches, otherwise the concept's nudge).
function ReviewCard({
  problem,
  showFigure,
  onSolved,
}: {
  problem: NumericProblem
  showFigure: boolean
  onSolved: (firstTry: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<string>()
  const [wrongCount, setWrongCount] = useState(0)
  const [solved, setSolved] = useState(false)

  function check(event: FormEvent) {
    event.preventDefault()
    const parsed = Number.parseFloat(value)
    const tolerance = problem.tolerance ?? 0
    if (!Number.isFinite(parsed)) {
      setFeedback('Enter a number to check.')
      return
    }
    if (Math.abs(parsed - problem.correctAnswer) <= tolerance) {
      setSolved(true)
      setFeedback(problem.feedback.correct || 'Correct.')
      onSolved(wrongCount === 0)
      return
    }
    setWrongCount((c) => c + 1)
    const hitCommon =
      problem.commonError && Math.abs(parsed - problem.commonError.value) <= tolerance
    if (hitCommon && problem.commonError) {
      setFeedback(problem.commonError.feedback)
    } else {
      const direction = parsed > problem.correctAnswer ? 'Too high.' : 'Too low.'
      setFeedback(`${direction} ${problem.feedback.incorrect}`)
    }
  }

  return (
    <div className="review__item">
      <p className="review__prompt"><MathText text={problem.prompt} /></p>

      {showFigure && problem.diagram && (
        <div className="diagram-placeholder review__diagram">
          <DiagramView config={problem.diagram} />
        </div>
      )}

      <form className="numeric" onSubmit={check}>
        <div className="numeric__row">
          <div className="numeric__entry">
            <input
              className="numeric__input"
              inputMode="numeric"
              autoComplete="off"
              value={value}
              disabled={solved}
              onChange={(event) => {
                setValue(event.target.value)
                if (feedback && !solved) {
                  setFeedback(undefined)
                }
              }}
            />
            {problem.unit && <span className="numeric__unit">{problem.unit}</span>}
          </div>
          {!solved && (
            <button type="submit" className="btn btn--primary" disabled={value.trim() === ''}>
              Check
            </button>
          )}
        </div>
        {feedback && (
          <div className={solved ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
            <strong>{solved ? 'Correct' : 'Not quite'}</strong>
            <p><MathText text={feedback} /></p>
          </div>
        )}
      </form>
    </div>
  )
}
