import { type FormEvent, type ReactNode, useCallback, useEffect, useState } from 'react'
import { AnglesDiagram } from '../diagram/AnglesDiagram'
import { ArcMeasureDiagram } from '../diagram/ArcMeasureDiagram'
import { CentralArcProof } from '../diagram/CentralArcProof'
import { ChordAngleDiagram } from '../diagram/ChordAngleDiagram'
import { ChordAngleProof } from '../diagram/ChordAngleProof'
import { CircleDiagram } from '../diagram/CircleDiagram'
import { CircumcircleDiagram } from '../diagram/CircumcircleDiagram'
import { CircumcircleProof } from '../diagram/CircumcircleProof'
import { CyclicQuadDiagram } from '../diagram/CyclicQuadDiagram'
import { CyclicQuadProof } from '../diagram/CyclicQuadProof'
import { IdentifyFigure } from '../diagram/IdentifyFigure'
import { ParallelAnglesProof } from '../diagram/ParallelAnglesProof'
import { PartsOfCircleFigure } from '../diagram/PartsOfCircleFigure'
import { PolygonAngleSumProof } from '../diagram/PolygonAngleSumProof'
import { PolygonDiagram } from '../diagram/PolygonDiagram'
import { ProofDiagram } from '../diagram/ProofDiagram'
import { PowerOfPointDiagram } from '../diagram/PowerOfPointDiagram'
import { PowerOfPointProof } from '../diagram/PowerOfPointProof'
import { PythagoreanProof } from '../diagram/PythagoreanProof'
import { QuadAreaDiagram } from '../diagram/QuadAreaDiagram'
import { QuadAreaProof } from '../diagram/QuadAreaProof'
import { SecantAngleProof } from '../diagram/SecantAngleProof'
import { SecantDiagram } from '../diagram/SecantDiagram'
import { SectorDiagram } from '../diagram/SectorDiagram'
import { SimilarTrianglesProof } from '../diagram/SimilarTrianglesProof'
import { SpecialTrianglesProof } from '../diagram/SpecialTrianglesProof'
import { StaticAngleDiagram } from '../diagram/StaticAngleDiagram'
import { TangentChordProof } from '../diagram/TangentChordProof'
import { TangentDiagram } from '../diagram/TangentDiagram'
import { TriangleAngleSumProof } from '../diagram/TriangleAngleSumProof'
import { TriangleDiagram } from '../diagram/TriangleDiagram'
import type {
  DiagramConfig,
  IdentifyStep,
  LessonStep,
  MatchStep,
  MultipleChoiceStep,
  NumericProblem,
  ProofFillBlank,
  ProofStep,
  StatementStep,
} from '../../types/lesson'
import { fetchGuidedHint } from '../../lib/ai-hint'
import { generateAiPractice } from '../../lib/ai-practice'
import { generatePracticeProblems } from '../../lib/practice'
import { SceneGraphic } from '../graphic/SceneGraphic'
import { CategorizeInteraction } from './CategorizeInteraction'
import { EstimateInteraction } from './EstimateInteraction'
import { MatchInteraction } from './MatchInteraction'
// The shared, data-driven highlighter. `AngleText` is kept as an alias so the
// many existing call sites here keep working; both colour the legacy angle
// phrases AND any `[label](color)` tokens a lesson authors.
import { AngleText, Legend } from './MathText'
import { MultiSelectInteraction } from './MultiSelectInteraction'
import { SpotTheMistakeInteraction } from './SpotTheMistakeInteraction'
import './StepRenderer.css'

// Number of wrong tries on the SAME question before we fetch a single AI "guided
// hint" that diagnoses the likely misconception. Shared by the numeric field and
// the multiple-choice picker so both unlock help at the same pace.
const HINT_THRESHOLD = 3

// Shown in the guided-hint panel when the AI call is unavailable (key unset, edge
// error, or invalid output) so a learner who has hit the threshold still gets a
// nudge and is never blocked. The per-option feedback above stays the primary
// safety net; this just keeps the panel from resolving to nothing.
const CHOICE_HINT_FALLBACK =
  'Take another look at what the question is really asking, and compare each option against the rule from this lesson.'

type StepRendererProps = {
  step: LessonStep
  stepNumber: number
  totalSteps: number
  maxStepReached: number
  completed: boolean
  onContinue: () => void
  onGoToStep: (index: number) => void
  onBack: () => void
  // Dev-only: present only under import.meta.env.DEV (see LessonView). `onDevJump`
  // moves to any step; `onDevFinish` jumps to the completion screen.
  onDevJump?: (index: number) => void
  onDevFinish?: () => void
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
  onDevJump,
  onDevFinish,
}: StepRendererProps) {
  const [isComplete, setIsComplete] = useState(completed || step.interactionType === 'statement')
  const complete = useCallback(() => setIsComplete(true), [])
  const isLast = stepNumber === totalSteps

  // Gate the dev affordances on import.meta.env.DEV so the entire block is dead
  // code (and removed) in production, even though the callbacks are typed as
  // optional. In dev both callbacks are always supplied by LessonView.
  const devNav =
    import.meta.env.DEV && onDevJump && onDevFinish
      ? { jump: onDevJump, finish: onDevFinish }
      : null

  return (
    <>
      <StepProgress
        stepNumber={stepNumber}
        totalSteps={totalSteps}
        maxReached={maxStepReached}
        onGoToStep={onGoToStep}
        onDevJump={devNav?.jump}
      />

      {step.interactionType === 'practice' ? (
        <PracticeLayout step={step} onComplete={complete} />
      ) : step.interactionType === 'proof' ? (
        <ProofLayout step={step} onComplete={complete} />
      ) : step.interactionType === 'identify' ? (
        <IdentifyLayout step={step} onComplete={complete} />
      ) : step.interactionType === 'match' ? (
        <MatchLayout step={step} onComplete={complete} />
      ) : (
        <section className="lesson-stage">
          <div className="prompt-panel">
            {step.graphic && <SceneGraphic name={step.graphic.name} caption={step.graphic.caption} />}
            <h1>
              <AngleText text={step.prompt} />
            </h1>
            {step.subtitle && (
              <p className="prompt-subtitle">
                <AngleText text={step.subtitle} />
              </p>
            )}
            {step.interactionType === 'statement' && <StatementBody step={step} />}
            {step.legend && <Legend items={step.legend} />}
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
        {devNav && (
          <div className="dev-skip" role="group" aria-label="Developer step controls">
            <span className="dev-skip__tag">Dev</span>
            <button
              type="button"
              className="dev-skip__btn"
              onClick={() => (isLast ? devNav.finish() : devNav.jump(stepNumber))}
            >
              {isLast ? 'Skip to finish' : 'Skip \u2192'}
            </button>
            {!isLast && (
              <button type="button" className="dev-skip__btn" onClick={() => devNav.finish()}>
                Skip to end
              </button>
            )}
          </div>
        )}
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
  onDevJump,
}: {
  stepNumber: number
  totalSteps: number
  maxReached: number
  onGoToStep: (index: number) => void
  // Dev-only: when supplied, every segment is clickable (jump anywhere, even
  // past maxReached). Absent in production, where only visited steps are active.
  onDevJump?: (index: number) => void
}) {
  return (
    <div className="step-progress">
      <ol className="step-progress__bar">
        {Array.from({ length: totalSteps }, (_, index) => {
          const done = index < stepNumber
          const reachable = index <= maxReached
          const devOnly = onDevJump !== undefined && !reachable
          return (
            <li key={index}>
              <button
                type="button"
                className={devOnly ? 'step-progress__seg-btn is-dev' : 'step-progress__seg-btn'}
                disabled={onDevJump === undefined && !reachable}
                aria-label={`Go to step ${index + 1}`}
                aria-current={index === stepNumber - 1 ? 'step' : undefined}
                onClick={() => (onDevJump ? onDevJump(index) : onGoToStep(index))}
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
    case 'categorize':
      return (
        <CategorizeInteraction
          buckets={step.buckets}
          items={step.items}
          doneNote={step.doneNote}
          onComplete={onComplete}
        />
      )
    case 'multi_select':
      return (
        <MultiSelectInteraction
          options={step.options}
          feedback={step.feedback}
          doneNote={step.doneNote}
          onComplete={onComplete}
        />
      )
    case 'estimate':
      return <EstimateInteraction step={step} onComplete={onComplete} />
    case 'spot_the_mistake':
      return (
        <SpotTheMistakeInteraction
          lines={step.lines}
          explanation={step.explanation}
          hint={step.hint}
          doneNote={step.doneNote}
          onComplete={onComplete}
        />
      )
    case 'explore':
    case 'proof':
    case 'practice':
    case 'identify':
    case 'statement':
    case 'match':
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
          tint={config.quadTint}
        />
      )
    }

    if (config.variant === 'power') {
      return (
        <PowerOfPointDiagram
          pa={config.power?.pa}
          pb={config.power?.pb}
          pc={config.power?.pc}
          pd={config.power?.pd}
          unknown={config.power?.unknown}
          tint={config.power?.tint}
        />
      )
    }

    if (config.variant === 'parts') {
      return <PartsOfCircleFigure showAll />
    }

    if (config.variant === 'sector') {
      return (
        <SectorDiagram
          angle={config.centralAngle}
          radiusLabel={config.radiusLabel !== undefined ? String(config.radiusLabel) : undefined}
        />
      )
    }

    if (config.variant === 'triangle') {
      const triangle = config.triangle
      return (
        <TriangleDiagram
          vertices={triangle?.vertices}
          vertexLabels={triangle?.vertexLabels}
          angleLabels={triangle?.angleLabels}
          sideLabels={triangle?.sideLabels}
          sideColors={triangle?.sideColors}
          angleColors={triangle?.angleColors}
          rightAngleColor={triangle?.rightAngleColor}
          rightAngleAt={triangle?.rightAngleAt}
          exterior={triangle?.exterior}
          overlayScale={triangle?.overlayScale}
          overlayLabel={triangle?.overlayLabel}
          overlayColor={triangle?.overlayColor}
        />
      )
    }

    if (config.variant === 'angles') {
      const angles = config.angles
      return (
        <AnglesDiagram
          highlight={angles?.highlight}
          angle={angles?.angle}
          markedLabel={angles?.markedLabel}
          partnerLabel={angles?.partnerLabel}
          showValues={angles?.showValues}
        />
      )
    }

    if (config.variant === 'polygon') {
      const polygon = config.polygon
      return (
        <PolygonDiagram
          sides={polygon?.sides}
          interactive={false}
          showInteriorAngle={polygon?.showInteriorAngle}
          showAngleSum={polygon?.showAngleSum}
          showArea={polygon?.showArea}
          showReadout={polygon?.showReadout}
          name={polygon?.name}
          interiorAngleColor={polygon?.interiorAngleColor}
          showTriangleFan={polygon?.showTriangleFan}
          triangleFanColor={polygon?.triangleFanColor}
          showExteriorAngle={polygon?.showExteriorAngle}
          exteriorAngleColor={polygon?.exteriorAngleColor}
        />
      )
    }

    if (config.variant === 'quadArea') {
      const quad = config.quadArea
      return (
        <QuadAreaDiagram
          shape={quad?.shape}
          base={quad?.base}
          height={quad?.height}
          base2={quad?.base2}
          side={quad?.side}
          diag1={quad?.diag1}
          diag2={quad?.diag2}
          tint={quad?.tint}
        />
      )
    }

    if (config.variant === 'arcMeasure') {
      return (
        <ArcMeasureDiagram
          centralAngle={config.centralAngle}
          showCentralValue={config.showCentralValue}
          showArcValue={config.showArcValue}
          highlightRemaining={config.highlightRemaining}
          showRemainingValue={config.showRemainingValue}
        />
      )
    }

    if (config.variant === 'chordAngle') {
      return (
        <ChordAngleDiagram
          arc1={config.chordAngle?.arc1}
          arc2={config.chordAngle?.arc2}
          unknown={config.chordAngle?.unknown}
          tint={config.chordAngle?.tint}
        />
      )
    }

    if (config.variant === 'secant') {
      return (
        <SecantDiagram
          farArc={config.secant?.farArc}
          nearArc={config.secant?.nearArc}
          unknown={config.secant?.unknown}
          tint={config.secant?.tint}
        />
      )
    }

    if (config.variant === 'tangent') {
      return (
        <TangentDiagram
          kind={config.tangent?.kind}
          arc={config.tangent?.arc}
          unknown={config.tangent?.unknown}
          tint={config.tangent?.tint}
        />
      )
    }

    if (config.variant === 'circumcircle') {
      return (
        <CircumcircleDiagram
          kind={config.circumcircle?.kind}
          hypLabel={config.circumcircle?.hypLabel}
          radiusLabel={config.circumcircle?.radiusLabel}
          tint={config.circumcircle?.tint}
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
      <CyclicQuadDiagram
        interactive
        showReadout={config.showReadout !== false}
        tint={config.quadTint}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'power') {
    return (
      <PowerOfPointDiagram
        interactive
        showReadout={config.showReadout !== false}
        tint={config.power?.tint}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'sector') {
    return (
      <SectorDiagram
        interactive
        angle={config.centralAngle}
        showReadout={config.showReadout !== false}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'triangle') {
    return (
      <TriangleDiagram
        interactive
        showAngles={config.triangle?.showAngles}
        showSides={config.triangle?.showSides}
        sideColors={config.triangle?.sideColors}
        angleColors={config.triangle?.angleColors}
        rightAngleColor={config.triangle?.rightAngleColor}
        showReadout={config.showReadout !== false}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'angles') {
    return (
      <AnglesDiagram
        interactive
        highlight={config.angles?.highlight}
        angle={config.angles?.angle}
        showReadout={config.showReadout !== false}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'polygon') {
    const polygon = config.polygon
    return (
      <PolygonDiagram
        interactive
        sides={polygon?.sides}
        minSides={polygon?.minSides}
        maxSides={polygon?.maxSides}
        showInteriorAngle={polygon?.showInteriorAngle}
        showAngleSum={polygon?.showAngleSum}
        showArea={polygon?.showArea}
        showReadout={config.showReadout !== false}
        name={polygon?.name}
        interiorAngleColor={polygon?.interiorAngleColor}
        showTriangleFan={polygon?.showTriangleFan}
        triangleFanColor={polygon?.triangleFanColor}
        showExteriorAngle={polygon?.showExteriorAngle}
        exteriorAngleColor={polygon?.exteriorAngleColor}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'quadArea') {
    return (
      <QuadAreaDiagram
        interactive
        shape={config.quadArea?.shape}
        tint={config.quadArea?.tint}
        showReadout={config.showReadout !== false}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'arcMeasure') {
    return (
      <ArcMeasureDiagram
        interactive
        showReadout={config.showReadout !== false}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'chordAngle') {
    return (
      <ChordAngleDiagram
        interactive
        showReadout={config.showReadout !== false}
        tint={config.chordAngle?.tint}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'secant') {
    return (
      <SecantDiagram
        interactive
        showReadout={config.showReadout !== false}
        tint={config.secant?.tint}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'tangent') {
    return (
      <TangentDiagram
        interactive
        showReadout={config.showReadout !== false}
        tint={config.tangent?.tint}
        onInteract={onInteract}
      />
    )
  }

  if (config.variant === 'circumcircle') {
    return (
      <CircumcircleDiagram
        interactive
        showReadout={config.showReadout !== false}
        tint={config.circumcircle?.tint}
        onInteract={onInteract}
      />
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
  // Track repeated wrong picks so that, after enough misses on this question, we
  // fetch a single AI guided hint diagnosing the misconception behind WHAT the
  // learner chose. `wrongChoices` holds the wrong option labels in order;
  // `hintRequested` latches so we fetch at most once; `hintLoading` drives the
  // loading state; `aiHint` is the coaching string (or null on empty/error, which
  // falls back to a local message).
  const [wrongCount, setWrongCount] = useState(0)
  const [wrongChoices, setWrongChoices] = useState<string[]>([])
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [hintRequested, setHintRequested] = useState(false)
  const [hintLoading, setHintLoading] = useState(false)

  const commitOnSelect = step.advanceOn === 'select'
  const isCorrect = selected === step.correctAnswer
  const selectedOption = step.options.find((option) => option.id === selected)
  const incorrectText = selectedOption?.feedback ?? step.feedback.incorrect
  const correctLabel =
    step.options.find((option) => option.id === step.correctAnswer)?.label ?? step.correctAnswer

  // Only the graded modes (advanceOn 'correct' / default) have a notion of a
  // "wrong" pick, so the guided hint never applies to commit-on-select
  // predictions. It hides again the moment the learner lands on the right answer.
  const showGuidedHint = !commitOnSelect && hintRequested && !isCorrect

  function choose(id: string) {
    if (commitOnSelect || id === step.correctAnswer) {
      setSelected(id)
      onComplete()
      return
    }

    // Wrong pick (graded mode). Every wrong tap counts as a miss, mirroring the
    // numeric path where each submission counts - and repeatedly choosing the
    // SAME wrong option is itself a strong misconception signal for the model.
    setSelected(id)

    const chosenLabel = step.options.find((option) => option.id === id)?.label ?? id
    const nextCount = wrongCount + 1
    const nextChoices = [...wrongChoices, chosenLabel]
    setWrongCount(nextCount)
    setWrongChoices(nextChoices)

    // After enough misses, fetch one AI guided hint that reasons about the
    // specific wrong option(s). The correct label is passed only to ground the
    // diagnosis; grading stays in code and the per-option feedback backs it up, so
    // we degrade gracefully if the call fails.
    if (nextCount >= HINT_THRESHOLD && !hintRequested) {
      setHintRequested(true)
      setHintLoading(true)
      void fetchGuidedHint({
        prompt: step.prompt,
        options: step.options.map((option) => option.label),
        correctChoice: correctLabel,
        chosen: nextChoices,
      }).then((hint) => {
        setAiHint(hint)
        setHintLoading(false)
      })
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

      {showGuidedHint && (
        <div className="hint-panel hint-panel--guided">
          <strong>Guided hint</strong>
          {hintLoading ? (
            <p className="hint-panel__loading">{'Looking at what you chose\u2026'}</p>
          ) : (
            <p>
              <AngleText text={aiHint ?? CHOICE_HINT_FALLBACK} />
            </p>
          )}
        </div>
      )}
    </>
  )
}

// In-range blanks for a fill-value proof: each must unlock a real hidden stage.
// Sorted by the stage they reveal so the proof checks them in reading order.
function usableBlanks(step: ProofStep): ProofFillBlank[] {
  const max = step.stages.length - 1
  return (step.blanks ?? [])
    .filter((blank) => Number.isInteger(blank.stage) && blank.stage >= 1 && blank.stage <= max)
    .sort((a, b) => a.stage - b.stage)
}

function ProofLayout({ step, onComplete }: { step: ProofStep; onComplete: () => void }) {
  // Each interactive mode needs its own well-formed data; anything malformed
  // falls back to the original staged reveal so existing proofs keep working.
  if (step.proofMode === 'reason' && step.gates?.length === step.stages.length - 1) {
    return <ProofReasonLayout step={step} onComplete={onComplete} />
  }
  if (step.proofMode === 'reorder' && step.stages.length >= 2) {
    return <ProofReorderLayout step={step} onComplete={onComplete} />
  }
  if (step.proofMode === 'fill-value' && usableBlanks(step).length > 0) {
    return <ProofFillValueLayout step={step} onComplete={onComplete} />
  }
  return <ProofRevealLayout step={step} onComplete={onComplete} />
}

// Shared staged figure: the diagram is driven purely by how many stages are
// revealed, so both reveal and reason modes render it identically.
function ProofFigure({ step, revealed }: { step: ProofStep; revealed: number }) {
  const centralAngle = step.diagram?.centralAngle ?? 120

  switch (step.diagram?.variant) {
    case 'quad':
      return <CyclicQuadProof revealed={revealed} />
    case 'power':
      return <PowerOfPointProof revealed={revealed} />
    case 'parallel-angles':
      return <ParallelAnglesProof revealed={revealed} />
    case 'triangle-sum':
      return <TriangleAngleSumProof revealed={revealed} />
    case 'pythagorean':
      return <PythagoreanProof revealed={revealed} />
    case 'special-triangles':
      return <SpecialTrianglesProof revealed={revealed} />
    case 'similar-triangles':
      return <SimilarTrianglesProof revealed={revealed} />
    case 'polygon-angle-sum':
      return <PolygonAngleSumProof revealed={revealed} />
    case 'quad-area':
      return <QuadAreaProof revealed={revealed} />
    case 'central-arc':
      return <CentralArcProof revealed={revealed} centralAngle={centralAngle} />
    case 'chord-angle':
      return <ChordAngleProof revealed={revealed} />
    case 'secant-angle':
      return <SecantAngleProof revealed={revealed} />
    case 'tangent-chord':
      return <TangentChordProof revealed={revealed} />
    case 'circumcircle':
      return <CircumcircleProof revealed={revealed} />
    default:
      return <ProofDiagram revealed={revealed} centralAngle={centralAngle} />
  }
}

function ProofStages({ stages, revealed }: { stages: string[]; revealed: number }) {
  return (
    <ol className="proof__stages">
      {stages.slice(0, revealed).map((stage, index) => (
        <li key={index} className={index === revealed - 1 ? 'is-current' : ''}>
          <AngleText text={stage} />
        </li>
      ))}
    </ol>
  )
}

function ProofRevealLayout({ step, onComplete }: { step: ProofStep; onComplete: () => void }) {
  const [revealed, setRevealed] = useState(1)
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
        <ProofFigure step={step} revealed={revealed} />
      </div>

      <div className="interaction-panel">
        <ProofStages stages={step.stages} revealed={revealed} />

        {!allRevealed && (
          <button type="button" className="btn btn--ghost" onClick={() => setRevealed((n) => n + 1)}>
            Next step
          </button>
        )}
      </div>
    </section>
  )
}

// Fill-the-reason proof: each new stage is unlocked by tapping the justification
// that makes it follow. The staged diagram is unchanged; only the advance
// mechanic differs. Choices are checked in code (gate.answer), never by the AI.
function ProofReasonLayout({ step, onComplete }: { step: ProofStep; onComplete: () => void }) {
  const gates = step.gates ?? []
  const [revealed, setRevealed] = useState(1)
  const [wrongId, setWrongId] = useState<string>()
  const [hint, setHint] = useState<string>()
  const allRevealed = revealed >= step.stages.length
  const gate = allRevealed ? undefined : gates[revealed - 1]

  useEffect(() => {
    if (allRevealed) {
      onComplete()
    }
  }, [allRevealed, onComplete])

  function choose(choiceId: string) {
    if (!gate) {
      return
    }
    if (choiceId === gate.answer) {
      setWrongId(undefined)
      setHint(undefined)
      setRevealed((n) => n + 1)
    } else {
      setWrongId(choiceId)
      setHint(gate.hint ?? 'Not quite \u2014 re-read the last line and check the diagram.')
    }
  }

  return (
    <section className="lesson-stage">
      <div className="prompt-panel">
        <h1>
          <AngleText text={step.prompt} />
        </h1>
      </div>

      <div className="diagram-placeholder">
        <ProofFigure step={step} revealed={revealed} />
      </div>

      <div className="interaction-panel">
        <ProofStages stages={step.stages} revealed={revealed} />

        {gate && (
          <div className="proof-gate">
            <p className="proof-gate__prompt">
              <AngleText text={gate.prompt} />
            </p>
            <div className="answer-list">
              {gate.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={choice.id === wrongId ? 'answer-option is-wrong' : 'answer-option'}
                  onClick={() => choose(choice.id)}
                >
                  <AngleText text={choice.label} />
                </button>
              ))}
            </div>
            {hint && (
              <FeedbackNote correct={false}>
                <AngleText text={hint} />
              </FeedbackNote>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// A small, self-contained PRNG so the shuffled order is stable across re-renders
// (seeded from the step id) without pulling in a dependency.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const rng = mulberry32(seed)
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const swap = out[i]
    out[i] = out[j]
    out[j] = swap
  }
  return out
}

// Reorder proof: the statements are shuffled and the learner taps them back into
// the authored (logical) order. Because the staged figure is coupled to stage
// order, it is rendered fully revealed (static) so it can never desync from the
// learner's progress. The correct next index is always `placed.length`, so the
// order is checked entirely in code.
function ProofReorderLayout({ step, onComplete }: { step: ProofStep; onComplete: () => void }) {
  const total = step.stages.length
  const [bank, setBank] = useState<number[]>(() => {
    const order = seededShuffle(
      step.stages.map((_, index) => index),
      hashString(step.stepId),
    )
    // A shuffle that lands on the authored order would make the task trivial.
    return order.every((index, position) => index === position) ? order.reverse() : order
  })
  const [placed, setPlaced] = useState<number[]>([])
  const [wrongIndex, setWrongIndex] = useState<number>()
  const done = placed.length === total

  useEffect(() => {
    if (done) {
      onComplete()
    }
  }, [done, onComplete])

  function choose(index: number) {
    if (index === placed.length) {
      setWrongIndex(undefined)
      setPlaced((current) => [...current, index])
      setBank((current) => current.filter((item) => item !== index))
    } else {
      setWrongIndex(index)
    }
  }

  return (
    <section className="lesson-stage">
      <div className="prompt-panel">
        <h1>
          <AngleText text={step.prompt} />
        </h1>
      </div>

      <div className="diagram-placeholder">
        <ProofFigure step={step} revealed={total} />
      </div>

      <div className="interaction-panel">
        {placed.length > 0 && <ProofStages stages={placed.map((index) => step.stages[index])} revealed={placed.length} />}

        {done ? (
          <p className="proof-reorder__done">That's the proof, start to finish.</p>
        ) : (
          <div className="proof-reorder">
            <p className="proof-gate__prompt">
              {placed.length === 0 ? 'Tap the statements in the right logical order.' : 'Which statement comes next?'}
            </p>
            <div className="answer-list">
              {bank.map((index) => (
                <button
                  key={index}
                  type="button"
                  className={index === wrongIndex ? 'answer-option is-wrong' : 'answer-option'}
                  onClick={() => choose(index)}
                >
                  <AngleText text={step.stages[index]} />
                </button>
              ))}
            </div>
            {wrongIndex !== undefined && (
              <FeedbackNote correct={false}>
                That step doesn't follow yet &mdash; what has to be true first?
              </FeedbackNote>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

// Fill-value proof: a hidden stage either reveals on a numeric answer the learner
// computes (a blank) or, when no blank guards it, on a plain "Next step". The
// staged figure advances exactly as in reason mode. Answers are checked in code.
function ProofFillValueLayout({ step, onComplete }: { step: ProofStep; onComplete: () => void }) {
  const blanks = usableBlanks(step)
  const blankByStage = new Map(blanks.map((blank) => [blank.stage, blank]))
  const [revealed, setRevealed] = useState(1)
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<string>()
  const allRevealed = revealed >= step.stages.length
  const blank = allRevealed ? undefined : blankByStage.get(revealed)

  useEffect(() => {
    if (allRevealed) {
      onComplete()
    }
  }, [allRevealed, onComplete])

  function advance() {
    setValue('')
    setFeedback(undefined)
    setRevealed((current) => current + 1)
  }

  function check(event: FormEvent) {
    event.preventDefault()
    if (!blank) {
      return
    }
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed)) {
      setFeedback('Enter a number to check.')
      return
    }
    if (Math.abs(parsed - blank.answer) <= (blank.tolerance ?? 0)) {
      advance()
      return
    }
    const direction = parsed > blank.answer ? 'Too high.' : 'Too low.'
    setFeedback(`${direction} ${blank.hint ?? 'Re-read the last line and check the diagram.'}`)
  }

  return (
    <section className="lesson-stage">
      <div className="prompt-panel">
        <h1>
          <AngleText text={step.prompt} />
        </h1>
      </div>

      <div className="diagram-placeholder">
        <ProofFigure step={step} revealed={revealed} />
      </div>

      <div className="interaction-panel">
        <ProofStages stages={step.stages} revealed={revealed} />

        {!allRevealed &&
          (blank ? (
            <form className="proof-gate proof-fill" onSubmit={check}>
              <label className="proof-gate__prompt" htmlFor={`${step.stepId}-blank-${revealed}`}>
                <AngleText text={blank.prompt} />
              </label>
              <div className="numeric__row">
                <div className="numeric__entry">
                  <input
                    id={`${step.stepId}-blank-${revealed}`}
                    className="numeric__input"
                    inputMode="numeric"
                    autoComplete="off"
                    value={value}
                    onChange={(event) => {
                      setValue(event.target.value)
                      if (feedback) {
                        setFeedback(undefined)
                      }
                    }}
                  />
                  {blank.unit && <span className="numeric__unit">{blank.unit}</span>}
                </div>
                <button type="submit" className="btn btn--primary" disabled={value.trim() === ''}>
                  Check
                </button>
              </div>
              {feedback && (
                <FeedbackNote correct={false}>
                  <AngleText text={feedback} />
                </FeedbackNote>
              )}
            </form>
          ) : (
            <button type="button" className="btn btn--ghost" onClick={advance}>
              Next step
            </button>
          ))}
      </div>
    </section>
  )
}

function MatchLayout({ step, onComplete }: { step: MatchStep; onComplete: () => void }) {
  return (
    <section className="lesson-stage match-stage">
      <div className="prompt-panel">
        {step.graphic && <SceneGraphic name={step.graphic.name} caption={step.graphic.caption} />}
        <h1>
          <AngleText text={step.prompt} />
        </h1>
        {step.subtitle && (
          <p className="prompt-subtitle">
            <AngleText text={step.subtitle} />
          </p>
        )}
        {step.legend && <Legend items={step.legend} />}
      </div>

      {step.diagram && (
        <div className="diagram-placeholder">
          <DiagramView config={step.diagram} />
        </div>
      )}

      <div className="interaction-panel">
        <MatchInteraction
          pairs={step.pairs}
          leftHeading={step.leftHeading}
          rightHeading={step.rightHeading}
          doneNote={step.doneNote}
          onComplete={onComplete}
        />
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

  function tap(id: string) {
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
        {step.graphic && <SceneGraphic name={step.graphic.name} caption={step.graphic.caption} />}
        <h1>
          <AngleText text={step.prompt} />
        </h1>
        <p className="prompt-subtitle">
          {done ? (step.doneNote ?? 'All found.') : <AngleText text={current.prompt} />}
        </p>
        {step.legend && <Legend items={step.legend} />}
      </div>

      <div className="diagram-placeholder">
        {step.figure === 'parts' ? (
          <PartsOfCircleFigure foundIds={foundIds} onTap={tap} />
        ) : (
          <IdentifyFigure
            centralAngle={step.centralAngle ?? 120}
            foundCentral={foundIds.includes('central')}
            foundInscribed={foundIds.includes('inscribed')}
            onTap={tap}
          />
        )}
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
  onSolved: (firstTry: boolean) => void
}) {
  const [value, setValue] = useState('')
  const [feedback, setFeedback] = useState<{ correct: boolean; text: string }>()
  const [wrongCount, setWrongCount] = useState(0)
  // The learner's wrong numeric attempts (in order) feed the misconception
  // diagnosis. `aiHint` holds the coaching string once it arrives; `hintRequested`
  // latches so we fetch at most once per problem (unobtrusive, not spammy).
  const [wrongAttempts, setWrongAttempts] = useState<number[]>([])
  const [aiHint, setAiHint] = useState<string | null>(null)
  const [hintRequested, setHintRequested] = useState(false)
  const solved = feedback?.correct === true

  const hintUnlocked = !solved && wrongCount >= HINT_THRESHOLD
  // The AI guided hint shows when it has arrived; otherwise we fall back to the
  // curated static hint (while loading, on empty/error, or when the API is down)
  // so behaviour never regresses without the model.
  const showGuidedHint = hintUnlocked && aiHint !== null
  const showStrongHint = hintUnlocked && aiHint === null && problem.strongHint !== undefined

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
      onSolved(wrongCount === 0)
      return
    }

    const nextCount = wrongCount + 1
    const nextAttempts = [...wrongAttempts, parsed]
    setWrongCount(nextCount)
    setWrongAttempts(nextAttempts)
    const direction = parsed > problem.correctAnswer ? 'Too high.' : 'Too low.'
    setFeedback({ correct: false, text: `${direction} ${problem.feedback.incorrect}` })

    // Once the learner has missed enough times, fetch one AI guided hint that
    // reasons about the wrong values. The correct answer is passed only to ground
    // the model's diagnosis; grading stays here in code and the static hint backs
    // it up, so we degrade gracefully if the call fails.
    if (nextCount >= HINT_THRESHOLD && !hintRequested) {
      setHintRequested(true)
      void fetchGuidedHint({
        prompt: problem.prompt,
        correctAnswer: problem.correctAnswer,
        attempts: nextAttempts,
      }).then((hint) => setAiHint(hint))
    }
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

      {showGuidedHint && (
        <div className="hint-panel hint-panel--guided">
          <strong>Guided hint</strong>
          <p>
            <AngleText text={aiHint ?? ''} />
          </p>
        </div>
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [correctRun, setCorrectRun] = useState(0)

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

  async function addMorePractice() {
    const topic = step.morePracticeKind
    if (!topic || loadingMore || moreAdded) {
      return
    }
    const offset = step.problems.length
    setLoadingMore(true)
    // Try AI-generated variety first; fall back to the deterministic pool on any failure.
    const aiProblems = await generateAiPractice(topic, 5, offset)
    setExtraProblems(aiProblems ?? generatePracticeProblems(topic, 5, offset))
    setMoreAdded(true)
    setCurrentIndex(offset)
    setLoadingMore(false)
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
        {correctRun >= 2 && (
          <span className="quiz__streak" aria-live="polite">
            {correctRun} in a row
          </span>
        )}
      </div>

      <div className="practice__item">
        {current.diagram && (
          <div className="diagram-placeholder practice__diagram">
            <DiagramView config={current.diagram} />
          </div>
        )}
        <NumericField
          key={current.id}
          problem={current}
          onSolved={(firstTry) => {
            markSolved(current.id)
            setCorrectRun((run) => (firstTry ? run + 1 : 0))
          }}
        />
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
          <button
            type="button"
            className="btn btn--ghost quiz__more"
            onClick={addMorePractice}
            disabled={loadingMore}
          >
            {loadingMore ? 'Generating\u2026' : 'More practice'}
          </button>
        )}
      </div>
    </section>
  )
}

function FeedbackNote({ correct, children }: { correct: boolean; children: ReactNode }) {
  return (
    <div className={correct ? 'feedback-panel is-correct' : 'feedback-panel is-incorrect'}>
      <strong>{correct ? 'Correct' : 'Not quite'}</strong>
      <p>{children}</p>
    </div>
  )
}
