import { familyVars, iconOrGeneric, iconPx, iconRef } from '../art/icons.ts'
import { getCell } from '../engine/content.ts'

/**
 * A cell's icon from the sprite, drawn at `pxPerUm` so cells shown together keep true proportions.
 * Cells with no icon yet get the generic placeholder in their family colours.
 */
export default function CellIcon({ cell, pxPerUm }: { cell: string; pxPerUm: number }) {
  const data = getCell(cell)
  const icon = iconOrGeneric(cell)
  const px = iconPx(icon, pxPerUm)
  return (
    <svg
      className="cell-icon"
      viewBox="0 0 100 100"
      width={px}
      height={px}
      role="img"
      aria-label={data?.name ?? cell}
      style={data ? familyVars(data.family) : undefined}
    >
      <use href={`#${iconRef(icon.id)}`} />
    </svg>
  )
}
