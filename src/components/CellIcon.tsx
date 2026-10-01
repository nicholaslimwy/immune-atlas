import { getIcon, iconPx, iconRef } from '../art/icons.ts'
import { getCell } from '../engine/content.ts'

/** A cell's icon from the sprite, drawn at `pxPerUm` so cells shown together keep true proportions. */
export default function CellIcon({ cell, pxPerUm }: { cell: string; pxPerUm: number }) {
  const icon = getIcon(cell)
  if (!icon) return null
  const px = iconPx(icon, pxPerUm)
  return (
    <svg className="cell-icon" viewBox="0 0 100 100" width={px} height={px} role="img" aria-label={getCell(cell)?.name ?? cell}>
      <use href={`#${iconRef(cell)}`} />
    </svg>
  )
}
