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

export type DiagramConfig = {
  mode: 'interactive' | 'static'
  centralAngle?: number
  showCentralValue?: boolean
  showAngleValue?: boolean
  showNames?: boolean
  highlightCentral?: boolean
  highlightAngle?: boolean
  lockAnchors?: boolean
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
}
