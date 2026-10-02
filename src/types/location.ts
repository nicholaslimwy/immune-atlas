// A place you can zoom into. Mirrors the Location schema in CLAUDE.md.
export const LOCATION_STATUSES = ['stub'] as const

export interface Location {
  id: string
  name: string
  /** Parent location id; null only for the root ("body"). Drives zoom-out and breadcrumbs. */
  parent: string | null
  /** URL segment when it differs from the id, e.g. "blood" for "peripheral-blood". */
  slug?: string
  /** Path under public/, e.g. "scenes/peripheral-blood.svg". A stub's scene is planned, not drawn yet. */
  scene: string
  summary: string
  /** What the scene shows, in a sentence or two, for people who cannot see it (read by screen readers). Required once the scene is built. */
  description?: string
  /** One line shown under the scene, for every visitor: the point the picture makes. */
  caption?: string
  /** SVG element id -> child location or cell id. */
  hotspots: { region: string; target: string }[]
  /** Which cells appear here, and what they do here. */
  residents: { cell: string; note?: string }[]
  /** "stub" = a place in the tree with no scene yet: its hotspot shows "coming soon" instead of zooming.
   *  Absent once the scene is built. */
  status?: (typeof LOCATION_STATUSES)[number]
}
