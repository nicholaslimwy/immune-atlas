import { Link } from 'react-router'
import { getLocation } from '../engine/content.ts'
import { pathFor } from '../engine/paths.ts'
import type { Cell } from '../types/cell.ts'
import type { Location } from '../types/location.ts'

/** Whole body › Peripheral blood › Neutrophil. Each earlier crumb zooms back out to that level. */
export default function Breadcrumbs({ location, cell }: { location: Location; cell?: Cell }) {
  const trail: Location[] = []
  for (let l: Location | undefined = location; l; l = l.parent ? getLocation(l.parent) : undefined) {
    trail.unshift(l)
  }

  return (
    <nav aria-label="Breadcrumb">
      <ol className="crumbs">
        {trail.map((l) => (
          <li key={l.id}>
            {l.id === location.id && !cell ? (
              <span aria-current="page">{l.name}</span>
            ) : (
              <Link to={pathFor(l)}>{l.name}</Link>
            )}
          </li>
        ))}
        {cell && (
          <li>
            <span aria-current="page">{cell.name}</span>
          </li>
        )}
      </ol>
    </nav>
  )
}
