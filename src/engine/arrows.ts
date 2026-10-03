// Curved arrows drawn over scenes: process steps (StoryArrows) and the still diagram of a scene loop (SceneLoop).

/** How far each end stops short of the centre it points at (scene units), so the arrow does not cover the label. */
const TRIM = 46
/** How far the curve bows to the left of its direction, as a share of its length: A to B and B to A make a loop. */
const BOW = 0.22

/**
 * A curved arrow path from `a` to `b` (scene units), or null when the two are too close to draw one.
 * Each end stops `trimBy` short of its point; the curve bows `bowBy` of its length to the left of travel.
 */
export function arrowPath(
  a: { x: number; y: number },
  b: { x: number; y: number },
  trimBy = TRIM,
  bowBy = BOW,
): string | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const trim = Math.min(trimBy, len * 0.2)
  if (len - 2 * trim < 20) return null
  const [ux, uy] = [dx / len, dy / len]
  const p = { x: a.x + ux * trim, y: a.y + uy * trim }
  const q = { x: b.x - ux * trim, y: b.y - uy * trim }
  // Bow to the left of the direction of travel (y grows downwards, so left is (uy, -ux)).
  const bow = bowBy * (len - 2 * trim)
  const c = { x: (p.x + q.x) / 2 + uy * bow, y: (p.y + q.y) / 2 - ux * bow }
  const f = (n: number) => n.toFixed(1)
  return `M${f(p.x)} ${f(p.y)} Q${f(c.x)} ${f(c.y)} ${f(q.x)} ${f(q.y)}`
}
