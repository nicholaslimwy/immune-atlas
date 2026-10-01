import type { Location } from '../types/location.ts'
import { getLocation } from './content.ts'
import type { LoadedScene } from './sceneCache.ts'

export type ZoomDirection = 'in' | 'out' | 'cross'

export interface Shown {
  location: Location
  scene: LoadedScene
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
  return {
    direction: toIsDescendant ? 'in' : 'out',
    origin: c ? `${c.x * 100}% ${c.y * 100}%` : CENTRE,
  }
}
