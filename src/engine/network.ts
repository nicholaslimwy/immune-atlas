// The interaction web for /network: every cell, every place an interaction moves a cell to, and every
// interaction record as an edge. Pure data and geometry; NetworkGraph hands it to Cytoscape.
//
// The layout is fixed, not simulated: innate cells in a column on the left, adaptive cells on the
// right, support cells and places down the middle, each family kept together. Positions never depend
// on the type filter, so a cell stays where the visitor last saw it whichever type is shown.
import type { Cell } from '../types/cell.ts'
import { INTERACTION_TYPES, type Interaction } from '../types/interaction.ts'
import { getCell, getCells, getInteractions, getLocation } from './content.ts'
import { entityPath } from './paths.ts'

export type InteractionType = Interaction['type']

export const isInteractionType = (s: string | null): s is InteractionType =>
  s !== null && (INTERACTION_TYPES as readonly string[]).includes(s)

type Column = 'left' | 'centre' | 'right'

export interface NetNode {
  id: string
  kind: 'cell' | 'place'
  /** The full name, for the side box and for screen readers. */
  name: string
  /** The name without its bracketed gloss, for the graph: "NK cell", not "NK cell (natural killer cell)". */
  label: string
  family?: Cell['family']
  column: Column
  /** Where a tap goes: the cell's panel in its home scene, or the place's scene. */
  path: string
}

export interface NetEdge {
  id: string
  source: string
  target: string
  type: InteractionType
}

export interface Network {
  nodes: NetNode[]
  edges: NetEdge[]
}

/** Families top to bottom within each column. */
const COLUMN_FAMILIES: Record<Column, Cell['family'][]> = {
  left: ['innate-myeloid', 'innate-lymphoid'],
  centre: ['support'],
  right: ['t-cell', 'b-cell'],
}

const columnOf = (family: Cell['family']): Column =>
  (Object.keys(COLUMN_FAMILIES) as Column[]).find((c) => COLUMN_FAMILIES[c].includes(family))!

const shortName = (name: string) => name.split(/\s+\(/)[0]

let cached: Network | undefined

export function getNetwork(): Network {
  if (cached) return cached
  const interactions = getInteractions()
  const nodes: NetNode[] = getCells().map((cell) => ({
    id: cell.id,
    kind: 'cell',
    name: cell.name,
    label: shortName(cell.name),
    family: cell.family,
    column: columnOf(cell.family),
    path: entityPath(cell.id)!,
  }))
  // Only the places some interaction points at become nodes ("moves to" targets).
  const placeIds = [...new Set(interactions.map((ix) => ix.target).filter((id) => !getCell(id)))]
  for (const id of placeIds) {
    const loc = getLocation(id)
    const path = entityPath(id)
    if (!loc || !path) continue
    nodes.push({ id, kind: 'place', name: loc.name, label: loc.name, column: 'centre', path })
  }
  const known = new Set(nodes.map((n) => n.id))
  const edges = interactions
    .filter((ix) => known.has(ix.source) && known.has(ix.target))
    .map((ix) => ({ id: ix.id, source: ix.source, target: ix.target, type: ix.type }))
    .sort((a, b) => a.id.localeCompare(b.id))
  cached = { nodes, edges }
  return cached
}

/** How many records of each type exist (types with none included, at 0). */
export function typeCounts(edges: NetEdge[]): Record<InteractionType, number> {
  const counts = Object.fromEntries(INTERACTION_TYPES.map((t) => [t, 0])) as Record<InteractionType, number>
  for (const e of edges) counts[e.type]++
  return counts
}

/** The edges of one type (all of them when `type` is null) and the nodes they touch. */
export function visiblePart(net: Network, type: InteractionType | null) {
  const edges = type ? net.edges.filter((e) => e.type === type) : net.edges
  const touched = new Set(edges.flatMap((e) => [e.source, e.target]))
  const nodes = type ? net.nodes.filter((n) => touched.has(n.id)) : net.nodes
  return {
    edges,
    nodes,
    cells: nodes.filter((n) => n.kind === 'cell').length,
    places: nodes.filter((n) => n.kind === 'place').length,
  }
}

// ---- Layout ----------------------------------------------------------------------------------

/** "wide" puts labels beside the side columns (desktop); "narrow" puts every label under its node (phones). */
export type LayoutMode = 'wide' | 'narrow'

export interface Placed {
  x: number
  y: number
  /** Where the label sits relative to the node. */
  label: 'left' | 'right' | 'below'
}

export interface Layout {
  positions: Map<string, Placed>
  /** Bend of each edge, as Cytoscape's control-point-distance from the straight line (model units). */
  bends: Map<string, number>
}

const GEOMETRY: Record<LayoutMode, { columnX: Record<Column, number>; row: number; blockGap: number; bulge: number }> = {
  wide: { columnX: { left: -300, centre: 0, right: 300 }, row: 62, blockGap: 30, bulge: 60 },
  narrow: { columnX: { left: -118, centre: 0, right: 118 }, row: 64, blockGap: 24, bulge: 0 },
}

/**
 * The order of nodes within each column: families in their fixed order, and within a family the
 * cells sorted a few times by the mean height of their partners (the barycentre rule), which
 * shortens edges and removes many crossings. Deterministic: ties fall back to the name.
 */
function columnOrders(net: Network): Record<Column, NetNode[]> {
  const blocks = new Map<string, NetNode[]>()
  for (const n of net.nodes) {
    const key = n.kind === 'place' ? 'centre:place' : `${n.column}:${n.family}`
    blocks.set(key, [...(blocks.get(key) ?? []), n])
  }
  const blockKeys: Record<Column, string[]> = {
    left: COLUMN_FAMILIES.left.map((f) => `left:${f}`),
    centre: [...COLUMN_FAMILIES.centre.map((f) => `centre:${f}`), 'centre:place'],
    right: COLUMN_FAMILIES.right.map((f) => `right:${f}`),
  }
  for (const list of blocks.values()) list.sort((a, b) => a.label.localeCompare(b.label))

  const neighbours = new Map<string, string[]>()
  for (const e of net.edges) {
    neighbours.set(e.source, [...(neighbours.get(e.source) ?? []), e.target])
    neighbours.set(e.target, [...(neighbours.get(e.target) ?? []), e.source])
  }
  const order = (): Record<Column, NetNode[]> =>
    Object.fromEntries(
      (Object.keys(blockKeys) as Column[]).map((c) => [c, blockKeys[c].flatMap((k) => blocks.get(k) ?? [])]),
    ) as Record<Column, NetNode[]>

  for (let sweep = 0; sweep < 6; sweep++) {
    const cols = order()
    // Height as a fraction of the column, so columns of different lengths compare fairly.
    const rank = new Map<string, number>()
    for (const list of Object.values(cols)) list.forEach((n, i) => rank.set(n.id, (i + 0.5) / list.length))
    for (const list of blocks.values()) {
      const score = new Map(
        list.map((n) => {
          const ns = neighbours.get(n.id) ?? []
          return [n.id, ns.length ? ns.reduce((s, id) => s + rank.get(id)!, 0) / ns.length : rank.get(n.id)!]
        }),
      )
      list.sort((a, b) => score.get(a.id)! - score.get(b.id)! || a.label.localeCompare(b.label))
    }
  }

  return order()
}

export function layoutNetwork(net: Network, mode: LayoutMode): Layout {
  const g = GEOMETRY[mode]
  const cols = columnOrders(net)
  const positions = new Map<string, Placed>()

  for (const c of Object.keys(cols) as Column[]) {
    const list = cols[c]
    const ys: number[] = []
    let y = 0
    list.forEach((n, i) => {
      const prev = list[i - 1]
      // A wider gap where one family (or the places) begins.
      if (prev) y += g.row + (prev.family !== n.family || prev.kind !== n.kind ? g.blockGap : 0)
      ys.push(y)
    })
    const height = y
    list.forEach((n, i) => {
      // Side columns bow outward in the middle, so edges between neighbours in one column have room to curve.
      const t = height ? ys[i] / height : 0.5
      const bow = Math.sin(Math.PI * t) * g.bulge
      const x = c === 'left' ? g.columnX.left - bow : c === 'right' ? g.columnX.right + bow : g.columnX.centre
      const label = mode === 'narrow' || c === 'centre' ? 'below' : c
      positions.set(n.id, { x, y: ys[i] - height / 2, label })
    })
  }

  // Bends. Edges are grouped by their unordered pair of ends, and each offset is worked out on
  // the "canonical" side of the pair (lower id first), then flipped for edges that run the other way,
  // because Cytoscape measures the bend from each edge's own direction.
  const pairs = new Map<string, NetEdge[]>()
  for (const e of net.edges) {
    const key = [e.source, e.target].sort().join('|')
    pairs.set(key, [...(pairs.get(key) ?? []), e])
  }
  const columnOfNode = new Map(net.nodes.map((n) => [n.id, n.column]))
  const bends = new Map<string, number>()
  for (const [key, list] of pairs) {
    const [a, b] = key.split('|')
    const pa = positions.get(a)!
    const pb = positions.get(b)!
    const dx = pb.x - pa.x
    const dy = pb.y - pa.y
    const len = Math.hypot(dx, dy) || 1
    // Cytoscape's positive side: the normal (-dy, dx) of the line from source to target.
    const nx = -dy / len
    let base: number
    const column = columnOfNode.get(a)
    if (column === columnOfNode.get(b)) {
      // Bow toward the middle of the graph (to the right inside the centre column), so the edge
      // does not run along the column over the cells between its ends.
      const towards = column === 'right' ? -1 : 1
      base = Math.sign(nx * towards || 1) * Math.min(0.32 * len, mode === 'wide' ? 150 : 90)
    } else {
      base = 0.1 * len
    }
    list.forEach((e, k) => {
      const offset = base + Math.sign(base || 1) * k * 14
      bends.set(e.id, e.source === a ? offset : -offset)
    })
  }

  return { positions, bends }
}
