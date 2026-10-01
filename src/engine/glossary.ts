import type { Cell } from '../types/cell.ts'
import type { Molecule } from '../types/molecule.ts'
import { getCell, getInteractions, getMolecules } from './content.ts'
import { createMentionFinder, type TextPart } from './mentions.ts'

export const KIND_LABELS: Record<Molecule['kind'], string> = {
  cytokine: 'Cytokine',
  chemokine: 'Chemokine',
  receptor: 'Receptor',
  antibody: 'Antibody',
  complement: 'Complement',
  other: 'Molecule',
}

/** Group headings on the glossary page, in the order the groups appear. */
const KIND_HEADINGS: Record<Molecule['kind'], string> = {
  cytokine: 'Cytokines',
  chemokine: 'Chemokines',
  receptor: 'Receptors',
  antibody: 'Antibodies',
  complement: 'Complement',
  other: 'Other molecules',
}

let finder: ReturnType<typeof createMentionFinder> | undefined

/**
 * A function that cuts text into plain parts and molecule mentions, marking each molecule's first
 * mention only. Make one per screen and pass every text on it through, in reading order, from the
 * render body (not from inside a child), so the order never depends on which part re-renders.
 * `skip` ids are never marked: the entry's own molecule on its own page.
 */
export function mentionAnnotator(skip: string[] = []): (text: string) => TextPart[] {
  finder ??= createMentionFinder(getMolecules())
  const seen = new Set(skip)
  const find = finder
  return (text) => find(text, seen)
}

export interface GlossaryItem {
  molecule: Molecule
  /** Cells on either end of an interaction that carries the molecule, by name. */
  cells: Cell[]
}

export interface GlossaryGroup {
  kind: Molecule['kind']
  heading: string
  items: GlossaryItem[]
}

const byName = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' })

/** Every molecule, grouped by kind (empty kinds left out) and sorted A to Z within each group. */
export function glossaryGroups(): GlossaryGroup[] {
  const cellsOf = new Map<string, Map<string, Cell>>()
  for (const ix of getInteractions()) {
    for (const m of ix.via ?? []) {
      const set = cellsOf.get(m) ?? new Map<string, Cell>()
      for (const id of [ix.source, ix.target]) {
        const cell = getCell(id)
        if (cell) set.set(id, cell)
      }
      cellsOf.set(m, set)
    }
  }
  return (Object.keys(KIND_HEADINGS) as Molecule['kind'][])
    .map((kind) => ({
      kind,
      heading: KIND_HEADINGS[kind],
      items: getMolecules()
        .filter((m) => m.kind === kind)
        .sort((a, b) => byName(a.name, b.name))
        .map((molecule) => ({
          molecule,
          cells: [...(cellsOf.get(molecule.id)?.values() ?? [])].sort((a, b) => byName(a.name, b.name)),
        })),
    }))
    .filter((g) => g.items.length > 0)
}
