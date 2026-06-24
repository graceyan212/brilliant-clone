import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthPanel } from './components/auth/AuthPanel'
import { StepRenderer } from './components/lesson/StepRenderer'
import { getLesson, lessons, type RegisteredLesson } from './content/lessons'
import { useAuth } from './lib/AuthProvider'
import { fetchLessonProgress, saveLessonProgress, type LessonProgress } from './lib/progress'
import { activeStreak, fetchStreak, recordStreakActivity, type Streak } from './lib/streaks'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lesson/:lessonId" element={<LessonPage />} />
      <Route path="/auth" element={<AuthPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function progressView(progress: LessonProgress | null | undefined, total: number) {
  const stepsDone = progress ? (progress.completed ? total : progress.currentStep) : 0
  const percent = Math.round((stepsDone / total) * 100)
  const cta = progress?.completed
    ? 'Review lesson'
    : stepsDone > 0
      ? 'Continue lesson'
      : 'Start lesson'
  return { stepsDone, percent, cta }
}

function HomePage() {
  const { user } = useAuth()
  const [progressById, setProgressById] = useState<Record<string, LessonProgress | null>>({})
  const [streak, setStreak] = useState<Streak | null>(null)

  useEffect(() => {
    let active = true

    if (!user) {
      setProgressById({})
      setStreak(null)
      return
    }

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

    return () => {
      active = false
    }
  }, [user])

  const featured = lessons[0]
  const rest = lessons.slice(1)
  const { stepsDone, percent, cta } = progressView(progressById[featured.id], featured.content.totalSteps)

  return (
    <main className="app-shell home">
      <Header />

      {user && <StreakBadge count={activeStreak(streak)} />}

      <section className="lesson-entry">
        <div className="lesson-entry__diagram">
          <PreviewDiagram />
        </div>
        <div className="lesson-entry__body">
          <h1>{featured.title}</h1>
          <p>{featured.tagline}</p>
          <div className="progress" role="group" aria-label="Lesson progress">
            <div className="progress__track">
              <span style={{ width: `${percent}%` }} />
            </div>
            <span className="progress__count">
              {progressById[featured.id]?.completed
                ? 'Completed'
                : `${stepsDone} of ${featured.content.totalSteps} steps`}
            </span>
          </div>
          <Link className="btn btn--primary" to={featured.path}>
            {cta}
          </Link>
          {!user && (
            <p className="home__hint">
              <Link to="/auth">Sign in</Link> to save your progress.
            </p>
          )}
        </div>
      </section>

      <section className="course-next" aria-label="More lessons">
        <h2 className="course-next__heading">More lessons</h2>
        <div className="course-list">
          {rest.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} progress={progressById[lesson.id] ?? null} />
          ))}
          <ComingSoonCard />
        </div>
      </section>
    </main>
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
        <LessonGlyph id={lesson.id} />
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

function LessonGlyph({ id }: { id: string }) {
  if (id === 'cyclic-quadrilaterals') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8.4" />
        <polygon points="12,3.6 20.4,12 13.5,20.3 4.2,9.1" strokeLinejoin="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M7.5 16 L15 6.5 M7.5 16 L17 13.5" strokeLinecap="round" strokeLinejoin="round" />
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

function PreviewDiagram() {
  return (
    <svg viewBox="0 0 200 168" role="img" aria-label="A circle with points A, B, and C">
      <circle className="pv-circle" cx="100" cy="84" r="60" />
      <line className="pv-chord" x1="110.4" y1="143.1" x2="43.6" y2="63.5" />
      <line className="pv-chord" x1="110.4" y1="143.1" x2="156.4" y2="63.5" />
      <line className="pv-base" x1="43.6" y1="63.5" x2="156.4" y2="63.5" />
      <PreviewPoint x={43.6} y={63.5} label="A" />
      <PreviewPoint x={156.4} y={63.5} label="B" />
      <PreviewPoint x={110.4} y={143.1} label="C" accent />
    </svg>
  )
}

function PreviewPoint({
  x,
  y,
  label,
  accent = false,
}: {
  x: number
  y: number
  label: string
  accent?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`} className={accent ? 'pv-point is-accent' : 'pv-point'}>
      <circle r="6" />
      <text x={label === 'B' ? 12 : label === 'C' ? 0 : -12} y={label === 'C' ? 20 : 4}>
        {label}
      </text>
    </g>
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

  function persist(step: number, completed: boolean) {
    if (user) {
      void saveLessonProgress(user.id, lesson.lessonId, { currentStep: step, completed })
    }
  }

  function handleContinue() {
    if (currentStepIndex === lastIndex) {
      setIsFinished(true)
      setMaxStepReached(lastIndex)
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
    setCurrentStepIndex(0)
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
    return (
      <main className="app-shell notice-shell">
        <Header />
        <section className="notice complete">
          <div className="complete__badge" aria-hidden="true">
            <CheckIcon />
          </div>
          <h1>Lesson complete</h1>
          <p className="complete__text">{registered.summary.text}</p>

          <p className="summary-formula">
            <span className="summary-formula__angle">{formula.left}</span> {formula.op}{' '}
            <span className="summary-formula__central">{formula.right}</span>
          </p>

          <UpNext nextId={registered.nextLessonId} />

          <div className="notice__actions">
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
    <main className="app-shell lesson-shell">
      <Header />

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
      />
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
    </header>
  )
}

export default App
