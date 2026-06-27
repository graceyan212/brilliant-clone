import type { TokenColor } from '../components/lesson/palette'

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
  | MatchStep
  | CategorizeStep
  | MultiSelectStep
  | EstimateStep
  | SpotMistakeStep

/** A point in the 0..360 diagram viewBox. */
export type DiagramPoint = { x: number; y: number }

export type TriangleVertexId = 'a' | 'b' | 'c'

/** Configures the static/interactive triangle figure (TriangleDiagram). */
export type TriangleFigureConfig = {
  /** Static vertex positions; omit to use the component's default triangle. */
  vertices?: Record<TriangleVertexId, DiagramPoint>
  vertexLabels?: Partial<Record<TriangleVertexId, string>>
  /** Static angle labels keyed by vertex (free text: "45°", "x", "?"). */
  angleLabels?: Partial<Record<TriangleVertexId, string>>
  /** Static side labels keyed by the OPPOSITE vertex (side a is opposite A = BC). */
  sideLabels?: Partial<Record<TriangleVertexId, string>>
  rightAngleAt?: TriangleVertexId
  /** Draw an exterior angle: extend side `from`→`at` beyond `at`. */
  exterior?: { at: TriangleVertexId; from: TriangleVertexId; label?: string; color?: TokenColor }
  /** Static: overlay a similar triangle scaled by this factor about the centroid. */
  overlayScale?: number
  /** Static: label placed beside the similarity overlay (e.g. "×2"). */
  overlayLabel?: string
  /** Static: colour the similarity overlay (outline + label) by palette token, e.g. "orange". */
  overlayColor?: TokenColor
  /** Interactive: draw the per-vertex angle arcs + values. Default true. */
  showAngles?: boolean
  /** Interactive: label each side with its length. */
  showSides?: boolean
  /**
   * Colour-match sides to prose tokens, keyed by the OPPOSITE vertex (side a is
   * BC). e.g. `{ "a": "blue", "b": "orange", "c": "green" }`. Colours the edge
   * line and its label. Omitted sides keep the default ink stroke.
   */
  sideColors?: Partial<Record<TriangleVertexId, TokenColor>>
  /** Colour-match interior angles (arc + value) by palette token, keyed by vertex. */
  angleColors?: Partial<Record<TriangleVertexId, TokenColor>>
  /** Colour the right-angle box (e.g. "green"). */
  rightAngleColor?: TokenColor
}

/**
 * Which angle relationship the transversal figure (AnglesDiagram) highlights.
 * 'rules' is a static-only composite that shows the vertical-angle pair and the
 * corresponding-angle pair together, each in its own colour (the angle-rules summary).
 */
export type AnglesHighlight =
  | 'vertical'
  | 'supplementary'
  | 'corresponding'
  | 'alternate'
  | 'cointerior'
  | 'rules'

/** Configures the two-parallel-lines-and-a-transversal figure (AnglesDiagram). */
export type AnglesFigureConfig = {
  highlight?: AnglesHighlight
  /** Transversal tilt from vertical, degrees, clamped to [-52, 52]. */
  angle?: number
  /** Static: text drawn on the primary (given) wedge, e.g. "130°". */
  markedLabel?: string
  /** Static: text drawn on the partner (target) wedge, e.g. "?". */
  partnerLabel?: string
  /** Static: show computed degree numbers when no label override is given. Default true. */
  showValues?: boolean
}

/** Configures the regular-polygon figure (PolygonDiagram), variant 'polygon'. */
export type PolygonFigureConfig = {
  /** Number of sides; the starting value in interactive mode. */
  sides?: number
  minSides?: number
  maxSides?: number
  showInteriorAngle?: boolean
  showAngleSum?: boolean
  showArea?: boolean
  /** Static only: render the readout panel (interactive uses the top-level showReadout). */
  showReadout?: boolean
  name?: string
  /** Colour the marked interior angle (arc + value) by palette token, e.g. "blue". */
  interiorAngleColor?: TokenColor
  /** Draw the (n−2)-triangle fan from the marked corner (the angle-sum visual). */
  showTriangleFan?: boolean
  /** Colour the triangle fan (default green). */
  triangleFanColor?: TokenColor
  /** Draw the exterior angle at the marked corner (extend a side + mark the turn). */
  showExteriorAngle?: boolean
  /** Colour the exterior angle (default orange). */
  exteriorAngleColor?: TokenColor
}

/** Which area figure the QuadAreaDiagram draws (variant 'quadArea'). */
export type QuadAreaShape = 'triangle' | 'equilateral' | 'parallelogram' | 'trapezoid' | 'kite'

/** Configures the area figure (QuadAreaDiagram), variant 'quadArea'. Labels are free text drawn on the figure. */
export type QuadAreaFigureConfig = {
  shape: QuadAreaShape
  base?: string
  height?: string
  /** Trapezoid second (top) parallel side. */
  base2?: string
  /** Equilateral side. */
  side?: string
  /** Kite horizontal diagonal. */
  diag1?: string
  /** Kite vertical diagonal. */
  diag2?: string
  /**
   * Colour-match the marks to prose tokens: base = blue, perpendicular height =
   * a dashed orange plumb line (distinct from the slant), slant sides = slate.
   * Defaults off (the original neutral figure).
   */
  tint?: boolean
}

/** Configures the intersecting-chords angle figure (ChordAngleDiagram). */
export type ChordAngleFigureConfig = {
  /** Intercepted arc AC, whole degrees. */
  arc1: number
  /** Intercepted arc BD, whole degrees. */
  arc2: number
  /** Static: which label renders as "?". */
  unknown?: 'angle' | 'arc1' | 'arc2'
  /** Colour-match the marks: arc AC = teal, arc BD = orange, angle at P = magenta. */
  tint?: boolean
}

/** Configures the two-secants-from-an-external-point figure (SecantDiagram). */
export type SecantFigureConfig = {
  /** Arc between the two FAR intersection points, whole degrees. */
  farArc: number
  /** Arc between the two NEAR intersection points, whole degrees. */
  nearArc: number
  unknown?: 'angle' | 'far' | 'near'
  /** Colour-match the marks: far arc = orange, near arc = teal, angle at P = magenta. */
  tint?: boolean
}

/** Configures the tangent figures (TangentDiagram). */
export type TangentFigureConfig = {
  /** 'radius' = tangent ⊥ radius; 'chord' = tangent–chord angle; 'pair' = two tangents from a point. */
  kind: 'radius' | 'chord' | 'pair'
  /** Intercepted arc (chord/pair kinds), whole degrees. */
  arc?: number
  unknown?: 'angle' | 'arc'
  /** Colour-match the marks: tangent = orange, radius = blue, chord = magenta, arc = teal. */
  tint?: boolean
}

/** Configures the circumscribed-circle figure (CircumcircleDiagram). */
export type CircumcircleFigureConfig = {
  /** 'general' = acute triangle + circumcenter; 'right' = hypotenuse-as-diameter. */
  kind: 'general' | 'right'
  /** Static 'right': label for the hypotenuse/diameter (free text, e.g. "10" or "?"). */
  hypLabel?: string
  /** Static: label for a radius O→vertex (e.g. "5" or "?"). */
  radiusLabel?: string
  /** Colour-match: the equal radii OA = OB = OC = green, perpendicular bisectors = orange. */
  tint?: boolean
}

export type DiagramConfig = {
  mode: 'interactive' | 'static'
  /**
   * Non-default figure to draw. Omit for the inscribed/central angle figure.
   * The `parallel-angles`, `triangle-sum`, `pythagorean`, `special-triangles`,
   * `similar-triangles`, `polygon-angle-sum`, `quad-area`, `central-arc`,
   * `chord-angle`, `secant-angle`, and `tangent-chord` variants are proof
   * figures used by proof steps (dispatched in ProofLayout), not by DiagramView.
   * (`circumcircle` is shared by the interactive figure and its proof.)
   */
  variant?:
    | 'quad'
    | 'power'
    | 'parts'
    | 'sector'
    | 'triangle'
    | 'angles'
    | 'arcMeasure'
    | 'polygon'
    | 'quadArea'
    | 'chordAngle'
    | 'secant'
    | 'tangent'
    | 'circumcircle'
    | 'parallel-angles'
    | 'triangle-sum'
    | 'pythagorean'
    | 'special-triangles'
    | 'similar-triangles'
    | 'polygon-angle-sum'
    | 'quad-area'
    | 'central-arc'
    | 'chord-angle'
    | 'secant-angle'
    | 'tangent-chord'
  /** Triangle figure (variant 'triangle'). */
  triangle?: TriangleFigureConfig
  /** Transversal figure (variant 'angles'). */
  angles?: AnglesFigureConfig
  /** Regular-polygon figure (variant 'polygon'). */
  polygon?: PolygonFigureConfig
  /** Area figure (variant 'quadArea'). */
  quadArea?: QuadAreaFigureConfig
  /** Intersecting-chords angle figure (variant 'chordAngle'). */
  chordAngle?: ChordAngleFigureConfig
  /** Two-secants figure (variant 'secant'). */
  secant?: SecantFigureConfig
  /** Tangent figures (variant 'tangent'). */
  tangent?: TangentFigureConfig
  /** Circumscribed-circle figure (variant 'circumcircle'). */
  circumcircle?: CircumcircleFigureConfig
  centralAngle?: number
  /** Sector static only: the radius length to label (e.g. 6). */
  radiusLabel?: number
  showCentralValue?: boolean
  showAngleValue?: boolean
  /** ArcMeasure static only: label the arc with its measure. */
  showArcValue?: boolean
  /** ArcMeasure static only: also draw the major arc the other way (360 − centralAngle). */
  highlightRemaining?: boolean
  /** ArcMeasure static only: label that major arc with its measure. */
  showRemainingValue?: boolean
  showNames?: boolean
  highlightCentral?: boolean
  highlightAngle?: boolean
  lockAnchors?: boolean
  /** Interactive quad/power only: show the live numeric readout (hidden during predictions). */
  showReadout?: boolean
  /** Quad static only: realize this value for ∠A (∠C becomes 180 − ∠A). */
  quadGivenA?: number
  /** Quad static only: which vertex angles to reveal; the rest show "?". */
  quadShow?: ('A' | 'C')[]
  /** Quad static only: rotate the whole figure (degrees) for visual variety. */
  quadRotate?: number
  /**
   * Cyclic-quad (variant 'quad'): colour the opposite angle pairs distinctly —
   * ∠A & ∠C = magenta, ∠B & ∠D = orange — and also draw the B & D angle marks.
   */
  quadTint?: boolean
  /** Power-of-a-point static figure: the four chord-segment lengths and (optionally) which one is unknown ("?"). Omit `unknown` to show all four. */
  power?: {
    pa: number
    pb: number
    pc: number
    pd: number
    unknown?: 'pa' | 'pb' | 'pc' | 'pd'
    /** Colour-match the chords: PA/PB (chord AB) = blue, PC/PD (chord CD) = orange. */
    tint?: boolean
  }
}

/** Topics that the practice generator (deterministic pool + AI) can produce. */
export type PracticeTopic =
  | 'inscribed'
  | 'cyclic'
  | 'power-of-point'
  | 'sector'
  | 'angles'
  | 'triangle-angle'
  | 'pythagorean'
  | 'special-triangle'
  | 'similar-triangle'
  | 'polygon-angle'
  | 'polygon-area'
  | 'central-angle'
  | 'chord-angle'
  | 'secant-angle'
  | 'tangent-angle'
  | 'circumcircle'

/** Minimal problem descriptor the AI returns. The answer/diagram/hints are always computed in code from this. Angle topics use `value`; power-of-a-point uses `values` ([PA, PB, PC]). */
export type PracticeSpec = {
  given?: string
  value?: number
  values?: number[]
  context?: string
}

/** One entry in a colour key. The colour is a shared palette token name. */
export type LegendItem = {
  /** A palette token name (blue, orange, green, magenta, teal, purple, …). */
  color: TokenColor
  /** What the colour stands for in this lesson, e.g. "side a" or "arc AB". */
  label: string
}

/** A decorative, real-world illustration shown above the prompt. */
export type StepGraphic = {
  /** A registered scene name (see the SceneGraphic component). */
  name: string
  /** Optional caption rendered under the illustration. */
  caption?: string
}

type BaseStep = {
  stepId: string
  prompt: string
  subtitle?: string
  diagram?: DiagramConfig
  /**
   * Optional colour key. Any step can show it so the colours used in the prose
   * (via `[label](color)` tokens) and the diagram are explained to the learner.
   */
  legend?: LegendItem[]
  /** Optional real-world illustration to hook the concept (intro/statement steps). */
  graphic?: StepGraphic
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

/** One justification the learner taps to unlock the next proof stage (proofMode 'reason'). */
export type ProofReasonChoice = {
  id: string
  label: string
}

/** Guards the reveal of a single proof stage in proofMode 'reason'. */
export type ProofReasonGate = {
  /** Question shown above the choices, e.g. "Why are those base angles equal?" */
  prompt: string
  choices: ProofReasonChoice[]
  /** id of the correct choice. The check happens in code; the AI never supplies it. */
  answer: string
  /** Optional nudge shown after a wrong tap. */
  hint?: string
}

/** A missing number the learner computes to unlock a proof stage (proofMode 'fill-value'). */
export type ProofFillBlank = {
  /**
   * 0-based index into `stages` of the stage this blank unlocks: a correct entry
   * reveals `stages[stage]`. Must be in 1..stages.length-1. Hidden stages with no
   * matching blank reveal with a plain "Next step", so a proof can mix the two.
   */
  stage: number
  /** Question shown above the input, e.g. "\u2220AOC = 180 \u2212 2\u00d730 = ?" */
  prompt: string
  /** The correct value. Checked in code; the AI never supplies it. */
  answer: number
  /** Accepted \u00b1 tolerance (default 0, i.e. exact). */
  tolerance?: number
  /** Optional unit suffix drawn beside the input, e.g. "\u00b0". */
  unit?: string
  /** Optional nudge shown after a wrong entry. */
  hint?: string
}

export type ProofStep = BaseStep & {
  interactionType: 'proof'
  stages: string[]
  /**
   * How the learner advances the proof.
   * - 'reveal' (default): tap "Next step" to uncover each stage in turn.
   * - 'reason': tap the correct justification to uncover the next stage.
   * - 'reorder': the statements are shuffled and the learner taps them back into
   *   logical order; the staged figure is shown fully revealed (static) so it
   *   cannot desync from the chosen order.
   * - 'fill-value': the learner computes the missing number(s) to uncover the
   *   next stage(s); the figure advances as stages unlock, like 'reason'.
   * Omit for the original reveal behaviour so existing proofs keep working.
   */
  proofMode?: 'reveal' | 'reason' | 'reorder' | 'fill-value'
  /**
   * proofMode 'reason' only: one gate per hidden stage, so `gates[i]` guards the
   * reveal of stage `i + 1`. Length must equal `stages.length - 1`; if it does
   * not (or is omitted) the proof falls back to plain reveal mode.
   */
  gates?: ProofReasonGate[]
  /**
   * proofMode 'fill-value' only: the numeric blanks, each keyed to the stage it
   * unlocks (see ProofFillBlank.stage). Needs at least one in-range blank or the
   * proof falls back to plain reveal mode.
   */
  blanks?: ProofFillBlank[]
}

export type PracticeStep = BaseStep & {
  interactionType: 'practice'
  problems: NumericProblem[]
  /** Which extra problems the "More practice" button generates. Omit to hide it. */
  morePracticeKind?: PracticeTopic
}

export type IdentifyTarget = {
  /** Matches a tap target id in the figure (angles: central/inscribed; parts: radius/chord/etc). */
  id: string
  /** Instruction shown while this item is the one to find. */
  prompt: string
  /** Label revealed on the figure once this item is tapped correctly. */
  label: string
  /** Shown when the wrong item is tapped. */
  hint: string
}

export type IdentifyStep = BaseStep & {
  interactionType: 'identify'
  /** Which figure to render. Defaults to the inscribed/central angle figure. */
  figure?: 'angles' | 'parts'
  /** Only used by the 'angles' figure. */
  centralAngle?: number
  /** Message shown once every target is found. */
  doneNote?: string
  targets: IdentifyTarget[]
}

/** One left↔right pair the learner connects in a `match` step. */
export type MatchPair = {
  /**
   * Stable id shared by the two halves of the pair. A learner's attempt is
   * correct (checked in code) when the tapped cue and answer carry the same id.
   */
  id: string
  /** The fixed cue shown in the left column (a term, figure, shape, relationship…). */
  left: string
  /** The answer the learner pairs to the cue (a definition, name, formula, value…). */
  right: string
  /** Optional note surfaced when this pair is matched correctly. */
  note?: string
}

export type MatchStep = BaseStep & {
  interactionType: 'match'
  pairs: MatchPair[]
  /** Heading above the fixed (left) column. */
  leftHeading?: string
  /** Heading above the answer (right) column. */
  rightHeading?: string
  /** Shown once every pair is matched. */
  doneNote?: string
}

/** A drop target in a `categorize` step. */
export type CategorizeBucket = {
  id: string
  /** Column heading the learner sorts into, e.g. "Equal" or "Adds to 180°". */
  label: string
}

/** One chip the learner sorts into a bucket in a `categorize` step. */
export type CategorizeItem = {
  id: string
  label: string
  /** id of the bucket this item belongs in. Checked in code; never by the AI. */
  bucket: string
}

/**
 * Sort-into-buckets. The learner taps a chip, then taps the group it belongs to;
 * a correct drop locks the chip into that column, a wrong one bounces back with a
 * nudge. Tap-to-place (no dragging) keeps it touch- and keyboard-friendly.
 */
export type CategorizeStep = BaseStep & {
  interactionType: 'categorize'
  buckets: CategorizeBucket[]
  items: CategorizeItem[]
  /** Shown once every chip is sorted correctly. */
  doneNote?: string
}

/** One choice in a `multi_select` step. */
export type MultiSelectOption = {
  id: string
  label: string
  /** Whether this option is part of the correct set. Checked in code. */
  correct: boolean
}

/**
 * Select-all-that-apply. The learner toggles any number of options and taps
 * Check; the step is solved only when the chosen set exactly matches the correct
 * set. Wrong attempts mark which picks were off so the learner can adjust.
 */
export type MultiSelectStep = BaseStep & {
  interactionType: 'multi_select'
  options: MultiSelectOption[]
  feedback?: Feedback
  /** Shown once the exact correct set is chosen. */
  doneNote?: string
}

/**
 * Estimate-with-a-slider, then reveal. The learner drags a slider and a small
 * figure responds live (an angle that opens, or a fill bar), then taps Check.
 * Within tolerance it reveals the takeaway; otherwise it nudges Too high / Too
 * low. The answer and grading live entirely in code.
 */
export type EstimateStep = BaseStep & {
  interactionType: 'estimate'
  min: number
  max: number
  /** Slider granularity (default 1). */
  step?: number
  /** The correct value. Checked in code; the AI never supplies it. */
  answer: number
  /** Accepted ± tolerance (default 0, i.e. exact). */
  tolerance?: number
  /** Unit suffix drawn beside the live value, e.g. "°". */
  unit?: string
  /** Initial slider value (defaults to the midpoint of [min, max]). */
  start?: number
  /** Live figure that tracks the slider: an opening angle or a fill bar. */
  visual?: 'angle' | 'bar'
  feedback?: Feedback
  /** Revealed once the estimate lands within tolerance. */
  revealText?: string
}

/** One line of a worked solution in a `spot_the_mistake` step. */
export type SolutionLine = {
  id: string
  text: string
  /** Marks the flawed line. Tapping it solves the step; checked in code. */
  wrong?: boolean
}

/**
 * Spot-the-mistake. A worked solution is shown line by line and the learner taps
 * the first line that is wrong. Tapping a correct line nudges them to look again;
 * tapping the flawed line reveals the explanation. Grading is in code.
 */
export type SpotMistakeStep = BaseStep & {
  interactionType: 'spot_the_mistake'
  lines: SolutionLine[]
  /** Why the flagged line is wrong, revealed once it is found. */
  explanation: string
  /** Nudge shown when a correct (fine) line is tapped. */
  hint?: string
  /** Shown once the mistake is found. */
  doneNote?: string
}
