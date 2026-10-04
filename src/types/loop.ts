// A looping animation inside one scene: a few cells follow routes between named places, round after
// round, staggered so they never move in lockstep. Mirrors the SceneLoop schema in CLAUDE.md.
// Played by SceneLoop.tsx from the timeline in src/engine/loop.ts; a still diagram stands in under reduced motion.

/** What happens to the cell while it travels to, or stays at, a stop. */
export const LOOP_EFFECTS = ['divide', 'take', 'help', 'die', 'leave'] as const
export type LoopEffect = (typeof LOOP_EFFECTS)[number]

/** Extra marks drawn on the moving cells whose shape follows the round's level. */
export const LOOP_MARKS = ['b-cell-receptor'] as const
export type LoopMarks = (typeof LOOP_MARKS)[number]

/** One stop on a route: travel to a place (move), then wait there (stay). */
export interface LoopStop {
  /** A place name, or "$<slot>" filled from the actor's slots. */
  at: string
  /** Phase id this stretch belongs to (what a process step highlights). */
  phase: string
  /** Seconds travelling here from the previous stop; absent or 0 = already here. */
  move?: number
  /** Seconds waiting here. */
  stay?: number
  /** How far the path bows to the left of travel, as a share of its length (default 0.18). */
  bow?: number
  /** divide and take and help act during the stay; die and leave during the move. */
  do?: LoopEffect
  /** A place the cell faces while it stays (antigen and signals arrive from that side); default: the way it was going. */
  face?: string
}

/** A phase of the loop, named in words and tied to the steps of a process told in the same scene. */
export interface LoopPhase {
  id: string
  name: string
  /** 1-based step numbers of the loop's process during which this phase is highlighted. */
  steps: number[]
}

/**
 * One round an actor plays: a route and how well its receptor binds this time (0-3), or a wait off stage
 * (so cells can take turns: one on stage at a time).
 */
export interface LoopRound {
  route?: string
  /** 0-3: sets the shape of the marks and how many antigen pieces a `take` picks up. With `route`. */
  level?: number
  /** Seconds off stage, instead of a route. The cell fades back in at the start of its next round. */
  wait?: number
}

/** One moving cell. All actors' rounds must add up to the same length, so the loop joins up. */
export interface LoopActor {
  /** Seconds into its own timeline at which it starts: the stagger. */
  start: number
  /** Slot name -> place name, for the routes' "$<slot>" stops. */
  slots: Record<string, string>
  rounds: LoopRound[]
}

/** A frozen cell in the still diagram: a route sampled at a moment, as an actor would play it. */
export interface LoopStillCell {
  route: string
  level: number
  /** Seconds into the route. */
  time: number
  slots: Record<string, string>
}

/** An arrow in the still diagram, between two places. */
export interface LoopStillArrow {
  from: string
  to: string
  phase: string
  bow?: number
}

export interface SceneLoop {
  id: string
  /** The scene it plays in; the scene's SVG marks where it is drawn with <g data-loop="<id>">. */
  location: string
  /** A process told in the same scene: while one of its steps is open, the matching phases are highlighted. */
  process?: string
  /** Cell id the moving cells are drawn as (its icon, or the generic one in its family colours). */
  look: string
  /** Cell id whose family colour the `help` signal is drawn in. */
  signal?: string
  marks?: LoopMarks
  /** Ring every cell on stage, so the eye can follow it (for loops that show one cell at a time). */
  follow?: boolean
  /** The short label on the stage: "Sped up". */
  speed: string
  /** Said after it where there is room: "a real round takes hours". */
  speedNote?: string
  /** Named points, [x, y] in scene units (800 x 500). */
  places: Record<string, [number, number]>
  phases: LoopPhase[]
  /** Reusable rounds: lists of stops. */
  routes: Record<string, LoopStop[]>
  actors: LoopActor[]
  /** Drawn instead of the animation under reduced motion. */
  still: { cells: LoopStillCell[]; arrows: LoopStillArrow[] }
}
