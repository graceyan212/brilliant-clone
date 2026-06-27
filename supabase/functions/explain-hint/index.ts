// Supabase Edge Function: explain-hint
//
// Server-side proxy that turns a learner's repeated WRONG answers into a short,
// encouraging coaching hint. It handles two request shapes:
//   - numeric: the learner's wrong numeric attempts (the original contract).
//   - choice ({ kind: 'choice' }): the wrong multiple-choice OPTION(S) the
//     learner keeps picking, plus the full option list.
// Its only job is to diagnose the LIKELY MISCONCEPTION behind the wrong answers /
// wrong pick and nudge the learner toward the right METHOD or idea - it must
// never take over grading.
//
// IMPORTANT - the code still owns the answer:
//   The client computes and checks the answer itself. This function returns ONLY
//   a coaching string. The model is GIVEN the correct answer purely so its
//   diagnosis is accurate (grounding); it is instructed to coach the
//   relationship/fix and NOT to blurt the number. The output is validated to be
//   a non-empty string within a length cap, otherwise we return an empty hint.
//
// Graceful degradation: on a missing key, bad input, or ANY failure we return
// { hint: "" } with status 200 so the client silently falls back to its curated
// static hint. We never 500 here.
//
// Why this lives on the server: the LLM API key is secret. Keeping the call here
// means the key never ships to the browser. Mirrors generate-practice (same key,
// CORS, model, and no-JWT-verification deploy).

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

const MAX_HINT_LENGTH = 280
const MAX_ATTEMPTS = 8
const MAX_PROMPT_LENGTH = 400
const MAX_TOPIC_LENGTH = 60
const MAX_OPTIONS = 8
const MAX_OPTION_LENGTH = 160
const MAX_CHOICES = 8

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// The cleaned, trusted shapes of a request after validation. Numeric is the
// original contract; choice carries the wrong multiple-choice pick(s).
interface NumericHintRequest {
  kind: 'numeric'
  prompt: string
  correctAnswer: number
  attempts: number[]
  topic?: string
}

interface ChoiceHintRequest {
  kind: 'choice'
  prompt: string
  options: string[]
  correctChoice: string
  chosen: string[]
  topic?: string
}

type HintRequest = NumericHintRequest | ChoiceHintRequest

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Topic is optional flavour text; reject anything overlong or containing digits
// so it can never smuggle a numeric answer into the prompt.
function cleanTopic(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (trimmed.length > 0 && trimmed.length <= MAX_TOPIC_LENGTH && !/\d/.test(trimmed)) {
    return trimmed
  }
  return undefined
}

// Clamp an unknown value into a bounded list of non-empty trimmed strings.
function cleanStringList(value: unknown, maxCount: number, maxLength: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const raw of value) {
    if (typeof raw !== 'string') continue
    const trimmed = raw.trim()
    if (trimmed.length === 0) continue
    out.push(trimmed.slice(0, maxLength))
    if (out.length >= maxCount) break
  }
  return out
}

// Coerce/clamp the incoming body into a trusted HintRequest, or null if it is
// too malformed to reason about. Dispatches on `kind`; absence of `kind` keeps
// the original numeric contract.
function cleanRequest(body: Record<string, unknown>): HintRequest | null {
  const rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  if (rawPrompt.length === 0) return null
  const prompt = rawPrompt.slice(0, MAX_PROMPT_LENGTH)

  if (body.kind === 'choice') {
    return cleanChoiceRequest(body, prompt)
  }
  return cleanNumericRequest(body, prompt)
}

function cleanNumericRequest(
  body: Record<string, unknown>,
  prompt: string,
): NumericHintRequest | null {
  const correctAnswer =
    typeof body.correctAnswer === 'number' ? body.correctAnswer : Number(body.correctAnswer)
  if (!Number.isFinite(correctAnswer)) return null

  const rawAttempts = Array.isArray(body.attempts) ? body.attempts : []
  const attempts: number[] = []
  for (const raw of rawAttempts) {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(n)) attempts.push(n)
    if (attempts.length >= MAX_ATTEMPTS) break
  }
  if (attempts.length === 0) return null

  return { kind: 'numeric', prompt, correctAnswer, attempts, topic: cleanTopic(body.topic) }
}

function cleanChoiceRequest(
  body: Record<string, unknown>,
  prompt: string,
): ChoiceHintRequest | null {
  const options = cleanStringList(body.options, MAX_OPTIONS, MAX_OPTION_LENGTH)
  if (options.length === 0) return null

  const correctChoice =
    typeof body.correctChoice === 'string'
      ? body.correctChoice.trim().slice(0, MAX_OPTION_LENGTH)
      : ''
  if (correctChoice.length === 0) return null

  const chosen = cleanStringList(body.chosen, MAX_CHOICES, MAX_OPTION_LENGTH)
  if (chosen.length === 0) return null

  return { kind: 'choice', prompt, options, correctChoice, chosen, topic: cleanTopic(body.topic) }
}

function buildMessages(req: HintRequest) {
  return req.kind === 'choice' ? buildChoiceMessages(req) : buildNumericMessages(req)
}

function buildNumericMessages(req: NumericHintRequest) {
  const system =
    'You are a warm, encouraging geometry tutor helping a student who has just ' +
    'answered the SAME practice problem wrong several times. ' +
    'Diagnose the single most LIKELY MISCONCEPTION behind their wrong answers ' +
    'and give ONE short, kind hint that points them toward the correct METHOD. ' +
    'You output ONLY strict JSON in this exact shape: { "hint": <string> }. ' +
    'The hint is 1-2 short sentences in plain, friendly, everyday language. ' +
    'You are told the correct answer ONLY for your private reasoning - you must ' +
    'NEVER state it or any other final number. Coach the relationship or the fix ' +
    '(for example "looks like you doubled instead of halving"), do not give the ' +
    'answer away. Be specific to the wrong values you see. ' +
    'No markdown, no lists, no preamble - just the JSON.'

  const lines = [
    `Problem: ${req.prompt}`,
    `Correct answer (for your reasoning only - do NOT reveal it): ${req.correctAnswer}`,
    `The student's wrong attempts, in order: ${req.attempts.join(', ')}.`,
  ]
  if (req.topic) {
    lines.push(`Topic: ${req.topic}.`)
  }
  lines.push(
    'Compare each wrong attempt to the correct answer, infer the misconception ' +
      '(e.g. doubling instead of halving, adding instead of subtracting, using the ' +
      'wrong relationship, forgetting a step, an off-by-a-factor slip), and write ' +
      'one short, encouraging coaching hint about what to do instead. Return JSON only.',
  )

  return [
    { role: 'system', content: system },
    { role: 'user', content: lines.join('\n') },
  ]
}

function buildChoiceMessages(req: ChoiceHintRequest) {
  const system =
    'You are a warm, encouraging geometry tutor helping a student who has just ' +
    'answered the SAME multiple-choice problem wrong several times, picking the ' +
    'same kind of wrong option. ' +
    'Infer the single most LIKELY MISCONCEPTION behind WHY that specific wrong ' +
    'option looked right to them, and give ONE short, kind hint that nudges them ' +
    'toward the correct idea. ' +
    'You output ONLY strict JSON in this exact shape: { "hint": <string> }. ' +
    'The hint is 1-2 short sentences in plain, friendly, everyday language. ' +
    'You are told which option is correct ONLY for your private reasoning - you ' +
    'must NEVER reveal it, name it, quote it, or say which option to choose. ' +
    'Coach the underlying mix-up (for example "it looks like you may be using the ' +
    'central angle instead of the inscribed one"), do not give the answer away. ' +
    'Be specific to the wrong option they chose. ' +
    'No markdown, no lists, no preamble - just the JSON.'

  const lines = [
    `Question: ${req.prompt}`,
    `Options shown: ${req.options.join(' | ')}`,
    `Correct option (for your reasoning only - do NOT reveal or name it): ${req.correctChoice}`,
    `The wrong option(s) the student keeps choosing, in order: ${req.chosen.join(' | ')}.`,
  ]
  if (req.topic) {
    lines.push(`Topic: ${req.topic}.`)
  }
  lines.push(
    'Look at the wrong option they chose, infer the misconception that would make ' +
      'that option look correct to them (e.g. confusing two related terms, swapping ' +
      'a relationship, halving vs doubling, mixing up which angle/arc/side is meant, ' +
      'a direction or sign slip), and write one short, encouraging hint about how to ' +
      'rethink it - without revealing the correct option. Return JSON only.',
  )

  return [
    { role: 'system', content: system },
    { role: 'user', content: lines.join('\n') },
  ]
}

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
      temperature: 0.7,
      max_tokens: 200,
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

// Pull the hint string out of the model's JSON payload, tolerating stray prose
// around the object. Returns '' when nothing usable is found.
function parseHint(content: string): string {
  let cleaned = stripCodeFences(content)

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return ''
    cleaned = cleaned.slice(start, end + 1)
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return ''
    }
  }

  const hint = (parsed as { hint?: unknown })?.hint
  return typeof hint === 'string' ? hint : ''
}

// Enforce the contract: a non-empty single-line string within the length cap.
// Anything else collapses to '' so the client falls back to its static hint.
function cleanHint(raw: string): string {
  const collapsed = raw.replace(/\s+/g, ' ').trim()
  if (collapsed.length === 0 || collapsed.length > MAX_HINT_LENGTH) return ''
  return collapsed
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

  // Recoverable cases below return 200 with an empty hint so the client falls
  // back to its curated static hint. Never 500 here.
  const clean = cleanRequest(body)
  if (!clean) {
    return json({ hint: '' }, 200)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    return json({ hint: '' }, 200)
  }

  try {
    const content = await callOpenAI(apiKey, buildMessages(clean))
    const hint = cleanHint(parseHint(content))
    return json({ hint }, 200)
  } catch {
    return json({ hint: '' }, 200)
  }
})
