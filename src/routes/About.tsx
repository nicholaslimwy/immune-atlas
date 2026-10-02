import { Link } from 'react-router'
import PageTopbar from '../components/PageTopbar.tsx'
import { useDocumentTitle } from '../components/useDocumentTitle.ts'
import { CREDITS, type Inline } from '../engine/attributions.ts'
import { getCells, getInteractions, getLocations, getMolecules, getTours } from '../engine/content.ts'
import { tourStepPath } from '../engine/tours.ts'

/** Inline pieces from ATTRIBUTIONS.md: text, `code` and links (external ones open in the same tab). */
function Pieces({ parts }: { parts: Inline[] }) {
  return parts.map((p, i) =>
    p.href ? (
      <a key={i} href={p.href}>
        {p.text}
      </a>
    ) : p.code ? (
      <code key={i}>{p.text}</code>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  )
}

const isTextbook = (s: string) => /Janeway's Immunobiology|Cellular and Molecular Immunology/.test(s)
const isOntology = (s: string) => s.startsWith('Cell Ontology')

/** /about: what the atlas is, how far to trust it, where its facts come from, and the credits. */
export default function About() {
  useDocumentTitle('About')
  const cells = getCells()
  const places = getLocations().filter((l) => l.status !== 'stub')
  const reviewed = cells.filter((c) => c.status === 'reviewed').length
  const articles = new Set(cells.flatMap((c) => c.sources).filter((s) => !isTextbook(s) && !isOntology(s))).size
  const tours = getTours()

  return (
    <main id="main" className="about">
      <PageTopbar trail={[{ label: 'About' }]} />
      <h1>About the atlas</h1>

      <aside className="about-note" aria-labelledby="about-note-title">
        <h2 id="about-note-title">For learning, not medical advice</h2>
        <p>
          This atlas explains how a healthy immune system works in general. It is not medical advice and must not be used
          to diagnose, treat or make decisions about anyone&rsquo;s health. If you are worried about your health, talk to
          a doctor or another qualified health professional.
        </p>
      </aside>

      <section aria-labelledby="about-what">
        <h2 id="about-what">What it is</h2>
        <p>
          An interactive, zoomable map of the immune system. Start at the <Link to="/body">whole body</Link>, zoom into a
          tissue, open a cell and read what it does and which cells it talks to. It is written for curious adults through
          to early university and medical students: cell surface markers and the main signalling molecules appear,
          detailed signalling pathways do not.
        </p>
        <p>
          It holds {places.length} places, {cells.length} cell types, {getInteractions().length} recorded interactions
          between them and {getMolecules().length} molecules in the <Link to="/glossary">glossary</Link>. The{' '}
          <Link to="/network">network view</Link> draws every interaction at once
          {tours.length > 0 && (
            <>
              , and the guided tour{' '}
              {tours.map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ', '}
                  <Link to={tourStepPath(t, 0)}>{t.title}</Link>
                </span>
              ))}{' '}
              follows one infection from start to finish
            </>
          )}
          .
        </p>
        <p>
          The pictures are simplified on purpose. Each cell type is one flat icon reused everywhere, and cells are drawn
          at their true size relative to each other, though in the lymph node and spleen scenes far larger than the organ
          around them.
        </p>
      </section>

      <section aria-labelledby="about-trust">
        <h2 id="about-trust">How far to trust it</h2>
        <p>
          {reviewed === 0
            ? `None of the ${cells.length} cell profiles has been signed off yet by a reviewer with immunology training: they are all drafts, and each panel says "not yet reviewed".`
            : `${reviewed} of the ${cells.length} cell profiles have been signed off by a reviewer with immunology training; the others are drafts, and their panels say "not yet reviewed".`}{' '}
          Reviewed panels show the date of their last review.
        </p>
        <p>
          Where mice and people differ, the text says so (&ldquo;human only&rdquo;, &ldquo;mouse only&rdquo;, &ldquo;shown
          mainly in mice&rdquo;), because much of immunology was first worked out in mice. Points that researchers still
          argue about start with &ldquo;Debated:&rdquo;.
        </p>
      </section>

      <section aria-labelledby="about-sources">
        <h2 id="about-sources">Sources</h2>
        <p>Every cell profile lists its own sources at the bottom of its panel. Across the atlas they are:</p>
        <ul>
          <li>
            Murphy K, Weaver C, Berg LJ. <cite>Janeway&rsquo;s Immunobiology</cite>. 10th ed. W. W. Norton; 2022.
          </li>
          <li>
            Abbas AK, Lichtman AH, Pillai S. <cite>Cellular and Molecular Immunology</cite>. 10th ed. Elsevier; 2022.
          </li>
          <li>
            The <a href="https://obofoundry.org/ontology/cl.html">Cell Ontology</a>, the standard naming scheme for cell
            types, linked from each profile.
          </li>
          <li>{articles} journal citations, mostly recent reviews and the original studies behind specific claims.</li>
        </ul>
      </section>

      <section aria-labelledby="about-credits">
        <h2 id="about-credits">Credits</h2>
        {CREDITS.map((section) => (
          <section key={section.heading} aria-label={section.heading} className="about-credits">
            <h3>{section.heading}</h3>
            {section.before.map((p, i) => (
              <p key={i}>
                <Pieces parts={p} />
              </p>
            ))}
            {section.table && (
              <div className="about-table">
                <table role="table">
                  <thead>
                    <tr role="row">
                      {section.table.header.map((h) => (
                        <th key={h} scope="col" role="columnheader">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.table.rows.map((row, r) => (
                      <tr key={r} role="row">
                        {row.map((cell, c) => (
                          <td key={c} data-label={section.table!.header[c]} role="cell">
                            <Pieces parts={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {section.after.map((p, i) => (
              <p key={i}>
                <Pieces parts={p} />
              </p>
            ))}
          </section>
        ))}
      </section>
    </main>
  )
}
