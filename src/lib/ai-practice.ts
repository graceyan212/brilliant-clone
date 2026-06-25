import type { NumericProblem, PracticeSpec, PracticeTopic } from '../types/lesson'
import { buildProblem } from './practice'
import { supabase } from './supabase'

// Asks the `generate-practice` edge function for AI-authored problem specs, then
// builds each one through the shared `buildProblem` so the answer, diagram, and
// targeted hints are still computed in code. Returns null on any failure so the
// caller falls back to the deterministic pool.
export async function generateAiPractice(
  topic: PracticeTopic,
  count: number,
  offset: number,
): Promise<NumericProblem[] | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-practice', {
      body: { topic, count },
    })

    if (error) {
      return null
    }

    const specs = (data as { specs?: PracticeSpec[] } | null)?.specs
    if (!specs || specs.length === 0) {
      return null
    }

    const problems: NumericProblem[] = []
    specs.forEach((spec, index) => {
      try {
        problems.push({ ...buildProblem(topic, spec), id: `ai-${offset + index}` })
      } catch {
        // Skip any spec that fails code-side validation; correctness is guarded here.
      }
    })

    return problems.length > 0 ? problems : null
  } catch {
    return null
  }
}
