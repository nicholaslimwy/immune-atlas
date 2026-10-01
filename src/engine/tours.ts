import type { Location } from '../types/location.ts'
import type { Tour, TourStep } from '../types/tour.ts'
import { getLocation, getTour } from './content.ts'

/** What a /tours/... URL points at. `index` is 0-based; undefined means no step was given. */
export interface TourMatch {
  tour: Tour
  index?: number
}

/** /tours/infection -> the tour; /tours/infection/3 -> its third step. Anything else: undefined. */
export function resolveTourPath(pathname: string): TourMatch | undefined {
  const [first, id, step, ...rest] = pathname.split('/').filter(Boolean)
  const tour = first === 'tours' && id ? getTour(id) : undefined
  if (!tour || rest.length) return undefined
  if (step === undefined) return { tour }
  const n = Number(step)
  // "3" only: not "03", "3.0" or "-1".
  if (!Number.isInteger(n) || String(n) !== step || n < 1 || n > tour.steps.length) return undefined
  return { tour, index: n - 1 }
}

/** The URL of a step; steps are numbered from 1 in URLs. */
export function tourStepPath(tour: Tour, index: number): string {
  return `/tours/${tour.id}/${index + 1}`
}

/** The hotspot a step zooms toward, matched by region id first, then by target. */
export function focusHotspot(loc: Location, step: TourStep): Location['hotspots'][number] | undefined {
  if (step.focus === undefined) return undefined
  return loc.hotspots.find((h) => h.region === step.focus) ?? loc.hotspots.find((h) => h.target === step.focus)
}

/** The step's scene. The validator guarantees it exists and is not a stub. */
export function stepLocation(step: TourStep): Location | undefined {
  const loc = getLocation(step.location)
  return loc?.status === 'stub' ? undefined : loc
}
