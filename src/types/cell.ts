// A cell type, independent of where it is found. Mirrors the Cell schema in CLAUDE.md.
export const CELL_ARMS = ['innate', 'adaptive', 'innate-like', 'stromal'] as const
export const CELL_LINEAGES = ['myeloid', 'lymphoid', 'stromal', 'other'] as const
export const CELL_STATUSES = ['stub', 'draft', 'reviewed'] as const

export interface Cell {
  id: string
  name: string
  /** Standard Cell Ontology id, e.g. "CL:0000775". */
  cellOntologyId?: string
  arm: (typeof CELL_ARMS)[number]
  lineage: (typeof CELL_LINEAGES)[number]
  /** Family-tree parent, e.g. "granulocyte". */
  parent?: string
  markers: string[]
  /** 2-3 sentences for the panel. */
  summary: string
  functions: string[]
  abundance?: string
  /** Citations. Required unless status is "stub". */
  sources: string[]
  /** stub = placeholder text; draft = written, not yet signed off; reviewed = signed off. */
  status: (typeof CELL_STATUSES)[number]
  /** ISO date (YYYY-MM-DD) of the last review. Required once status is "reviewed". */
  lastReviewed?: string
}
