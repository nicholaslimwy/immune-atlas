// Colour tokens of the style guide (CLAUDE.md, "Style guide"). Icons in src/icons use these hex
// values literally, and `npm run validate` rejects any other colour there.
import type { Cell } from '../types/cell.ts'

export interface FamilyColours {
  /** Legend name of the family. */
  label: string
  /** The family colour: nuclei, legend swatches, panel accents. */
  base: string
  /** Light fill: cytoplasm. */
  tint: string
  /** Dark detail: granules, receptors, chromatin. */
  shade: string
}

export const FAMILY_COLOURS: Record<Cell['family'], FamilyColours> = {
  'innate-myeloid': { label: 'Innate myeloid', base: '#E4572E', tint: '#FBD9CC', shade: '#A8341A' },
  'innate-lymphoid': { label: 'Innate lymphoid', base: '#8E5BB5', tint: '#E6D8F0', shade: '#5E3580' },
  't-cell': { label: 'T cells', base: '#2F6DB5', tint: '#D3E2F4', shade: '#1D4680' },
  'b-cell': { label: 'B cells', base: '#3E9B63', tint: '#D3ECDD', shade: '#25633D' },
  support: { label: 'Support and stromal', base: '#8A8F98', tint: '#E3E5E8', shade: '#5A5F68' },
}

/** Outlines of membranes and nuclei, and label text. */
export const INK = '#1F2933'

/** Red blood cells are background art, not a family: muted so they never compete with myeloid orange. */
export const RED_CELL = { tint: '#F6D6D6', base: '#D98C8C' }

/** Every colour an icon may use. */
export const ICON_COLOURS: string[] = [
  INK,
  RED_CELL.tint,
  RED_CELL.base,
  ...Object.values(FAMILY_COLOURS).flatMap((f) => [f.base, f.tint, f.shade]),
]
