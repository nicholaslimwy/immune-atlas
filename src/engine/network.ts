// The interaction web as plain data for the /network view and its list: cells (and, for
// "migrates-to", places) as nodes, interaction records as edges. Pure; reads content only.
import type { Cell } from '../types/cell.ts'
import { INTERACTION_TYPES, type Interaction } from '../types/interaction.ts'
import { getCell, getCells, getInteractions, getLocation, getMolecule } from './content.ts'
import { entityPath } from './paths.ts'

export type InteractionType = Interaction['type']

export const isInteractionType = (s: string | null): s is InteractionType =>
  !!s && (INTERACTION_TYPES as readonly string[]).includes(s)

export interface NetNode {
  id: string
  name: string
  kind: 'cell' | 'location'
  family?: Cell['family']
  /** Where a click goes: the cell's panel in its home scene, or the place's scene. Absent for a stub place. */
  path?: string
}

export interface NetEdge {
  id: string
  source: NetNode
  target: NetNode
  type: InteractionType
  description: string
  via: { id: string; name: string }[]
  where: { id: string; name: string }[]
}

export interface Network {
  nodes: NetNode[]
  edges: NetEdge[]
}

function nodeOf(id: string): NetNode {
  const cell = getCell(id)
  if (cell) return { id, name: cell.name, kind: 'cell', family: cell.family, path: entityPath(id) }
  const loc = getLocation(id)
  return { id, name: loc?.name ?? id, kind: 'location', path: entityPath(id) }
}

/**
 * The web, optionally cut down to one interaction type. With no filter every cell is a node;
 * with one, only the ends of the remaining edges are (a cell with nothing to show would float alone).
 */
export function buildNetwork(type?: InteractionType): Network {
  const records = getInteractions().filter((ix) => !type || ix.type === type)
  const edges = records
    .map(
      (ix): NetEdge => ({
        id: ix.id,
        source: nodeOf(ix.source),
        target: nodeOf(ix.target),
        type: ix.type,
        description: ix.description,
        via: (ix.via ?? []).map((m) => ({ id: m, name: getMolecule(m)?.name ?? m })),
        where: (ix.where ?? []).map((l) => ({ id: l, name: getLocation(l)?.name ?? l })),
      }),
    )
    .sort((a, b) => a.source.name.localeCompare(b.source.name) || a.target.name.localeCompare(b.target.name))
  const nodes = new Map<string, NetNode>()
  if (!type) for (const c of getCells()) nodes.set(c.id, nodeOf(c.id))
  for (const e of edges) {
    nodes.set(e.source.id, e.source)
    nodes.set(e.target.id, e.target)
  }
  return { nodes: [...nodes.values()].sort((a, b) => a.name.localeCompare(b.name)), edges }
}

/** How many interaction records there are of each type. */
export function interactionCounts(): Record<InteractionType, number> {
  const counts = Object.fromEntries(INTERACTION_TYPES.map((t) => [t, 0])) as Record<InteractionType, number>
  for (const ix of getInteractions()) counts[ix.type]++
  return counts
}
