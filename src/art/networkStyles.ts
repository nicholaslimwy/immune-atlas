// How the network view (/network) draws cells, places and interaction types. Each family keeps its
// colours from the style guide and gains a shape, and each interaction type has a colour, a line
// pattern and an arrowhead, so neither colour nor shape carries a meaning alone.
import type { Css } from 'cytoscape'
import type { Cell } from '../types/cell.ts'
import type { Interaction } from '../types/interaction.ts'
import { ANATOMY, INK } from './palette.ts'

/** Cytoscape node shapes, one per family. */
export const FAMILY_SHAPES: Record<Cell['family'], Css.NodeShape> = {
  'innate-myeloid': 'ellipse',
  'innate-lymphoid': 'round-diamond',
  't-cell': 'round-rectangle',
  'b-cell': 'hexagon',
  support: 'round-triangle',
}

/** Places (targets of "moves to") are drawn in anatomy colours, never a family's, so they never read as cells. */
export const PLACE_STYLE: { shape: Css.NodeShape; fill: string; border: string } = { shape: 'barrel', fill: ANATOMY.follicle, border: ANATOMY.lymphBase }

export interface EdgeStyle {
  /** Okabe-Ito colours (safe for the common colour-vision deficiencies), plus ink. */
  colour: string
  /** Cytoscape line-dash-pattern; empty for a solid line. */
  dash: number[]
  arrow: Extract<Css.ArrowShape, 'triangle' | 'vee' | 'diamond' | 'triangle-cross' | 'circle' | 'chevron' | 'tee' | 'triangle-backcurve' | 'square'>
  width: number
}

export const EDGE_STYLES: Record<Interaction['type'], EdgeStyle> = {
  activates: { colour: '#D55E00', dash: [], arrow: 'triangle', width: 2 },
  'presents-antigen-to': { colour: '#0072B2', dash: [7, 4], arrow: 'vee', width: 2 },
  helps: { colour: '#009E73', dash: [], arrow: 'diamond', width: 2 },
  kills: { colour: INK, dash: [], arrow: 'triangle-cross', width: 3 },
  phagocytoses: { colour: '#CC79A7', dash: [1, 4], arrow: 'circle', width: 2.5 },
  recruits: { colour: '#E69F00', dash: [8, 3, 2, 3], arrow: 'chevron', width: 2 },
  suppresses: { colour: INK, dash: [], arrow: 'tee', width: 2 },
  'differentiates-into': { colour: '#8A8F98', dash: [13, 4], arrow: 'triangle-backcurve', width: 2 },
  'migrates-to': { colour: '#56B4E9', dash: [2, 6], arrow: 'square', width: 2.5 },
}
