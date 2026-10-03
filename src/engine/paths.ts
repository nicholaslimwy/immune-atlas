import { getCell, getCellHome, getChildren, getLocation, getRoot } from './content.ts'
import type { Cell } from '../types/cell.ts'
import type { Location, Region } from '../types/location.ts'

/** A location's URL segment: its `slug` if it has one, otherwise its id. */
const slugOf = (loc: Location) => loc.slug ?? loc.id

/** What a URL points at: a scene, and optionally a cell or one of the scene's regions whose panel is open over it. */
export interface Resolved {
  location: Location
  cell?: Cell
  region?: Region
}

/**
 * Turn a pathname like /body/blood or /body/blood/neutrophil into a scene and an optional cell,
 * or undefined if it matches nothing. A cell can only be the last segment. Any cell may open over
 * any scene, so interaction links can jump sideways without leaving the place you are in. A region
 * (/body/lymph-node/germinal-centre/dark-zone) opens only over its own scene.
 */
export function resolvePath(pathname: string): Resolved | undefined {
  const segments = pathname.split('/').filter(Boolean)
  let current = getRoot()
  if (!current || segments[0] !== slugOf(current)) return undefined
  for (const [i, segment] of segments.slice(1).entries()) {
    // A stub place has no scene yet, so it has no URL either.
    const child: Location | undefined = getChildren(current.id).find(
      (c) => slugOf(c) === segment && c.status !== 'stub',
    )
    if (child) {
      current = child
      continue
    }
    const isLast = i === segments.length - 2
    if (!isLast) return undefined
    const cell = getCell(segment)
    if (cell) return { location: current, cell }
    const region = current.regions?.find((r) => r.id === segment)
    return region ? { location: current, region } : undefined
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

/** The URL of a region's panel open over its scene. */
export function regionPathFor(loc: Location, regionId: string): string {
  return `${pathFor(loc)}/${regionId}`
}

/** The URL of a molecule's glossary entry. */
export function glossaryPathFor(moleculeId: string): string {
  return `/glossary/${moleculeId}`
}

/** Where a link to a cell or place goes: a cell's panel over `inScene` (or its home), a place's scene. */
export function entityPath(id: string, inScene?: Location): string | undefined {
  const cell = getCell(id)
  if (cell) return cellPathFor(inScene ?? getCellHome(cell), id)
  const loc = getLocation(id)
  return loc && loc.status !== 'stub' ? pathFor(loc) : undefined
}
