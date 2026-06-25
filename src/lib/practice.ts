import type { NumericProblem, PracticeSpec, PracticeTopic } from '../types/lesson'

// Single source of truth for practice problems. Both the deterministic pool and
// the AI path build problems through `buildProblem`, so the answer, diagram, and
// the targeted hints are always computed in code - the AI only ever supplies a
// spec (which value is given + the number(s) + optional flavor text), never the
// math or the hints.

function isInt(value: number, lo: number, hi: number) {
  return Number.isInteger(value) && value >= lo && value <= hi
}

export function buildProblem(topic: PracticeTopic, spec: PracticeSpec): Omit<NumericProblem, 'id'> {
  const core = buildCore(topic, spec)
  const context = spec.context?.trim()
  return context ? { ...core, prompt: `${context} ${core.prompt}` } : core
}

function buildCore(topic: PracticeTopic, spec: PracticeSpec): Omit<NumericProblem, 'id'> {
  switch (topic) {
    case 'inscribed':
      return inscribedProblem(spec)
    case 'cyclic':
      return cyclicProblem(spec)
    case 'power-of-point':
      return powerProblem(spec)
  }
}

function inscribedProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number') {
    throw new Error('inscribed problem needs a value')
  }
  if (given === 'central') {
    if (!isInt(value, 60, 170) || value % 2 !== 0) {
      throw new Error(`invalid inscribed/central value: ${value}`)
    }
    const inscribed = value / 2
    return {
      prompt: `The central angle \u2220AOB is ${value}\u00B0. Find \u2220ACB.`,
      diagram: { mode: 'static', centralAngle: value, showCentralValue: true, showAngleValue: false },
      correctAnswer: inscribed,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. Half of ${value} is ${inscribed}.`,
        incorrect: 'How does the inscribed angle compare with the central angle?',
      },
      strongHint: `Halve the central angle: ${value}\u00B0 \u00F7 2.`,
    }
  }
  if (given === 'inscribed') {
    if (!isInt(value, 20, 85)) {
      throw new Error(`invalid inscribed/inscribed value: ${value}`)
    }
    const central = value * 2
    return {
      prompt: `\u2220ACB is ${value}\u00B0. Find the central angle \u2220AOB.`,
      diagram: { mode: 'static', centralAngle: central, showCentralValue: false, showAngleValue: true },
      correctAnswer: central,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. Double ${value} is ${central}.`,
        incorrect: 'How does the central angle compare with the inscribed angle?',
      },
      strongHint: `Double the inscribed angle: ${value}\u00B0 \u00D7 2.`,
    }
  }
  throw new Error(`unknown inscribed given: ${given}`)
}

function cyclicProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number') {
    throw new Error('cyclic problem needs a value')
  }
  if (!isInt(value, 40, 140)) {
    throw new Error(`invalid cyclic value: ${value}`)
  }
  const other = 180 - value
  if (given === 'A') {
    return {
      prompt: `ABCD is a cyclic quadrilateral. \u2220A is ${value}\u00B0. Find \u2220C.`,
      diagram: { mode: 'static', variant: 'quad', quadGivenA: value, quadShow: ['A'] },
      correctAnswer: other,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. 180\u00B0 \u2212 ${value}\u00B0 = ${other}\u00B0.`,
        incorrect: 'Opposite angles of a cyclic quadrilateral add to 180\u00B0.',
      },
      strongHint: '\u2220A and \u2220C are opposite, so take the given \u2220A away from 180\u00B0.',
    }
  }
  if (given === 'C') {
    return {
      prompt: `ABCD is a cyclic quadrilateral. \u2220C is ${value}\u00B0. Find \u2220A.`,
      diagram: { mode: 'static', variant: 'quad', quadGivenA: other, quadShow: ['C'], quadRotate: 30 },
      correctAnswer: other,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. 180\u00B0 \u2212 ${value}\u00B0 = ${other}\u00B0.`,
        incorrect: '\u2220A and \u2220C are opposite, so they add to 180\u00B0.',
      },
      strongHint: '\u2220A and \u2220C are opposite, so take the given \u2220C away from 180\u00B0.',
    }
  }
  throw new Error(`unknown cyclic given: ${given}`)
}

// Power of a point (intersecting chords): two chords cross at P, and
// PA * PB = PC * PD. The spec supplies [PA, PB, PC]; code computes PD and
// guarantees it is a whole number in range.
function powerProblem({ values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (!values || values.length !== 3 || !values.every((v) => isInt(v, 2, 20))) {
    throw new Error('power-of-point needs values [PA, PB, PC] of integers in 2..20')
  }
  const [pa, pb, pc] = values
  const product = pa * pb
  if (product % pc !== 0) {
    throw new Error('power-of-point: PA * PB must be divisible by PC')
  }
  const pd = product / pc
  if (!isInt(pd, 2, 30)) {
    throw new Error(`power-of-point: PD out of range (${pd})`)
  }
  return {
    prompt: `Two chords cross at P. PA = ${pa}, PB = ${pb}, and PC = ${pc}. Find PD.`,
    diagram: { mode: 'static', variant: 'power', power: { pa, pb, pc, pd, unknown: 'pd' } },
    correctAnswer: pd,
    feedback: {
      correct: `Correct. PA \u00D7 PB = ${pa} \u00D7 ${pb} = ${product}, and ${product} \u00F7 ${pc} = ${pd}.`,
      incorrect: 'The two parts of one chord multiply to the same as the two parts of the other.',
    },
    strongHint: `PA \u00D7 PB = PC \u00D7 PD, so PD = (${pa} \u00D7 ${pb}) \u00F7 ${pc}.`,
  }
}

const INSCRIBED_SPECS: PracticeSpec[] = [
  ...[80, 100, 120, 140, 160].map((value) => ({ given: 'central', value })),
  ...[30, 40, 50, 70, 80].map((value) => ({ given: 'inscribed', value })),
]

const CYCLIC_SPECS: PracticeSpec[] = [
  ...[70, 85, 100, 110, 125].map((value) => ({ given: 'A', value })),
  ...[75, 95, 105, 120].map((value) => ({ given: 'C', value })),
]

const POWER_SPECS: PracticeSpec[] = [
  [4, 6, 3],
  [6, 4, 8],
  [3, 8, 4],
  [5, 6, 3],
  [6, 6, 4],
  [4, 10, 8],
  [3, 8, 6],
  [9, 2, 6],
  [5, 8, 4],
].map((values) => ({ given: 'PD', values }))

function poolFor(topic: PracticeTopic): PracticeSpec[] {
  if (topic === 'cyclic') {
    return CYCLIC_SPECS
  }
  if (topic === 'power-of-point') {
    return POWER_SPECS
  }
  return INSCRIBED_SPECS
}

// Deterministic fallback: shuffle the topic's pool and return `count` distinct problems.
export function generatePracticeProblems(
  topic: PracticeTopic,
  count: number,
  offset: number,
): NumericProblem[] {
  const specs = [...poolFor(topic)]

  for (let i = specs.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[specs[i], specs[j]] = [specs[j], specs[i]]
  }

  return specs
    .slice(0, count)
    .map((spec, index) => ({ ...buildProblem(topic, spec), id: `generated-${offset + index}` }))
}
