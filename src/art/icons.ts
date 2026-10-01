// Cell icons: one SVG file per cell type in src/icons (file name = cell id), drawn once and placed
// everywhere through the sprite (IconSprite.tsx) as <use href="#icon-<cell id>">.
import { BODY_UNITS, ICON_SPECS, type IconSpec } from './iconSpecs.ts'

const files = import.meta.glob<string>('../icons/*.svg', { query: '?raw', import: 'default', eager: true })

export interface CellIconArt extends IconSpec {
  id: string
  /** The icon's inner SVG markup, without the outer <svg>. */
  markup: string
}

// The validator guarantees every file has a spec.
export const ICONS: CellIconArt[] = Object.entries(files)
  .map(([path, svg]) => {
    const id = path.slice(path.lastIndexOf('/') + 1, -'.svg'.length)
    const markup = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    return { id, markup, ...ICON_SPECS[id] }
  })
  .sort((a, b) => a.id.localeCompare(b.id))

export function getIcon(id: string): CellIconArt | undefined {
  return ICONS.find((icon) => icon.id === id)
}

/** The sprite element id of a cell's icon; prefixed so it never clashes with scene element ids. */
export const iconRef = (id: string) => `icon-${id}`

/** Rendered size of an icon's 100-unit box, in px, when cells are drawn at `pxPerUm`. */
export const iconPx = (icon: IconSpec, pxPerUm: number) => (icon.diameterUm * pxPerUm * 100) / BODY_UNITS
