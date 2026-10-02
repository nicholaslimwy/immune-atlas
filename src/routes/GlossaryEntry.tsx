import { useEffect, useRef } from 'react'
import { Link, useNavigationType, useParams } from 'react-router'
import { getMolecule } from '../engine/content.ts'
import GlossaryTopbar from '../components/GlossaryTopbar.tsx'
import { useDocumentTitle } from '../components/useDocumentTitle.ts'
import MoleculeText from '../components/MoleculeText.tsx'
import { KIND_LABELS, mentionAnnotator } from '../engine/glossary.ts'
import { usesOfMolecule, type MoleculeUse } from '../engine/interactions.ts'
import { entityPath } from '../engine/paths.ts'
import NotFound from './NotFound.tsx'

/** A cell or place name that links to where it lives; plain text if it has no page. */
function EntityLink({ end }: { end: MoleculeUse['source'] }) {
  const to = entityPath(end.id)
  return to ? <Link to={to}>{end.name}</Link> : <>{end.name}</>
}

/** A molecule's glossary entry (/glossary/<id>): what it is and every recorded interaction it carries. */
export default function GlossaryEntry() {
  const { id } = useParams()
  const arrivedByClick = useNavigationType() === 'PUSH'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const molecule = id ? getMolecule(id) : undefined
  useDocumentTitle(molecule ? `${molecule.name}: glossary` : 'Not found')

  // Arriving from a search result or a link moves focus to the title; a direct page load does not.
  useEffect(() => {
    if (arrivedByClick) headingRef.current?.focus()
  }, [id, arrivedByClick])

  if (!molecule) return <NotFound />
  const uses = usesOfMolecule(molecule.id)
  // The entry's own name is never marked on its own page; other molecules are marked at first mention.
  const mark = mentionAnnotator([molecule.id])

  return (
    <main id="main" className="glossary">
      <GlossaryTopbar entry={molecule.name} />
      <h1 tabIndex={-1} ref={headingRef}>
        {molecule.name}
      </h1>
      <p className="panel-meta">{KIND_LABELS[molecule.kind]}</p>
      <p>
        <MoleculeText parts={mark(molecule.summary)} />
      </p>
      {molecule.aliases && molecule.aliases.length > 0 && (
        <p className="panel-meta">Also written: {molecule.aliases.join(', ')}</p>
      )}

      <section>
        <h2>Where it acts</h2>
        {uses.length === 0 ? (
          <p>No interactions recorded yet.</p>
        ) : (
          <ul className="interactions">
            {uses.map((u) => (
              <li key={u.id}>
                <p className="ix-head">
                  <EntityLink end={u.source} /> <span className="ix-verb">{u.verb}</span> <EntityLink end={u.target} />
                </p>
                <p>
                  <MoleculeText parts={mark(u.description)} />
                </p>
                {u.where.length > 0 && <p className="ix-meta">In {u.where.join(', ')}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
