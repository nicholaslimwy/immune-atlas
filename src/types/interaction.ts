// Who does what to whom. Mirrors the Interaction schema in CLAUDE.md.
export const INTERACTION_TYPES = [
  'activates',
  'presents-antigen-to',
  'helps',
  'kills',
  'phagocytoses',
  'recruits',
  'suppresses',
  'differentiates-into',
  'migrates-to',
] as const

export interface Interaction {
  /** Convention: <source>-<type>-<target>. */
  id: string
  /** Cell id. */
  source: string
  /** Cell id, or a location id for "migrates-to". */
  target: string
  type: (typeof INTERACTION_TYPES)[number]
  /** Molecule ids, e.g. ["mhc-ii", "il-12"]. */
  via?: string[]
  /** Location ids. */
  where?: string[]
  description: string
}
