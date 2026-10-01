// A place you can zoom into. Mirrors the Location schema in CLAUDE.md.
export interface Location {
  id: string
  name: string
  /** Parent location id; null only for the root ("body"). Drives zoom-out and breadcrumbs. */
  parent: string | null
  /** URL segment when it differs from the id, e.g. "blood" for "peripheral-blood". */
  slug?: string
  /** Path under public/, e.g. "scenes/peripheral-blood.svg". */
  scene: string
  summary: string
  /** SVG element id -> child location or cell id. */
  hotspots: { region: string; target: string }[]
  /** Which cells appear here, and what they do here. */
  residents: { cell: string; note?: string }[]
}
