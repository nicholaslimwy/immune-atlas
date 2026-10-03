import type { Ref } from 'react'
import { Link, useNavigate } from 'react-router'
import { m } from 'framer-motion'
import { getCell } from '../engine/content.ts'
import { mentionAnnotator } from '../engine/glossary.ts'
import { cellPathFor, pathFor } from '../engine/paths.ts'
import MoleculeText from './MoleculeText.tsx'
import type { Location, Region } from '../types/location.ts'

interface Props {
  region: Region
  /** The scene the region belongs to; closing returns to it. */
  location: Location
  headingRef?: Ref<HTMLHeadingElement>
}

/** Side panel for a labelled area of a scene. Everything it says comes from the location's JSON. */
export default function RegionPanel({ region, location, headingRef }: Props) {
  const navigate = useNavigate()
  const closeTo = pathFor(location)
  // One annotator for the panel, in reading order: each molecule is marked at its first mention only.
  const mark = mentionAnnotator()
  const summary = mark(region.summary)
  const happens = region.happens.map(mark)
  const cells = region.cells.flatMap((id) => getCell(id) ?? [])

  return (
    <m.aside
      key={region.id}
      className="panel"
      aria-labelledby="region-panel-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') navigate(closeTo)
      }}
    >
      <div className="panel-head">
        <h2 id="region-panel-title" tabIndex={-1} ref={headingRef}>
          {region.name}
        </h2>
        <Link to={closeTo} className="panel-close" aria-label={`Close ${region.name} panel`}>
          ×
        </Link>
      </div>
      <p className="panel-meta">Area of the {location.name.toLowerCase()}</p>
      <p>
        <MoleculeText parts={summary} />
      </p>

      {happens.length > 0 && (
        <section>
          <h3>What happens here</h3>
          <ul>
            {happens.map((parts, i) => (
              <li key={region.happens[i]}>
                <MoleculeText parts={parts} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {cells.length > 0 && (
        <section>
          <h3>Cells found here</h3>
          <ul className="region-cells">
            {cells.map((cell) => (
              <li key={cell.id}>
                <Link to={cellPathFor(location, cell.id)}>{cell.name}</Link>
                {cell.status === 'stub' && <span className="soon-tag">full profile coming soon</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </m.aside>
  )
}
