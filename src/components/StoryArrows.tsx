import { arrowPath } from '../engine/arrows.ts'
import { SCENE_H, SCENE_W, type LoadedScene } from '../engine/sceneCache.ts'

/** One arrow, as two keys into the scene's measured centres (a hotspot target or a region id). */
export interface ArrowEnds {
  from: string
  to: string
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
