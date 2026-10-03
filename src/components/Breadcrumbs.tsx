import { Link } from 'react-router'
import { getLocation } from '../engine/content.ts'
import { pathFor } from '../engine/paths.ts'
import type { Cell } from '../types/cell.ts'
import type { Location, Region } from '../types/location.ts'

/** Whole body › Peripheral blood › Neutrophil. Each earlier crumb zooms back out to that level.
 *  An open panel (a cell, or a region of the scene) is the last crumb. */
export default function Breadcrumbs({ location, cell, region }: { location: Location; cell?: Cell; region?: Region }) {
  const open = cell?.name ?? region?.name
  const trail: Location[] = []
  for (let l: Location | undefined = location; l; l = l.parent ? getLocation(l.parent) : undefined) {
    trail.unshift(l)
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="crumbs">
        {trail.map((l) => (
          <li key={l.id}>
            {l.id === location.id && !open ? (
              <span aria-current="page">{l.name}</span>
            ) : (
              <Link to={pathFor(l)}>{l.name}</Link>
            )}
          </li>
        ))}
        {open && (
          <li>
            <span aria-current="page">{open}</span>
          </li>
        )}
      </ol>
    </nav>
  )
}
