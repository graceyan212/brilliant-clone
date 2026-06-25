import type { Lesson } from '../../types/lesson'
import cyclicContent from './cyclic-quadrilaterals.json'
import inscribedContent from './inscribed-angle-theorem.json'

export type LessonSummary = {
  /** One-line recap shown on the completion screen. */
  text: string
  /** Color-coded formula: `left` in the inscribed-angle color, `right` in the central color. */
  formula: { left: string; op: string; right: string }
}

export type RegisteredLesson = {
  id: string
  path: string
  title: string
  tagline: string
  summary: LessonSummary
  /** The lesson surfaced as "Up next" after completion (and on the home screen). */
  nextLessonId?: string
  content: Lesson
}

const inscribed: RegisteredLesson = {
  id: 'inscribed-angle-theorem',
  path: '/lesson/inscribed-angle-theorem',
  title: 'The inscribed angle theorem',
  tagline: 'An inscribed angle and the central angle on the same arc.',
  nextLessonId: 'cyclic-quadrilaterals',
  content: inscribedContent as Lesson,
  summary: {
    text: 'An inscribed angle is always half the central angle that shares the same two endpoints on the circle.',
    formula: { left: 'inscribed angle', op: '= \u00bd \u00d7', right: 'central angle' },
  },
}

const cyclic: RegisteredLesson = {
  id: 'cyclic-quadrilaterals',
  path: '/lesson/cyclic-quadrilaterals',
  title: 'Cyclic quadrilaterals',
  tagline: 'Opposite angles when four points share a circle.',
  content: cyclicContent as Lesson,
  summary: {
    text: 'Opposite angles of a cyclic quadrilateral are supplementary: each pair sums to 180\u00b0, because the two arcs they open onto fill the whole circle.',
    formula: { left: '\u2220A + \u2220C', op: '=', right: '180\u00b0' },
  },
}

export const lessons: RegisteredLesson[] = [inscribed, cyclic]

export function getLesson(id: string | undefined): RegisteredLesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}
