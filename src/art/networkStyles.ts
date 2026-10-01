// How the /network view draws interactions and nodes. Colour never carries meaning alone: each
// interaction type also has its own line pattern and arrowhead, and each family its own node shape.
import type { Cell } from '../types/cell.ts'
import type { Interaction } from '../types/interaction.ts'

export interface EdgeStyle {
  colour: string
  line: 'solid' | 'dashed' | 'dotted'
  width: number
  /** A Cytoscape target-arrow-shape. */
  arrow: 'triangle' | 'vee' | 'diamond' | 'triangle-cross' | 'circle-triangle' | 'chevron' | 'tee' | 'triangle-backcurve'
}

export const EDGE_STYLES: Record<Interaction['type'], EdgeStyle> = {
  activates: { colour: '#1F2933', line: 'solid', width: 1.5, arrow: 'triangle' },
  'presents-antigen-to': { colour: '#1971C2', line: 'dashed', width: 1.5, arrow: 'vee' },
  helps: { colour: '#9C6B00', line: 'solid', width: 1.5, arrow: 'diamond' },
  kills: { colour: '#C92A2A', line: 'solid', width: 3, arrow: 'triangle-cross' },
  phagocytoses: { colour: '#7048E8', line: 'dotted', width: 2.5, arrow: 'circle-triangle' },
  recruits: { colour: '#0B7285', line: 'dashed', width: 1.5, arrow: 'chevron' },
  suppresses: { colour: '#A61E4D', line: 'solid', width: 1.5, arrow: 'tee' },
  'differentiates-into': { colour: '#495057', line: 'solid', width: 3, arrow: 'triangle-backcurve' },
  'migrates-to': { colour: '#087F5B', line: 'dotted', width: 2.5, arrow: 'vee' },
}

/** Node shapes (Cytoscape names): one per colour family, and one for places. */
export const NODE_SHAPES: Record<Cell['family'] | 'location', string> = {
  'innate-myeloid': 'ellipse',
  'innate-lymphoid': 'round-pentagon',
  't-cell': 'round-rectangle',
  'b-cell': 'round-hexagon',
  support: 'round-diamond',
  location: 'barrel',
}
