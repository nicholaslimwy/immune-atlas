// How something happens, told as steps inside one scene. Mirrors the Process schema in CLAUDE.md.
// Played by the same engine as a guided tour (src/engine/stories.ts), launched from "See how it works".

/** Movement drawn on the scene: an arrow from one place in it to another. */
export interface ProcessArrow {
  /** A hotspot region or target, or a region id, in the process's scene. */
  from: string
  to: string
}

export interface ProcessStep {
  /** A hotspot (region or target) or a region id to zoom toward. Absent = the whole scene. */
  focus?: string
  caption: string
  /** Cell ids to highlight; each must be a hotspot target in the scene. */
  highlight: string[]
  /** Interaction ids this step illustrates, listed under the caption. */
  interactions: string[]
  /** Movement to draw in this step. */
  arrows?: ProcessArrow[]
}

export interface Process {
  id: string
  title: string
  /** Location id: the one scene every step shows (never a stub). */
  location: string
  steps: ProcessStep[]
}
