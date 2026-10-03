import { SCENE_H, SCENE_W, type LoadedScene } from '../engine/sceneCache.ts'

/** One arrow, as two keys into the scene's measured centres (a hotspot target or a region id). */
export interface ArrowEnds {
  from: string
  to: string
}

/** How far each end stops short of the centre it points at (scene units), so the arrow does not cover the label. */
const TRIM = 46
/** How far the curve bows to the left of its direction, as a share of its length: A to B and B to A make a loop. */
const BOW = 0.22

/** A curved arrow path from `a` to `b` (scene units), or null when the two are too close to draw one. */
function arrowPath(a: { x: number; y: number }, b: { x: number; y: number }): string | null {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  const trim = Math.min(TRIM, len * 0.2)
  if (len - 2 * trim < 20) return null
  const [ux, uy] = [dx / len, dy / len]
  const p = { x: a.x + ux * trim, y: a.y + uy * trim }
  const q = { x: b.x - ux * trim, y: b.y - uy * trim }
  // Bow to the left of the direction of travel (y grows downwards, so left is (uy, -ux)).
  const bow = BOW * (len - 2 * trim)
  const c = { x: (p.x + q.x) / 2 + uy * bow, y: (p.y + q.y) / 2 - ux * bow }
  const f = (n: number) => n.toFixed(1)
  return `M${f(p.x)} ${f(p.y)} Q${f(c.x)} ${f(c.y)} ${f(q.x)} ${f(q.y)}`
}

/**
 * Movement in a process step, drawn over the scene in the same frame (so it zooms with it): ink arrows
 * on a white casing, with white dots sliding along them in the direction of travel. The dots are not
 * drawn under reduced motion and stop with the Pause scene motion button (CSS). Hidden from screen
 * readers: the step's panel lists the same movement in words.
 */
export default function StoryArrows({ arrows, centres }: { arrows: readonly ArrowEnds[]; centres: LoadedScene['centres'] }) {
  const paths = arrows.flatMap(({ from, to }) => {
    const a = centres[from]
    const b = centres[to]
    const d = a && b ? arrowPath({ x: a.x * SCENE_W, y: a.y * SCENE_H }, { x: b.x * SCENE_W, y: b.y * SCENE_H }) : null
    return d ? [{ key: `${from}>${to}`, d }] : []
  })
  if (!paths.length) return null
  return (
    <svg className="story-arrows" viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} aria-hidden="true" focusable="false">
      <defs>
        <marker id="story-arrowhead" viewBox="0 0 10 10" refX="4" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 Z" fill="#1F2933" stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
        </marker>
      </defs>
      {paths.map(({ key, d }) => (
        <g key={key} className="story-arrow">
          <path d={d} className="story-arrow-casing" />
          <path d={d} className="story-arrow-line" markerEnd="url(#story-arrowhead)" />
          <path d={d} className="story-arrow-flow" />
        </g>
      ))}
    </svg>
  )
}
