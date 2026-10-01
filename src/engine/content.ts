// The one place the app reads /content. Components ask these functions; they never hold content.
// The files are checked by `npm run validate` (scripts/validate.ts), so this trusts their shape.
import type { Cell } from '../types/cell.ts'
import type { Interaction } from '../types/interaction.ts'
import type { Location } from '../types/location.ts'
import type { Molecule } from '../types/molecule.ts'
import type { Tour } from '../types/tour.ts'

const glob = {
  locations: import.meta.glob<Location>('../../content/locations/*.json', { eager: true, import: 'default' }),
  cells: import.meta.glob<Cell>('../../content/cells/*.json', { eager: true, import: 'default' }),
  interactions: import.meta.glob<Interaction>('../../content/interactions/*.json', { eager: true, import: 'default' }),
  molecules: import.meta.glob<Molecule>('../../content/molecules/*.json', { eager: true, import: 'default' }),
  tours: import.meta.glob<Tour>('../../content/tours/*.json', { eager: true, import: 'default' }),
}

const byId = <T extends { id: string }>(files: Record<string, T>) =>
  new Map<string, T>(Object.values(files).map((item) => [item.id, item]))

const locations = byId(glob.locations)
const cells = byId(glob.cells)
const interactions = byId(glob.interactions)
const molecules = byId(glob.molecules)
const tours = byId(glob.tours)

export function getLocation(id: string): Location | undefined {
  return locations.get(id)
}

/** The top of the zoom tree: the one location without a parent. */
export function getRoot(): Location | undefined {
  return [...locations.values()].find((loc) => loc.parent === null)
}

export function getChildren(id: string): Location[] {
  return [...locations.values()].filter((loc) => loc.parent === id)
}

export function getCell(id: string): Cell | undefined {
  return cells.get(id)
}

export function getCells(): Cell[] {
  return [...cells.values()]
}

export function getInteractions(): Interaction[] {
  return [...interactions.values()]
}

export function getInteraction(id: string): Interaction | undefined {
  return interactions.get(id)
}

export function getMolecule(id: string): Molecule | undefined {
  return molecules.get(id)
}

/** Every interaction where `id` is the source or the target (what a cell panel lists). */
export function getInteractionsOf(id: string): Interaction[] {
  return [...interactions.values()].filter((i) => i.source === id || i.target === id)
}

export function getTour(id: string): Tour | undefined {
  return tours.get(id)
}

export function getTours(): Tour[] {
  return [...tours.values()]
}

export function getLocations(): Location[] {
  return [...locations.values()]
}

export function getMolecules(): Molecule[] {
  return [...molecules.values()]
}

/**
 * The place a search result opens `cell`'s panel in: its `home` if it has one, otherwise the first
 * built place (by id) that lists it as a resident, otherwise the whole body.
 */
export function getCellHome(cell: Cell): Location {
  const home = cell.home ? locations.get(cell.home) : undefined
  if (home) return home
  const sorted = [...locations.values()].sort((a, b) => a.id.localeCompare(b.id))
  return sorted.find((l) => l.status !== 'stub' && l.residents.some((r) => r.cell === cell.id)) ?? getRoot()!
}
