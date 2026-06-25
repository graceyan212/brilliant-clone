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

type Topic = 'inscribed' | 'cyclic' | 'power-of-point'

// A spec is the problem setup only. Angle topics use { given, value }; the
// power-of-a-point topic uses { values: [PA, PB, PC] }.
interface Spec {
  given?: string
  value?: number
  values?: number[]
  context?: string
}

function isTopic(value: unknown): value is Topic {
  return value === 'inscribed' || value === 'cyclic' || value === 'power-of-point'
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
    const messages =
      topic === 'power-of-point'
        ? buildPowerMessages(count)
        : buildAngleMessages(topic, ANGLE_TOPICS[topic], count)

    const content = await callOpenAI(apiKey, messages)
    const rawSpecs = parseSpecsPayload(content)

    const specs: Spec[] = []
    for (const raw of rawSpecs) {
      const valid =
        topic === 'power-of-point' ? validatePowerSpec(raw) : validateAngleSpec(raw, ANGLE_TOPICS[topic])
      if (valid) specs.push(valid)
      if (specs.length >= count) break
    }

    return json({ specs }, 200)
  } catch {
    return json({ specs: [] }, 200)
  }
})
