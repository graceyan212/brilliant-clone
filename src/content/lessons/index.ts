import type { Lesson } from '../../types/lesson'
import anglesContent from './angles-and-angle-chasing.json'
import triangleAnglesContent from './angles-in-a-triangle.json'
import areasOfPolygonsContent from './areas-of-polygons.json'
import arcsSectorsContent from './arcs-and-sectors.json'
import centralAnglesContent from './central-angles.json'
import circumcircleContent from './circumscribed-circle.json'
import cyclicContent from './cyclic-quadrilaterals.json'
import inscribedContent from './inscribed-angle-theorem.json'
import chordAngleContent from './intersecting-chord-angles.json'
import partsContent from './parts-of-a-circle.json'
import polygonAnglesContent from './polygon-angles.json'
import powerContent from './power-of-point.json'
import pythagoreanContent from './pythagorean-theorem.json'
import secantAngleContent from './secant-angle.json'
import similarTrianglesContent from './similar-triangles.json'
import specialTrianglesContent from './special-right-triangles.json'
import tangentsContent from './tangents.json'

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

// Foundations -----------------------------------------------------------------

const parts: RegisteredLesson = {
  id: 'parts-of-a-circle',
  path: '/lesson/parts-of-a-circle',
  title: 'Parts of a circle',
  tagline: 'The vocabulary: radius, chord, diameter, secant, tangent.',
  kind: 'prequiz',
  nextLessonId: 'angles-and-angle-chasing',
  content: partsContent as Lesson,
  summary: {
    text: 'A radius runs from the center to the edge; a diameter is a chord through the center, twice as long as the radius.',
    formula: { left: 'diameter', op: '=', right: '2 \u00d7 radius' },
  },
}

const angles: RegisteredLesson = {
  id: 'angles-and-angle-chasing',
  path: '/lesson/angles-and-angle-chasing',
  title: 'Angles & angle-chasing',
  tagline: 'Vertical, corresponding, and alternate angles across crossing lines.',
  nextLessonId: 'angles-in-a-triangle',
  content: anglesContent as Lesson,
  summary: {
    text: 'When a transversal crosses two parallel lines, corresponding and alternate interior angles are equal, while co-interior angles add to 180\u00b0.',
    formula: { left: 'alternate \u2220s', op: 'are', right: 'equal' },
  },
}

const triangleAngles: RegisteredLesson = {
  id: 'angles-in-a-triangle',
  path: '/lesson/angles-in-a-triangle',
  title: 'Angles in a triangle',
  tagline: 'The three angles of every triangle add to 180\u00b0.',
  nextLessonId: 'pythagorean-theorem',
  content: triangleAnglesContent as Lesson,
  summary: {
    text: 'The three interior angles of any triangle add to 180\u00b0, and an exterior angle equals the sum of the two remote interior angles.',
    formula: { left: 'a + b + c', op: '=', right: '180\u00b0' },
  },
}

// Triangles & Pythagoras ------------------------------------------------------

const pythagorean: RegisteredLesson = {
  id: 'pythagorean-theorem',
  path: '/lesson/pythagorean-theorem',
  title: 'The Pythagorean theorem',
  tagline: 'In a right triangle, the two legs and the hypotenuse obey a\u00b2 + b\u00b2 = c\u00b2.',
  nextLessonId: 'special-right-triangles',
  content: pythagoreanContent as Lesson,
  summary: {
    text: 'In any right triangle, the squares of the two legs add up to the square of the hypotenuse.',
    formula: { left: 'a\u00b2 + b\u00b2', op: '=', right: 'c\u00b2' },
  },
}

const specialTriangles: RegisteredLesson = {
  id: 'special-right-triangles',
  path: '/lesson/special-right-triangles',
  title: 'Special right triangles',
  tagline: 'The fixed side ratios of the 45-45-90 and 30-60-90 triangles.',
  nextLessonId: 'similar-triangles',
  content: specialTrianglesContent as Lesson,
  summary: {
    text: 'A 45-45-90 triangle has sides 1 : 1 : \u221a2, and a 30-60-90 triangle has sides 1 : \u221a3 : 2.',
    formula: { left: '30-60-90', op: '\u2192', right: '1 : \u221a3 : 2' },
  },
}

const similarTriangles: RegisteredLesson = {
  id: 'similar-triangles',
  path: '/lesson/similar-triangles',
  title: 'Similar triangles & scaling',
  tagline: 'Equal angles mean proportional sides \u2014 and area scales by k\u00b2.',
  nextLessonId: 'polygon-angles',
  content: similarTrianglesContent as Lesson,
  summary: {
    text: 'Triangles with equal angles are similar: corresponding sides share one ratio k, and their areas scale by k\u00b2.',
    formula: { left: 'area ratio', op: '=', right: 'k\u00b2' },
  },
}

// Polygons & area -------------------------------------------------------------

const polygonAngles: RegisteredLesson = {
  id: 'polygon-angles',
  path: '/lesson/polygon-angles',
  title: 'Polygon angles',
  tagline: 'The interior angles of an n-gon add to (n \u2212 2) \u00d7 180\u00b0.',
  nextLessonId: 'areas-of-polygons',
  content: polygonAnglesContent as Lesson,
  summary: {
    text: 'The interior angles of an n-sided polygon always add to (n \u2212 2) \u00d7 180\u00b0, so each angle of a regular n-gon is that sum split n ways.',
    formula: { left: 'angle sum', op: '=', right: '(n \u2212 2) \u00d7 180\u00b0' },
  },
}

const areasOfPolygons: RegisteredLesson = {
  id: 'areas-of-polygons',
  path: '/lesson/areas-of-polygons',
  title: 'Areas of polygons',
  tagline: 'Triangle, parallelogram, trapezoid, and kite areas \u2014 all from base \u00d7 height.',
  nextLessonId: 'central-angles',
  content: areasOfPolygonsContent as Lesson,
  summary: {
    text: 'Every polygon area comes back to base \u00d7 height: a triangle is \u00bd b h, a parallelogram b h, a trapezoid averages its parallel sides, and a kite is half its diagonals\u2019 product.',
    formula: { left: 'triangle area', op: '=', right: '\u00bd \u00d7 b \u00d7 h' },
  },
}

// Circles ---------------------------------------------------------------------

const centralAngles: RegisteredLesson = {
  id: 'central-angles',
  path: '/lesson/central-angles',
  title: 'Central angles & arc measure',
  tagline: 'A central angle and the arc it cuts off share one measure.',
  nextLessonId: 'inscribed-angle-theorem',
  content: centralAnglesContent as Lesson,
  summary: {
    text: 'An arc has the same measure as the central angle that subtends it, and the whole circle is 360\u00b0.',
    formula: { left: 'arc AB', op: '=', right: '\u2220AOB' },
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
  nextLessonId: 'intersecting-chord-angles',
  content: cyclicContent as Lesson,
  summary: {
    text: 'Opposite angles of a cyclic quadrilateral are supplementary: each pair sums to 180\u00b0, because the two arcs they open onto fill the whole circle.',
    formula: { left: '\u2220A + \u2220C', op: '=', right: '180\u00b0' },
  },
}

const intersectingChordAngles: RegisteredLesson = {
  id: 'intersecting-chord-angles',
  path: '/lesson/intersecting-chord-angles',
  title: 'Angles from intersecting chords',
  tagline: 'When two chords cross, the angle is half the arcs it catches.',
  nextLessonId: 'secant-angle',
  content: chordAngleContent as Lesson,
  summary: {
    text: 'When two chords cross inside a circle, the angle is half the sum of the two intercepted arcs.',
    formula: { left: 'angle', op: '= \u00bd \u00d7', right: '(arc + arc)' },
  },
}

const secantAngle: RegisteredLesson = {
  id: 'secant-angle',
  path: '/lesson/secant-angle',
  title: 'Secants & the secant angle',
  tagline: 'From outside the circle, the angle is half the difference of the arcs.',
  nextLessonId: 'tangents',
  content: secantAngleContent as Lesson,
  summary: {
    text: 'From an external point, the angle between two secants is half the difference of the intercepted arcs.',
    formula: { left: 'angle', op: '= \u00bd \u00d7', right: '(far \u2212 near)' },
  },
}

const tangents: RegisteredLesson = {
  id: 'tangents',
  path: '/lesson/tangents',
  title: 'Tangents to a circle',
  tagline: 'Perpendicular radii, the alternate-segment angle, and equal tangents.',
  nextLessonId: 'power-of-point',
  content: tangentsContent as Lesson,
  summary: {
    text: 'A tangent is perpendicular to the radius; the tangent\u2013chord angle is half its arc, and two tangents from a point are equal.',
    formula: { left: 'tangent\u2013chord', op: '= \u00bd \u00d7', right: 'arc' },
  },
}

const power: RegisteredLesson = {
  id: 'power-of-point',
  path: '/lesson/power-of-point',
  title: 'Crossing chords',
  tagline: 'When two chords cross, the products of their parts match.',
  nextLessonId: 'circumscribed-circle',
  content: powerContent as Lesson,
  summary: {
    text: 'When two chords cross inside a circle, the products of their two pieces are equal.',
    formula: { left: 'PA \u00d7 PB', op: '=', right: 'PC \u00d7 PD' },
  },
}

const circumscribedCircle: RegisteredLesson = {
  id: 'circumscribed-circle',
  path: '/lesson/circumscribed-circle',
  title: 'Circumscribed circle',
  tagline: 'Perpendicular bisectors meet at the circumcenter through all three vertices.',
  nextLessonId: 'arcs-and-sectors',
  content: circumcircleContent as Lesson,
  summary: {
    text: 'The perpendicular bisectors of a triangle\u2019s sides meet at the circumcenter, equidistant from all three vertices.',
    formula: { left: 'OA = OB', op: '=', right: 'OC' },
  },
}

const sectors: RegisteredLesson = {
  id: 'arcs-and-sectors',
  path: '/lesson/arcs-and-sectors',
  title: 'Arcs and sectors',
  tagline: 'A slice of a circle is set by its central angle.',
  content: arcsSectorsContent as Lesson,
  summary: {
    text: 'A sector is the fraction \u03b8/360 of its circle, so its arc and area are that same fraction of 2\u03c0r and \u03c0r\u00b2.',
    formula: { left: 'sector', op: '=', right: '\u03b8/360 of the circle' },
  },
}

export const lessons: RegisteredLesson[] = [
  parts,
  angles,
  triangleAngles,
  pythagorean,
  specialTriangles,
  similarTriangles,
  polygonAngles,
  areasOfPolygons,
  centralAngles,
  inscribed,
  cyclic,
  intersectingChordAngles,
  secantAngle,
  tangents,
  power,
  circumscribedCircle,
  sectors,
]

export function getLesson(id: string | undefined): RegisteredLesson | undefined {
  return lessons.find((lesson) => lesson.id === id)
}
