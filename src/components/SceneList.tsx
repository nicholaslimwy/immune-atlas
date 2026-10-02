import { Link } from 'react-router'
import { FAMILY_COLOURS } from '../art/palette.ts'
import { getCell, getLocation } from '../engine/content.ts'
import { cellPathFor, pathFor } from '../engine/paths.ts'
import type { Location } from '../types/location.ts'

/**
 * The same things the scene's hotspots open, as a plain list of links in tab order. It is the way in
 * for anyone who cannot aim at small shapes (a screen reader, a switch, a thumb on a phone where the
 * scene's labels are tiny).
 */
export default function SceneList({ location }: { location: Location }) {
  const items = location.hotspots.flatMap(({ target }) => {
    const place = getLocation(target)
    if (place) {
      return [{ key: target, name: place.name, kind: 'Place', to: place.status === 'stub' ? undefined : pathFor(place), soon: place.status === 'stub' }]
    }
    const cell = getCell(target)
    if (!cell) return []
    return [{ key: target, name: cell.name, kind: `Cell · ${FAMILY_COLOURS[cell.family].label}`, to: cellPathFor(location, target), soon: false }]
  })
  if (items.length === 0) return null
  return (
    <details className="scene-list">
      <summary>List view: everything in this scene ({items.length})</summary>
      <ul>
        {items.map((item) => (
          <li key={item.key}>
            {item.to ? <Link to={item.to}>{item.name}</Link> : <span>{item.name}</span>}
            <span className="scene-list-kind">
              {item.kind}
              {item.soon && ', coming soon'}
            </span>
          </li>
        ))}
      </ul>
    </details>
  )
}
