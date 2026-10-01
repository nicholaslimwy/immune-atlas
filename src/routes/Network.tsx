import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useNavigationType, useSearchParams } from 'react-router'
import { EDGE_STYLES, type EdgeStyle } from '../art/networkStyles.ts'
import PageTopbar from '../components/PageTopbar.tsx'
import { typeLabel } from '../engine/interactions.ts'
import { buildNetwork, interactionCounts, isInteractionType, type NetEdge, type NetNode } from '../engine/network.ts'
import { glossaryPathFor } from '../engine/paths.ts'
import { INTERACTION_TYPES } from '../types/interaction.ts'

const NetworkGraph = lazy(() => import('../components/NetworkGraph.tsx'))

/** A cell or place name that links into the scenes; plain text for a stub place. */
function NodeLink({ node }: { node: NetNode }) {
  return node.path ? <Link to={node.path}>{node.name}</Link> : <>{node.name}</>
}

/** The arrowheads approximate Cytoscape's shapes, drawn at the end of a 44 px legend line. */
function ArrowHead({ arrow, colour }: { arrow: EdgeStyle['arrow']; colour: string }) {
  const solid = { fill: colour, stroke: colour }
  switch (arrow) {
    case 'tee':
      return <line x1="38" y1="1" x2="38" y2="13" stroke={colour} strokeWidth="3" />
    case 'diamond':
      return <polygon points="34,7 39,2 44,7 39,12" {...solid} />
    case 'vee':
      return <polyline points="34,1 43,7 34,13" fill="none" stroke={colour} strokeWidth="2" />
    case 'chevron':
      return <path d="M32,2 L38,7 L32,12 M38,2 L44,7 L38,12" fill="none" stroke={colour} strokeWidth="2" />
    case 'triangle-cross':
      return (
        <>
          <polygon points="34,1 44,7 34,13" {...solid} />
          <line x1="38" y1="1" x2="38" y2="13" stroke="#fff" strokeWidth="1.5" />
        </>
      )
    case 'circle-triangle':
      return (
        <>
          <circle cx="36" cy="7" r="3.5" {...solid} />
          <polygon points="38,1 44,7 38,13" {...solid} />
        </>
      )
    case 'triangle-backcurve':
      return <path d="M33,1 L44,7 L33,13 Q37,7 33,1 Z" {...solid} />
    default:
      return <polygon points="34,1 44,7 34,13" {...solid} />
  }
}

/** A sample of an interaction type's line, so the legend shows the pattern and arrowhead as well as the colour. */
function Swatch({ type }: { type: NetEdge['type'] }) {
  const s = EDGE_STYLES[type]
  const dash = s.line === 'dashed' ? '7 4' : s.line === 'dotted' ? '1.5 4' : undefined
  return (
    <svg className="swatch" width="44" height="14" viewBox="0 0 44 14" aria-hidden="true" focusable="false">
      <line
        x1="2"
        y1="7"
        x2="34"
        y2="7"
        stroke={s.colour}
        strokeWidth={s.width}
        strokeDasharray={dash}
        strokeLinecap={s.line === 'dotted' ? 'round' : 'butt'}
      />
      <ArrowHead arrow={s.arrow} colour={s.colour} />
    </svg>
  )
}

/** What one interaction record says: its two ends, description, molecules and places. */
function EdgeDetail({ edge }: { edge: NetEdge }) {
  return (
    <>
      <p className="ix-head">
        <NodeLink node={edge.source} /> <span className="ix-verb">{typeLabel(edge.type).toLowerCase()}</span>{' '}
        <NodeLink node={edge.target} />
      </p>
      <p>{edge.description}</p>
      {edge.via.length > 0 && (
        <p className="ix-meta">
          Via:{' '}
          {edge.via.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ', '}
              <Link to={glossaryPathFor(m.id)}>{m.name}</Link>
            </span>
          ))}
        </p>
      )}
      {edge.where.length > 0 && <p className="ix-meta">In {edge.where.map((w) => w.name).join(', ')}</p>}
    </>
  )
}

/** /network: the whole interaction web as a graph, with the same records as a plain list. */
export default function Network() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const arrivedByClick = useNavigationType() === 'PUSH'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const typeParam = params.get('type')
  const type = isInteractionType(typeParam) ? typeParam : undefined
  const view = params.get('view') === 'list' ? 'list' : 'graph'
  const [selected, setSelected] = useState<string | null>(null)

  const network = useMemo(() => buildNetwork(type), [type])
  const counts = useMemo(() => interactionCounts(), [])
  const total = INTERACTION_TYPES.reduce((n, t) => n + counts[t], 0)
  const edge = selected ? network.edges.find((e) => e.id === selected) : undefined
  const cellCount = network.nodes.filter((n) => n.kind === 'cell').length
  const placeCount = network.nodes.length - cellCount

  // Arriving from the header link moves focus to the title; a direct page load does not.
  useEffect(() => {
    if (arrivedByClick) headingRef.current?.focus()
  }, [arrivedByClick])

  // The view and the filter live in the URL (?view=list&type=kills), so a link keeps them.
  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k)
      else next.set(k, v)
    }
    setParams(next, { replace: true })
  }
  const chooseType = (t: string | null) => {
    setSelected(null)
    update({ type: t })
  }

  const listed = INTERACTION_TYPES.filter((t) => network.edges.some((e) => e.type === t))

  return (
    <main className="network">
      <PageTopbar trail={[{ label: 'Network' }]} />
      <h1 tabIndex={-1} ref={headingRef}>
        Interaction network
      </h1>
      <p>
        Every recorded interaction between cells ({total} in all). Each node is a cell, shaped and coloured by its family;
        a place appears where a cell moves to it. Select a node to open that cell in its scene, or a line to read what it
        records.
      </p>

      <div role="group" aria-label="View" className="network-views">
        <button type="button" aria-pressed={view === 'graph'} onClick={() => update({ view: null })}>
          Graph
        </button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => update({ view: 'list' })}>
          List
        </button>
      </div>

      <section aria-labelledby="network-legend-title" className="network-legend">
        <h2 id="network-legend-title">Interaction types</h2>
        <p className="panel-meta">Choose one to show only that type.</p>
        <ul>
          <li>
            <button type="button" aria-pressed={!type} onClick={() => chooseType(null)}>
              All types <span className="panel-meta">({total})</span>
            </button>
          </li>
          {INTERACTION_TYPES.map((t) => (
            <li key={t}>
              <button
                type="button"
                aria-pressed={type === t}
                disabled={counts[t] === 0}
                title={counts[t] === 0 ? 'None recorded yet' : undefined}
                onClick={() => chooseType(type === t ? null : t)}
              >
                <Swatch type={t} /> {typeLabel(t)} <span className="panel-meta">({counts[t]})</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p role="status" className="panel-meta network-count">
        Showing {network.edges.length} {network.edges.length === 1 ? 'interaction' : 'interactions'} between {cellCount}{' '}
        cells{placeCount > 0 && ` and ${placeCount} ${placeCount === 1 ? 'place' : 'places'}`}.
      </p>

      {view === 'graph' ? (
        <div className="network-layout">
          <Suspense fallback={<p className="network-loading">Loading the graph…</p>}>
            <NetworkGraph
              network={network}
              selectedEdge={selected}
              onNodeTap={(id) => {
                const path = network.nodes.find((n) => n.id === id)?.path
                if (path) navigate(path)
              }}
              onEdgeTap={setSelected}
            />
          </Suspense>
          <aside className="network-detail" aria-live="polite" aria-label="Selected interaction">
            {edge ? (
              <EdgeDetail edge={edge} />
            ) : (
              <p className="panel-meta">
                Select a line to see the interaction it records. Drag to move; scroll or pinch to zoom. Prefer text? Use
                the List view.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <div className="network-list">
          {listed.map((t) => {
            const rows = network.edges.filter((e) => e.type === t)
            return (
              <section key={t} aria-labelledby={`network-list-${t}`}>
                <h2 id={`network-list-${t}`} className="network-list-heading">
                  <Swatch type={t} /> {typeLabel(t)} <span className="panel-meta">({rows.length})</span>
                </h2>
                <ul className="interactions">
                  {rows.map((e) => (
                    <li key={e.id}>
                      <EdgeDetail edge={e} />
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </main>
  )
}
