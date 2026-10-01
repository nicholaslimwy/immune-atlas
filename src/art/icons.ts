// Cell icons: one SVG file per cell type in src/icons (file name = cell id), drawn once and placed
// everywhere through the sprite (IconSprite.tsx) as <use href="#icon-<cell id>">.
import type { Cell } from '../types/cell.ts'
import { BODY_UNITS, GENERIC_ICON, ICON_SPECS, RED_CELL_ICON, RESERVED_ICONS, type IconSpec } from './iconSpecs.ts'
import { FAMILY_COLOURS } from './palette.ts'

const files = import.meta.glob<string>('../icons/*.svg', { query: '?raw', import: 'default', eager: true })

export interface CellIconArt extends IconSpec {
  id: string
  /** The icon's inner SVG markup, without the outer <svg>. */
  markup: string
}

// The validator guarantees every file is a cell with a spec, or a reserved icon (generic, red cell).
const ALL: CellIconArt[] = Object.entries(files)
  .map(([path, svg]) => {
    const id = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)
    const markup = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    return { id, markup, ...(RESERVED_ICONS[id] ?? ICON_SPECS[id]) }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

/** Every icon in the sprite, the reserved ones (generic, red cell) included. */
export const SPRITE_ICONS = ALL

/** The drawn cell icons (not the generic placeholder or the red cell). */
export const ICONS: CellIconArt[] = ALL.filter((icon) => !(icon.id in RESERVED_ICONS))

export const GENERIC: CellIconArt = ALL.find((icon) => icon.id === GENERIC_ICON)!

/** The red blood cell: background art in blood, and the size reference on /styleguide. */
export const RED_CELL_ART: CellIconArt = ALL.find((icon) => icon.id === RED_CELL_ICON)!

export function getIcon(id: string): CellIconArt | undefined {
  return ICONS.find((icon) => icon.id === id)
}

/** A cell's own icon, or the generic placeholder if it has none yet. */
export const iconOrGeneric = (id: string): CellIconArt => getIcon(id) ?? GENERIC

/** The sprite element id of a cell's icon; prefixed so it never clashes with scene element ids. */
export const iconRef = (id: string) => `icon-${id}`

/** Rendered size of an icon's 100-unit box, in px, when cells are drawn at `pxPerUm`. */
export const iconPx = (icon: IconSpec, pxPerUm: number) => (icon.diameterUm * pxPerUm * 100) / BODY_UNITS

/** CSS variables the generic icon fills from, so a placeholder still shows its family colour. */
export const familyVars = (family: Cell['family']) =>
  ({ '--cell-tint': FAMILY_COLOURS[family].tint, '--cell-base': FAMILY_COLOURS[family].base }) as Record<string, string>
