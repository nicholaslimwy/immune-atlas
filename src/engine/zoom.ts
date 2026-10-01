import type { Location } from '../types/location.ts'
import { getLocation } from './content.ts'
import type { LoadedScene } from './sceneCache.ts'

export type ZoomDirection = 'in' | 'out' | 'cross'

/**
 * How a scene sits in the stage: scaled by `scale` from its top-left corner, then shifted by
 * `x`, `y` (fractions of the stage). A tour step frames its focus hotspot this way; free
 * exploration always shows the whole scene.
 */
export interface Frame {
  scale: number
  x: number
  y: number
}

export const WHOLE: Frame = { scale: 1, x: 0, y: 0 }

/** How far a tour step zooms toward its focus at most. Enough to point, not so much that labels leave the stage. */
const FOCUS_SCALE = 1.6
/** Room kept between the outermost framed hotspot centre and the stage edge (fraction of the stage),
 *  enough for a cell and the start of its label. */
const PAD = 0.15

type Point = { x: number; y: number }

/**
 * Zoom toward `focus` (fractions of the scene) while keeping every point in `also` (a step's
 * highlighted cells) on the stage; the scene's edges never come inside the stage.
 */
export function frameAround(focus?: Point, also: Point[] = []): Frame {
  if (!focus) return WHOLE
  const pts = [focus, ...also]
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const s = Math.max(1, Math.min(FOCUS_SCALE, 1 / (x1 - x0 + 2 * PAD), 1 / (y1 - y0 + 2 * PAD)))
  const shift = (c: number) => Math.min(0, Math.max(1 - s, 0.5 - s * c))
  return { scale: s, x: shift((x0 + x1) / 2), y: shift((y0 + y1) / 2) }
}

export const sameFrame = (a: Frame, b: Frame) => a.scale === b.scale && a.x === b.x && a.y === b.y

export interface Shown {
  location: Location
  scene: LoadedScene
  frame: Frame
}

export interface ZoomNav {
  direction: ZoomDirection
  /** CSS transform-origin for whichever scene scales big: the hotspot it was entered through. */
  origin: string
}

export const CENTRE = '50% 50%'

function ancestorIds(loc: Location): string[] {
  const ids: string[] = []
  for (let l: Location | undefined = loc; l; l = l.parent ? getLocation(l.parent) : undefined) {
    ids.push(l.id)
  }
  return ids
}

/**
 * Works out the transition purely from the scene we left and the one we arrived at, so
 * hotspot clicks, breadcrumbs, the Back button and browser back/forward all animate alike.
 */
export function computeNav(from: Shown, to: Shown): ZoomNav {
  const toIsDescendant = ancestorIds(to.location).includes(from.location.id)
  const fromIsDescendant = ancestorIds(from.location).includes(to.location.id)
  if (toIsDescendant === fromIsDescendant) return { direction: 'cross', origin: CENTRE }

  const [outer, inner] = toIsDescendant ? [from, to] : [to, from]
  // The first step down from the outer scene toward the inner one.
  const chain = ancestorIds(inner.location)
  const step = chain[chain.indexOf(outer.location.id) - 1]
  const c = outer.scene.centres[step]
  // Where the hotspot sits on the stage, after the outer scene's own frame (a tour may have zoomed it).
  const { scale, x, y } = outer.frame
  return {
    direction: toIsDescendant ? 'in' : 'out',
    origin: c ? `${(x + scale * c.x) * 100}% ${(y + scale * c.y) * 100}%` : CENTRE,
  }
}
