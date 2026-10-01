import { getCell, getChildren, getLocation, getRoot } from './content.ts'
import type { Cell } from '../types/cell.ts'
import type { Location } from '../types/location.ts'

/** A location's URL segment: its `slug` if it has one, otherwise its id. */
const slugOf = (loc: Location) => loc.slug ?? loc.id

/** What a URL points at: a scene, and optionally a cell whose panel is open over it. */
export interface Resolved {
  location: Location
  cell?: Cell
}

/**
 * Turn a pathname like /body/blood or /body/blood/neutrophil into a scene and an optional cell,
 * or undefined if it matches nothing. A cell can only be the last segment. Any cell may open over
 * any scene, so interaction links can jump sideways without leaving the place you are in.
 */
export function resolvePath(pathname: string): Resolved | undefined {
  const segments = pathname.split('/').filter(Boolean)
  let current = getRoot()
  if (!current || segments[0] !== slugOf(current)) return undefined
  for (const [i, segment] of segments.slice(1).entries()) {
    const child: Location | undefined = getChildren(current.id).find((c) => slugOf(c) === segment)
    if (child) {
      current = child
      continue
    }
    const cell = getCell(segment)
    const isLast = i === segments.length - 2
    return cell && isLast ? { location: current, cell } : undefined
  }
  return { location: current }
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

/** The URL of a cell's panel open over `loc`'s scene. */
export function cellPathFor(loc: Location, cellId: string): string {
  return `${pathFor(loc)}/${cellId}`
}
