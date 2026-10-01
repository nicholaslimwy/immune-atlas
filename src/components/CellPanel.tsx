import type { Ref } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { getLocation } from '../engine/content.ts'
import { interactionLinksOf, type InteractionLink } from '../engine/interactions.ts'
import { cellPathFor, pathFor } from '../engine/paths.ts'
import type { Cell } from '../types/cell.ts'
import type { Location } from '../types/location.ts'

const ARM_LABELS: Record<Cell['arm'], string> = {
  innate: 'Innate',
  adaptive: 'Adaptive',
  'innate-like': 'Innate-like',
  stromal: 'Support and stromal',
}

const LINEAGE_LABELS: Record<Cell['lineage'], string> = {
  myeloid: 'Myeloid',
  lymphoid: 'Lymphoid',
  stromal: 'Stromal',
  other: 'Other',
}

const ontologyUrl = (id: string) => `https://purl.obolibrary.org/obo/${id.replace(':', '_')}`

interface Props {
  cell: Cell
  /** The scene the panel is open over; links stay in it, and closing returns to it. */
  location: Location
  headingRef?: Ref<HTMLHeadingElement>
}

/** Side panel for one cell. Everything it says comes from the cell's JSON and its interactions. */
export default function CellPanel({ cell, location, headingRef }: Props) {
  const navigate = useNavigate()
  const closeTo = pathFor(location)
  const links = interactionLinksOf(cell.id)
  const stub = cell.status === 'stub'

  const hrefFor = (other: InteractionLink['other']) => {
    const loc = other.kind === 'location' ? getLocation(other.id) : undefined
    return loc ? pathFor(loc) : cellPathFor(location, other.id)
  }

  return (
    <motion.aside
      key={cell.id}
      className="panel"
      aria-labelledby="cell-panel-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') navigate(closeTo)
      }}
    >
      <div className="panel-head">
        <h2 id="cell-panel-title" tabIndex={-1} ref={headingRef}>
          {cell.name}
        </h2>
        <Link to={closeTo} className="panel-close" aria-label={`Close ${cell.name} panel`}>
          ×
        </Link>
      </div>
      <p className="panel-meta">
        {ARM_LABELS[cell.arm]} · {LINEAGE_LABELS[cell.lineage]} lineage
      </p>

      {stub ? (
        <p className="soon">Full profile coming soon.</p>
      ) : (
        <>
          <p>{cell.summary}</p>

          {cell.markers.length > 0 && (
            <section>
              <h3>Markers</h3>
              <ul className="markers">
                {cell.markers.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          )}

          {cell.functions.length > 0 && (
            <section>
              <h3>What it does</h3>
              <ul>
                {cell.functions.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          )}

          {cell.abundance && (
            <section>
              <h3>Abundance</h3>
              <p>{cell.abundance}</p>
            </section>
          )}
        </>
      )}

      <section>
        <h3>Interacts with</h3>
        {links.length === 0 ? (
          <p>No interactions recorded yet.</p>
        ) : (
          <ul className="interactions">
            {links.map((ix) => (
              <li key={ix.id}>
                <p className="ix-head">
                  <span className="ix-verb">{ix.verb}</span> <Link to={hrefFor(ix.other)}>{ix.other.name}</Link>
                  {ix.other.stub && <span className="soon-tag">full profile coming soon</span>}
                </p>
                <p>{ix.description}</p>
                {(ix.via.length > 0 || ix.where.length > 0) && (
                  <p className="ix-meta">
                    {ix.via.length > 0 && <>Via {ix.via.join(', ')}</>}
                    {ix.via.length > 0 && ix.where.length > 0 && ' · '}
                    {ix.where.length > 0 && <>In {ix.where.join(', ')}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!stub && (
        <footer className="panel-foot">
          {cell.sources.length > 0 && (
            <details>
              <summary>Sources ({cell.sources.length})</summary>
              <ol>
                {cell.sources.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </details>
          )}
          {cell.cellOntologyId && (
            <p>
              Cell Ontology:{' '}
              <a href={ontologyUrl(cell.cellOntologyId)} target="_blank" rel="noreferrer">
                {cell.cellOntologyId}
              </a>
            </p>
          )}
          <p>
            Last reviewed:{' '}
            {cell.lastReviewed ?? (cell.status === 'draft' ? 'not yet reviewed (draft)' : 'not recorded')}
          </p>
        </footer>
      )}
    </motion.aside>
  )
}
