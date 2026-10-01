import { getChildren, getLocation, getRoot } from './content.ts'
import type { Location } from '../types/location.ts'

/** A location's URL segment: its `slug` if it has one, otherwise its id. */
const slugOf = (loc: Location) => loc.slug ?? loc.id

/** Turn a pathname like /body/blood into a Location, or undefined if it matches nothing. */
export function resolvePath(pathname: string): Location | undefined {
  const segments = pathname.split('/').filter(Boolean)
  let current = getRoot()
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
