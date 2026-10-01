// A place you can zoom into. Mirrors the Location schema in CLAUDE.md.
export interface Location {
  id: string
  name: string
  parent: string | null
  scene: string
  summary: string
  hotspots: { region: string; target: string }[]
  residents: { cell: string; note?: string }[]
}
