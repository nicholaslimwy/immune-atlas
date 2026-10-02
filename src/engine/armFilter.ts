// The "highlight one part of the immune system" filter: pick an arm (innate, adaptive...) and the
// other cells are dimmed in scenes and the network and sorted last in search. Pure helpers here;
// the React state lives in components/ArmFilterContext.tsx.
import { CELL_ARMS, type Cell } from '../types/cell.ts'
import { getCells } from './content.ts'

export type Arm = Cell['arm']

/** Visitor-facing names. The `stromal` arm is shown as "Support", the name used everywhere else in the atlas. */
export const ARM_LABELS: Record<Arm, string> = {
  innate: 'Innate',
  adaptive: 'Adaptive',
  'innate-like': 'Innate-like',
  stromal: 'Support',
}

/** Display order: the two big arms first, then the smaller groups. */
const ORDER: Arm[] = ['innate', 'innate-like', 'adaptive', 'stromal']

let cachedArms: Arm[] | undefined

/** The arms that at least one cell has, in display order, so a group with no cells never gets a button. */
export function getArms(): Arm[] {
  cachedArms ??= ORDER.filter((arm) => getCells().some((c) => c.arm === arm))
  return cachedArms
}

export const isArm = (value: unknown): value is Arm =>
  typeof value === 'string' && (CELL_ARMS as readonly string[]).includes(value) && getArms().includes(value as Arm)

/** True when no filter is on, or when the cell belongs to the chosen arm. */
export function matchesArm(arm: Arm | null, cellId: string): boolean {
  return arm === null || getCells().find((c) => c.id === cellId)?.arm === arm
}

/** How many cells an arm holds (for the live region: "Highlighting Innate: 11 of 27 cells"). */
export const countArm = (arm: Arm) => getCells().filter((c) => c.arm === arm).length

const STORAGE_KEY = 'immune-atlas:arm-filter'

/** The remembered choice, or null. Storage can be missing or throw (private windows, blocked site data). */
export function loadArm(): Arm | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isArm(stored) ? stored : null
  } catch {
    return null
  }
}

export function saveArm(arm: Arm | null): void {
  try {
    if (arm) window.localStorage.setItem(STORAGE_KEY, arm)
    else window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // The choice just won't outlive this visit.
  }
}
