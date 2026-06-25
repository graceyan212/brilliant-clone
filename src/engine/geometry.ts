export type Point = {
  x: number
  y: number
}

export type Circle = {
  center: Point
  radius: number
}

const fullTurn = 360

export function normalizeDegrees(degrees: number) {
  return ((degrees % fullTurn) + fullTurn) % fullTurn
}

export function pointOnCircle(circle: Circle, degrees: number): Point {
  const radians = (degrees * Math.PI) / 180

  return {
    x: circle.center.x + circle.radius * Math.cos(radians),
    y: circle.center.y + circle.radius * Math.sin(radians),
  }
}

export function angleFromCenter(circle: Circle, point: Point) {
  const radians = Math.atan2(point.y - circle.center.y, point.x - circle.center.x)

  return normalizeDegrees((radians * 180) / Math.PI)
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// Intersection of the infinite lines through A-B and C-D. Returns null when the
// lines are parallel. Used to find where two chords cross.
export function lineIntersection(a: Point, b: Point, c: Point, d: Point): Point | null {
  const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)
  if (Math.abs(denominator) < 1e-9) {
    return null
  }
  const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / denominator
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
}

export function angleBetweenPoints(vertex: Point, firstPoint: Point, secondPoint: Point) {
  const firstVector = {
    x: firstPoint.x - vertex.x,
    y: firstPoint.y - vertex.y,
  }
  const secondVector = {
    x: secondPoint.x - vertex.x,
    y: secondPoint.y - vertex.y,
  }

  const dotProduct = firstVector.x * secondVector.x + firstVector.y * secondVector.y
  const firstMagnitude = Math.hypot(firstVector.x, firstVector.y)
  const secondMagnitude = Math.hypot(secondVector.x, secondVector.y)
  const cosine = dotProduct / (firstMagnitude * secondMagnitude)

  return radiansToDegrees(Math.acos(clamp(cosine, -1, 1)))
}

export function arcPath(circle: Circle, startDegrees: number, arcDegrees: number) {
  const start = pointOnCircle(circle, startDegrees)
  const end = pointOnCircle(circle, startDegrees + arcDegrees)
  const largeArcFlag = Math.abs(arcDegrees) > 180 ? 1 : 0
  const sweepFlag = arcDegrees >= 0 ? 1 : 0

  return `M ${start.x} ${start.y} A ${circle.radius} ${circle.radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`
}

// Filled pie-slice from the center out to an arc, used to shade the central angle.
export function centerSectorPath(circle: Circle, startDegrees: number, arcDegrees: number) {
  const start = pointOnCircle(circle, startDegrees)
  const end = pointOnCircle(circle, startDegrees + arcDegrees)
  const largeArcFlag = Math.abs(arcDegrees) > 180 ? 1 : 0
  const sweepFlag = arcDegrees >= 0 ? 1 : 0

  return `M ${circle.center.x} ${circle.center.y} L ${start.x} ${start.y} A ${circle.radius} ${circle.radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y} Z`
}

function angleArcEndpoints(vertex: Point, towardA: Point, towardB: Point, radius: number) {
  const start = pointAlongRay(vertex, towardA, radius)
  const end = pointAlongRay(vertex, towardB, radius)
  const crossProduct =
    (towardA.x - vertex.x) * (towardB.y - vertex.y) -
    (towardA.y - vertex.y) * (towardB.x - vertex.x)
  const sweepFlag = crossProduct > 0 ? 1 : 0

  return { start, end, sweepFlag }
}

export function angleArcPath(vertex: Point, towardA: Point, towardB: Point, radius: number) {
  const { start, end, sweepFlag } = angleArcEndpoints(vertex, towardA, towardB, radius)

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y}`
}

export function angleSectorPath(vertex: Point, towardA: Point, towardB: Point, radius: number) {
  const { start, end, sweepFlag } = angleArcEndpoints(vertex, towardA, towardB, radius)

  return `M ${vertex.x} ${vertex.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 ${sweepFlag} ${end.x} ${end.y} Z`
}

function pointAlongRay(start: Point, end: Point, distance: number): Point {
  const vector = {
    x: end.x - start.x,
    y: end.y - start.y,
  }
  const magnitude = Math.hypot(vector.x, vector.y)

  return {
    x: start.x + (vector.x / magnitude) * distance,
    y: start.y + (vector.y / magnitude) * distance,
  }
}

function radiansToDegrees(radians: number) {
  return (radians * 180) / Math.PI
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
