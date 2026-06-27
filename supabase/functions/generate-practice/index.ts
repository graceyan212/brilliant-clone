// Supabase Edge Function: generate-practice
//
// Server-side proxy for AI-generated math practice. Its ONLY job is to ask an
// LLM for problem "specs" - the *setup* of a problem, never the answer.
//
// IMPORTANT - no-answers / no-hints guarantee:
//   This function must NEVER return answers, feedback, hints, or explanations.
//   The client computes the answer itself (e.g. inscribed = central / 2, or
//   PD = PA * PB / PC). We only return the setup. Every spec coming back from
//   the model is validated against strict per-topic rules and anything
//   non-conforming is dropped. Any `context` phrase is scrubbed so it can't
//   smuggle a number (and therefore can't leak the answer).
//
// Why this lives on the server: the LLM API key is secret. Keeping the call
// here means the key never ships to the browser.

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const MIN_COUNT = 1
const MAX_COUNT = 8
const DEFAULT_COUNT = 4
const MAX_CONTEXT_LENGTH = 80

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Topic =
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

// A spec is the problem setup only. Angle topics use { given, value }; the
// power-of-a-point topic uses { values: [PA, PB, PC] }.
interface Spec {
  given?: string
  value?: number
  values?: number[]
  context?: string
}

function isTopic(value: unknown): value is Topic {
  return (
    value === 'inscribed' ||
    value === 'cyclic' ||
    value === 'power-of-point' ||
    value === 'sector' ||
    value === 'angles' ||
    value === 'triangle-angle' ||
    value === 'pythagorean' ||
    value === 'special-triangle' ||
    value === 'similar-triangle' ||
    value === 'polygon-angle' ||
    value === 'polygon-area' ||
    value === 'central-angle' ||
    value === 'chord-angle' ||
    value === 'secant-angle' ||
    value === 'tangent-angle' ||
    value === 'circumcircle'
  )
}

function clampCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_COUNT
  const floored = Math.floor(n)
  if (floored < MIN_COUNT) return MIN_COUNT
  if (floored > MAX_COUNT) return MAX_COUNT
  return floored
}

// Keep a context phrase only if it is short and number-free (so it can't leak a value).
function cleanContext(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > MAX_CONTEXT_LENGTH || /\d/.test(trimmed)) {
    return undefined
  }
  return trimmed
}

// --- Angle topics (inscribed, cyclic): { given, value } -------------------

interface GivenRule {
  min: number
  max: number
  requireEven?: boolean
}

interface AngleConfig {
  explanation: string
  givens: Record<string, GivenRule>
  contextIdeas: string[]
}

const ANGLE_TOPICS: Record<'inscribed' | 'cyclic', AngleConfig> = {
  inscribed: {
    explanation:
      'Inscribed angle theorem: an inscribed angle is half of the central angle that subtends the same arc. ' +
      '"given: central" means the central angle is provided; "given: inscribed" means the inscribed angle is provided.',
    givens: {
      central: { min: 60, max: 170, requireEven: true },
      inscribed: { min: 20, max: 85 },
    },
    contextIdeas: ['a Ferris wheel', 'a clock face', 'a circular stained-glass window'],
  },
  cyclic: {
    explanation:
      'Cyclic quadrilateral inscribed in a circle: opposite angles are supplementary (sum to 180 degrees). ' +
      '"given: A" means angle A is provided; "given: C" means its opposite angle C is provided.',
    givens: {
      A: { min: 40, max: 140 },
      C: { min: 40, max: 140 },
    },
    contextIdeas: ['a kite frame', 'a quadrilateral park', 'a four-sided tile'],
  },
}

function validateAngleSpec(raw: unknown, config: AngleConfig): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string') return null
  const rule = config.givens[given]
  if (!rule) return null

  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < rule.min || value > rule.max) return null
  if (rule.requireEven && value % 2 !== 0) return null

  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildAngleMessages(topic: 'inscribed' | 'cyclic', config: AngleConfig, count: number) {
  const allowedGiven = Object.keys(config.givens)
    .map((g) => `"${g}"`)
    .join(' or ')
  const rules = Object.entries(config.givens)
    .map(([key, rule]) => {
      const kind = rule.requireEven ? 'an EVEN integer' : 'an integer'
      return `  - given "${key}": value is ${kind} between ${rule.min} and ${rule.max} (inclusive)`
    })
    .join('\n')

  const user = [
    `Topic: ${topic}.`,
    config.explanation,
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "context": <optional string> } ] }',
    '',
    'Rules:',
    `- "given" must be ${allowedGiven}.`,
    '- "value" must satisfy:',
    rules,
    '- Vary BOTH which quantity is given AND the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${config.contextIdeas.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include answers, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Power of a point: { values: [PA, PB, PC] } ---------------------------

const POWER_CONTEXT_IDEAS = ['a circular pond', 'a Ferris wheel', 'a round window']

function validatePowerSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 3) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v) && v >= 2 && v <= 20)) {
    return null
  }
  const [pa, pb, pc] = values as number[]
  // PD = PA * PB / PC must be a whole number in a sane range.
  const product = pa * pb
  if (product % pc !== 0) return null
  const pd = product / pc
  if (!Number.isInteger(pd) || pd < 2 || pd > 30) return null

  const spec: Spec = { values: [pa, pb, pc] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildPowerMessages(count: number) {
  const user = [
    'Topic: intersecting chords (power of a point).',
    'Two chords of a circle cross at an interior point P. With segments PA, PB on one chord and PC, PD on the other, PA * PB = PC * PD.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "values": [PA, PB, PC], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- "values" is exactly [PA, PB, PC], three integers each between 2 and 20.',
    '- PA * PB MUST be divisible by PC, and PD = PA * PB / PC must be a whole number between 2 and 30.',
    '- Vary the three numbers across specs; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${POWER_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include PD, answers, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Arcs & sectors: { given: 'arc' | 'area', values: [radius, angle] } ---

const SECTOR_CONTEXT_IDEAS = ['a pizza slice', 'a clock face', 'a hand fan']

function validateSectorSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (given !== 'arc' && given !== 'area') return null

  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 2) return null
  const [r, angle] = values as number[]
  if (typeof r !== 'number' || !Number.isInteger(r) || r < 1 || r > 20) return null
  if (typeof angle !== 'number' || !Number.isInteger(angle) || angle % 30 !== 0 || angle < 30 || angle > 330) {
    return null
  }
  // The answer is the whole-number coefficient of pi.
  const coeff = given === 'arc' ? (angle * 2 * r) / 360 : (angle * r * r) / 360
  if (!Number.isInteger(coeff) || coeff < 1) return null

  const spec: Spec = { given, values: [r, angle] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildSectorMessages(count: number) {
  const user = [
    'Topic: arcs and sectors of a circle.',
    'A sector with central angle theta in a circle of radius r is the fraction theta/360 of the circle. Its arc length is (theta/360)*2*pi*r and its area is (theta/360)*pi*r^2.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": "arc" | "area", "values": [radius, angle], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- "given" is "arc" (ask for arc length) or "area" (ask for sector area).',
    '- "values" is exactly [radius, angle]: radius an integer 1..20, angle a multiple of 30 between 30 and 330.',
    '- Choose radius and angle so the answer is a whole number times pi (arc: angle*2*radius/360; area: angle*radius*radius/360).',
    '- Vary "given", the radius, and the angle across specs; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${SECTOR_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Angle chasing (parallel lines + transversal): { given, value } -------

const ANGLES_GIVENS = [
  'corresponding',
  'alternate',
  'vertical',
  'vertical-corresponding',
  'supplementary',
  'cointerior',
]
const ANGLES_CONTEXT_IDEAS = ['a railway crossing', 'a tiled floor', 'a folded ribbon']

function validateAnglesSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string' || !ANGLES_GIVENS.includes(given)) return null

  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 40 || value > 140) return null

  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildAnglesMessages(count: number) {
  const user = [
    'Topic: angle chasing with parallel lines and a transversal.',
    'Two parallel lines are cut by a transversal (or two lines simply cross). Relationships: vertically opposite angles are equal; angles on a straight line are supplementary (sum to 180); corresponding angles are equal; alternate interior angles are equal; co-interior (same-side interior) angles are supplementary.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "context": <optional string> } ] }',
    '',
    'Rules:',
    `- "given" must be one of ${ANGLES_GIVENS.map((g) => `"${g}"`).join(', ')}.`,
    '- "value" is an integer between 40 and 140 (the single given angle).',
    '- Vary BOTH the relationship and the number; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${ANGLES_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include answers, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Angles in a triangle: { given, values: [a, b] } ----------------------

const TRIANGLE_CONTEXT_IDEAS = ['a roof truss', 'a sail', 'a triangular plot']

function validateTriangleAngleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 2) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v))) return null
  const [first, second] = values as number[]

  if (given === 'missing') {
    if (first < 20 || first > 140 || second < 20 || second > 140) return null
    if (first + second < 40 || first + second > 160) return null
  } else if (given === 'exterior-sum') {
    if (first < 20 || first > 130 || second < 20 || second > 130) return null
    if (first + second < 40 || first + second > 160) return null
  } else if (given === 'exterior-remote') {
    if (first < 40 || first > 160) return null
    if (second < 20 || second > first - 20) return null
  } else {
    return null
  }

  const spec: Spec = { given, values: [first, second] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildTriangleAngleMessages(count: number) {
  const user = [
    'Topic: angles in a triangle.',
    'The three interior angles of a triangle sum to 180 degrees. An exterior angle equals the sum of the two remote (non-adjacent) interior angles.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": "missing" | "exterior-sum" | "exterior-remote", "values": [number, number], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "missing": values are two interior angles [a, b], each 20..140, with a+b between 40 and 160.',
    '- given "exterior-sum": values are the two remote interior angles [a, b], each 20..130, with a+b between 40 and 160.',
    '- given "exterior-remote": values are [exteriorAngle, oneRemoteInterior]; the exterior is 40..160 and the remote is between 20 and exterior-20.',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${TRIANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Pythagorean theorem: { given: 'leg' | 'hyp', values: [..] } ----------

const PYTHAGOREAN_CONTEXT_IDEAS = ['a ladder against a wall', 'a ramp', 'a kite string']

function isPerfectSquare(n: number): boolean {
  if (n < 0) return false
  const root = Math.round(Math.sqrt(n))
  return root * root === n
}

function validatePythagoreanSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 2) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v))) return null
  const [first, second] = values as number[]

  if (given === 'leg') {
    if (first < 1 || first > 100 || second < 1 || second > 100) return null
    const sum = first * first + second * second
    if (!isPerfectSquare(sum)) return null
    const hyp = Math.sqrt(sum)
    if (hyp < 1 || hyp > 200) return null
  } else if (given === 'hyp') {
    if (first < 1 || first > 100 || second < 2 || second > 200 || second <= first) return null
    const diff = second * second - first * first
    if (!isPerfectSquare(diff)) return null
    const other = Math.sqrt(diff)
    if (other < 1 || other > 200) return null
  } else {
    return null
  }

  const spec: Spec = { given, values: [first, second] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildPythagoreanMessages(count: number) {
  const user = [
    'Topic: the Pythagorean theorem in a right triangle.',
    'For legs a, b and hypotenuse c: a*a + b*b = c*c. Use only Pythagorean triples so every side is a whole number (e.g. 3-4-5, 5-12-13, 8-15-17, 6-8-10, 9-12-15, 7-24-25).',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": "leg" | "hyp", "values": [number, number], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "leg": values are the two legs [a, b] (ask for the hypotenuse). a*a + b*b must be a perfect square; each leg 1..100; hypotenuse 1..200.',
    '- given "hyp": values are [one leg, hypotenuse] with hypotenuse > leg (ask for the other leg). hypotenuse*hypotenuse - leg*leg must be a perfect square; leg 1..100; hypotenuse 2..200.',
    '- Use real Pythagorean triples only; vary which side is unknown and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${PYTHAGOREAN_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Special right triangles: { given, value } ----------------------------

const SPECIAL_TRIANGLE_GIVENS = [
  '45-leg-hyp',
  '30-short-hyp',
  '30-short-long',
  '30-hyp-short',
  '30-hyp-long',
]
const SPECIAL_TRIANGLE_CONTEXT_IDEAS = ['a set square', 'a ramp', 'a roof gable']

function validateSpecialTriangleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string' || !SPECIAL_TRIANGLE_GIVENS.includes(given)) return null

  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null

  if (given === '45-leg-hyp' || given === '30-short-hyp' || given === '30-short-long') {
    if (value < 1 || value > 30) return null
  } else {
    // 30-hyp-short, 30-hyp-long: the hypotenuse must be an even integer 2..60.
    if (value < 2 || value > 60 || value % 2 !== 0) return null
  }

  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildSpecialTriangleMessages(count: number) {
  const user = [
    'Topic: special right triangles (45-45-90 and 30-60-90).',
    'A 45-45-90 triangle has sides in ratio 1 : 1 : sqrt(2). A 30-60-90 triangle has sides in ratio 1 : sqrt(3) : 2 (short leg : long leg : hypotenuse).',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "45-leg-hyp": value is the leg length, an integer 1..30 (ask for the hypotenuse, which is value*sqrt(2)).',
    '- given "30-short-hyp": value is the short leg, an integer 1..30 (ask for the hypotenuse).',
    '- given "30-short-long": value is the short leg, an integer 1..30 (ask for the long leg, value*sqrt(3)).',
    '- given "30-hyp-short": value is the hypotenuse, an EVEN integer 2..60 (ask for the short leg).',
    '- given "30-hyp-long": value is the hypotenuse, an EVEN integer 2..60 (ask for the long leg).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${SPECIAL_TRIANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Similar triangles & scaling: { given, value | values } ---------------

const SIMILAR_TRIANGLE_GIVENS = ['side', 'area-ratio', 'area']
const SIMILAR_TRIANGLE_CONTEXT_IDEAS = ['a scale drawing', 'a photo enlargement', 'two nested flags']

function validateSimilarTriangleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string' || !SIMILAR_TRIANGLE_GIVENS.includes(given)) return null

  if (given === 'area-ratio') {
    const value = candidate.value
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 2 || value > 4) return null
    const spec: Spec = { given, value }
    const context = cleanContext(candidate.context)
    if (context) spec.context = context
    return spec
  }

  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 2) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v))) return null
  const [first, k] = values as number[]
  if (k < 2 || k > 4) return null

  if (given === 'side') {
    if (first < 1 || first > 20) return null
    const bigger = first * k
    if (bigger < 2 || bigger > 80) return null
  } else {
    // area: larger = smallerArea * k * k
    if (first < 1 || first > 20) return null
    const bigger = first * k * k
    if (bigger < 4 || bigger > 320) return null
  }

  const spec: Spec = { given, values: [first, k] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildSimilarTriangleMessages(count: number) {
  const user = [
    'Topic: similar triangles and scaling.',
    'Similar triangles have equal angles; corresponding sides share one scale factor k, and areas scale by k*k.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "values": [number, number], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "side": values are [smallerSide, k] (ask for the corresponding larger side). smallerSide 1..20, k 2..4, and smallerSide*k must be <= 80.',
    '- given "area-ratio": use the "value" field (an integer k, 2..4) and ask for the ratio of areas, which is k*k.',
    '- given "area": values are [smallerArea, k] (ask for the larger area = smallerArea*k*k). smallerArea 1..20, k 2..4, product <= 320.',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${SIMILAR_TRIANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Polygon angles: { given, value } -------------------------------------

const POLYGON_ANGLE_GIVENS = ['sum', 'regular', 'exterior', 'sides-from-sum']
const POLYGON_ANGLE_CONTEXT_IDEAS = ['a stop sign', 'a floor tile', 'a gazebo roof']

function validatePolygonAngleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string' || !POLYGON_ANGLE_GIVENS.includes(given)) return null

  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null

  if (given === 'sum') {
    if (value < 3 || value > 20) return null
  } else if (given === 'regular' || given === 'exterior') {
    if (value < 3 || value > 20 || 360 % value !== 0) return null
  } else {
    // sides-from-sum: value is the interior-angle sum; n = value/180 + 2 must be 3..20.
    if (value % 180 !== 0) return null
    const n = value / 180 + 2
    if (n < 3 || n > 20) return null
  }

  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildPolygonAngleMessages(count: number) {
  const user = [
    'Topic: polygon angles.',
    'The interior angles of an n-sided polygon sum to (n - 2) * 180 degrees. In a regular n-gon each interior angle is (n - 2) * 180 / n, and each exterior angle is 360 / n (the exterior angles always total 360).',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "sum": value is the number of sides n, an integer 3..20 (ask for the interior-angle sum).',
    '- given "regular": value is n, an integer 3..20 that divides 360 (ask for each interior angle of a regular n-gon).',
    '- given "exterior": value is n, an integer 3..20 that divides 360 (ask for each exterior angle of a regular n-gon).',
    '- given "sides-from-sum": value is an interior-angle sum, a multiple of 180 with value/180 + 2 between 3 and 20 (ask for the number of sides).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${POLYGON_ANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Areas of polygons: { given, value | values } -------------------------

const POLYGON_AREA_GIVENS = ['triangle', 'parallelogram', 'trapezoid', 'kite', 'equilateral']
const POLYGON_AREA_CONTEXT_IDEAS = ['a garden plot', 'a sail', 'a paper kite']

function validatePolygonAreaSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string' || !POLYGON_AREA_GIVENS.includes(given)) return null

  if (given === 'equilateral') {
    const value = candidate.value
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 2 || value > 20 || value % 2 !== 0) {
      return null
    }
    const spec: Spec = { given, value }
    const context = cleanContext(candidate.context)
    if (context) spec.context = context
    return spec
  }

  const values = candidate.values
  if (!Array.isArray(values)) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 40)) return null

  if (given === 'triangle' || given === 'kite') {
    if (values.length !== 2) return null
    const [a, b] = values as number[]
    if ((a * b) % 2 !== 0) return null
  } else if (given === 'parallelogram') {
    if (values.length !== 2) return null
  } else {
    // trapezoid: [b1, b2, h] with b2 <= b1 and (b1+b2)*h even.
    if (values.length !== 3) return null
    const [b1, b2, h] = values as number[]
    if (b2 > b1 || ((b1 + b2) * h) % 2 !== 0) return null
  }

  const spec: Spec = { given, values: values as number[] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildPolygonAreaMessages(count: number) {
  const user = [
    'Topic: areas of polygons.',
    'Triangle area = 1/2 * base * height. Parallelogram = base * height. Trapezoid = 1/2 * (b1 + b2) * height. Kite = 1/2 * d1 * d2 (diagonals). Equilateral triangle of side s = (sqrt(3)/4) * s^2.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "values": [numbers], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "triangle": values are [base, height], integers 1..40, with base*height EVEN (whole-number area).',
    '- given "parallelogram": values are [base, height], integers 1..40.',
    '- given "trapezoid": values are [b1, b2, height], integers 1..40, with b2 <= b1 and (b1+b2)*height EVEN.',
    '- given "kite": values are [d1, d2], integers 1..40, with d1*d2 EVEN.',
    '- given "equilateral": use the "value" field, an EVEN integer 2..20 (the side); ask for the area in terms of sqrt(3).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${POLYGON_AREA_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Central angles & arc measure: { given, value } -----------------------

const CENTRAL_ANGLE_GIVENS = ['central', 'arc', 'remaining']
const CENTRAL_ANGLE_CONTEXT_IDEAS = ['a clock face', 'a pizza', 'a Ferris wheel']

function validateCentralAngleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  const given = candidate.given
  if (typeof given !== 'string' || !CENTRAL_ANGLE_GIVENS.includes(given)) return null

  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (given === 'remaining') {
    if (value < 30 || value > 170) return null
  } else {
    if (value < 20 || value > 170) return null
  }

  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildCentralAngleMessages(count: number) {
  const user = [
    'Topic: central angles and arc measure.',
    'An arc of a circle has the same measure as the central angle that subtends it. The whole circle is 360 degrees, so a minor arc and the major arc the other way around add to 360.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "central": value is the central angle, an integer 20..170 (ask for the arc, which equals it).',
    '- given "arc": value is the arc measure, an integer 20..170 (ask for the central angle, which equals it).',
    '- given "remaining": value is a minor arc, an integer 30..170 (ask for the major arc the other way around, 360 minus value).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, ` +
      `e.g. ${CENTRAL_ANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')

  return systemUser(user)
}

// --- Intersecting-chords angle: { given: 'angle'|'arc', values } -----------

const CHORD_ANGLE_CONTEXT_IDEAS = ['a clock face', 'a Ferris wheel', 'a round window']

function validateChordAngleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>
  const given = candidate.given
  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 2) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v))) return null
  const [first, second] = values as number[]

  if (given === 'angle') {
    if (first < 20 || first > 170 || second < 20 || second > 170) return null
    if ((first + second) % 2 !== 0 || first + second < 40 || first + second > 300) return null
  } else if (given === 'arc') {
    const other = 2 * first - second
    if (first < 20 || first > 150 || second < 20 || second > 170) return null
    if (other < 20 || other > 170 || second + other < 40 || second + other > 300) return null
  } else {
    return null
  }

  const spec: Spec = { given, values: [first, second] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildChordAngleMessages(count: number) {
  const user = [
    'Topic: the angle formed by two chords crossing INSIDE a circle.',
    'When two chords cross inside a circle, the angle equals half the SUM of the two intercepted arcs: angle = (arc1 + arc2) / 2.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": "angle" | "arc", "values": [number, number], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "angle": values are the two intercepted arcs [arc1, arc2], each 20..170, their sum EVEN and between 40 and 300 (ask for the angle).',
    '- given "arc": values are [angle, oneArc]; the angle is 20..150 and oneArc is 20..170, with (2*angle - oneArc) between 20 and 170 (ask for the other arc).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, e.g. ${CHORD_ANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')
  return systemUser(user)
}

// --- Secant angle: { given: 'angle'|'near'|'far', values } -----------------

const SECANT_ANGLE_CONTEXT_IDEAS = ['a lighthouse beam', 'a camera viewfinder', 'a searchlight']

function validateSecantAngleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>
  const given = candidate.given
  const values = candidate.values
  if (!Array.isArray(values) || values.length !== 2) return null
  if (!values.every((v) => typeof v === 'number' && Number.isInteger(v))) return null
  const [first, second] = values as number[]

  if (given === 'angle') {
    const far = first
    const near = second
    if (far < 60 || far > 200 || near < 20 || near > far - 20) return null
    if ((far - near) % 2 !== 0 || far + near < 40 || far + near > 320) return null
  } else if (given === 'near') {
    const angle = first
    const far = second
    const near = far - 2 * angle
    if (angle < 10 || angle > 80 || far < 60 || far > 200) return null
    if (near < 20 || near > far - 20 || far + near < 40 || far + near > 320) return null
  } else if (given === 'far') {
    const angle = first
    const near = second
    const far = near + 2 * angle
    if (angle < 10 || angle > 80 || near < 20 || near > 160) return null
    if (far < 60 || far > 200 || far + near < 40 || far + near > 320) return null
  } else {
    return null
  }

  const spec: Spec = { given, values: [first, second] }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildSecantAngleMessages(count: number) {
  const user = [
    'Topic: the angle formed by two secants meeting OUTSIDE a circle.',
    'From an external point, the angle equals half the DIFFERENCE of the intercepted arcs: angle = (farArc - nearArc) / 2.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": "angle" | "near" | "far", "values": [number, number], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "angle": values are [farArc, nearArc] with far 60..200, near 20..(far-20), (far-near) EVEN, far+near <= 320 (ask for the angle).',
    '- given "near": values are [angle, farArc]; near = far - 2*angle must be 20..(far-20) (ask for the near arc).',
    '- given "far": values are [angle, nearArc]; far = near + 2*angle must be 60..200 (ask for the far arc).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, e.g. ${SECANT_ANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')
  return systemUser(user)
}

// --- Tangent angles: { given, value } --------------------------------------

const TANGENT_ANGLE_GIVENS = ['chord-arc', 'chord-angle', 'pair-arc']
const TANGENT_ANGLE_CONTEXT_IDEAS = ['a pulley belt', 'a road sign', 'a bike wheel']

function validateTangentAngleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>
  const given = candidate.given
  if (typeof given !== 'string' || !TANGENT_ANGLE_GIVENS.includes(given)) return null
  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null

  if (given === 'chord-arc') {
    if (value < 20 || value > 170 || value % 2 !== 0) return null
  } else if (given === 'chord-angle') {
    if (value < 10 || value > 85) return null
  } else {
    // pair-arc: capped at 120 so the external point fits the figure.
    if (value < 60 || value > 120 || value % 2 !== 0) return null
  }

  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildTangentAngleMessages(count: number) {
  const user = [
    'Topic: tangent angles on a circle.',
    'Tangent-chord angle = half the intercepted arc. Angle between two tangents from an external point = 180 - (near arc between the contact points).',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "chord-arc": value is the intercepted arc, an EVEN integer 20..170 (ask for the tangent-chord angle).',
    '- given "chord-angle": value is the tangent-chord angle, an integer 10..85 (ask for the intercepted arc).',
    '- given "pair-arc": value is the near arc between two tangents\u2019 contact points, an EVEN integer 60..120 (ask for the angle between the tangents).',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, e.g. ${TANGENT_ANGLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')
  return systemUser(user)
}

// --- Circumscribed circle (right triangle): { given, value | values } ------

const CIRCUMCIRCLE_GIVENS = ['hyp', 'radius', 'legs']
const CIRCUMCIRCLE_CONTEXT_IDEAS = ['a triangular sail', 'a set square', 'a roof truss']

function validateCircumcircleSpec(raw: unknown): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>
  const given = candidate.given
  if (typeof given !== 'string' || !CIRCUMCIRCLE_GIVENS.includes(given)) return null

  if (given === 'legs') {
    const values = candidate.values
    if (!Array.isArray(values) || values.length !== 2) return null
    if (!values.every((v) => typeof v === 'number' && Number.isInteger(v))) return null
    const [a, b] = values as number[]
    if (a < 1 || a > 100 || b < 1 || b > 100) return null
    const hyp = Math.sqrt(a * a + b * b)
    if (!Number.isInteger(hyp) || hyp % 2 !== 0 || hyp < 4 || hyp > 100) return null
    const spec: Spec = { given, values: [a, b] }
    const context = cleanContext(candidate.context)
    if (context) spec.context = context
    return spec
  }

  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (given === 'hyp') {
    if (value < 4 || value > 60 || value % 2 !== 0) return null
  } else {
    // radius
    if (value < 2 || value > 30) return null
  }
  const spec: Spec = { given, value }
  const context = cleanContext(candidate.context)
  if (context) spec.context = context
  return spec
}

function buildCircumcircleMessages(count: number) {
  const user = [
    'Topic: the circumscribed circle of a RIGHT triangle.',
    'In a right triangle the hypotenuse is a diameter of the circumscribed circle, so the circumradius = hypotenuse / 2.',
    '',
    `Produce ${count} DIVERSE problem specs as strict JSON in this exact shape:`,
    '{ "specs": [ { "given": <string>, "value": <integer>, "values": [number, number], "context": <optional string> } ] }',
    '',
    'Rules:',
    '- given "hyp": use the "value" field, an EVEN integer 4..60 (the hypotenuse); ask for the circumradius.',
    '- given "radius": use the "value" field, an integer 2..30; ask for the hypotenuse.',
    '- given "legs": use the "values" field [a, b], each 1..100, such that sqrt(a*a+b*b) is an EVEN whole number 4..100; ask for the circumradius.',
    '- Vary the "given" kind and the numbers; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} chars) neutral real-world setup, e.g. ${CIRCUMCIRCLE_CONTEXT_IDEAS.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO digits and must NOT reveal or hint at any answer.',
    '- Do NOT include the answer, hints, explanations, units, or extra fields. Return JSON only.',
  ].join('\n')
  return systemUser(user)
}

function systemUser(user: string) {
  const system =
    'You generate setups for geometry practice problems. ' +
    'You output ONLY strict JSON and nothing else. ' +
    'You NEVER include answers, solutions, results, hints, explanations, or any computed/derived number. ' +
    'You only state the given quantities.'
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// --- LLM call + parsing ----------------------------------------------------

async function callOpenAI(apiKey: string, messages: unknown): Promise<string> {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      response_format: { type: 'json_object' },
      temperature: 0.9,
      max_tokens: 800,
    }),
  })

  if (!res.ok) {
    throw new Error(`OpenAI request failed: ${res.status}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string') {
    throw new Error('OpenAI response missing content')
  }
  return content
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  if (trimmed.startsWith('```')) {
    return trimmed
      .replace(/^```[a-zA-Z]*\s*/, '')
      .replace(/\s*```$/, '')
      .trim()
  }
  return trimmed
}

function parseSpecsPayload(content: string): unknown[] {
  let cleaned = stripCodeFences(content)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return []
    cleaned = cleaned.slice(start, end + 1)
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return []
    }
  }

  const specs = (parsed as { specs?: unknown })?.specs
  return Array.isArray(specs) ? specs : []
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object') {
      body = parsed as Record<string, unknown>
    }
  } catch {
    body = {}
  }

  const topic = body.topic
  if (!isTopic(topic)) {
    return json({ error: 'Invalid topic' }, 400)
  }
  const count = clampCount(body.count)

  // Recoverable cases below return 200 with an empty list so the client falls
  // back to its built-in pool. Never 500 here.
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json({ specs: [] }, 200)
  }

  try {
    let messages: unknown
    if (topic === 'power-of-point') {
      messages = buildPowerMessages(count)
    } else if (topic === 'sector') {
      messages = buildSectorMessages(count)
    } else if (topic === 'angles') {
      messages = buildAnglesMessages(count)
    } else if (topic === 'triangle-angle') {
      messages = buildTriangleAngleMessages(count)
    } else if (topic === 'pythagorean') {
      messages = buildPythagoreanMessages(count)
    } else if (topic === 'special-triangle') {
      messages = buildSpecialTriangleMessages(count)
    } else if (topic === 'similar-triangle') {
      messages = buildSimilarTriangleMessages(count)
    } else if (topic === 'polygon-angle') {
      messages = buildPolygonAngleMessages(count)
    } else if (topic === 'polygon-area') {
      messages = buildPolygonAreaMessages(count)
    } else if (topic === 'central-angle') {
      messages = buildCentralAngleMessages(count)
    } else if (topic === 'chord-angle') {
      messages = buildChordAngleMessages(count)
    } else if (topic === 'secant-angle') {
      messages = buildSecantAngleMessages(count)
    } else if (topic === 'tangent-angle') {
      messages = buildTangentAngleMessages(count)
    } else if (topic === 'circumcircle') {
      messages = buildCircumcircleMessages(count)
    } else {
      messages = buildAngleMessages(topic, ANGLE_TOPICS[topic], count)
    }

    const content = await callOpenAI(apiKey, messages)
    const rawSpecs = parseSpecsPayload(content)

    const specs: Spec[] = []
    for (const raw of rawSpecs) {
      let valid: Spec | null
      if (topic === 'power-of-point') {
        valid = validatePowerSpec(raw)
      } else if (topic === 'sector') {
        valid = validateSectorSpec(raw)
      } else if (topic === 'angles') {
        valid = validateAnglesSpec(raw)
      } else if (topic === 'triangle-angle') {
        valid = validateTriangleAngleSpec(raw)
      } else if (topic === 'pythagorean') {
        valid = validatePythagoreanSpec(raw)
      } else if (topic === 'special-triangle') {
        valid = validateSpecialTriangleSpec(raw)
      } else if (topic === 'similar-triangle') {
        valid = validateSimilarTriangleSpec(raw)
      } else if (topic === 'polygon-angle') {
        valid = validatePolygonAngleSpec(raw)
      } else if (topic === 'polygon-area') {
        valid = validatePolygonAreaSpec(raw)
      } else if (topic === 'central-angle') {
        valid = validateCentralAngleSpec(raw)
      } else if (topic === 'chord-angle') {
        valid = validateChordAngleSpec(raw)
      } else if (topic === 'secant-angle') {
        valid = validateSecantAngleSpec(raw)
      } else if (topic === 'tangent-angle') {
        valid = validateTangentAngleSpec(raw)
      } else if (topic === 'circumcircle') {
        valid = validateCircumcircleSpec(raw)
      } else {
        valid = validateAngleSpec(raw, ANGLE_TOPICS[topic])
      }
      if (valid) specs.push(valid)
      if (specs.length >= count) break
    }

    return json({ specs }, 200)
  } catch {
    return json({ specs: [] }, 200)
  }
})
