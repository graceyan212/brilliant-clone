import { supabase } from './supabase'

export type Streak = {
  currentStreak: number
  longestStreak: number
  lastActiveDate: string | null
}

function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dayGap(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`)
  const to = new Date(`${toISO}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

function nextStreak(existing: Streak | null, today: string): number {
  if (!existing?.lastActiveDate) {
    return 1
  }

  const gap = dayGap(existing.lastActiveDate, today)
  if (gap >= 2) {
    return 1
  }
  if (gap === 1) {
    return existing.currentStreak + 1
  }
  return Math.max(existing.currentStreak, 1)
}

// The stored streak is only "alive" if the last activity was today or yesterday.
// After a longer gap the streak is broken, so the badge should read 0 until the
// next lesson restarts it, rather than showing a stale count.
export function activeStreak(streak: Streak | null): number {
  if (!streak?.lastActiveDate) {
    return 0
  }
  return dayGap(streak.lastActiveDate, todayISO()) <= 1 ? streak.currentStreak : 0
}

export async function fetchStreak(userId: string): Promise<Streak | null> {
  const { data, error } = await supabase
    .from('user_streaks')
    .select('current_streak, longest_streak, last_active_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('Failed to load streak:', error.message)
    return null
  }

  if (!data) {
    return null
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActiveDate: data.last_active_date,
  }
}

export async function recordStreakActivity(userId: string): Promise<Streak | null> {
  const existing = await fetchStreak(userId)
  const today = todayISO()
  const currentStreak = nextStreak(existing, today)
  const longestStreak = Math.max(currentStreak, existing?.longestStreak ?? 0)

  const { data, error } = await supabase
    .from('user_streaks')
    .upsert(
      {
        user_id: userId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        last_active_date: today,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('current_streak, longest_streak, last_active_date')
    .single()

  if (error) {
    console.error('Failed to record streak:', error.message)
    return existing
  }

  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastActiveDate: data.last_active_date,
  }
}
