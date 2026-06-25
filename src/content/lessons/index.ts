import type { Lesson } from '../../types/lesson'
import cyclicContent from './cyclic-quadrilaterals.json'
import inscribedContent from './inscribed-angle-theorem.json'
import partsContent from './parts-of-a-circle.json'
import powerContent from './power-of-point.json'

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
  /** Marks a short warm-up presented as a "prequiz" rather than a full lesson. */
  kind?: 'prequiz'
  /** The lesson surfaced as "Up next" after completion (and on the home screen). */
  nextLessonId?: string
  content: Lesson
}

const parts: RegisteredLesson = {
  id: 'parts-of-a-circle',
  path: '/lesson/parts-of-a-circle',
  title: 'Parts of a circle',
  tagline: 'The vocabulary: radius, chord, diameter, secant, tangent.',
  kind: 'prequiz',
  nextLessonId: 'inscribed-angle-theorem',
  content: partsContent as Lesson,
  summary: {
    text: 'A radius runs from the center to the edge; a diameter is a chord through the center, twice as long as the radius.',
    formula: { left: 'diameter', op: '=', right: '2 \u00d7 radius' },
  },
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
  nextLessonId: 'power-of-point',
  content: cyclicContent as Lesson,
  summary: {
    text: 'Opposite angles of a cyclic quadrilateral are supplementary: each pair sums to 180\u00b0, because the two arcs they open onto fill the whole circle.',
    formula: { left: '\u2220A + \u2220C', op: '=', right: '180\u00b0' },
  },
}

const power: RegisteredLesson = {
  id: 'power-of-point',
  path: '/lesson/power-of-point',
  title: 'Crossing chords',
  tagline: 'When two chords cross, the products of their parts match.',
  content: powerContent as Lesson,
  summary: {
    text: 'When two chords cross inside a circle, the products of their two pieces are equal.',
    formula: { left: 'PA \u00d7 PB', op: '=', right: 'PC \u00d7 PD' },
  },
}

export const lessons: RegisteredLesson[] = [parts, inscribed, cyclic, power]

export function getLesson(id: string | undefined): RegisteredLesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}
