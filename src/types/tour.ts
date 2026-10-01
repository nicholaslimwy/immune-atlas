// A guided tour: a story told as steps, each one a framing of a scene. Mirrors CLAUDE.md.
export interface TourStep {
  /** Location id: the scene this step shows (never a stub). */
  location: string
  /** A hotspot in that scene to zoom toward: its region id, or the cell or location it targets.
   *  Absent = the whole scene. */
  focus?: string
  caption: string
  /** Cell ids to highlight; each must be a hotspot target in the step's scene. */
  highlight: string[]
  /** Interaction ids this step illustrates, listed under the caption. */
  interactions: string[]
}

export interface Tour {
  id: string
  title: string
  steps: TourStep[]
}
