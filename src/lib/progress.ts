import { supabase } from './supabase'

export type LessonProgress = {
  currentStep: number
  completed: boolean
}

export async function fetchLessonProgress(
  userId: string,
  lessonId: string,
): Promise<LessonProgress | null> {
  const { data, error } = await supabase
    .from('lesson_progress')
    .select('current_step, completed')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load lesson progress:', error.message)
    return null
  }

  if (!data) {
    return null
  }

  return { currentStep: data.current_step, completed: data.completed }
}

export async function saveLessonProgress(
  userId: string,
  lessonId: string,
  progress: LessonProgress,
): Promise<void> {
  const { error } = await supabase.from('lesson_progress').upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      current_step: progress.currentStep,
      completed: progress.completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' },
  )

  if (error) {
    console.error('Failed to save lesson progress:', error.message)
  }
}
