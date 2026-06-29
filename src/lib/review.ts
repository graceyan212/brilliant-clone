import type { NumericProblem, PracticeTopic } from '../types/lesson'
import { generatePracticeProblems } from './practice'
import { isSupabaseConfigured, supabase } from './supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Spaced repetition + mastery, the Phase 3 retention engine.
//
// One record per concept (a PracticeTopic). A Leitner-style `box` drives the
// interval until the concept next resurfaces: a correct answer promotes the box
// (longer gap); a wrong answer demotes it and makes the concept due TOMORROW, so
// missed ideas come back soonest. `cleanCorrect` (first-try-correct count) is the
// mastery signal that gates progression; it is sticky once earned.
//
// All scheduling functions are pure and date-injected so they can be tested and
// so the app never depends on a live clock inside the logic.
// ─────────────────────────────────────────────────────────────────────────────

export type ConceptReview = {
  topic: PracticeTopic
  box: number
  /** ISO yyyy-mm-dd the concept is next due, or null if never practiced. */
  dueDate: string | null
  lastSeen: string | null
  seen: number
  /** First-try-correct answers — the mastery signal. */
  cleanCorrect: number
  /** Sticky: true once the learner has shown mastery; gates the next lesson. */
  mastered: boolean
}

export const MAX_BOX = 5
// Days until a concept resurfaces after a CORRECT answer, indexed by the new box.
// Growing intervals: 2 → 4 → 9 → 19 → 40 days as a concept is repeatedly recalled.
export const INTERVALS = [1, 2, 4, 9, 19, 40]
// First-try-correct answers needed to count a concept as mastered.
export const MASTERY_CLEAN_CORRECT = 3

export function todayISO(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDaysISO(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00`)
  date.setDate(date.getDate() + days)
  return todayISO(date)
}

export function emptyReview(topic: PracticeTopic): ConceptReview {
  return { topic, box: 0, dueDate: null, lastSeen: null, seen: 0, cleanCorrect: 0, mastered: false }
}

/**
 * Pure scheduler: fold one attempt into a concept's review state.
 * - correct  → promote the box, schedule further out; first try also advances mastery.
 * - wrong    → demote the box, resurface tomorrow.
 */
export function applyAttempt(
  prev: ConceptReview | undefined,
  topic: PracticeTopic,
  outcome: { correct: boolean; firstTry: boolean },
  today: string,
): ConceptReview {
  const base = prev ?? emptyReview(topic)
  const box = outcome.correct ? Math.min(base.box + 1, MAX_BOX) : Math.max(base.box - 1, 0)
  const cleanCorrect = base.cleanCorrect + (outcome.correct && outcome.firstTry ? 1 : 0)
  const interval = outcome.correct ? INTERVALS[box] : 1
  return {
    topic,
    box,
    dueDate: addDaysISO(today, interval),
    lastSeen: today,
    seen: base.seen + 1,
    cleanCorrect,
    mastered: base.mastered || cleanCorrect >= MASTERY_CLEAN_CORRECT,
  }
}

/** A concept is due when it has been practiced and its due date has arrived. */
export function isDue(review: ConceptReview | undefined, today: string): boolean {
  return Boolean(review && review.seen > 0 && review.dueDate !== null && review.dueDate <= today)
}

export function dueTopics(reviews: ReviewMap, today: string): PracticeTopic[] {
  return Object.values(reviews)
    .filter((review) => isDue(review, today))
    // Soonest-overdue first, then weakest box first, so the shakiest ideas lead.
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : a.dueDate! > b.dueDate! ? 1 : a.box - b.box))
    .map((review) => review.topic)
}

export type ReviewMap = Partial<Record<PracticeTopic, ConceptReview>>

// ── Interleaved session building ─────────────────────────────────────────────

export type ReviewItem = { topic: PracticeTopic; problem: NumericProblem }

// Build an INTERLEAVED set: one fresh problem per topic, then shuffled so the
// learner must choose the right approach rather than ride momentum from the last
// problem. Reuses the same code-graded generator the practice pool uses.
export function buildReviewSession(topics: PracticeTopic[]): ReviewItem[] {
  const items: ReviewItem[] = topics
    .map((topic) => {
      const [problem] = generatePracticeProblems(topic, 1, 0)
      return problem ? { topic, problem } : null
    })
    .filter((item): item is ReviewItem => item !== null)

  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
  return items
}

// ── Persistence: Supabase when signed in & configured, else localStorage ──────

const LOCAL_KEY = 'angle-attack:reviews'

function loadLocal(): ReviewMap {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as ReviewMap) : {}
  } catch {
    return {}
  }
}

function saveLocal(map: ReviewMap): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map))
  } catch {
    // Storage unavailable (private mode, quota) — reviews just won't persist.
  }
}

function rowToReview(row: {
  topic: string
  box: number
  due_date: string | null
  last_seen: string | null
  seen: number
  clean_correct: number
  mastered: boolean
}): ConceptReview {
  return {
    topic: row.topic as PracticeTopic,
    box: row.box,
    dueDate: row.due_date,
    lastSeen: row.last_seen,
    seen: row.seen,
    cleanCorrect: row.clean_correct,
    mastered: row.mastered,
  }
}

export async function loadReviews(userId: string | null): Promise<ReviewMap> {
  if (userId && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('concept_reviews')
      .select('topic, box, due_date, last_seen, seen, clean_correct, mastered')
      .eq('user_id', userId)
    if (!error && data) {
      const map: ReviewMap = {}
      for (const row of data) {
        map[row.topic as PracticeTopic] = rowToReview(row)
      }
      return map
    }
    if (error) {
      console.error('Failed to load reviews:', error.message)
    }
  }
  return loadLocal()
}

export async function saveReview(userId: string | null, review: ConceptReview): Promise<void> {
  if (userId && isSupabaseConfigured) {
    const { error } = await supabase.from('concept_reviews').upsert(
      {
        user_id: userId,
        topic: review.topic,
        box: review.box,
        due_date: review.dueDate,
        last_seen: review.lastSeen,
        seen: review.seen,
        clean_correct: review.cleanCorrect,
        mastered: review.mastered,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,topic' },
    )
    if (error) {
      console.error('Failed to save review:', error.message)
    }
    return
  }
  const map = loadLocal()
  map[review.topic] = review
  saveLocal(map)
}

/** Record one attempt: load → fold → persist → return the updated record. */
export async function recordAttempt(
  userId: string | null,
  current: ConceptReview | undefined,
  topic: PracticeTopic,
  outcome: { correct: boolean; firstTry: boolean },
): Promise<ConceptReview> {
  const next = applyAttempt(current, topic, outcome, todayISO())
  await saveReview(userId, next)
  return next
}
