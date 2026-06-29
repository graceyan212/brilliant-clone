import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthPanel } from './components/auth/AuthPanel'
import { Confetti } from './components/celebrate/Confetti'
import { HeroIllustration } from './components/HeroIllustration'
import { getLesson, lessons, type RegisteredLesson } from './content/lessons'

// Lazy-loaded so the diagram/proof component tree (the bulk of the JS) ships in
// its own chunk, fetched only when a learner opens a lesson — the home screen
// no longer pays for it on first load.
const StepRenderer = lazy(() =>
  import('./components/lesson/StepRenderer').then((module) => ({ default: module.StepRenderer })),
)
const ReviewSession = lazy(() =>
  import('./components/review/ReviewSession').then((module) => ({ default: module.ReviewSession })),
)
import { setAiEnabled, useAiEnabled } from './lib/ai-settings'
import { useAuth } from './lib/auth-context'
import { fetchLessonProgress, saveLessonProgress, type LessonProgress } from './lib/progress'
import {
  applyAttempt,
  dueTopics,
  loadReviews,
  MAX_BOX,
  saveReview,
  todayISO,
  type ReviewMap,
} from './lib/review'
import { activeStreak, fetchStreak, recordStreakActivity, type Streak } from './lib/streaks'
import type { PracticeTopic } from './types/lesson'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lesson/:lessonId" element={<LessonPage />} />
      <Route
        path="/review"
        element={
          <Suspense fallback={<main className="app-shell notice-shell"><section className="notice"><p>Loading…</p></section></main>}>
            <ReviewSession />
          </Suspense>
        }
      />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function progressView(progress: LessonProgress | null | undefined, total: number, noun = 'lesson') {
  const stepsDone = progress ? (progress.completed ? total : progress.currentStep) : 0
  const percent = Math.round((stepsDone / total) * 100)
  const cta = progress?.completed
    ? `Review ${noun}`
    : stepsDone > 0
      ? `Continue ${noun}`
      : `Start ${noun}`
  return { stepsDone, percent, cta }
}

// The journey map groups lessons under unit headings. The prequiz opens the
// climb as its own "Warm-up" leg; the rest are keyed by id so the section labels
// stay correct regardless of progress state.
function unitFor(lesson: RegisteredLesson): string {
  if (lesson.kind === 'prequiz') {
    return 'Warm-up'
  }
  const { id } = lesson
  if (id === 'angles-and-angle-chasing' || id === 'angles-in-a-triangle') {
    return 'Foundations'
  }
  if (id === 'pythagorean-theorem' || id === 'special-right-triangles' || id === 'similar-triangles') {
    return 'Triangles & Pythagoras'
  }
  if (id === 'polygon-angles' || id === 'areas-of-polygons') {
    return 'Polygons & area'
  }
  return 'Circles'
}

type UnitGroup = { title: string; items: RegisteredLesson[] }

// Groups consecutive lessons by their unit, preserving the course order and never
// dropping a lesson (anything unmapped falls into the trailing "Circles" group).
function groupByUnit(items: RegisteredLesson[]): UnitGroup[] {
  const groups: UnitGroup[] = []
  for (const lesson of items) {
    const title = unitFor(lesson)
    const last = groups[groups.length - 1]
    if (last && last.title === title) {
      last.items.push(lesson)
    } else {
      groups.push({ title, items: [lesson] })
    }
  }
  return groups
}

// 1-based position of each lesson in the overall course, used to number the
// nodes on the journey map so the 17-step climb reads in order.
const courseNumber = new Map(lessons.map((lesson, index) => [lesson.id, index + 1] as const))

// Lessons counted by the overall progress bar. The prequiz ("Parts of a circle")
// is a warm-up rather than a graded lesson, so it is excluded and the bar tracks
// the 16 lessons that make up the four units.
const progressLessons = lessons.filter((lesson) => lesson.kind !== 'prequiz')

function HomePage() {
  const { user } = useAuth()
  const [progressById, setProgressById] = useState<Record<string, LessonProgress | null>>({})
  const [streak, setStreak] = useState<Streak | null>(null)
  const [reviews, setReviews] = useState<ReviewMap>({})
  const today = todayISO()

  useEffect(() => {
    let active = true

    if (!user) {
      setProgressById({})
      setStreak(null)
    } else {
      Promise.all(
        lessons.map((lesson) =>
          fetchLessonProgress(user.id, lesson.id).then((result) => [lesson.id, result] as const),
        ),
      ).then((entries) => {
        if (active) {
          setProgressById(Object.fromEntries(entries))
        }
      })
      fetchStreak(user.id).then((result) => {
        if (active) {
          setStreak(result)
        }
      })
    }

    // Reviews load even when signed out (localStorage), so mastery + spaced
    // repetition work as a no-account experience too.
    loadReviews(user?.id ?? null).then((map) => {
      if (active) {
        setReviews(map)
      }
    })

    return () => {
      active = false
    }
  }, [user])

  const unitGroups = groupByUnit(lessons)

  const completedLessons = progressLessons.filter(
    (lesson) => progressById[lesson.id]?.completed,
  ).length

  // Mastery: which concepts have been mastered, and which lessons are therefore
  // unlocked. A lesson opens when the PREVIOUS lesson's concept is mastered (real
  // mastery learning); the prequiz, the first lesson, and anything already started
  // stay open so progress is never trapped behind the gate.
  const masteredConcepts = new Set(
    lessons.filter((lesson) => lesson.concept && reviews[lesson.concept]?.mastered).map((l) => l.concept!),
  )
  const unlockedIds = new Set<string>()
  lessons.forEach((lesson, index) => {
    const progress = progressById[lesson.id]
    const started = Boolean(progress?.completed) || (progress?.currentStep ?? 0) > 0
    if (index <= 1 || started) {
      unlockedIds.add(lesson.id)
      return
    }
    const prev = lessons[index - 1]
    const prevCleared = prev.concept
      ? masteredConcepts.has(prev.concept)
      : Boolean(progressById[prev.id]?.completed)
    if (prevCleared) {
      unlockedIds.add(lesson.id)
    }
  })

  const currentIndex = lessons.findIndex((lesson) => !progressById[lesson.id]?.completed)
  const currentId = currentIndex === -1 ? null : lessons[currentIndex].id

  const courseComplete = currentIndex === -1
  // CTA targets the first not-yet-finished lesson that is actually unlocked.
  const nextLesson =
    lessons.find((lesson) => !progressById[lesson.id]?.completed && unlockedIds.has(lesson.id)) ??
    lessons[0]
  const courseStarted = lessons.some((lesson) => {
    const progress = progressById[lesson.id]
    return Boolean(progress?.completed) || (progress?.currentStep ?? 0) > 0
  })
  const primaryCta = courseComplete
    ? 'Review course'
    : courseStarted
      ? 'Continue course'
      : 'Start course'

  const dueCount = dueTopics(reviews, today).length
  const masteredCount = masteredConcepts.size

  return (
    <main className="app-shell home">
      <Header />

      <section className="course-intro">
        <div className="course-intro__text">
          <p className="course-intro__eyebrow">Geometry course</p>
          <h1 className="course-intro__title">Angle Attack</h1>
          <p className="course-intro__lead">
            17 lessons across 4 units, from angle-chasing and the Pythagorean theorem to the
            circle theorems.
          </p>
          <Link className="btn btn--primary" to={nextLesson.path}>
            {primaryCta}
          </Link>
          {!user && (
            <p className="home__hint">
              <Link to="/auth">Sign in</Link> to save your progress.
            </p>
          )}
        </div>
        <div className="course-intro__visual">
          <HeroIllustration />
        </div>
      </section>

      <ReviewCard dueCount={dueCount} />

      <CourseProgress completed={completedLessons} total={progressLessons.length} />

      {user && (
        <div className="home-stats">
          <StreakBadge count={activeStreak(streak)} />
        </div>
      )}

      <MemoryPanel reviews={reviews} masteredCount={masteredCount} />

      <section className="course-next" aria-label="Course journey">
        <h2 className="course-next__heading">Your journey</h2>
        <JourneyMap
          groups={unitGroups}
          progressById={progressById}
          currentId={currentId}
          unlockedIds={unlockedIds}
          masteredConcepts={masteredConcepts}
        />
      </section>
    </main>
  )
}

// The spaced-repetition entry point. When concepts are due it's a prominent call
// to action; otherwise a quiet "caught up" note that still links to a mixed
// review for anyone who wants extra interleaved practice.
function ReviewCard({ dueCount }: { dueCount: number }) {
  if (dueCount > 0) {
    return (
      <Link className="review-card is-due" to="/review">
        <span className="review-card__icon" aria-hidden="true">↻</span>
        <span className="review-card__text">
          <strong>{dueCount} concept{dueCount === 1 ? '' : 's'} due for review</strong>
          <span>A quick mixed set — recall them before they fade.</span>
        </span>
        <span className="review-card__cta">Review</span>
      </Link>
    )
  }
  return (
    <div className="review-card is-clear">
      <span className="review-card__icon" aria-hidden="true">✓</span>
      <span className="review-card__text">
        <strong>Review — all caught up</strong>
        <span>Mastered concepts return here on a spaced schedule.</span>
      </span>
    </div>
  )
}

// Shows retention at a glance: a strength bar per practiced concept (its Leitner
// box) plus how many are mastered. This is the visible "did it stick?" signal.
function MemoryPanel({ reviews, masteredCount }: { reviews: ReviewMap; masteredCount: number }) {
  const seen = lessons
    .filter((lesson) => lesson.concept && reviews[lesson.concept]?.seen)
    .map((lesson) => ({ title: lesson.title, review: reviews[lesson.concept!]! }))

  if (seen.length === 0) {
    return null
  }

  return (
    <section className="memory" aria-label="Memory strength">
      <div className="memory__head">
        <h2 className="memory__heading">Memory</h2>
        <span className="memory__summary">
          {masteredCount} mastered &middot; {seen.length} in rotation
        </span>
      </div>
      <ul className="memory__list">
        {seen.map(({ title, review }) => (
          <li key={review.topic} className="memory__row">
            <span className="memory__label">{title}</span>
            <span className="memory__bar" aria-hidden="true">
              <span
                className={review.mastered ? 'memory__fill is-mastered' : 'memory__fill'}
                style={{ width: `${Math.round((review.box / MAX_BOX) * 100)}%` }}
              />
            </span>
            <span className="memory__state">
              {review.mastered ? 'Mastered' : `Box ${review.box}/${MAX_BOX}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function CourseProgress({ completed, total }: { completed: number; total: number }) {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div className="course-progress">
      <div className="course-progress__head" aria-hidden="true">
        <span className="course-progress__label">Course progress</span>
        <span className="course-progress__value">
          {completed} / {total} lessons &middot; {percent}%
        </span>
      </div>
      <div
        className="course-progress__track"
        role="progressbar"
        aria-label="Course progress"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completed}
        aria-valuetext={`${completed} of ${total} lessons complete, ${percent}%`}
      >
        <span className="course-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

type NodeState = 'done' | 'current' | 'upcoming' | 'locked'

function JourneyMap({
  groups,
  progressById,
  currentId,
  unlockedIds,
  masteredConcepts,
}: {
  groups: UnitGroup[]
  progressById: Record<string, LessonProgress | null>
  currentId: string | null
  unlockedIds: Set<string>
  masteredConcepts: Set<PracticeTopic>
}) {
  return (
    <nav className="journey" aria-label="Course map">
      {groups.map((group) => {
        const completed = group.items.filter((lesson) => progressById[lesson.id]?.completed).length

        return (
          <section className="jm-unit" key={group.title}>
            <div className="jm-unit__head">
              <h3 className="jm-unit__title">{group.title}</h3>
              <UnitBadge title={group.title} completed={completed} total={group.items.length} />
            </div>
            <ol className="jm-list">
              {group.items.map((lesson, index) => {
                const done = progressById[lesson.id]?.completed ?? false
                const prevDone = index > 0 && (progressById[group.items[index - 1].id]?.completed ?? false)
                const locked = !done && !unlockedIds.has(lesson.id)
                const state: NodeState = done
                  ? 'done'
                  : locked
                    ? 'locked'
                    : lesson.id === currentId
                      ? 'current'
                      : 'upcoming'
                const mastered = lesson.concept ? masteredConcepts.has(lesson.concept) : false

                return (
                  <JourneyNode
                    key={lesson.id}
                    lesson={lesson}
                    number={courseNumber.get(lesson.id) ?? index + 1}
                    progress={progressById[lesson.id] ?? null}
                    state={state}
                    mastered={mastered}
                    showTopRail={index > 0}
                    showBottomRail={index < group.items.length - 1}
                    topFilled={prevDone}
                    bottomFilled={done}
                  />
                )
              })}
            </ol>
          </section>
        )
      })}
    </nav>
  )
}

function JourneyNode({
  lesson,
  number,
  progress,
  state,
  mastered,
  showTopRail,
  showBottomRail,
  topFilled,
  bottomFilled,
}: {
  lesson: RegisteredLesson
  number: number
  progress: LessonProgress | null
  state: NodeState
  mastered: boolean
  showTopRail: boolean
  showBottomRail: boolean
  topFilled: boolean
  bottomFilled: boolean
}) {
  const total = lesson.content.totalSteps
  const { stepsDone } = progressView(progress, total)

  const status =
    state === 'locked'
      ? 'Master the previous lesson to unlock'
      : state === 'done'
        ? mastered
          ? 'Mastered'
          : 'Completed — practice to master'
        : state === 'current'
          ? stepsDone > 0
            ? `${stepsDone} of ${total} steps`
            : 'Start now'
          : `${total} steps`

  const stateLabel =
    state === 'locked'
      ? 'Locked'
      : state === 'done'
        ? mastered
          ? 'Mastered'
          : 'Completed'
        : state === 'current'
          ? 'Current lesson'
          : 'Upcoming'

  const rail = (
    <span className="jm-rail" aria-hidden="true">
      {showTopRail && (
        <span className={`jm-rail__seg jm-rail__seg--top${topFilled ? ' is-filled' : ''}`} />
      )}
      {showBottomRail && (
        <span className={`jm-rail__seg jm-rail__seg--bottom${bottomFilled ? ' is-filled' : ''}`} />
      )}
      <span className="jm-dot">
        {state === 'done' ? (
          <CheckIcon />
        ) : state === 'locked' ? (
          <LockIcon />
        ) : (
          <span className="jm-dot__num">{number}</span>
        )}
      </span>
    </span>
  )

  const body = (
    <span className="jm-node__body">
      <span className="jm-node__title">
        {lesson.title}
        {state === 'done' && mastered && <span className="jm-node__star" aria-hidden="true"> ★</span>}
      </span>
      <span className="jm-node__status">{status}</span>
    </span>
  )

  if (state === 'locked') {
    return (
      <li className="jm-node jm-node--locked">
        <div className="jm-node__link" aria-label={`Lesson ${number}: ${lesson.title}. ${stateLabel}.`} aria-disabled="true">
          {rail}
          {body}
        </div>
      </li>
    )
  }

  return (
    <li className={`jm-node jm-node--${state}`}>
      <Link
        className="jm-node__link"
        to={lesson.path}
        aria-label={`Lesson ${number}: ${lesson.title}. ${stateLabel}.`}
        aria-current={state === 'current' ? 'step' : undefined}
      >
        {rail}
        {body}
        {state === 'current' && (
          <span className="jm-node__cta">{stepsDone > 0 ? 'Continue' : 'Start'}</span>
        )}
      </Link>
    </li>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor">
      <path d="M12 1.5a4.5 4.5 0 0 0-4.5 4.5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1.5V6A4.5 4.5 0 0 0 12 1.5zm2.5 7.5h-5V6a2.5 2.5 0 0 1 5 0v3z" />
    </svg>
  )
}

function UnitBadge({
  title,
  completed,
  total,
}: {
  title: string
  completed: number
  total: number
}) {
  const earned = total > 0 && completed === total

  if (earned) {
    return (
      <span className="jm-badge is-earned" title={`${title} complete`} aria-label={`${title} unit complete`}>
        <CheckIcon />
        <span className="jm-badge__label">Earned</span>
      </span>
    )
  }

  return (
    <span
      className="jm-badge is-locked"
      title={`${completed} of ${total} lessons complete`}
      aria-label={`${title} unit: ${completed} of ${total} lessons complete`}
    >
      <span className="jm-badge__count">
        {completed}/{total}
      </span>
    </span>
  )
}

function StreakBadge({ count }: { count: number }) {
  return (
    <div className="streak-badge" title={`${count}-day streak`}>
      <FlameIcon active={count > 0} />
      <span className="streak-badge__count">{count}</span>
      <span className="streak-badge__label">day streak</span>
    </div>
  )
}

function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg
      className={active ? 'flame is-active' : 'flame'}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248zM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.547 3.75 3.75 0 0 1 3.255 3.719z"
      />
    </svg>
  )
}

function LessonCard({
  lesson,
  progress,
  note,
}: {
  lesson: RegisteredLesson
  progress: LessonProgress | null
  note?: string
}) {
  const total = lesson.content.totalSteps
  const { stepsDone, cta } = progressView(progress, total)
  const status =
    note ??
    (progress?.completed ? 'Completed' : stepsDone > 0 ? `${stepsDone} of ${total} steps` : cta)

  return (
    <Link className="course-card course-card--active" to={lesson.path}>
      <span className="course-card__glyph" aria-hidden="true">
        <LessonGlyph />
      </span>
      <div className="course-card__text">
        <h3>{lesson.title}</h3>
        <p>{status}</p>
      </div>
      <ChevronIcon />
    </Link>
  )
}

function ComingSoonCard() {
  return (
    <article className="course-card is-locked" aria-disabled="true">
      <span className="course-card__lock" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path
            fill="currentColor"
            d="M12 1.5a4.5 4.5 0 0 0-4.5 4.5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1.5V6A4.5 4.5 0 0 0 12 1.5zm2.5 7.5h-5V6a2.5 2.5 0 0 1 5 0v3z"
          />
        </svg>
      </span>
      <div className="course-card__text">
        <h3>More circle theorems</h3>
        <p>Coming soon</p>
      </div>
    </article>
  )
}

function LessonGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.4" />
      <polygon points="12,3.6 20.4,12 13.5,20.3 4.2,9.1" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      className="course-card__arrow"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function HouseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function LessonPage() {
  const { lessonId } = useParams()
  const registered = getLesson(lessonId)

  if (!registered) {
    return <Navigate to="/" replace />
  }

  return <LessonView key={registered.id} registered={registered} />
}

function LessonView({ registered }: { registered: RegisteredLesson }) {
  const lesson = registered.content
  const { user, loading: authLoading } = useAuth()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [maxStepReached, setMaxStepReached] = useState(0)
  const [isFinished, setIsFinished] = useState(false)
  const [hydrating, setHydrating] = useState(true)
  const [justFinished, setJustFinished] = useState(false)
  // Spaced-repetition / mastery state for this user, kept in a ref so recording a
  // practice result never re-renders the lesson. Loaded once per user.
  const reviewsRef = useRef<ReviewMap>({})
  const lastIndex = lesson.steps.length - 1
  const currentStep = lesson.steps[currentStepIndex]

  useEffect(() => {
    if (authLoading) {
      return
    }

    let active = true

    if (!user) {
      setHydrating(false)
      return
    }

    fetchLessonProgress(user.id, lesson.lessonId).then((progress) => {
      if (!active) {
        return
      }
      if (progress) {
        const resumeIndex = Math.min(Math.max(progress.currentStep, 0), lastIndex)
        setIsFinished(progress.completed)
        setCurrentStepIndex(resumeIndex)
        setMaxStepReached(progress.completed ? lastIndex : resumeIndex)
      }
      setHydrating(false)
    })

    return () => {
      active = false
    }
  }, [user, authLoading, lastIndex, lesson.lessonId])

  useEffect(() => {
    if (user) {
      void recordStreakActivity(user.id)
    }
  }, [user])

  useEffect(() => {
    let active = true
    loadReviews(user?.id ?? null).then((map) => {
      if (active) {
        reviewsRef.current = map
      }
    })
    return () => {
      active = false
    }
  }, [user])

  // Fold a practice result into the concept's spaced-repetition + mastery state
  // and persist it (Supabase when signed in, else localStorage).
  function handleConceptResult(topic: PracticeTopic, outcome: { correct: boolean; firstTry: boolean }) {
    const next = applyAttempt(reviewsRef.current[topic], topic, outcome, todayISO())
    reviewsRef.current = { ...reviewsRef.current, [topic]: next }
    void saveReview(user?.id ?? null, next)
  }

  function persist(step: number, completed: boolean) {
    if (user) {
      void saveLessonProgress(user.id, lesson.lessonId, { currentStep: step, completed })
    }
  }

  function handleContinue() {
    if (currentStepIndex === lastIndex) {
      setIsFinished(true)
      setMaxStepReached(lastIndex)
      setJustFinished(true)
      persist(lastIndex, true)
      return
    }

    const next = currentStepIndex + 1
    setCurrentStepIndex(next)
    if (next > maxStepReached) {
      setMaxStepReached(next)
      persist(next, false)
    }
  }

  function goToStep(index: number) {
    if (index < 0 || index > maxStepReached) {
      return
    }
    setIsFinished(false)
    setCurrentStepIndex(index)
  }

  function goBack() {
    setCurrentStepIndex((index) => Math.max(index - 1, 0))
  }

  function restart() {
    setIsFinished(false)
    setJustFinished(false)
    setCurrentStepIndex(0)
    setMaxStepReached(0)
    persist(0, false)
  }

  // Dev-only navigation shortcuts. `devJump` moves to any step and bumps the
  // high-water mark so the progress bar stays consistent; `devFinish` drops onto
  // the completion screen. Both bypass the completion gate without touching the
  // production logic above (no persistence side effects). Every call site is
  // wrapped in `import.meta.env.DEV`, so these are stripped from the prod build.
  function devJump(index: number) {
    const clamped = Math.min(Math.max(index, 0), lastIndex)
    setIsFinished(false)
    setCurrentStepIndex(clamped)
    setMaxStepReached((reached) => Math.max(reached, clamped))
  }

  function devFinish() {
    setCurrentStepIndex(lastIndex)
    setMaxStepReached(lastIndex)
    setIsFinished(true)
  }

  if (hydrating) {
    return (
      <main className="app-shell notice-shell">
        <Header />
        <section className="notice">
          <p>Loading your progress…</p>
        </section>
      </main>
    )
  }

  if (isFinished) {
    const { formula } = registered.summary
    const nextLesson = registered.nextLessonId ? getLesson(registered.nextLessonId) : undefined
    return (
      <main className="app-shell notice-shell">
        <Header />
        <section className="notice complete">
          {justFinished && <Confetti />}
          <div
            className={justFinished ? 'complete__badge is-celebrate' : 'complete__badge'}
            aria-hidden="true"
          >
            <CheckIcon />
          </div>
          <h1>{registered.kind === 'prequiz' ? 'Prequiz complete' : 'Lesson complete'}</h1>
          <p className="complete__text">{registered.summary.text}</p>

          <p className="summary-formula">
            <span className="summary-formula__angle">{formula.left}</span> {formula.op}{' '}
            <span className="summary-formula__central">{formula.right}</span>
          </p>

          <UpNext nextId={registered.nextLessonId} />

          <div className="notice__actions">
            {nextLesson && (
              <Link className="btn btn--primary" to={nextLesson.path}>
                Next lesson
                <ArrowRightIcon />
              </Link>
            )}
            <button type="button" className="btn btn--ghost" onClick={restart}>
              <RefreshIcon />
              Start over
            </button>
            <Link className="btn btn--ghost" to="/">
              <HouseIcon />
              Back home
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className={import.meta.env.DEV ? 'app-shell lesson-shell has-dev-bar' : 'app-shell lesson-shell'}>
      <Header />

      <Suspense fallback={<section className="notice"><p>Loading…</p></section>}>
        <StepRenderer
          key={currentStep.stepId}
          step={currentStep}
          stepNumber={currentStepIndex + 1}
          totalSteps={lesson.totalSteps}
          maxStepReached={maxStepReached}
          completed={currentStepIndex < maxStepReached}
          onContinue={handleContinue}
          onGoToStep={goToStep}
          onBack={goBack}
          onConceptResult={handleConceptResult}
          onDevJump={import.meta.env.DEV ? devJump : undefined}
          onDevFinish={import.meta.env.DEV ? devFinish : undefined}
        />
      </Suspense>
    </main>
  )
}

function UpNext({ nextId }: { nextId?: string }) {
  const next = nextId ? getLesson(nextId) : undefined

  return (
    <section className="course-next" aria-label="Recommended next lesson">
      <h2 className="course-next__heading">Up next</h2>
      {next ? <LessonCard lesson={next} progress={null} note={next.tagline} /> : <ComingSoonCard />}
    </section>
  )
}

function AuthPage() {
  const { user, loading } = useAuth()

  if (!loading && user) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="app-shell notice-shell">
      <Header />
      {!loading && <AuthPanel />}
    </main>
  )
}

function LogoMark() {
  return (
    <svg className="brand__mark" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle className="brand__ring" cx="12" cy="12" r="8.4" />
      <path className="brand__angle" d="M12 12.6 L7.18 18.88 M12 12.6 L16.82 18.88 M10.54 14.5 H13.46" />
      <path className="brand__a" d="M12 3.6 L7.18 18.88 M12 3.6 L16.82 18.88 M10.3 9 H13.7" />
    </svg>
  )
}

function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="top-nav">
      <Link className="brand" to="/">
        <LogoMark />
        <span className="brand__name">Angle Attack</span>
      </Link>
      <div className="nav-right">
        <AiControl />
        {user ? (
          <div className="nav-account">
            <span className="nav-account__email">{user.email}</span>
            <button type="button" className="nav-link nav-link--button" onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        ) : (
          <Link className="nav-link" to="/auth">
            Sign in
          </Link>
        )}
      </div>
    </header>
  )
}

// One compact control for the optional AI surfaces (AI-generated extra practice
// and AI guided hints). The switch toggles them; the "AI ⓘ" label both names the
// control and, on hover/tap, opens a plain-language explainer so a learner can
// make an informed choice. Turning it off makes the app behave exactly as with no
// API key — deterministic problems and curated hints — verifiable right here.
function AiControl() {
  const enabled = useAiEnabled()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    function onDocDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className="ai-control"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={enabled ? 'AI features on' : 'AI features off'}
        className={enabled ? 'ai-switch is-on' : 'ai-switch'}
        onClick={() => setAiEnabled(!enabled)}
      >
        <span className="ai-switch__label">{enabled ? 'AI on' : 'AI off'}</span>
        <span className="ai-switch__thumb" aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ai-info"
        aria-label="What does AI do in this app?"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">i</span>
      </button>
      {open && (
        <div className="ai-pop" role="dialog" aria-label="What AI does in this app">
          <strong className="ai-pop__title">What “AI” does here</strong>
          <ul className="ai-pop__list">
            <li>
              <b>Extra practice</b> — “More practice” invents fresh problems with new numbers and
              framings. The answer, figure, and hints are always computed in code; AI only proposes
              the setup, never a number you see.
            </li>
            <li>
              <b>Guided hints</b> — after a few wrong tries, it diagnoses your likely mistake and
              coaches you toward the fix, without revealing the answer.
            </li>
          </ul>
          <p className="ai-pop__foot">Off: built-in problems and pre-written hints. Nothing breaks.</p>
        </div>
      )}
    </div>
  )
}

export default App
