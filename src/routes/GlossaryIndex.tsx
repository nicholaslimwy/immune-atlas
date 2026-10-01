import { Link } from 'react-router'
import GlossaryTopbar from '../components/GlossaryTopbar.tsx'
import { glossaryGroups } from '../engine/glossary.ts'
import { entityPath, glossaryPathFor } from '../engine/paths.ts'

/** /glossary: every molecule, grouped by kind and A to Z, each with the cells it acts between. */
export default function GlossaryIndex() {
  const groups = glossaryGroups()
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <main className="glossary">
      <GlossaryTopbar />
      <h1>Glossary</h1>
      <p>
        {total} molecules the cells use to talk to each other. Open one for what it does and every recorded interaction
        it carries; the cells beneath each name are the ones it acts between.
      </p>
      <nav aria-label="Jump to a group" className="glossary-jump">
        <ul>
          {groups.map((g) => (
            <li key={g.kind}>
              <a href={`#glossary-${g.kind}`}>{g.heading}</a> <span className="panel-meta">({g.items.length})</span>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((g) => (
        <section key={g.kind} id={`glossary-${g.kind}`} aria-labelledby={`glossary-${g.kind}-title`}>
          <h2 id={`glossary-${g.kind}-title`}>{g.heading}</h2>
          <ul className="glossary-list">
            {g.items.map(({ molecule, cells }) => (
              <li key={molecule.id}>
                <h3>
                  <Link to={glossaryPathFor(molecule.id)}>{molecule.name}</Link>
                </h3>
                <p>{molecule.summary}</p>
                {cells.length > 0 && (
                  <p className="panel-meta glossary-cells">
                    Acts between:{' '}
                    {cells.map((cell, i) => (
                      <span key={cell.id}>
                        {i > 0 && ', '}
                        <Link to={entityPath(cell.id)!}>{cell.name}</Link>
                      </span>
                    ))}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
