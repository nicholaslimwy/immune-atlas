import { getChildren, getLocation } from './content.ts'
import type { Location } from '../types/location.ts'

// URL segment for locations whose segment differs from their id.
// Phase 2 should decide whether this moves into the schema or stays here.
const SLUGS: Record<string, string> = {
  'peripheral-blood': 'blood',
}

const slugOf = (loc: Location) => SLUGS[loc.id] ?? loc.id

/** Turn a pathname like /body/blood into a Location, or undefined if it matches nothing. */
export function resolvePath(pathname: string): Location | undefined {
  const segments = pathname.split('/').filter(Boolean)
  let current = getLocation('body')
  if (!current || segments[0] !== slugOf(current)) return undefined
  for (const segment of segments.slice(1)) {
    current = getChildren(current.id).find((child) => slugOf(child) === segment)
    if (!current) return undefined
  }
  return current
}

/** Turn a Location into its URL, by walking up through parents. */
export function pathFor(loc: Location): string {
  const slugs: string[] = []
  let current: Location | undefined = loc
  while (current) {
    slugs.unshift(slugOf(current))
    current = current.parent ? getLocation(current.parent) : undefined
  }
  return '/' + slugs.join('/')
}
