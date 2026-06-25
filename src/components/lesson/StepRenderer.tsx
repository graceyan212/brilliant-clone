import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { CircleDiagram } from '../diagram/CircleDiagram'
import { CyclicQuadDiagram } from '../diagram/CyclicQuadDiagram'
import { CyclicQuadProof } from '../diagram/CyclicQuadProof'
import { IdentifyFigure } from '../diagram/IdentifyFigure'
import { ProofDiagram } from '../diagram/ProofDiagram'
import { StaticAngleDiagram } from '../diagram/StaticAngleDiagram'
import type {
  DiagramConfig,
  IdentifyStep,
  LessonStep,
  MultipleChoiceStep,
  NumericProblem,
  ProofStep,
  StatementStep,
} from '../../types/lesson'
import './StepRenderer.css'

// Central angle (∠AOB and the words "central angle") is teal; inscribed angle
// (∠ACB and the words "inscribed angle") is the accent. Keeps the prose, the
// readouts, and the diagram labels on one consistent color key.
const isCentralToken = /^(?:\u2220AOB|central angles?)$/i
const isInscribedToken = /^(?:\u2220ACB|inscribed angles?)$/i

function AngleText({ text }: { text: string }) {
  const parts = text.split(/(\u2220AOB|\u2220ACB|central angles?|inscribed angles?)/i)

  return (
    <>
      {parts.map((part, index) => {
        if (isCentralToken.test(part)) {
          return (
            <span key={index} className="angle-text is-central">
              {part}
            </span>
          )
        }
        if (isInscribedToken.test(part)) {
          return (
            <span key={index} className="angle-text is-inscribed">
              {part}
            </span>
          )
        }
        return part
      })}
    </>
  )
}

type StepRendererProps = {
  step: LessonStep
  stepNumber: number
  totalSteps: number
  maxStepReached: number
  completed: boolean
  onContinue: () => void
  onGoToStep: (index: number) => void
  onBack: () => void
}

export function StepRenderer({
  step,
  stepNumber,
  totalSteps,
  maxStepReached,
  completed,
  onContinue,
  onGoToStep,
  onBack,
}: StepRendererProps) {
  const [isComplete, setIsComplete] = useState(completed || step.interactionType === 'statement')
  const complete = useCallback(() => setIsComplete(true), [])
  const isLast = stepNumber === totalSteps

  return (
    <>
      <StepProgress
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        maxReached={maxStepReached}
        onGoToStep={onGoToStep}
      />

      {step.interactionType === 'practice' ? (
        <PracticeLayout step={step} onComplete={complete} />
      ) : step.interactionType === 'proof' ? (
        <ProofLayout step={step} onComplete={complete} />
      ) : step.interactionType === 'identify' ? (
        <IdentifyLayout step={step} onComplete={complete} />
      ) : (
        <section className="lesson-stage">
          <div className="prompt-panel">
            <h1>
              <AngleText text={step.prompt} />
            </h1>
            {step.subtitle && (
              <p className="prompt-subtitle">
                <AngleText text={step.subtitle} />
              </p>
            )}
            {step.interactionType === 'statement' && <StatementBody step={step} />}
          </div>

          {step.diagram && (
            <div className="diagram-placeholder">
              <DiagramView
                config={step.diagram}
                onInteract={step.interactionType === 'explore' ? complete : undefined}
              />
            </div>
          )}

          <div className="interaction-panel">
            <Interaction step={step} onComplete={complete} />
          </div>
        </section>
      )}

      <div className="bottom-action">
        <div className="bottom-action__row">
          {stepNumber > 1 && (
            <button
              type="button"
              className="btn btn--ghost bottom-action__back"
              onClick={onBack}
              aria-label="Previous step"
            >
              <BackIcon />
            </button>
          )}
          <button type="button" className="btn btn--primary" disabled={!isComplete} onClick={onContinue}>
            {isLast ? 'Finish lesson' : 'Continue'}
          </button>
        </div>
      </div>
    </>
  )
}

function BackIcon() {
  return (
    <svg
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
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function StepProgress({
  stepNumber,
  totalSteps,
  maxReached,
  onGoToStep,
}: {
  stepNumber: number
  totalSteps: number
  maxReached: number
  onGoToStep: (index: number) => void
}) {
  return (
    <div className="step-progress">
      <ol className="step-progress__bar">
        {Array.from({ length: totalSteps }, (_, index) => {
          const done = index < stepNumber
          const reachable = index <= maxReached
          return (
            <li key={index}>
              <button
                type="button"
                className="step-progress__seg-btn"
                disabled={!reachable}
                aria-label={`Go to step ${index + 1}`}
                aria-current={index === stepNumber - 1 ? 'step' : undefined}
                onClick={() => onGoToStep(index)}
              >
                <span className={done ? 'step-progress__seg is-done' : 'step-progress__seg'} />
              </button>
            </li>
          )
        })}
      </ol>
      <p className="step-counter">
        Step {stepNumber} of {totalSteps}
      </p>
    </div>
  )
}

function Interaction({ step, onComplete }: { step: LessonStep; onComplete: () => void }) {
  switch (step.interactionType) {
    case 'multiple_choice':
      return <MultipleChoice step={step} onComplete={onComplete} />
    case 'numeric':
      return <NumericField problem={step.problem} onSolved={onComplete} />
    case 'explore':
    case 'proof':
    case 'practice':
    case 'identify':
    case 'statement':
      return null
  }
}

function DiagramView({ config, onInteract }: { config: DiagramConfig; onInteract?: () => void }) {
  if (config.mode === 'static') {
    if (config.variant === 'quad') {
      return (
        <CyclicQuadDiagram
          interactive={false}
          givenA={config.quadGivenA}
          show={config.quadShow}
          rotate={config.quadRotate}
        />
      )
    }

    return (
      <StaticAngleDiagram
        centralAngle={config.centralAngle ?? 0}
        showCentralValue={config.showCentralValue}
        showAngleValue={config.showAngleValue}
        showNames={config.showNames}
      />
    )
  }

  if (config.variant === 'quad') {
    return (
      <CyclicQuadDiagram interactive showReadout={config.showReadout !== false} onInteract={onInteract} />
    )
  }

  return (
    <CircleDiagram
      showAngle={config.highlightAngle !== false}
      showCentral={config.highlightCentral === true}
      lockAnchors={config.lockAnchors}
      onInteract={onInteract}
    />
  )
}

function StatementBody({ step }: { step: StatementStep }) {
  return (
    <>
      {step.body.split('\n').map((line, index) => (
        <p key={index} className="statement-body">
          <AngleText text={line} />
        </p>
      ))}
    </>
  )
}

function MultipleChoice({
  step,
  onComplete,
}: {
  step: MultipleChoiceStep
  onComplete: () => void
}) {
  const [selected, setSelected] = useState<string>()
  const commitOnSelect = step.advanceOn === 'select'
  const isCorrect = selected === step.correctAnswer
  const selectedOption = step.options.find((option) => option.id === selected)
  const incorrectText = selectedOption?.feedback ?? step.feedback.incorrect

  function choose(id: string) {
    setSelected(id)
    if (commitOnSelect || id === step.correctAnswer) {
      onComplete()
    }
  }

  return (
    <>
      <div className="answer-list">
        {step.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={selected === option.id ? 'answer-option is-selected' : 'answer-option'}
            onClick={() => choose(option.id)}
          >
            <AngleText text={option.label} />
          </button>
        ))}
      </div>

      {selected !== undefined &&
        (commitOnSelect ? (
          step.commitNote && <p className="commit-note">{step.commitNote}</p>
        ) : (
          <FeedbackNote correct={isCorrect}>
            <AngleText text={isCorrect ? step.feedback.correct : incorrectText} />
          </FeedbackNote>
        ))}
    </>
  )
}

function ProofLayout({ step, onComplete }: { step: ProofStep; onComplete: () => void }) {
  const [revealed, setRevealed] = useState(1)
  const centralAngle = step.diagram?.centralAngle ?? 120
  const allRevealed = revealed >= step.stages.length

  useEffect(() => {
    if (allRevealed) {
      onComplete()
    }
  }, [allRevealed, onComplete])

  return (
    <section className="lesson-stage">
      <div className="prompt-panel">
        <h1>
          <AngleText text={step.prompt} />
        </h1>
      </div>

      <div className="diagram-placeholder">
        {step.diagram?.variant === 'quad' ? (
          <CyclicQuadProof revealed={revealed} />
        ) : (
          <ProofDiagram revealed={revealed} centralAngle={centralAngle} />
        )}
      </div>

      <div className="interaction-panel">
        <ol className="proof__stages">
          {step.stages.slice(0, revealed).map((stage, index) => (
            <li key={index} className={index === revealed - 1 ? 'is-current' : ''}>
              {stage}
            </li>
          ))}
        </ol>

        {!allRevealed && (
          <button type="button" className="btn btn--ghost" onClick={() => setRevealed((n) => n + 1)}>
            Next step
          </button>
        )}
      </div>
    </section>
  )
}

function IdentifyLayout({ step, onComplete }: { step: IdentifyStep; onComplete: () => void }) {
  const [foundIds, setFoundIds] = useState<string[]>([])
  const [feedback, setFeedback] = useState<string>()
  const current = step.targets[foundIds.length]
  const done = current === undefined

  useEffect(() => {
    if (done) {
      onComplete()
    }
  }, [done, onComplete])

  function tap(id: 'central' | 'inscribed') {
    if (!current || foundIds.includes(id)) {
      return
    }
    if (id === current.id) {
      setFeedback(undefined)
      setFoundIds((ids) => [...ids, id])
    } else {
      setFeedback(current.hint)
    }
  }

  return (
    <section className="lesson-stage">
      <div className="prompt-panel">
        <h1>
          <AngleText text={step.prompt} />
        </h1>
        <p className="prompt-subtitle">
          {done ? 'Both angles found.' : <AngleText text={current.prompt} />}
        </p>
      </div>

      <div className="diagram-placeholder">
        <IdentifyFigure
          centralAngle={step.centralAngle}
          foundCentral={foundIds.includes('central')}
          foundInscribed={foundIds.includes('inscribed')}
          onTap={tap}
        />
      </div>

      <div className="interaction-panel">
        {feedback && (
          <FeedbackNote correct={false}>
            <AngleText text={feedback} />
          </FeedbackNote>
        )}
      </div>
    </section>
  )
}

function NumericField({
  problem,
  onSolved,
}: {
  problem: NumericProblem
  onSolved: () => void
}) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string }>()
  const [wrongCount, setWrongCount] = useState(0)
  const solved = feedback?.correct === true
  const showStrongHint = !solved && wrongCount >= 3 && problem.strongHint !== undefined

  function check(event: FormEvent) {
    event.preventDefault()
    const parsed = Number.parseFloat(value)
    const tolerance = problem.tolerance ?? 0

    if (!Number.isFinite(parsed)) {
      setFeedback({ correct: false, text: 'Enter a number to check.' })
      return
    }

    if (Math.abs(parsed - problem.correctAnswer) <= tolerance) {
      setFeedback({ correct: true, text: problem.feedback.correct })
      onSolved()
      return
    }

    setWrongCount((count) => count + 1)
    const direction = parsed > problem.correctAnswer ? 'Too high.' : 'Too low.'
    setFeedback({ correct: false, text: `${direction} ${problem.feedback.incorrect}` })
  }

  return (
    <form className="numeric" onSubmit={check}>
      <label className="numeric__label" htmlFor={problem.id}>
        <AngleText text={problem.prompt} />
      </label>
      <div className="numeric__row">
        <div className="numeric__entry">
          <input
            id={problem.id}
            className="numeric__input"
            inputMode="numeric"
            autoComplete="off"
            value={value}
            disabled={solved}
            onChange={(event) => {
              setValue(event.target.value)
              if (feedback && !feedback.correct) {
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
        <FeedbackNote correct={feedback.correct}>
          <AngleText text={feedback.text} />
        </FeedbackNote>
      )}

      {showStrongHint && (
        <div className="hint-panel">
          <strong>Bigger hint</strong>
          <p>
            <AngleText text={problem.strongHint ?? ''} />
          </p>
        </div>
      )}
    </form>
  )
}

function PracticeLayout({
  step,
  onComplete,
}: {
  step: Extract<LessonStep, { interactionType: 'practice' }>
  onComplete: () => void
}) {
  const [extraProblems, setExtraProblems] = useState<NumericProblem[]>([])
  const [solved, setSolved] = useState<Record<string, boolean>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [moreAdded, setMoreAdded] = useState(false)

  const problems = [...step.problems, ...extraProblems]
  const allBaseSolved = step.problems.every((problem) => solved[problem.id])
  const current = problems[currentIndex]
  const currentSolved = solved[current.id] === true
  const isLastQuestion = currentIndex === problems.length - 1

  useEffect(() => {
    if (allBaseSolved) {
      onComplete()
    }
  }, [allBaseSolved, onComplete])

  function markSolved(id: string) {
    setSolved((cur) => ({ ...cur, [id]: true }))
  }

  function addMorePractice() {
    if (!step.morePracticeKind) {
      return
    }
    setExtraProblems(generatePracticeProblems(step.morePracticeKind, 5, step.problems.length))
    setMoreAdded(true)
    setCurrentIndex(step.problems.length)
  }

  return (
    <section className="practice quiz">
      <div className="quiz__head">
        <h1>
          <AngleText text={step.prompt} />
        </h1>
        <p className="quiz__counter">
          Question {currentIndex + 1} of {problems.length}
        </p>
      </div>

      <div className="practice__item">
        {current.diagram && (
          <div className="diagram-placeholder practice__diagram">
            <DiagramView config={current.diagram} />
          </div>
        )}
        <NumericField key={current.id} problem={current} onSolved={() => markSolved(current.id)} />
      </div>

      <div className="quiz__nav">
        {currentSolved && !isLastQuestion && (
          <button
            type="button"
            className="btn btn--primary quiz__next"
            onClick={() => setCurrentIndex((index) => index + 1)}
          >
            Next question
          </button>
        )}
        {currentSolved && isLastQuestion && allBaseSolved && !moreAdded && step.morePracticeKind && (
          <button type="button" className="btn btn--ghost quiz__more" onClick={addMorePractice}>
            More practice
          </button>
        )}
      </div>
    </section>
  )
}

// Builds a pool of distinct problems and returns `count` unique ones, so a batch
// never repeats a question. Deterministic math (no AI), per the Phase 1 rule.
function generatePracticeProblems(
  kind: 'inscribed' | 'cyclic',
  count: number,
  offset: number,
): NumericProblem[] {
  const pool = kind === 'cyclic' ? cyclicPool() : inscribedPool()

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, count).map((problem, index) => ({ ...problem, id: `generated-${offset + index}` }))
}

function inscribedPool(): Omit<NumericProblem, 'id'>[] {
  const pool: Omit<NumericProblem, 'id'>[] = []

  for (const central of [80, 100, 120, 140, 160]) {
    const inscribed = central / 2
    pool.push({
      prompt: `The central angle \u2220AOB is ${central}\u00B0. Find \u2220ACB.`,
      diagram: { mode: 'static', centralAngle: central, showCentralValue: true, showAngleValue: false },
      correctAnswer: inscribed,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. Half of ${central} is ${inscribed}.`,
        incorrect: 'How does the inscribed angle compare with the central angle?',
      },
      strongHint: `Halve the central angle: ${central}\u00B0 \u00F7 2.`,
    })
  }

  for (const inscribed of [30, 40, 50, 70, 80]) {
    const central = inscribed * 2
    pool.push({
      prompt: `\u2220ACB is ${inscribed}\u00B0. Find the central angle \u2220AOB.`,
      diagram: { mode: 'static', centralAngle: central, showCentralValue: false, showAngleValue: true },
      correctAnswer: central,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. Double ${inscribed} is ${central}.`,
        incorrect: 'How does the central angle compare with the inscribed angle?',
      },
      strongHint: `Double the inscribed angle: ${inscribed}\u00B0 \u00D7 2.`,
    })
  }

  return pool
}

function cyclicPool(): Omit<NumericProblem, 'id'>[] {
  const pool: Omit<NumericProblem, 'id'>[] = []

  for (const atA of [70, 85, 100, 110, 125]) {
    const atC = 180 - atA
    pool.push({
      prompt: `ABCD is a cyclic quadrilateral. \u2220A is ${atA}\u00B0. Find \u2220C.`,
      diagram: { mode: 'static', variant: 'quad', quadGivenA: atA, quadShow: ['A'] },
      correctAnswer: atC,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. 180\u00B0 \u2212 ${atA}\u00B0 = ${atC}\u00B0.`,
        incorrect: 'Opposite angles of a cyclic quadrilateral add to 180\u00B0.',
      },
      strongHint: '\u2220A and \u2220C are opposite, so take the given \u2220A away from 180\u00B0.',
    })
  }

  for (const atC of [75, 95, 105, 120]) {
    const atA = 180 - atC
    pool.push({
      prompt: `ABCD is a cyclic quadrilateral. \u2220C is ${atC}\u00B0. Find \u2220A.`,
      diagram: { mode: 'static', variant: 'quad', quadGivenA: atA, quadShow: ['C'], quadRotate: 30 },
      correctAnswer: atA,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. 180\u00B0 \u2212 ${atC}\u00B0 = ${atA}\u00B0.`,
        incorrect: '\u2220A and \u2220C are opposite, so they add to 180\u00B0.',
      },
      strongHint: '\u2220A and \u2220C are opposite, so take the given \u2220C away from 180\u00B0.',
    })
  }

  return pool
}

function FeedbackNote({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <div className={correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
      <strong>{correct ? 'Correct' : 'Not quite'}</strong>
      <p>{children}</p>
    </div>
  )
}
