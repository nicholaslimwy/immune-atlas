// Scene loops (content/loops): turns a loop's routes and actors into timelines, and says where each
// moving cell is, and how it looks, at any moment. Pure: SceneLoop.tsx draws what this returns.
import type { LoopActor, LoopEffect, LoopRound, LoopStop, SceneLoop } from '../types/loop.ts'

export interface Pt {
  x: number
  y: number
}

/** One stretch of an actor's timeline: travelling between two points, or waiting at one. */
export interface Segment {
  t0: number
  t1: number
  phase: string
  from: Pt
  to: Pt
  /** Control point of the curve (a stay has from = to = ctrl). */
  ctrl: Pt
  move: boolean
  effect?: LoopEffect
  /** The round's level (receptor shape after this round's division). */
  level: number
  /** The level shown before a division in this stretch: last round's. */
  before: number
  /** Antigen pieces held during this stretch (set by an earlier `take` in the round). */
  carry: number
  /** The cell was gone (died or left) before this stretch: it fades in. */
  enter: boolean
  /** Unit direction of the last move into this point: where the cell came from faces away from it. */
  dir: Pt
}

export interface Timeline {
  segments: Segment[]
  duration: number
}

/** How a moving cell looks at one moment. Positions are in scene units. */
export interface ActorFrame {
  /** Died or left, and not back yet: draw nothing. */
  gone: boolean
  phase: string
  x: number
  y: number
  opacity: number
  /** Division: stretch along `angle` (degrees), 1 = round. */
  stretch: number
  angle: number
  /** Overall size, 1 = true size (a dying cell shrinks). */
  scale: number
  dying: boolean
  /** The level whose marks the cell shows. */
  look: number
  /** The other daughter of a division, drifting away and fading into the crowd. */
  sibling?: { x: number; y: number; opacity: number; look: number }
  /** Antigen pieces, at absolute positions. */
  pieces: Pt[]
  /** Help signal arriving. */
  help: { x: number; y: number; opacity: number }[]
}

const DEFAULT_BOW = 0.18
/** Distance (scene units) from a cell's centre at which antigen and signals start, just outside its membrane. */
const REACH = 44
/** How far the two daughters end up apart, and where the one not followed fades out. */
const SPLIT_GAP = 46

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
const clamp01 = (u: number) => Math.min(1, Math.max(0, u))
/** 0 before `a`, 1 after `b`, smooth between. */
const ramp = (u: number, a: number, b: number) => {
  const v = clamp01((u - a) / (b - a))
  return v * v * (3 - 2 * v)
}

/** The point a stop names, through the actor's slots. */
export function placeOf(loop: SceneLoop, at: string, slots: Record<string, string>): Pt | undefined {
  const name = at.startsWith('$') ? slots[at.slice(1)] : at
  const p = name === undefined ? undefined : loop.places[name]
  return p ? { x: p[0], y: p[1] } : undefined
}

/** The curve's control point: bowed to the left of travel (y grows downwards), so there and back make a loop. */
function control(a: Pt, b: Pt, bow: number): Pt {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return { x: (a.x + b.x) / 2 + dy * bow, y: (a.y + b.y) / 2 - dx * bow }
}

const ends = (effect?: LoopEffect) => effect === 'die' || effect === 'leave'

/** Lays an actor's rounds end to end. Unknown places are skipped (the validator reports them). */
export function buildTimeline(loop: SceneLoop, rounds: LoopRound[], slots: Record<string, string>): Timeline {
  const segments: Segment[] = []
  let t = 0
  let here: Pt | undefined
  let dir: Pt = { x: 1, y: 0 }
  // A loop joins up: if the last round ends with the cell gone, the first one starts with it fading in.
  const lastStops = loop.routes[rounds[rounds.length - 1]?.route] ?? []
  let gone = lastStops.some((s) => ends(s.do))
  let before = rounds[rounds.length - 1]?.level ?? 0
  for (const round of rounds) {
    let carry = 0
    for (const stop of loop.routes[round.route] ?? []) {
      const to = placeOf(loop, stop.at, slots)
      if (!to) continue
      const base = { phase: stop.phase, level: round.level, before, effect: stop.do }
      if (stop.move && here) {
        const len = Math.hypot(to.x - here.x, to.y - here.y) || 1
        dir = { x: (to.x - here.x) / len, y: (to.y - here.y) / len }
        segments.push({
          ...base,
          t0: t,
          t1: t + stop.move,
          from: here,
          to,
          ctrl: control(here, to, stop.bow ?? DEFAULT_BOW),
          move: true,
          carry,
          enter: false,
          dir,
        })
        t += stop.move
        if (ends(stop.do)) gone = true
      }
      here = to
      const face = stop.face === undefined ? undefined : placeOf(loop, stop.face, slots)
      if (face) {
        const len = Math.hypot(face.x - to.x, face.y - to.y) || 1
        dir = { x: (face.x - to.x) / len, y: (face.y - to.y) / len }
      }
      if (stop.stay) {
        segments.push({ ...base, t0: t, t1: t + stop.stay, from: to, to, ctrl: to, move: false, carry, enter: gone, dir })
        gone = false
        t += stop.stay
        if (stop.do === 'take') carry = round.level
      }
    }
    before = round.level
  }
  return { segments, duration: t }
}

/** The total length of an actor's rounds, in seconds. */
export const actorDuration = (loop: SceneLoop, actor: LoopActor) => buildTimeline(loop, actor.rounds, actor.slots).duration

/** The level the other daughter shows: a different mutation from the one followed. */
const siblingLook = (level: number) => (level + 2) % 4

/** Where an actor is, and how it looks, `time` seconds into its timeline (wraps round). */
export function sampleTimeline({ segments, duration }: Timeline, time: number, axisDeg: number): ActorFrame {
  const t = ((time % duration) + duration) % duration
  const seg = segments.find((s) => t < s.t1) ?? segments[segments.length - 1]
  const u = clamp01((t - seg.t0) / (seg.t1 - seg.t0 || 1))
  const frame: ActorFrame = {
    gone: false,
    phase: seg.phase,
    x: seg.to.x,
    y: seg.to.y,
    opacity: 1,
    stretch: 1,
    angle: axisDeg,
    scale: 1,
    dying: false,
    look: seg.level,
    pieces: [],
    help: [],
  }
  if (seg.move) {
    const s = ramp(u, 0, 1)
    const a = (1 - s) * (1 - s)
    const b = 2 * s * (1 - s)
    const c = s * s
    frame.x = a * seg.from.x + b * seg.ctrl.x + c * seg.to.x
    frame.y = a * seg.from.y + b * seg.ctrl.y + c * seg.to.y
  }
  const { dir } = seg
  // Antigen held inside the cell, in a short row across it, just behind the side it touched.
  const held = (n: number) =>
    Array.from({ length: n }, (_, k) => ({
      x: frame.x + dir.x * 12 - dir.y * (k - (n - 1) / 2) * 9,
      y: frame.y + dir.y * 12 + dir.x * (k - (n - 1) / 2) * 9,
    }))
  if (seg.effect !== 'take') frame.pieces = held(seg.carry)

  if (seg.enter) frame.opacity = ramp(t - seg.t0, 0, 0.6)

  switch (seg.effect) {
    case 'divide': {
      // Round, stretch, pinch in two, the daughters part, and the one not followed fades into the crowd.
      frame.look = u < 0.47 ? seg.before : seg.level
      frame.pieces = []
      const rad = (axisDeg * Math.PI) / 180
      const ax = { x: Math.cos(rad), y: Math.sin(rad) }
      if (u < 0.47) {
        frame.stretch = 1 + 0.32 * ramp(u, 0.25, 0.47)
      } else {
        const part = ramp(u, 0.47, 0.68)
        const back = lerp(-SPLIT_GAP * 0.24, 0, part)
        const away = lerp(SPLIT_GAP * 0.24, SPLIT_GAP, part) + 8 * ramp(u, 0.68, 1)
        frame.x += ax.x * back
        frame.y += ax.y * back
        frame.sibling = {
          x: seg.to.x + ax.x * away,
          y: seg.to.y + ax.y * away,
          opacity: 1 - ramp(u, 0.7, 1),
          look: siblingLook(seg.level),
        }
      }
      break
    }
    case 'take': {
      // Pieces leave the antigen-holding process ahead of the cell, one after another, and end up inside it.
      const end = held(seg.level)
      frame.pieces = end.map((p, k) => {
        const v = ramp(u, 0.15 + 0.15 * k, 0.55 + 0.15 * k)
        const sx = p.x + dir.x * (REACH - 12)
        const sy = p.y + dir.y * (REACH - 12)
        return { x: lerp(sx, p.x, v), y: lerp(sy, p.y, v) }
      })
      break
    }
    case 'help': {
      // Only a cell that shows antigen gets help: two signal dots cross from the helper and fade inside it.
      if (seg.carry > 0) {
        frame.help = [-1, 1].map((side, k) => {
          const v = ramp(u, 0.15 + 0.12 * k, 0.6 + 0.12 * k)
          const off = { x: -dir.y * side * 8, y: dir.x * side * 8 }
          return {
            x: frame.x + off.x + dir.x * lerp(REACH, 6, v),
            y: frame.y + off.y + dir.y * lerp(REACH, 6, v),
            opacity: v === 0 ? 0 : 1 - ramp(u, 0.75, 1),
          }
        })
      }
      break
    }
    case 'die': {
      // It shrinks and fades on the way, and is swallowed at the end (the macrophage is drawn over it).
      frame.dying = u > 0.12
      frame.scale = lerp(1, 0.72, ramp(u, 0, 0.3)) * lerp(1, 0.25, ramp(u, 0.8, 1))
      frame.opacity *= lerp(1, 0.55, ramp(u, 0, 0.5)) * (1 - ramp(u, 0.85, 1))
      frame.pieces = []
      break
    }
    case 'leave':
      frame.opacity *= 1 - ramp(u, 0.65, 1)
      break
  }
  if (ends(seg.effect) && u >= 1) frame.gone = true
  return frame
}

/** A stop's route length check for the validator: seconds of one route. */
export const routeSeconds = (stops: LoopStop[]) => stops.reduce((sum, s) => sum + (s.move ?? 0) + (s.stay ?? 0), 0)
