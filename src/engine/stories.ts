// Guided tours and processes are both stories: numbered steps, each a framing of a scene with a caption.
// A tour moves between scenes; a process stays in one. One player (SceneRoute + TourPanel) plays both.
import type { Location } from '../types/location.ts'
import type { Process, ProcessArrow } from '../types/process.ts'
import type { Tour } from '../types/tour.ts'
import { getCell, getLocation, getProcess, getTour } from './content.ts'

export type StoryKind = 'tour' | 'process'

export interface StoryStep {
  /** Location id: the scene this step shows. */
  location: string
  focus?: string
  caption: string
  highlight: string[]
  interactions: string[]
  arrows: readonly ProcessArrow[]
}

export interface Story {
  kind: StoryKind
  id: string
  title: string
  steps: StoryStep[]
}

/** The URL folder of each kind: /tours/<id>/<n>, /processes/<id>/<n>. */
const FOLDER: Record<StoryKind, string> = { tour: 'tours', process: 'processes' }
const NO_ARROWS: readonly ProcessArrow[] = []

/** The player's own wording for each kind (site text, not science). */
export const STORY_WORDS: Record<StoryKind, { badge: string; noun: string; exit: string; done: string; end: string; restart: string }> = {
  tour: {
    badge: 'Guided tour',
    noun: 'Tour',
    exit: 'Exit tour',
    done: 'Tour complete',
    end: 'That is the end of the tour. Play it again, or explore the atlas freely: every cell in the scene opens its profile.',
    restart: '↺ Restart tour',
  },
  process: {
    badge: 'How it works',
    noun: 'Process',
    exit: 'Close',
    done: 'All steps shown',
    end: 'That is the whole process. Play it again, or explore the scene freely: every cell and area in it opens a panel.',
    restart: '↺ Play again',
  },
}

// One Story object per tour or process, so its steps keep their identity between renders.
const made = new Map<string, Story>()

export function tourStory(tour: Tour): Story {
  const key = `tour/${tour.id}`
  let story = made.get(key)
  if (!story) {
    story = { kind: 'tour', id: tour.id, title: tour.title, steps: tour.steps.map((s) => ({ ...s, arrows: NO_ARROWS })) }
    made.set(key, story)
  }
  return story
}

export function processStory(process: Process): Story {
  const key = `process/${process.id}`
  let story = made.get(key)
  if (!story) {
    story = {
      kind: 'process',
      id: process.id,
      title: process.title,
      steps: process.steps.map((s) => ({ ...s, location: process.location, arrows: s.arrows ?? NO_ARROWS })),
    }
    made.set(key, story)
  }
  return story
}

/**
 * What a /tours/... or /processes/... URL points at. `index` is 0-based; undefined means no step was
 * given, and an index equal to the step count is the end screen (/<folder>/<id>/end).
 */
export interface StoryMatch {
  story: Story
  index?: number
}

/** /tours/infection -> the tour; /tours/infection/3 -> its third step; .../end -> the end screen. Same for processes. */
export function resolveStoryPath(pathname: string): StoryMatch | undefined {
  const [first, id, step, ...rest] = pathname.split('/').filter(Boolean)
  if (!id || rest.length) return undefined
  const tour = first === FOLDER.tour ? getTour(id) : undefined
  const process = first === FOLDER.process ? getProcess(id) : undefined
  const story = tour ? tourStory(tour) : process ? processStory(process) : undefined
  if (!story) return undefined
  if (step === undefined) return { story }
  if (step === 'end') return { story, index: story.steps.length }
  const n = Number(step)
  // "3" only: not "03", "3.0" or "-1".
  if (!Number.isInteger(n) || String(n) !== step || n < 1 || n > story.steps.length) return undefined
  return { story, index: n - 1 }
}

/** The URL of a step; steps are numbered from 1 in URLs, and the index after the last is the end screen. */
export function storyStepPath(story: Story, index: number): string {
  const base = `/${FOLDER[story.kind]}/${story.id}`
  return index >= story.steps.length ? `${base}/end` : `${base}/${index + 1}`
}

/** The URL of a tour's step (from the tour's content record). */
export const tourStepPath = (tour: Tour, index: number) => storyStepPath(tourStory(tour), index)

/** The URL of a process's step (from the process's content record). */
export const processStepPath = (process: Process, index: number) => storyStepPath(processStory(process), index)

/**
 * The key a place in a scene is measured under (LoadedScene.centres): a hotspot's target, found by its
 * region id or its target, or a region's id.
 */
export function pointKey(loc: Location, id: string): string | undefined {
  const hotspot = loc.hotspots.find((h) => h.region === id) ?? loc.hotspots.find((h) => h.target === id)
  if (hotspot) return hotspot.target
  return loc.regions?.some((r) => r.id === id) ? id : undefined
}

/** The name of a place in a scene that an arrow starts or ends at: a region's, or a hotspot target's. */
export function pointName(loc: Location, id: string): string {
  const region = loc.regions?.find((r) => r.id === id)
  if (region) return region.name
  const key = pointKey(loc, id) ?? id
  return getCell(key)?.name ?? getLocation(key)?.name ?? id
}

/** What a step zooms toward, as a centres key (see pointKey). */
export function focusKey(loc: Location, step: StoryStep): string | undefined {
  return step.focus === undefined ? undefined : pointKey(loc, step.focus)
}

/** The step's scene. The validator guarantees it exists and is not a stub. */
export function stepLocation(step: StoryStep): Location | undefined {
  const loc = getLocation(step.location)
  return loc?.status === 'stub' ? undefined : loc
}
