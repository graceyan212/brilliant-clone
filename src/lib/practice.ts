import type {
  AnglesHighlight,
  DiagramConfig,
  NumericProblem,
  PracticeSpec,
  PracticeTopic,
} from '../types/lesson'

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
    case 'sector':
      return sectorProblem(spec)
    case 'angles':
      return anglesProblem(spec)
    case 'triangle-angle':
      return triangleAngleProblem(spec)
    case 'pythagorean':
      return pythagoreanProblem(spec)
    case 'special-triangle':
      return specialTriangleProblem(spec)
    case 'similar-triangle':
      return similarTriangleProblem(spec)
    case 'polygon-angle':
      return polygonAngleProblem(spec)
    case 'polygon-area':
      return polygonAreaProblem(spec)
    case 'central-angle':
      return centralAngleProblem(spec)
    case 'chord-angle':
      return chordAngleProblem(spec)
    case 'secant-angle':
      return secantAngleProblem(spec)
    case 'tangent-angle':
      return tangentAngleProblem(spec)
    case 'circumcircle':
      return circumcircleProblem(spec)
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
      commonError: {
        value,
        feedback: `${value}\u00B0 is the central angle itself \u2014 the inscribed angle is HALF of it, so \u2220ACB = ${value} \u00F7 2 = ${inscribed}\u00B0.`,
      },
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
      commonError: {
        value,
        feedback: `Opposite angles are supplementary, not equal \u2014 \u2220C = 180\u00B0 \u2212 ${value}\u00B0 = ${other}\u00B0.`,
      },
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
      commonError: {
        value,
        feedback: `Opposite angles are supplementary, not equal \u2014 \u2220A = 180\u00B0 \u2212 ${value}\u00B0 = ${other}\u00B0.`,
      },
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

// Arcs & sectors: a sector is the fraction theta/360 of the circle, so its arc
// length is (theta/360) * 2*pi*r and its area is (theta/360) * pi*r^2. The spec
// supplies [radius, angle]; the answer is the whole-number coefficient of pi.
function sectorProblem({ given, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (
    !values ||
    values.length !== 2 ||
    !isInt(values[0], 1, 20) ||
    values[1] % 30 !== 0 ||
    !isInt(values[1], 30, 330)
  ) {
    throw new Error('sector needs values [radius, angle], angle a multiple of 30 in 30..330')
  }
  const [r, theta] = values
  const diagram: NumericProblem['diagram'] = {
    mode: 'static',
    variant: 'sector',
    centralAngle: theta,
    radiusLabel: r,
  }

  if (given === 'arc') {
    const coeff = (theta * 2 * r) / 360
    if (!isInt(coeff, 1, 200)) {
      throw new Error(`sector arc not a whole multiple of pi: ${coeff}`)
    }
    return {
      prompt: `A sector has radius ${r} and central angle ${theta}\u00B0. Find its arc length (in terms of \u03C0).`,
      diagram,
      correctAnswer: coeff,
      unit: '\u03C0',
      feedback: {
        correct: `Correct. (${theta}\u00F7360) \u00D7 2\u03C0(${r}) = ${coeff}\u03C0.`,
        incorrect: 'Arc length is the fraction \u03B8/360 of the whole circumference, 2\u03C0r.',
      },
      strongHint: `Arc = (${theta} \u00F7 360) \u00D7 2\u03C0 \u00D7 ${r}.`,
    }
  }
  if (given === 'area') {
    const coeff = (theta * r * r) / 360
    if (!isInt(coeff, 1, 400)) {
      throw new Error(`sector area not a whole multiple of pi: ${coeff}`)
    }
    return {
      prompt: `A sector has radius ${r} and central angle ${theta}\u00B0. Find its area (in terms of \u03C0).`,
      diagram,
      correctAnswer: coeff,
      unit: '\u03C0',
      feedback: {
        correct: `Correct. (${theta}\u00F7360) \u00D7 \u03C0(${r})\u00B2 = ${coeff}\u03C0.`,
        incorrect: 'Sector area is the fraction \u03B8/360 of the whole area, \u03C0r\u00B2.',
      },
      strongHint: `Area = (${theta} \u00F7 360) \u00D7 \u03C0 \u00D7 ${r}\u00B2.`,
    }
  }
  throw new Error(`unknown sector given: ${given}`)
}

function clampTilt(value: number): number {
  return Math.max(-52, Math.min(52, value))
}

// Angle chasing across two parallel lines cut by a transversal (plus a single
// crossing for vertical/linear-pair facts). The spec supplies a single angle
// `value`; code computes the answer from the named relationship and builds a
// static transversal figure that marks the given angle and a "?" on the target.
function anglesProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number' || !isInt(value, 40, 140)) {
    throw new Error(`invalid angles value: ${value}`)
  }

  const figure = (highlight: AnglesHighlight, tilt: number): DiagramConfig => ({
    mode: 'static',
    variant: 'angles',
    angles: { highlight, angle: clampTilt(tilt), markedLabel: `${value}\u00B0`, partnerLabel: '?' },
  })

  const equalTilt = 90 - value
  const supplement = 180 - value

  switch (given) {
    case 'corresponding':
      return {
        prompt: `Two parallel lines are cut by a transversal. One angle is ${value}\u00B0. Find its corresponding angle.`,
        diagram: figure('corresponding', equalTilt),
        correctAnswer: value,
        unit: '\u00B0',
        feedback: {
          correct: `Correct. Corresponding angles are equal, so it is also ${value}\u00B0.`,
          incorrect: 'Corresponding angles sit in matching corners at each crossing, so they are equal.',
        },
        strongHint: `Corresponding angles are equal, so the answer is just ${value}\u00B0.`,
      }
    case 'alternate':
      return {
        prompt: `Two parallel lines are cut by a transversal. An interior angle is ${value}\u00B0. Find its alternate interior angle.`,
        diagram: figure('alternate', equalTilt),
        correctAnswer: value,
        unit: '\u00B0',
        feedback: {
          correct: `Correct. Alternate interior angles (the Z shape) are equal: ${value}\u00B0.`,
          incorrect: 'Alternate interior angles form a Z between the parallel lines, so they are equal.',
        },
        strongHint: `Alternate interior angles are equal, so the answer is ${value}\u00B0.`,
      }
    case 'vertical':
      return {
        prompt: `Two lines cross. One angle is ${value}\u00B0. Find the angle vertically opposite it.`,
        diagram: figure('vertical', equalTilt),
        correctAnswer: value,
        unit: '\u00B0',
        feedback: {
          correct: `Correct. Vertically opposite angles are equal: ${value}\u00B0.`,
          incorrect: 'Vertically opposite angles (across the crossing point) are equal.',
        },
        strongHint: `Vertical angles are equal, so the answer is ${value}\u00B0.`,
      }
    case 'vertical-corresponding':
      return {
        prompt: `\u22201 and \u22202 are vertical angles. \u22202 and \u22203 are corresponding angles where a transversal cuts two parallel lines. If \u22201 = ${value}\u00B0, find \u22203.`,
        diagram: figure('corresponding', equalTilt),
        correctAnswer: value,
        unit: '\u00B0',
        feedback: {
          correct: `Correct. \u22201 = \u22202 (vertical) and \u22202 = \u22203 (corresponding), so \u22203 = ${value}\u00B0.`,
          incorrect: 'Chase it one link at a time: vertical angles are equal, then corresponding angles are equal.',
        },
        strongHint: `Each link keeps the angle the same: \u22203 = ${value}\u00B0.`,
      }
    case 'supplementary':
      return {
        prompt: `Two angles lie on a straight line. One is ${value}\u00B0. Find the other.`,
        diagram: figure('supplementary', equalTilt),
        correctAnswer: supplement,
        unit: '\u00B0',
        feedback: {
          correct: `Correct. Angles on a straight line sum to 180\u00B0, so 180\u00B0 \u2212 ${value}\u00B0 = ${supplement}\u00B0.`,
          incorrect: 'Angles on a straight line (a linear pair) add to 180\u00B0.',
        },
        strongHint: `Subtract from 180\u00B0: 180\u00B0 \u2212 ${value}\u00B0.`,
      }
    case 'cointerior':
      return {
        prompt: `Two parallel lines are cut by a transversal. Two co-interior angles lie on the same side, between the lines. One is ${value}\u00B0. Find the other.`,
        diagram: figure('cointerior', value - 90),
        correctAnswer: supplement,
        unit: '\u00B0',
        feedback: {
          correct: `Correct. Co-interior angles are supplementary: 180\u00B0 \u2212 ${value}\u00B0 = ${supplement}\u00B0.`,
          incorrect: 'Co-interior (same-side interior) angles add to 180\u00B0.',
        },
        strongHint: `Co-interior angles sum to 180\u00B0: 180\u00B0 \u2212 ${value}\u00B0.`,
      }
    default:
      throw new Error(`unknown angles given: ${given}`)
  }
}

// Angles in a triangle: the interior angles sum to 180, and an exterior angle
// equals the sum of the two remote interior angles. The spec supplies the given
// numbers in `values`; code computes the answer and builds the triangle figure.
function triangleAngleProblem({ given, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
    throw new Error('triangle-angle needs two integer values')
  }
  const [first, second] = values

  if (given === 'missing') {
    if (!isInt(first, 20, 140) || !isInt(second, 20, 140) || !isInt(first + second, 40, 160)) {
      throw new Error(`invalid triangle missing values: ${values}`)
    }
    const third = 180 - first - second
    return {
      prompt: `A triangle has two angles measuring ${first}\u00B0 and ${second}\u00B0. Find the third angle.`,
      diagram: {
        mode: 'static',
        variant: 'triangle',
        triangle: { angleLabels: { a: `${first}\u00B0`, b: `${second}\u00B0`, c: '?' } },
      },
      correctAnswer: third,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. 180\u00B0 \u2212 ${first}\u00B0 \u2212 ${second}\u00B0 = ${third}\u00B0.`,
        incorrect: 'The three interior angles of a triangle add to 180\u00B0.',
      },
      strongHint: `Take both away from 180\u00B0: 180\u00B0 \u2212 ${first}\u00B0 \u2212 ${second}\u00B0.`,
    }
  }

  if (given === 'exterior-sum') {
    if (!isInt(first, 20, 130) || !isInt(second, 20, 130) || !isInt(first + second, 40, 160)) {
      throw new Error(`invalid triangle exterior-sum values: ${values}`)
    }
    const exterior = first + second
    return {
      prompt: `In a triangle, the two remote interior angles are ${first}\u00B0 and ${second}\u00B0. Find the exterior angle at the third vertex.`,
      diagram: {
        mode: 'static',
        variant: 'triangle',
        triangle: {
          angleLabels: { a: `${first}\u00B0`, b: `${second}\u00B0` },
          exterior: { at: 'c', from: 'b', label: '?' },
        },
      },
      correctAnswer: exterior,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. An exterior angle equals the sum of the two remote interior angles: ${first}\u00B0 + ${second}\u00B0 = ${exterior}\u00B0.`,
        incorrect: 'An exterior angle equals the sum of the two non-adjacent (remote) interior angles.',
      },
      strongHint: `Add the two remote interior angles: ${first}\u00B0 + ${second}\u00B0.`,
    }
  }

  if (given === 'exterior-remote') {
    // values = [exterior, oneRemote]; the other remote = exterior - oneRemote.
    if (!isInt(first, 40, 160) || !isInt(second, 20, first - 20)) {
      throw new Error(`invalid triangle exterior-remote values: ${values}`)
    }
    const other = first - second
    return {
      prompt: `An exterior angle of a triangle is ${first}\u00B0. One of its two remote interior angles is ${second}\u00B0. Find the other remote interior angle.`,
      diagram: {
        mode: 'static',
        variant: 'triangle',
        triangle: {
          angleLabels: { a: `${second}\u00B0`, b: '?' },
          exterior: { at: 'c', from: 'b', label: `${first}\u00B0` },
        },
      },
      correctAnswer: other,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The exterior angle is the sum of the remote interiors, so the other is ${first}\u00B0 \u2212 ${second}\u00B0 = ${other}\u00B0.`,
        incorrect: 'Exterior angle = sum of the two remote interior angles, so subtract the known one.',
      },
      strongHint: `Subtract: ${first}\u00B0 \u2212 ${second}\u00B0.`,
    }
  }

  throw new Error(`unknown triangle-angle given: ${given}`)
}

type SideLabels = Partial<Record<'a' | 'b' | 'c', string>>

// A clean right triangle with the right angle at C (so side c, opposite C, is the
// hypotenuse and sides a, b are the legs). Used by the Pythagorean problems.
function rightTriangleFigure(sideLabels: SideLabels): DiagramConfig {
  return {
    mode: 'static',
    variant: 'triangle',
    triangle: {
      vertices: { a: { x: 70, y: 70 }, b: { x: 320, y: 290 }, c: { x: 70, y: 290 } },
      rightAngleAt: 'c',
      sideLabels,
    },
  }
}

// Pythagorean theorem: in a right triangle, a^2 + b^2 = c^2 with c the hypotenuse.
// The spec supplies the two known sides in `values`; code computes the missing side
// and guarantees it is a whole number (the three sides form a Pythagorean triple).
// `given: 'leg'` provides the two legs (find the hypotenuse); `given: 'hyp'`
// provides one leg and the hypotenuse (find the other leg).
function pythagoreanProblem({ given, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
    throw new Error('pythagorean needs two integer values')
  }
  const [first, second] = values

  if (given === 'leg') {
    if (!isInt(first, 1, 100) || !isInt(second, 1, 100)) {
      throw new Error(`invalid pythagorean legs: ${values}`)
    }
    const hyp = Math.sqrt(first * first + second * second)
    if (!Number.isInteger(hyp) || !isInt(hyp, 1, 200)) {
      throw new Error(`pythagorean legs do not form a whole hypotenuse: ${values}`)
    }
    return {
      prompt: `A right triangle has legs of ${first} and ${second}. Find the hypotenuse.`,
      diagram: rightTriangleFigure({ a: `${first}`, b: `${second}`, c: '?' }),
      correctAnswer: hyp,
      feedback: {
        correct: `Correct. ${first}\u00B2 + ${second}\u00B2 = ${hyp}\u00B2, so the hypotenuse is ${hyp}.`,
        incorrect: 'In a right triangle, leg\u00B2 + leg\u00B2 = hypotenuse\u00B2.',
      },
      strongHint: `The hypotenuse c has c\u00B2 = ${first}\u00B2 + ${second}\u00B2 = ${first * first + second * second}. Take the square root.`,
      commonError: {
        value: first + second,
        feedback: `You added the legs. Square them first: c = \u221A(${first}\u00B2 + ${second}\u00B2) = \u221A${first * first + second * second} = ${hyp}.`,
      },
    }
  }

  if (given === 'hyp') {
    if (!isInt(first, 1, 100) || !isInt(second, 2, 200) || second <= first) {
      throw new Error(`invalid pythagorean leg/hyp: ${values}`)
    }
    const other = Math.sqrt(second * second - first * first)
    if (!Number.isInteger(other) || !isInt(other, 1, 200)) {
      throw new Error(`pythagorean leg/hyp do not form a whole leg: ${values}`)
    }
    return {
      prompt: `A right triangle has a leg of ${first} and a hypotenuse of ${second}. Find the other leg.`,
      diagram: rightTriangleFigure({ a: `${first}`, c: `${second}`, b: '?' }),
      correctAnswer: other,
      feedback: {
        correct: `Correct. ${first}\u00B2 + ${other}\u00B2 = ${second}\u00B2, so the other leg is ${other}.`,
        incorrect: 'Rearrange a\u00B2 + b\u00B2 = c\u00B2: the missing leg\u00B2 = hypotenuse\u00B2 \u2212 known leg\u00B2.',
      },
      strongHint: `The missing leg b has b\u00B2 = ${second}\u00B2 \u2212 ${first}\u00B2 = ${second * second - first * first}. Take the square root.`,
    }
  }

  throw new Error(`unknown pythagorean given: ${given}`)
}

// Isosceles right triangle (45-45-90) with the right angle at C.
function fortyFiveFigure(sideLabels: SideLabels): DiagramConfig {
  return {
    mode: 'static',
    variant: 'triangle',
    triangle: {
      vertices: { a: { x: 100, y: 80 }, b: { x: 280, y: 260 }, c: { x: 100, y: 260 } },
      angleLabels: { a: '45\u00B0', b: '45\u00B0' },
      rightAngleAt: 'c',
      sideLabels,
    },
  }
}

// 30-60-90 triangle with the 30-degree angle at A, the 60 at B, the right angle at
// C. Side a (opposite A) is the short leg, side b (opposite B) the long leg, side c
// (opposite C) the hypotenuse.
function thirtySixtyFigure(sideLabels: SideLabels): DiagramConfig {
  return {
    mode: 'static',
    variant: 'triangle',
    triangle: {
      vertices: { a: { x: 90, y: 70 }, b: { x: 206, y: 270 }, c: { x: 90, y: 270 } },
      angleLabels: { a: '30\u00B0', b: '60\u00B0' },
      rightAngleAt: 'c',
      sideLabels,
    },
  }
}

// Special right triangles. 45-45-90 sides are in ratio 1 : 1 : sqrt(2); 30-60-90
// sides are 1 : sqrt(3) : 2 (short : long : hypotenuse). The spec supplies the one
// given length in `value`; code computes the answer. Answers that carry a radical
// are returned as the whole-number coefficient with unit "sqrt2"/"sqrt3" (mirroring
// the sector topic's pi coefficient); the rest are clean integers.
function specialTriangleProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('special-triangle needs an integer value')
  }

  switch (given) {
    case '45-leg-hyp': {
      if (!isInt(value, 1, 30)) {
        throw new Error(`invalid 45-leg-hyp value: ${value}`)
      }
      return {
        prompt: `A 45-45-90 right triangle has legs of length ${value}. Find the hypotenuse (in terms of \u221A2).`,
        diagram: fortyFiveFigure({ a: `${value}`, b: `${value}`, c: '?' }),
        correctAnswer: value,
        unit: '\u221A2',
        feedback: {
          correct: `Correct. In a 45-45-90 triangle the hypotenuse is a leg times \u221A2: ${value}\u221A2.`,
          incorrect: 'In a 45-45-90 triangle the hypotenuse equals a leg times \u221A2.',
        },
        strongHint: `Hypotenuse = leg \u00D7 \u221A2 = ${value}\u221A2, so enter ${value}.`,
      }
    }
    case '30-short-hyp': {
      if (!isInt(value, 1, 30)) {
        throw new Error(`invalid 30-short-hyp value: ${value}`)
      }
      const hyp = value * 2
      return {
        prompt: `A 30-60-90 right triangle has a short leg of ${value} (opposite the 30\u00B0 angle). Find the hypotenuse.`,
        diagram: thirtySixtyFigure({ a: `${value}`, c: '?' }),
        correctAnswer: hyp,
        feedback: {
          correct: `Correct. The hypotenuse is twice the short leg: 2 \u00D7 ${value} = ${hyp}.`,
          incorrect: 'In a 30-60-90 triangle the hypotenuse is twice the short leg (the side opposite 30\u00B0).',
        },
        strongHint: `Hypotenuse = 2 \u00D7 short leg = 2 \u00D7 ${value}.`,
      }
    }
    case '30-short-long': {
      if (!isInt(value, 1, 30)) {
        throw new Error(`invalid 30-short-long value: ${value}`)
      }
      return {
        prompt: `A 30-60-90 right triangle has a short leg of ${value}. Find the long leg (in terms of \u221A3).`,
        diagram: thirtySixtyFigure({ a: `${value}`, b: '?' }),
        correctAnswer: value,
        unit: '\u221A3',
        feedback: {
          correct: `Correct. The long leg is the short leg times \u221A3: ${value}\u221A3.`,
          incorrect: 'In a 30-60-90 triangle the long leg (opposite 60\u00B0) is the short leg times \u221A3.',
        },
        strongHint: `Long leg = short leg \u00D7 \u221A3 = ${value}\u221A3, so enter ${value}.`,
      }
    }
    case '30-hyp-short': {
      if (!isInt(value, 2, 60) || value % 2 !== 0) {
        throw new Error(`invalid 30-hyp-short value: ${value}`)
      }
      const short = value / 2
      return {
        prompt: `A 30-60-90 right triangle has a hypotenuse of ${value}. Find the short leg (opposite the 30\u00B0 angle).`,
        diagram: thirtySixtyFigure({ c: `${value}`, a: '?' }),
        correctAnswer: short,
        feedback: {
          correct: `Correct. The short leg is half the hypotenuse: ${value} \u00F7 2 = ${short}.`,
          incorrect: 'In a 30-60-90 triangle the short leg is half the hypotenuse.',
        },
        strongHint: `Short leg = hypotenuse \u00F7 2 = ${value} \u00F7 2.`,
      }
    }
    case '30-hyp-long': {
      if (!isInt(value, 2, 60) || value % 2 !== 0) {
        throw new Error(`invalid 30-hyp-long value: ${value}`)
      }
      const short = value / 2
      return {
        prompt: `A 30-60-90 right triangle has a hypotenuse of ${value}. Find the long leg (in terms of \u221A3).`,
        diagram: thirtySixtyFigure({ c: `${value}`, b: '?' }),
        correctAnswer: short,
        unit: '\u221A3',
        feedback: {
          correct: `Correct. The short leg is ${short}, so the long leg is ${short}\u221A3.`,
          incorrect: 'Halve the hypotenuse to get the short leg, then multiply by \u221A3 for the long leg.',
        },
        strongHint: `Short leg = ${value} \u00F7 2 = ${short}; long leg = ${short}\u221A3, so enter ${short}.`,
      }
    }
    default:
      throw new Error(`unknown special-triangle given: ${given}`)
  }
}

// A small base triangle with a dashed similar copy scaled about its centroid. The
// scale 2..4 keeps the overlay inside the viewBox.
const similarVertices = { a: { x: 180, y: 185 }, b: { x: 146, y: 250 }, c: { x: 214, y: 250 } }

function similarFigure(scale: number, sideLabels?: SideLabels): DiagramConfig {
  return {
    mode: 'static',
    variant: 'triangle',
    triangle: {
      vertices: similarVertices,
      overlayScale: scale,
      overlayLabel: `\u00D7${scale}`,
      sideLabels,
    },
  }
}

// Similar triangles & scaling. Corresponding sides share one ratio k, and area
// scales by k^2. The spec supplies the given numbers; code computes the answer.
function similarTriangleProblem({ given, value, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (given === 'side') {
    if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('similar-triangle side needs two integer values')
    }
    const [side, k] = values
    if (!isInt(side, 1, 20) || !isInt(k, 2, 4)) {
      throw new Error(`invalid similar-triangle side values: ${values}`)
    }
    const bigger = side * k
    if (!isInt(bigger, 2, 80)) {
      throw new Error(`similar-triangle side out of range: ${bigger}`)
    }
    return {
      prompt: `Two triangles are similar. A side of the smaller is ${side}, and the larger is ${k} times as big. Find the corresponding side of the larger triangle.`,
      diagram: similarFigure(k, { a: `${side}` }),
      correctAnswer: bigger,
      feedback: {
        correct: `Correct. Corresponding sides scale by the same factor: ${side} \u00D7 ${k} = ${bigger}.`,
        incorrect: 'In similar triangles, every pair of corresponding sides shares the same ratio.',
      },
      strongHint: `Multiply the side by the scale factor: ${side} \u00D7 ${k}.`,
    }
  }

  if (given === 'area-ratio') {
    if (typeof value !== 'number' || !isInt(value, 2, 4)) {
      throw new Error(`invalid similar-triangle area-ratio value: ${value}`)
    }
    const ratio = value * value
    return {
      prompt: `Two triangles are similar with corresponding sides in the ratio ${value} : 1. Find the ratio of their areas (larger : smaller).`,
      diagram: similarFigure(value),
      correctAnswer: ratio,
      feedback: {
        correct: `Correct. Area scales by the square of the side ratio: ${value}\u00B2 = ${ratio}.`,
        incorrect: 'When lengths scale by k, areas scale by k\u00B2.',
      },
      strongHint: `Square the side ratio: ${value}\u00B2 = ${ratio}.`,
    }
  }

  if (given === 'area') {
    if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('similar-triangle area needs two integer values')
    }
    const [area, k] = values
    if (!isInt(area, 1, 20) || !isInt(k, 2, 4)) {
      throw new Error(`invalid similar-triangle area values: ${values}`)
    }
    const bigger = area * k * k
    if (!isInt(bigger, 4, 320)) {
      throw new Error(`similar-triangle area out of range: ${bigger}`)
    }
    return {
      prompt: `Two triangles are similar. The smaller has area ${area} and the larger is ${k} times as large in length. Find the larger triangle's area.`,
      diagram: similarFigure(k),
      correctAnswer: bigger,
      feedback: {
        correct: `Correct. Area scales by k\u00B2: ${area} \u00D7 ${k}\u00B2 = ${area} \u00D7 ${k * k} = ${bigger}.`,
        incorrect: 'Multiply the smaller area by k\u00B2, where k is the length scale factor.',
      },
      strongHint: `Multiply by the square of the scale: ${area} \u00D7 ${k}\u00B2.`,
    }
  }

  throw new Error(`unknown similar-triangle given: ${given}`)
}

const POLYGON_NAMES: Record<number, string> = {
  3: 'triangle',
  4: 'quadrilateral',
  5: 'pentagon',
  6: 'hexagon',
  7: 'heptagon',
  8: 'octagon',
  9: 'nonagon',
  10: 'decagon',
  11: 'hendecagon',
  12: 'dodecagon',
}

function polygonName(n: number): string {
  return POLYGON_NAMES[n] ?? `${n}-gon`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Bare regular n-gon (no angle marks / readout) so a practice figure never leaks its answer.
function polygonFigure(n: number): DiagramConfig {
  return {
    mode: 'static',
    variant: 'polygon',
    polygon: {
      sides: n,
      showInteriorAngle: false,
      showAngleSum: false,
      showReadout: false,
      name: capitalize(polygonName(n)),
    },
  }
}

// Polygon angles: interior-angle sum (n-2)*180, each interior angle of a regular
// n-gon (n-2)*180/n, each exterior angle 360/n, and reversing the sum to find n.
// The spec supplies a single `value` (n, or the angle sum for 'sides-from-sum').
function polygonAngleProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('polygon-angle needs an integer value')
  }

  if (given === 'sum') {
    if (!isInt(value, 3, 20)) {
      throw new Error(`invalid polygon-angle sum value: ${value}`)
    }
    const sum = (value - 2) * 180
    return {
      prompt: `Find the sum of the interior angles of a ${polygonName(value)} (${value} sides).`,
      diagram: polygonFigure(value),
      correctAnswer: sum,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. (${value} \u2212 2) \u00D7 180\u00B0 = ${sum}\u00B0.`,
        incorrect: 'The interior angles of an n-gon add to (n \u2212 2) \u00D7 180\u00B0.',
      },
      strongHint: `Multiply: (${value} \u2212 2) \u00D7 180\u00B0.`,
    }
  }

  if (given === 'regular') {
    if (!isInt(value, 3, 20) || 360 % value !== 0) {
      throw new Error(`invalid polygon-angle regular value: ${value}`)
    }
    const sum = (value - 2) * 180
    const each = sum / value
    return {
      prompt: `Find each interior angle of a regular ${polygonName(value)} (${value} sides).`,
      diagram: polygonFigure(value),
      correctAnswer: each,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. (${value} \u2212 2) \u00D7 180\u00B0 = ${sum}\u00B0, and ${sum}\u00B0 \u00F7 ${value} = ${each}\u00B0.`,
        incorrect: 'Each interior angle of a regular n-gon is (n \u2212 2) \u00D7 180\u00B0 \u00F7 n.',
      },
      strongHint: `First the sum (${value} \u2212 2) \u00D7 180\u00B0 = ${sum}\u00B0, then \u00F7 ${value}.`,
    }
  }

  if (given === 'exterior') {
    if (!isInt(value, 3, 20) || 360 % value !== 0) {
      throw new Error(`invalid polygon-angle exterior value: ${value}`)
    }
    const each = 360 / value
    return {
      prompt: `Find each exterior angle of a regular ${polygonName(value)} (${value} sides).`,
      diagram: polygonFigure(value),
      correctAnswer: each,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The exterior angles total 360\u00B0, so each is 360\u00B0 \u00F7 ${value} = ${each}\u00B0.`,
        incorrect: 'The exterior angles of any polygon add to 360\u00B0, so each is 360\u00B0 \u00F7 n.',
      },
      strongHint: `Divide: 360\u00B0 \u00F7 ${value}.`,
    }
  }

  if (given === 'sides-from-sum') {
    if (value % 180 !== 0) {
      throw new Error(`invalid polygon-angle sides-from-sum value: ${value}`)
    }
    const n = value / 180 + 2
    if (!isInt(n, 3, 20)) {
      throw new Error(`polygon-angle sides-from-sum out of range: ${n}`)
    }
    return {
      prompt: `The interior angles of a polygon add to ${value}\u00B0. How many sides does it have?`,
      correctAnswer: n,
      feedback: {
        correct: `Correct. ${value}\u00B0 \u00F7 180\u00B0 = ${value / 180}, and ${value / 180} + 2 = ${n}.`,
        incorrect: 'Work back from (n \u2212 2) \u00D7 180\u00B0 = sum.',
      },
      strongHint: `Solve (n \u2212 2) \u00D7 180 = ${value}: n = ${value} \u00F7 180 + 2.`,
    }
  }

  throw new Error(`unknown polygon-angle given: ${given}`)
}

// Areas of polygons. The spec supplies the given dimensions; code computes the
// area. 'equilateral' uses `value` (side s) and returns the whole-number
// coefficient of sqrt(3) (mirroring the special-triangle radical convention);
// the rest use `values` and are guaranteed whole-number areas.
function polygonAreaProblem({ given, value, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (given === 'triangle') {
    if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('polygon-area triangle needs two integer values')
    }
    const [b, h] = values
    if (!isInt(b, 1, 40) || !isInt(h, 1, 40) || (b * h) % 2 !== 0) {
      throw new Error(`invalid polygon-area triangle values: ${values}`)
    }
    const area = (b * h) / 2
    return {
      prompt: `A triangle has base ${b} and height ${h}. Find its area.`,
      diagram: { mode: 'static', variant: 'quadArea', quadArea: { shape: 'triangle', base: `${b}`, height: `${h}` } },
      correctAnswer: area,
      feedback: {
        correct: `Correct. \u00BD \u00D7 ${b} \u00D7 ${h} = ${area}.`,
        incorrect: "A triangle's area is \u00BD \u00D7 base \u00D7 height.",
      },
      strongHint: `Halve the product: \u00BD \u00D7 ${b} \u00D7 ${h}.`,
    }
  }

  if (given === 'parallelogram') {
    if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('polygon-area parallelogram needs two integer values')
    }
    const [b, h] = values
    if (!isInt(b, 1, 40) || !isInt(h, 1, 40)) {
      throw new Error(`invalid polygon-area parallelogram values: ${values}`)
    }
    const area = b * h
    return {
      prompt: `A parallelogram has base ${b} and perpendicular height ${h}. Find its area.`,
      diagram: { mode: 'static', variant: 'quadArea', quadArea: { shape: 'parallelogram', base: `${b}`, height: `${h}` } },
      correctAnswer: area,
      feedback: {
        correct: `Correct. ${b} \u00D7 ${h} = ${area}.`,
        incorrect: "A parallelogram's area is base \u00D7 height.",
      },
      strongHint: `Multiply: ${b} \u00D7 ${h}.`,
    }
  }

  if (given === 'trapezoid') {
    if (!values || values.length !== 3 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('polygon-area trapezoid needs three integer values')
    }
    const [b1, b2, h] = values
    if (!isInt(b1, 1, 40) || !isInt(b2, 1, 40) || !isInt(h, 1, 40) || b2 > b1 || ((b1 + b2) * h) % 2 !== 0) {
      throw new Error(`invalid polygon-area trapezoid values: ${values}`)
    }
    const area = ((b1 + b2) * h) / 2
    return {
      prompt: `A trapezoid has parallel sides ${b1} and ${b2} and a perpendicular height of ${h}. Find its area.`,
      diagram: { mode: 'static', variant: 'quadArea', quadArea: { shape: 'trapezoid', base: `${b1}`, base2: `${b2}`, height: `${h}` } },
      correctAnswer: area,
      feedback: {
        correct: `Correct. \u00BD \u00D7 (${b1} + ${b2}) \u00D7 ${h} = ${area}.`,
        incorrect: 'Average the two parallel sides, then multiply by the height: \u00BD \u00D7 (b\u2081 + b\u2082) \u00D7 h.',
      },
      strongHint: `Add the parallel sides, then \u00BD \u00D7 (${b1} + ${b2}) \u00D7 ${h}.`,
    }
  }

  if (given === 'kite') {
    if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('polygon-area kite needs two integer values')
    }
    const [d1, d2] = values
    if (!isInt(d1, 1, 40) || !isInt(d2, 1, 40) || (d1 * d2) % 2 !== 0) {
      throw new Error(`invalid polygon-area kite values: ${values}`)
    }
    const area = (d1 * d2) / 2
    return {
      prompt: `A kite has diagonals ${d1} and ${d2}. Find its area.`,
      diagram: { mode: 'static', variant: 'quadArea', quadArea: { shape: 'kite', diag1: `${d1}`, diag2: `${d2}` } },
      correctAnswer: area,
      feedback: {
        correct: `Correct. \u00BD \u00D7 ${d1} \u00D7 ${d2} = ${area}.`,
        incorrect: "A kite's area is half the product of its diagonals: \u00BD \u00D7 d\u2081 \u00D7 d\u2082.",
      },
      strongHint: `Halve the product of the diagonals: \u00BD \u00D7 ${d1} \u00D7 ${d2}.`,
    }
  }

  if (given === 'equilateral') {
    if (typeof value !== 'number' || !isInt(value, 2, 20) || value % 2 !== 0) {
      throw new Error(`invalid polygon-area equilateral value: ${value}`)
    }
    const coeff = (value * value) / 4
    return {
      prompt: `An equilateral triangle has side ${value}. Find its area (in terms of \u221A3).`,
      diagram: { mode: 'static', variant: 'quadArea', quadArea: { shape: 'equilateral', side: `${value}` } },
      correctAnswer: coeff,
      unit: '\u221A3',
      feedback: {
        correct: `Correct. (\u221A3 \u00F7 4) \u00D7 ${value}\u00B2 = ${coeff}\u221A3.`,
        incorrect: 'The area of an equilateral triangle of side s is (\u221A3 \u00F7 4) \u00D7 s\u00B2.',
      },
      strongHint: `Compute ${value}\u00B2 \u00F7 4 = ${coeff}; the area is ${coeff}\u221A3, so enter ${coeff}.`,
    }
  }

  throw new Error(`unknown polygon-area given: ${given}`)
}

// Central angle & arc measure: an arc has the same measure as the central angle
// that subtends it, and the whole circle is 360 deg (so two arcs that close the
// circle add to 360). The spec supplies a single `value`; code computes the
// answer and builds the arcMeasure figure.
function centralAngleProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('central-angle problem needs an integer value')
  }

  if (given === 'central') {
    if (!isInt(value, 20, 170)) {
      throw new Error(`invalid central-angle/central value: ${value}`)
    }
    return {
      prompt: `The central angle \u2220AOB is ${value}\u00B0. Find the measure of arc AB.`,
      diagram: { mode: 'static', variant: 'arcMeasure', centralAngle: value, showCentralValue: true, showArcValue: false },
      correctAnswer: value,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. An arc has the same measure as its central angle: ${value}\u00B0.`,
        incorrect: 'An arc has the same measure as the central angle that cuts it off.',
      },
      strongHint: `The arc equals the central angle, so arc AB = ${value}\u00B0.`,
    }
  }

  if (given === 'arc') {
    if (!isInt(value, 20, 170)) {
      throw new Error(`invalid central-angle/arc value: ${value}`)
    }
    return {
      prompt: `Arc AB measures ${value}\u00B0. Find the central angle \u2220AOB.`,
      diagram: { mode: 'static', variant: 'arcMeasure', centralAngle: value, showCentralValue: false, showArcValue: true },
      correctAnswer: value,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The central angle matches its arc: ${value}\u00B0.`,
        incorrect: 'The central angle has the same measure as the arc it opens onto.',
      },
      strongHint: `The central angle equals the arc, so \u2220AOB = ${value}\u00B0.`,
    }
  }

  if (given === 'remaining') {
    if (!isInt(value, 30, 170)) {
      throw new Error(`invalid central-angle/remaining value: ${value}`)
    }
    const major = 360 - value
    return {
      prompt: `Arc AB measures ${value}\u00B0. Find the major arc from A to B the other way around the circle.`,
      diagram: { mode: 'static', variant: 'arcMeasure', centralAngle: value, showArcValue: true, highlightRemaining: true, showRemainingValue: false },
      correctAnswer: major,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The whole circle is 360\u00B0, so 360\u00B0 \u2212 ${value}\u00B0 = ${major}\u00B0.`,
        incorrect: 'The two arcs together make the whole circle, 360\u00B0.',
      },
      strongHint: `Subtract from the whole circle: 360\u00B0 \u2212 ${value}\u00B0.`,
    }
  }

  throw new Error(`unknown central-angle given: ${given}`)
}

// Angle from two chords crossing INSIDE a circle: angle = 1/2 (arc1 + arc2).
// given 'angle': values [arc1, arc2] -> the angle.
// given 'arc':   values [angle, knownArc] -> the other arc = 2*angle - knownArc.
function chordAngleProblem({ given, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
    throw new Error('chord-angle needs two integer values')
  }
  const [first, second] = values
  if (given === 'angle') {
    if (
      !isInt(first, 20, 170) ||
      !isInt(second, 20, 170) ||
      (first + second) % 2 !== 0 ||
      !isInt(first + second, 40, 300)
    ) {
      throw new Error(`invalid chord-angle values: ${values}`)
    }
    const angle = (first + second) / 2
    const halfDiff = Math.abs(first - second) / 2
    return {
      prompt: `Two chords cross inside a circle, cutting off arcs of ${first}\u00B0 and ${second}\u00B0. Find the angle where they meet.`,
      diagram: { mode: 'static', variant: 'chordAngle', chordAngle: { arc1: first, arc2: second, unknown: 'angle' } },
      correctAnswer: angle,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. \u00BD (${first}\u00B0 + ${second}\u00B0) = ${angle}\u00B0.`,
        incorrect: 'Inside the circle, the angle is half the sum of the two intercepted arcs.',
      },
      strongHint: `Add the arcs and halve: (${first}\u00B0 + ${second}\u00B0) \u00F7 2.`,
      commonError:
        Number.isInteger(halfDiff) && halfDiff !== angle
          ? {
              value: halfDiff,
              feedback: `That's half the DIFFERENCE \u2014 the rule for secants meeting OUTSIDE the circle. Two chords crossing INSIDE use half the SUM: \u00BD(${first}\u00B0 + ${second}\u00B0) = ${angle}\u00B0.`,
            }
          : undefined,
    }
  }
  if (given === 'arc') {
    const other = 2 * first - second
    if (
      !isInt(first, 20, 150) ||
      !isInt(second, 20, 170) ||
      !isInt(other, 20, 170) ||
      !isInt(second + other, 40, 300)
    ) {
      throw new Error(`invalid chord-angle arc values: ${values}`)
    }
    return {
      prompt: `Two chords meet at ${first}\u00B0 inside a circle. One intercepted arc is ${second}\u00B0. Find the other intercepted arc.`,
      diagram: { mode: 'static', variant: 'chordAngle', chordAngle: { arc1: second, arc2: other, unknown: 'arc2' } },
      correctAnswer: other,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The arcs add to 2 \u00D7 ${first}\u00B0 = ${2 * first}\u00B0, so the other is ${2 * first}\u00B0 \u2212 ${second}\u00B0 = ${other}\u00B0.`,
        incorrect: 'The angle is half the sum of the arcs, so the arcs add to twice the angle.',
      },
      strongHint: `Twice the angle minus the known arc: 2 \u00D7 ${first}\u00B0 \u2212 ${second}\u00B0.`,
    }
  }
  throw new Error(`unknown chord-angle given: ${given}`)
}

// Angle from two secants meeting OUTSIDE a circle: angle = 1/2 (far - near).
// given 'angle': values [far, near] -> the angle.
// given 'near':  values [angle, far] -> near = far - 2*angle.
// given 'far':   values [angle, near] -> far = near + 2*angle.
function secantAngleProblem({ given, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
    throw new Error('secant-angle needs two integer values')
  }
  const [first, second] = values
  if (given === 'angle') {
    const far = first
    const near = second
    if (
      !isInt(far, 60, 200) ||
      !isInt(near, 20, far - 20) ||
      (far - near) % 2 !== 0 ||
      !isInt(far + near, 40, 320)
    ) {
      throw new Error(`invalid secant-angle values: ${values}`)
    }
    const angle = (far - near) / 2
    const halfSum = (far + near) / 2
    return {
      prompt: `Two secants from an external point cut off a far arc of ${far}\u00B0 and a near arc of ${near}\u00B0. Find the angle at the point.`,
      diagram: { mode: 'static', variant: 'secant', secant: { farArc: far, nearArc: near, unknown: 'angle' } },
      correctAnswer: angle,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. \u00BD (${far}\u00B0 \u2212 ${near}\u00B0) = ${angle}\u00B0.`,
        incorrect: 'Outside the circle, the angle is half the difference of the two arcs.',
      },
      strongHint: `Subtract the arcs and halve: (${far}\u00B0 \u2212 ${near}\u00B0) \u00F7 2.`,
      commonError: Number.isInteger(halfSum)
        ? {
            value: halfSum,
            feedback: `That's half the SUM \u2014 the rule for two chords crossing INSIDE the circle. From an external point, use half the DIFFERENCE: \u00BD(${far}\u00B0 \u2212 ${near}\u00B0) = ${angle}\u00B0.`,
          }
        : undefined,
    }
  }
  if (given === 'near') {
    const angle = first
    const far = second
    const near = far - 2 * angle
    if (!isInt(angle, 10, 80) || !isInt(far, 60, 200) || !isInt(near, 20, far - 20) || !isInt(far + near, 40, 320)) {
      throw new Error(`invalid secant-angle near values: ${values}`)
    }
    return {
      prompt: `The angle between two secants from an external point is ${angle}\u00B0, and the far arc is ${far}\u00B0. Find the near arc.`,
      diagram: { mode: 'static', variant: 'secant', secant: { farArc: far, nearArc: near, unknown: 'near' } },
      correctAnswer: near,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. near = far \u2212 2 \u00D7 angle = ${far}\u00B0 \u2212 ${2 * angle}\u00B0 = ${near}\u00B0.`,
        incorrect: 'The angle is half (far \u2212 near), so near = far \u2212 2 \u00D7 angle.',
      },
      strongHint: `near arc = ${far}\u00B0 \u2212 2 \u00D7 ${angle}\u00B0.`,
    }
  }
  if (given === 'far') {
    const angle = first
    const near = second
    const far = near + 2 * angle
    if (!isInt(angle, 10, 80) || !isInt(near, 20, 160) || !isInt(far, 60, 200) || !isInt(far + near, 40, 320)) {
      throw new Error(`invalid secant-angle far values: ${values}`)
    }
    return {
      prompt: `The angle between two secants from an external point is ${angle}\u00B0, and the near arc is ${near}\u00B0. Find the far arc.`,
      diagram: { mode: 'static', variant: 'secant', secant: { farArc: far, nearArc: near, unknown: 'far' } },
      correctAnswer: far,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. far = near + 2 \u00D7 angle = ${near}\u00B0 + ${2 * angle}\u00B0 = ${far}\u00B0.`,
        incorrect: 'The angle is half (far \u2212 near), so far = near + 2 \u00D7 angle.',
      },
      strongHint: `far arc = ${near}\u00B0 + 2 \u00D7 ${angle}\u00B0.`,
    }
  }
  throw new Error(`unknown secant-angle given: ${given}`)
}

// Tangent angles.
// given 'chord-arc':   value = arc   -> tangent-chord angle = arc / 2.
// given 'chord-angle': value = angle -> intercepted arc = 2 * angle.
// given 'pair-arc':    value = near arc -> angle between two tangents = 180 - arc.
function tangentAngleProblem({ given, value }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('tangent-angle needs an integer value')
  }
  if (given === 'chord-arc') {
    if (!isInt(value, 20, 170) || value % 2 !== 0) {
      throw new Error(`invalid tangent chord-arc value: ${value}`)
    }
    const angle = value / 2
    return {
      prompt: `A tangent and a chord meet at the point of contact, cutting off a ${value}\u00B0 arc. Find the tangent\u2013chord angle.`,
      diagram: { mode: 'static', variant: 'tangent', tangent: { kind: 'chord', arc: value, unknown: 'angle' } },
      correctAnswer: angle,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The tangent\u2013chord angle is half the arc: \u00BD \u00D7 ${value}\u00B0 = ${angle}\u00B0.`,
        incorrect: 'The tangent\u2013chord angle is half the intercepted arc.',
      },
      strongHint: `Halve the arc: ${value}\u00B0 \u00F7 2.`,
    }
  }
  if (given === 'chord-angle') {
    if (!isInt(value, 10, 85)) {
      throw new Error(`invalid tangent chord-angle value: ${value}`)
    }
    const arc = 2 * value
    return {
      prompt: `A tangent\u2013chord angle measures ${value}\u00B0. Find the arc the chord cuts off.`,
      diagram: { mode: 'static', variant: 'tangent', tangent: { kind: 'chord', arc, unknown: 'arc' } },
      correctAnswer: arc,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The arc is twice the angle: 2 \u00D7 ${value}\u00B0 = ${arc}\u00B0.`,
        incorrect: 'The arc is twice the tangent\u2013chord angle.',
      },
      strongHint: `Double the angle: 2 \u00D7 ${value}\u00B0.`,
    }
  }
  if (given === 'pair-arc') {
    // Capped at 120 so the external point stays inside the figure's viewBox.
    if (!isInt(value, 60, 120) || value % 2 !== 0) {
      throw new Error(`invalid tangent pair-arc value: ${value}`)
    }
    const angle = 180 - value
    return {
      prompt: `Two tangents from a point touch a circle, enclosing a ${value}\u00B0 arc between the points of contact. Find the angle between the tangents.`,
      diagram: { mode: 'static', variant: 'tangent', tangent: { kind: 'pair', arc: value, unknown: 'angle' } },
      correctAnswer: angle,
      unit: '\u00B0',
      feedback: {
        correct: `Correct. The angle between the tangents is 180\u00B0 \u2212 ${value}\u00B0 = ${angle}\u00B0.`,
        incorrect: 'The angle between two tangents is 180\u00B0 minus the near arc between the contact points.',
      },
      strongHint: `Subtract the arc from 180\u00B0: 180\u00B0 \u2212 ${value}\u00B0.`,
    }
  }
  throw new Error(`unknown tangent-angle given: ${given}`)
}

// Circumscribed circle of a RIGHT triangle: the hypotenuse is a diameter, so
// circumradius = hypotenuse / 2.
// given 'hyp':    value = hypotenuse (even) -> R = hyp / 2.
// given 'radius': value = R                 -> hypotenuse = 2R.
// given 'legs':   values = [a, b]           -> hyp = sqrt(a^2+b^2) (even whole), R = hyp / 2.
function circumcircleProblem({ given, value, values }: PracticeSpec): Omit<NumericProblem, 'id'> {
  if (given === 'hyp') {
    if (typeof value !== 'number' || !isInt(value, 4, 60) || value % 2 !== 0) {
      throw new Error(`invalid circumcircle hyp value: ${value}`)
    }
    const radius = value / 2
    return {
      prompt: `A right triangle has a hypotenuse of ${value}. Find the radius of its circumscribed circle.`,
      diagram: { mode: 'static', variant: 'circumcircle', circumcircle: { kind: 'right', hypLabel: `${value}`, radiusLabel: '?' } },
      correctAnswer: radius,
      feedback: {
        correct: `Correct. The hypotenuse is a diameter, so the radius is ${value} \u00F7 2 = ${radius}.`,
        incorrect: 'In a right triangle the hypotenuse is a diameter, so the circumradius is half of it.',
      },
      strongHint: `Halve the hypotenuse: ${value} \u00F7 2.`,
    }
  }
  if (given === 'radius') {
    if (typeof value !== 'number' || !isInt(value, 2, 30)) {
      throw new Error(`invalid circumcircle radius value: ${value}`)
    }
    const hyp = value * 2
    return {
      prompt: `The circumscribed circle of a right triangle has radius ${value}. Find the hypotenuse.`,
      diagram: { mode: 'static', variant: 'circumcircle', circumcircle: { kind: 'right', hypLabel: '?', radiusLabel: `${value}` } },
      correctAnswer: hyp,
      feedback: {
        correct: `Correct. The hypotenuse is the diameter, twice the radius: 2 \u00D7 ${value} = ${hyp}.`,
        incorrect: 'The hypotenuse is a diameter, so it is twice the radius.',
      },
      strongHint: `Double the radius: 2 \u00D7 ${value}.`,
    }
  }
  if (given === 'legs') {
    if (!values || values.length !== 2 || !values.every((v) => Number.isInteger(v))) {
      throw new Error('circumcircle legs needs two integer values')
    }
    const [a, b] = values
    if (!isInt(a, 1, 100) || !isInt(b, 1, 100)) {
      throw new Error(`invalid circumcircle legs: ${values}`)
    }
    const hyp = Math.sqrt(a * a + b * b)
    if (!Number.isInteger(hyp) || hyp % 2 !== 0 || !isInt(hyp, 4, 100)) {
      throw new Error(`circumcircle legs do not give an even whole hypotenuse: ${values}`)
    }
    const radius = hyp / 2
    return {
      prompt: `A right triangle has legs ${a} and ${b}. Find the radius of its circumscribed circle.`,
      diagram: { mode: 'static', variant: 'circumcircle', circumcircle: { kind: 'right', hypLabel: '?', radiusLabel: '?' } },
      correctAnswer: radius,
      feedback: {
        correct: `Correct. The hypotenuse is \u221A(${a}\u00B2 + ${b}\u00B2) = ${hyp}, so the radius is ${radius}.`,
        incorrect: 'First find the hypotenuse with the Pythagorean theorem, then halve it.',
      },
      strongHint: `Hypotenuse = \u221A(${a * a} + ${b * b}) = ${hyp}; radius = ${hyp} \u00F7 2.`,
    }
  }
  throw new Error(`unknown circumcircle given: ${given}`)
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

const SECTOR_SPECS: PracticeSpec[] = [
  { given: 'area', values: [6, 90] },
  { given: 'arc', values: [6, 120] },
  { given: 'area', values: [6, 120] },
  { given: 'arc', values: [6, 90] },
  { given: 'area', values: [4, 90] },
  { given: 'arc', values: [10, 180] },
  { given: 'area', values: [6, 60] },
  { given: 'arc', values: [12, 150] },
  { given: 'area', values: [6, 150] },
]

const ANGLES_SPECS: PracticeSpec[] = [
  { given: 'corresponding', value: 65 },
  { given: 'alternate', value: 50 },
  { given: 'cointerior', value: 110 },
  { given: 'vertical', value: 125 },
  { given: 'supplementary', value: 72 },
  { given: 'vertical-corresponding', value: 58 },
  { given: 'alternate', value: 84 },
  { given: 'cointerior', value: 128 },
  { given: 'corresponding', value: 47 },
]

const TRIANGLE_ANGLE_SPECS: PracticeSpec[] = [
  { given: 'missing', values: [40, 75] },
  { given: 'missing', values: [90, 35] },
  { given: 'exterior-sum', values: [55, 60] },
  { given: 'exterior-remote', values: [120, 70] },
  { given: 'missing', values: [50, 50] },
  { given: 'exterior-sum', values: [38, 47] },
  { given: 'exterior-remote', values: [140, 95] },
  { given: 'missing', values: [72, 64] },
  { given: 'exterior-sum', values: [66, 59] },
]

const PYTHAGOREAN_SPECS: PracticeSpec[] = [
  { given: 'leg', values: [3, 4] },
  { given: 'leg', values: [6, 8] },
  { given: 'hyp', values: [5, 13] },
  { given: 'hyp', values: [8, 17] },
  { given: 'leg', values: [9, 12] },
  { given: 'hyp', values: [7, 25] },
  { given: 'leg', values: [5, 12] },
  { given: 'hyp', values: [15, 17] },
  { given: 'leg', values: [8, 15] },
]

const SPECIAL_TRIANGLE_SPECS: PracticeSpec[] = [
  { given: '45-leg-hyp', value: 5 },
  { given: '30-short-hyp', value: 6 },
  { given: '30-short-long', value: 4 },
  { given: '30-hyp-short', value: 14 },
  { given: '30-hyp-long', value: 10 },
  { given: '45-leg-hyp', value: 3 },
  { given: '30-short-long', value: 7 },
  { given: '30-hyp-short', value: 20 },
  { given: '45-leg-hyp', value: 8 },
]

const SIMILAR_TRIANGLE_SPECS: PracticeSpec[] = [
  { given: 'side', values: [6, 2] },
  { given: 'side', values: [5, 3] },
  { given: 'area-ratio', value: 2 },
  { given: 'area-ratio', value: 3 },
  { given: 'area', values: [6, 2] },
  { given: 'side', values: [7, 4] },
  { given: 'area-ratio', value: 4 },
  { given: 'area', values: [5, 3] },
  { given: 'side', values: [9, 2] },
]

const POLYGON_ANGLE_SPECS: PracticeSpec[] = [
  { given: 'sum', value: 5 },
  { given: 'regular', value: 6 },
  { given: 'exterior', value: 8 },
  { given: 'sum', value: 7 },
  { given: 'regular', value: 8 },
  { given: 'sides-from-sum', value: 720 },
  { given: 'sum', value: 10 },
  { given: 'regular', value: 12 },
  { given: 'exterior', value: 6 },
]

const POLYGON_AREA_SPECS: PracticeSpec[] = [
  { given: 'triangle', values: [8, 5] },
  { given: 'parallelogram', values: [7, 6] },
  { given: 'trapezoid', values: [9, 5, 4] },
  { given: 'kite', values: [10, 12] },
  { given: 'equilateral', value: 6 },
  { given: 'triangle', values: [9, 4] },
  { given: 'parallelogram', values: [5, 8] },
  { given: 'trapezoid', values: [10, 6, 5] },
  { given: 'kite', values: [7, 6] },
]

const CENTRAL_ANGLE_SPECS: PracticeSpec[] = [
  { given: 'central', value: 40 },
  { given: 'arc', value: 75 },
  { given: 'remaining', value: 130 },
  { given: 'central', value: 110 },
  { given: 'arc', value: 95 },
  { given: 'remaining', value: 60 },
  { given: 'central', value: 150 },
  { given: 'arc', value: 50 },
  { given: 'remaining', value: 160 },
]

const CHORD_ANGLE_SPECS: PracticeSpec[] = [
  { given: 'angle', values: [70, 90] },
  { given: 'angle', values: [40, 100] },
  { given: 'angle', values: [88, 96] },
  { given: 'arc', values: [80, 70] },
  { given: 'angle', values: [54, 66] },
  { given: 'arc', values: [75, 60] },
  { given: 'angle', values: [110, 30] },
  { given: 'arc', values: [90, 110] },
  { given: 'angle', values: [120, 60] },
]

const SECANT_ANGLE_SPECS: PracticeSpec[] = [
  { given: 'angle', values: [120, 40] },
  { given: 'angle', values: [100, 30] },
  { given: 'near', values: [25, 110] },
  { given: 'angle', values: [160, 70] },
  { given: 'far', values: [30, 60] },
  { given: 'angle', values: [140, 60] },
  { given: 'near', values: [35, 150] },
  { given: 'angle', values: [110, 50] },
  { given: 'far', values: [20, 80] },
]

const TANGENT_ANGLE_SPECS: PracticeSpec[] = [
  { given: 'chord-arc', value: 120 },
  { given: 'chord-angle', value: 35 },
  { given: 'pair-arc', value: 100 },
  { given: 'chord-arc', value: 86 },
  { given: 'pair-arc', value: 80 },
  { given: 'chord-angle', value: 52 },
  { given: 'chord-arc', value: 140 },
  { given: 'pair-arc', value: 110 },
  { given: 'chord-angle', value: 28 },
]

const CIRCUMCIRCLE_SPECS: PracticeSpec[] = [
  { given: 'hyp', value: 10 },
  { given: 'legs', values: [10, 24] },
  { given: 'radius', value: 9 },
  { given: 'hyp', value: 14 },
  { given: 'legs', values: [6, 8] },
  { given: 'radius', value: 13 },
  { given: 'hyp', value: 26 },
  { given: 'legs', values: [18, 24] },
  { given: 'radius', value: 5 },
]

function poolFor(topic: PracticeTopic): PracticeSpec[] {
  if (topic === 'cyclic') {
    return CYCLIC_SPECS
  }
  if (topic === 'power-of-point') {
    return POWER_SPECS
  }
  if (topic === 'sector') {
    return SECTOR_SPECS
  }
  if (topic === 'angles') {
    return ANGLES_SPECS
  }
  if (topic === 'triangle-angle') {
    return TRIANGLE_ANGLE_SPECS
  }
  if (topic === 'pythagorean') {
    return PYTHAGOREAN_SPECS
  }
  if (topic === 'special-triangle') {
    return SPECIAL_TRIANGLE_SPECS
  }
  if (topic === 'similar-triangle') {
    return SIMILAR_TRIANGLE_SPECS
  }
  if (topic === 'polygon-angle') {
    return POLYGON_ANGLE_SPECS
  }
  if (topic === 'polygon-area') {
    return POLYGON_AREA_SPECS
  }
  if (topic === 'central-angle') {
    return CENTRAL_ANGLE_SPECS
  }
  if (topic === 'chord-angle') {
    return CHORD_ANGLE_SPECS
  }
  if (topic === 'secant-angle') {
    return SECANT_ANGLE_SPECS
  }
  if (topic === 'tangent-angle') {
    return TANGENT_ANGLE_SPECS
  }
  if (topic === 'circumcircle') {
    return CIRCUMCIRCLE_SPECS
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
