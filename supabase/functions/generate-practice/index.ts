// Supabase Edge Function: generate-practice
//
// Server-side proxy for AI-generated math practice. Its ONLY job is to ask an
// LLM for problem "specs" — i.e. *which* quantity is given, *what* integer value
// it has, and an OPTIONAL short real-world context phrase.
//
// IMPORTANT — no-answers / no-hints guarantee:
//   This function must NEVER return answers, feedback, hints, or explanations.
//   The client computes the answer itself (e.g. inscribed = central / 2). We only
//   return the *problem setup*. Every spec coming back from the model is validated
//   against a strict per-topic allow-list and anything non-conforming is dropped.
//   The `context` phrase is additionally scrubbed so it can't smuggle a number
//   (and therefore can't leak the answer).
//
// Why this lives on the server: the LLM API key is secret. Keeping the call here
// means the key never ships to the browser. That is the whole point of the proxy.

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const MIN_COUNT = 1
const MAX_COUNT = 8
const DEFAULT_COUNT = 4

// Context must be a short, neutral, number-free scenario phrase.
const MAX_CONTEXT_LENGTH = 80

// CORS: this function is called from the browser, so every response (including
// the OPTIONS preflight) must carry these headers.
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ---------------------------------------------------------------------------
// Topic definitions
// ---------------------------------------------------------------------------

type Topic = 'inscribed' | 'cyclic' | 'tangent-radius'

// A single problem setup. `given` says which quantity is provided, `value` is its
// integer measure, and `context` is an optional flavour phrase. No answer field —
// by design.
interface Spec {
  given: string
  value: number
  context?: string
}

// Allowed value range for one `given` key. Inclusive integer bounds, plus an
// optional "must be even" constraint (used by `inscribed`/central so the derived
// inscribed angle stays a whole number).
interface GivenRule {
  min: number
  max: number
  requireEven?: boolean
}

interface TopicConfig {
  // Plain-language description of the relationship, fed to the model so it knows
  // what each `given` means. (It is NOT asked to use the relationship — just to
  // pick which side is given.)
  explanation: string
  // The allow-list: only these `given` keys are valid, each with its value range.
  givens: Record<string, GivenRule>
  // A couple of neutral, number-free context ideas to steer the model.
  contextIdeas: string[]
}

// The single source of truth for validation AND for the prompt. Keeping them in
// one place means the rules we describe to the model are exactly the rules we
// enforce afterwards.
const TOPICS: Record<Topic, TopicConfig> = {
  inscribed: {
    explanation:
      'Inscribed angle theorem: an inscribed angle is half of the central angle that subtends the same arc. ' +
      '"given: central" means the central angle is the quantity provided; ' +
      '"given: inscribed" means the inscribed angle is the quantity provided.',
    givens: {
      // Central angle must be EVEN so its half (the inscribed angle) is an integer.
      central: { min: 60, max: 170, requireEven: true },
      inscribed: { min: 20, max: 85 },
    },
    contextIdeas: ['a Ferris wheel', 'a clock face', 'a circular stained-glass window'],
  },
  cyclic: {
    explanation:
      'Cyclic quadrilateral inscribed in a circle: opposite angles are supplementary (they sum to 180 degrees). ' +
      '"given: A" means angle A is provided; "given: C" means its opposite angle C is provided.',
    givens: {
      A: { min: 40, max: 140 },
      C: { min: 40, max: 140 },
    },
    contextIdeas: ['a kite frame', 'a quadrilateral park', 'a four-sided tile'],
  },
  'tangent-radius': {
    explanation:
      'A tangent to a circle is perpendicular to the radius at the point of tangency, so the two meet at 90 degrees. ' +
      '"given: tangent" or "given: radius" means that one of the two angles formed at the contact point is provided.',
    givens: {
      tangent: { min: 10, max: 80 },
      radius: { min: 10, max: 80 },
    },
    contextIdeas: ['a bridge arch', 'a wheel resting on a road', 'a ball touching a wall'],
  },
}

function isTopic(value: unknown): value is Topic {
  return value === 'inscribed' || value === 'cyclic' || value === 'tangent-radius'
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

// Clamp the requested count into [1, 8]; fall back to 4 when missing/invalid.
function clampCount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_COUNT
  const floored = Math.floor(n)
  if (floored < MIN_COUNT) return MIN_COUNT
  if (floored > MAX_COUNT) return MAX_COUNT
  return floored
}

// Validate a single raw spec from the model against the topic allow-list.
// Returns a clean Spec, or null if it doesn't conform (caller drops nulls).
// This is the core of the safety guarantee: anything outside the declared
// `given` keys / integer ranges is rejected rather than passed through.
function validateSpec(raw: unknown, config: TopicConfig): Spec | null {
  if (!raw || typeof raw !== 'object') return null
  const candidate = raw as Record<string, unknown>

  // `given` must be one of the explicitly allowed keys for this topic.
  const given = candidate.given
  if (typeof given !== 'string') return null
  const rule = config.givens[given]
  if (!rule) return null

  // `value` must be an integer inside the allowed range (and even if required).
  const value = candidate.value
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  if (value < rule.min || value > rule.max) return null
  if (rule.requireEven && value % 2 !== 0) return null

  const spec: Spec = { given, value }

  // `context` is optional. Keep it only if it's a short, number-free phrase.
  // Dropping anything with a digit prevents the model from leaking the answer
  // (or any number the client didn't compute itself) through the flavour text.
  const context = candidate.context
  if (typeof context === 'string') {
    const trimmed = context.trim()
    const hasNumber = /\d/.test(trimmed)
    if (trimmed.length > 0 && trimmed.length <= MAX_CONTEXT_LENGTH && !hasNumber) {
      spec.context = trimmed
    }
    // Too long, empty, or contains a number -> silently drop just the context.
  }

  return spec
}

// ---------------------------------------------------------------------------
// LLM prompt + call
// ---------------------------------------------------------------------------

// Turn a topic's allow-list into a human-readable rules block for the prompt, so
// the model is told exactly the same constraints we enforce in validateSpec.
function describeGivens(config: TopicConfig): string {
  return Object.entries(config.givens)
    .map(([key, rule]) => {
      const kind = rule.requireEven ? 'an EVEN integer' : 'an integer'
      return `  - given "${key}": value is ${kind} between ${rule.min} and ${rule.max} (inclusive)`
    })
    .join('\n')
}

function buildMessages(topic: Topic, config: TopicConfig, count: number) {
  const allowedGiven = Object.keys(config.givens)
    .map((g) => `"${g}"`)
    .join(' or ')

  const system =
    'You generate setups for geometry practice problems. ' +
    'You output ONLY strict JSON and nothing else. ' +
    'You NEVER include answers, solutions, results, hints, explanations, or any computed number. ' +
    'You only state which quantity is GIVEN and its value.'

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
    describeGivens(config),
    '- Vary BOTH which quantity is given AND the numbers across the specs; avoid repeats.',
    `- "context" is OPTIONAL: a short (max ${MAX_CONTEXT_LENGTH} characters) neutral real-world setup, ` +
      `e.g. ${config.contextIdeas.map((c) => `"${c}"`).join(', ')}.`,
    '- "context" must contain NO numbers/digits and must NOT reveal or hint at any answer.',
    '- Do NOT include answers, hints, explanations, units, or any extra fields.',
    '- Return JSON only (no markdown, no prose).',
  ].join('\n')

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]
}

// Call OpenAI Chat Completions. Throws on any non-OK response or missing content;
// the caller turns thrown errors into the graceful empty-specs fallback.
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
      // Ask for a JSON object so we get parseable output.
      response_format: { type: 'json_object' },
      // A little heat to keep the generated specs varied.
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

// Strip ```json ... ``` (or plain ``` ... ```) fences the model might add.
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

// Parse the model's text into an array of raw specs. Defensive: tolerates code
// fences and falls back to extracting the outermost {...} object. Returns [] if
// it can't find a usable array (caller treats [] as "no specs").
function parseSpecsPayload(content: string): unknown[] {
  let cleaned = stripCodeFences(content)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    // Last resort: grab the first {...} block and try again.
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

// ---------------------------------------------------------------------------
// HTTP helpers + handler
// ---------------------------------------------------------------------------

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request): Promise<Response> => {
  // 1) CORS preflight.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 2) Only POST is supported.
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // 3) Parse the body defensively.
  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object') {
      body = parsed as Record<string, unknown>
    }
  } catch {
    body = {}
  }

  // 4) A bad topic is a real client error -> 400.
  const topic = body.topic
  if (!isTopic(topic)) {
    return json({ error: 'Invalid topic' }, 400)
  }
  const config = TOPICS[topic]
  const count = clampCount(body.count)

  // 5) Recoverable cases below all return 200 with an empty list so the client
  //    can cleanly fall back to its built-in problem pool. We never 500 here.

  // Missing key -> graceful fallback.
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json({ specs: [] }, 200)
  }

  try {
    const messages = buildMessages(topic, config, count)
    const content = await callOpenAI(apiKey, messages)
    const rawSpecs = parseSpecsPayload(content)

    // Validate everything the model returned; drop non-conforming specs and cap
    // to the requested count. The result may be empty — that's fine.
    const specs: Spec[] = []
    for (const raw of rawSpecs) {
      const valid = validateSpec(raw, config)
      if (valid) specs.push(valid)
      if (specs.length >= count) break
    }

    return json({ specs }, 200)
  } catch {
    // LLM error, network error, parse failure, etc. -> graceful fallback.
    return json({ specs: [] }, 200)
  }
})
