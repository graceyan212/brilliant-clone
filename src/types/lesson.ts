export type Lesson = {
  lessonId: string
  title: string
  totalSteps: number
  steps: LessonStep[]
}

export type LessonStep =
  | MultipleChoiceStep
  | ExploreStep
  | NumericStep
  | StatementStep
  | ProofStep
  | PracticeStep
  | IdentifyStep

export type DiagramConfig = {
  mode: 'interactive' | 'static'
  /** Non-default figure to draw. Omit for the inscribed/central angle figure. */
  variant?: 'quad'
  centralAngle?: number
  showCentralValue?: boolean
  showAngleValue?: boolean
  showNames?: boolean
  highlightCentral?: boolean
  highlightAngle?: boolean
  lockAnchors?: boolean
  /** Interactive quad only: show the live numeric readout (hidden during predictions). */
  showReadout?: boolean
  /** Quad static only: realize this value for ∠A (∠C becomes 180 − ∠A). */
  quadGivenA?: number
  /** Quad static only: which vertex angles to reveal; the rest show "?". */
  quadShow?: ('A' | 'C')[]
  /** Quad static only: rotate the whole figure (degrees) for visual variety. */
  quadRotate?: number
}

type BaseStep = {
  stepId: string
  prompt: string
  subtitle?: string
  diagram?: DiagramConfig
}

export type Feedback = {
  correct: string
  incorrect: string
}

export type AnswerOption = {
  id: string
  label: string
  feedback?: string
}

export type NumericProblem = {
  id: string
  prompt: string
  diagram?: DiagramConfig
  correctAnswer: number
  tolerance?: number
  unit?: string
  feedback: Feedback
  strongHint?: string
}

export type MultipleChoiceStep = BaseStep & {
  interactionType: 'multiple_choice'
  options: AnswerOption[]
  correctAnswer: string
  feedback: Feedback
  advanceOn?: 'select' | 'correct'
  commitNote?: string
}

export type ExploreStep = BaseStep & {
  interactionType: 'explore'
}

export type NumericStep = BaseStep & {
  interactionType: 'numeric'
  problem: NumericProblem
}

export type StatementStep = BaseStep & {
  interactionType: 'statement'
  body: string
}

export type ProofStep = BaseStep & {
  interactionType: 'proof'
  stages: string[]
}

export type PracticeStep = BaseStep & {
  interactionType: 'practice'
  problems: NumericProblem[]
  /** Which extra problems the "More practice" button generates. Omit to hide it. */
  morePracticeKind?: 'inscribed' | 'cyclic'
}

export type IdentifyTarget = {
  id: 'central' | 'inscribed'
  /** Instruction shown while this angle is the one to find. */
  prompt: string
  /** Label revealed on the figure once this angle is tapped correctly. */
  label: string
  /** Shown when the wrong angle is tapped. */
  hint: string
}

export type IdentifyStep = BaseStep & {
  interactionType: 'identify'
  centralAngle: number
  targets: IdentifyTarget[]
}
