import { isAiEnabled } from './ai-settings'
import { supabase } from './supabase'

/** Inputs for a guided hint about repeated WRONG NUMERIC answers. `attempts` are
 * the learner's wrong values (in order); `correctAnswer` grounds the model's
 * diagnosis only - the client still owns grading. `topic` is optional context. */
export interface NumericGuidedHintArgs {
  prompt: string
  correctAnswer: number
  attempts: number[]
  topic?: string
}

/** Inputs for a guided hint about a repeated WRONG CHOICE on a multiple-choice
 * question. `options` lists every choice label shown; `correctChoice` is the
 * label of the right option (grounding only - never revealed); `chosen` holds the
 * wrong labels the learner picked, in order, so the model can diagnose the
 * misconception behind that specific pick. `topic` is optional context. */
export interface ChoiceGuidedHintArgs {
  prompt: string
  options: string[]
  correctChoice: string
  chosen: string[]
  topic?: string
}

/** Back-compat alias for the original numeric-only argument shape. */
export type GuidedHintArgs = NumericGuidedHintArgs

function isChoiceArgs(
  args: NumericGuidedHintArgs | ChoiceGuidedHintArgs,
): args is ChoiceGuidedHintArgs {
  return 'options' in args
}

// Asks the `explain-hint` edge function to diagnose the learner's likely
// misconception and return one short coaching hint. Handles either a repeated
// wrong NUMERIC answer or a repeated wrong multiple-choice PICK (overloaded).
// Returns the trimmed hint string, or null on any empty/error response so the
// caller falls back to its curated static hint / feedback. The AI never grades or
// supplies the answer.
export function fetchGuidedHint(args: NumericGuidedHintArgs): Promise<string | null>
export function fetchGuidedHint(args: ChoiceGuidedHintArgs): Promise<string | null>
export async function fetchGuidedHint(
  args: NumericGuidedHintArgs | ChoiceGuidedHintArgs,
): Promise<string | null> {
  // Respect the in-app AI toggle: when off, skip the call so the caller falls
  // back to its curated static hint, exactly as when no API key is set.
  if (!isAiEnabled()) {
    return null
  }
  try {
    // The numeric body stays byte-identical to the original contract so a
    // not-yet-redeployed edge function keeps serving numeric hints unchanged. The
    // choice body adds `kind: 'choice'` plus the option context.
    const body = isChoiceArgs(args)
      ? {
          kind: 'choice' as const,
          prompt: args.prompt,
          options: args.options,
          correctChoice: args.correctChoice,
          chosen: args.chosen,
          topic: args.topic,
        }
      : {
          prompt: args.prompt,
          correctAnswer: args.correctAnswer,
          attempts: args.attempts,
          topic: args.topic,
        }

    const { data, error } = await supabase.functions.invoke('explain-hint', { body })

    if (error) {
      return null
    }

    const hint = (data as { hint?: unknown } | null)?.hint
    if (typeof hint !== 'string') {
      return null
    }

    const trimmed = hint.trim()
    return trimmed.length > 0 ? trimmed : null
  } catch {
    return null
  }
}
