import { useEffect, useRef } from 'react'
import { Link, useNavigate, useNavigationType, useParams } from 'react-router'
import { getMolecule } from '../engine/content.ts'
import { usesOfMolecule, type MoleculeUse } from '../engine/interactions.ts'
import { entityPath } from '../engine/paths.ts'
import NotFound from './NotFound.tsx'

const KIND_LABELS = {
  cytokine: 'Cytokine',
  chemokine: 'Chemokine',
  receptor: 'Receptor',
  antibody: 'Antibody',
  complement: 'Complement',
  other: 'Molecule',
} as const

/** A cell or place name that links to where it lives; plain text if it has no page. */
function EntityLink({ end }: { end: MoleculeUse['source'] }) {
  const to = entityPath(end.id)
  return to ? <Link to={to}>{end.name}</Link> : <>{end.name}</>
}

/** A molecule's glossary entry (/glossary/<id>): what it is and every recorded interaction it carries. */
export default function GlossaryEntry() {
  const { id } = useParams()
  const navigate = useNavigate()
  const arrivedByClick = useNavigationType() === 'PUSH'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const molecule = id ? getMolecule(id) : undefined

  // Arriving from a search result or a link moves focus to the title; a direct page load does not.
  useEffect(() => {
    if (arrivedByClick) headingRef.current?.focus()
  }, [id, arrivedByClick])

  if (!molecule) return <NotFound />
  const uses = usesOfMolecule(molecule.id)
  // history.state.idx is React Router's position in this tab's history: 0 means nothing to go back to.
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  return (
    <main className="glossary">
      <div className="topbar">
        <button type="button" className="back" onClick={() => (canGoBack ? navigate(-1) : navigate('/body'))}>
          ← Back
        </button>
        <nav aria-label="Breadcrumb">
          <ol className="crumbs">
            <li>
              <Link to="/body">Whole body</Link>
            </li>
            <li>
              <span aria-current="page">Glossary</span>
            </li>
          </ol>
        </nav>
      </div>
      <h1 tabIndex={-1} ref={headingRef}>
        {molecule.name}
      </h1>
      <p className="panel-meta">{KIND_LABELS[molecule.kind]}</p>
      <p>{molecule.summary}</p>
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
                <p>{u.description}</p>
                {u.where.length > 0 && <p className="ix-meta">In {u.where.join(', ')}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
