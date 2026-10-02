import { lazy, type ReactNode, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { EDGE_STYLES, FAMILY_SHAPES, PLACE_STYLE } from '../art/networkStyles.ts'
import { FAMILY_COLOURS } from '../art/palette.ts'
import MoleculeText from '../components/MoleculeText.tsx'
import { useArmFilter } from '../components/armFilterState.ts'
import PageTopbar from '../components/PageTopbar.tsx'
import { getInteraction, getLocation, getMolecule } from '../engine/content.ts'
import { mentionAnnotator } from '../engine/glossary.ts'
import { typeLabel } from '../engine/interactions.ts'
import type { TextPart } from '../engine/mentions.ts'
import {
  getNetwork,
  type InteractionType,
  isInteractionType,
  type NetEdge,
  type NetNode,
  typeCounts,
  visiblePart,
} from '../engine/network.ts'
import { entityPath, glossaryPathFor } from '../engine/paths.ts'
import { INTERACTION_TYPES } from '../types/interaction.ts'
import type { Arm } from '../engine/armFilter.ts'
import type { Cell } from '../types/cell.ts'

const NetworkGraph = lazy(() => import('../components/NetworkGraph.tsx'))

/** One record ready to show: both ends, the description cut up for molecule tooltips, molecules and places. */
interface Row {
  edge: NetEdge
  source: NetNode
  target: NetNode
  description: TextPart[]
  via: { id: string; name: string }[]
  where: { id: string; name: string; path?: string }[]
}

/** /network: every interaction record as a graph (or a plain list), filtered to one type at a time. */
export default function Network() {
  const net = getNetwork()
  const nodeById = useMemo(() => new Map(net.nodes.map((n) => [n.id, n])), [net])
  const counts = useMemo(() => typeCounts(net.edges), [net])
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const typeParam = params.get('type')
  const type = isInteractionType(typeParam) && counts[typeParam] > 0 ? typeParam : null
  const view = params.get('view') === 'list' ? 'list' : 'graph'
  const { arm } = useArmFilter()
  const [chosen, setChosen] = useState<string | null>(null)
  const [hovered, setHovered] = useState<NetNode | null>(null)
  const shown = visiblePart(net, type)
  // A chosen edge of another type is forgotten when the filter hides it.
  const selectedEdge = chosen && shown.edges.some((e) => e.id === chosen) ? chosen : null

  // Escape closes the chosen interaction (a molecule popover inside it stops Escape first and closes alone).
  useEffect(() => {
    if (!selectedEdge) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setChosen(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedEdge])

  const setParam = (key: 'type' | 'view', value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  // One annotator per screen, called here in reading order, so each molecule's first mention gets the tooltip.
  const annotate = mentionAnnotator()
  const toRow = (edge: NetEdge): Row => {
    const ix = getInteraction(edge.id)!
    return {
      edge,
      source: nodeById.get(edge.source)!,
      target: nodeById.get(edge.target)!,
      description: annotate(ix.description),
      via: (ix.via ?? []).map((id) => ({ id, name: getMolecule(id)?.name ?? id })),
      where: (ix.where ?? []).map((id) => ({ id, name: getLocation(id)?.name ?? id, path: entityPath(id) })),
    }
  }
  const chosenRow = view === 'graph' && selectedEdge ? toRow(net.edges.find((e) => e.id === selectedEdge)!) : null
  const listGroups =
    view === 'list'
      ? INTERACTION_TYPES.filter((t) => (type ? t === type : counts[t] > 0)).map((t) => ({
          type: t,
          rows: shown.edges
            .filter((e) => e.type === t)
            .sort(
              (a, b) =>
                nodeById.get(a.source)!.name.localeCompare(nodeById.get(b.source)!.name) ||
                nodeById.get(a.target)!.name.localeCompare(nodeById.get(b.target)!.name),
            )
            .map(toRow),
        }))
      : []

  const hoveredCount = hovered
    ? shown.edges.filter((e) => e.source === hovered.id || e.target === hovered.id).length
    : 0

  return (
    <main className="network">
      <PageTopbar trail={[{ label: 'Network' }]} />
      <h1>Interaction network</h1>
      <p className="network-lede">
        Every recorded interaction between the atlas's cells, and the places cells move to. Innate cells are on the left,
        adaptive cells on the right, support cells and places down the middle. Choose a type to see one kind of
        interaction at a time.
      </p>

      <div className="network-view" role="group" aria-label="View">
        <button type="button" aria-pressed={view === 'graph'} onClick={() => setParam('view', null)}>
          Graph
        </button>
        <button type="button" aria-pressed={view === 'list'} onClick={() => setParam('view', 'list')}>
          List
        </button>
      </div>

      <section className="network-legend" aria-labelledby="network-types">
        <h2 id="network-types">Interaction types</h2>
        <p className="panel-meta network-legend-help">Each type has its own colour, line and arrowhead. Choose one to show only that type.</p>
        <ul>
          <li>
            <button type="button" aria-pressed={type === null} onClick={() => setParam('type', null)}>
              <span className="network-sample" aria-hidden="true" />
              <span>All types</span>
              <span className="network-count">{net.edges.length}</span>
            </button>
          </li>
          {INTERACTION_TYPES.map((t) => (
            <li key={t}>
              <button
                type="button"
                aria-pressed={type === t}
                disabled={counts[t] === 0}
                onClick={() => setParam('type', type === t ? null : t)}
              >
                <EdgeSample type={t} />
                <span>{typeLabel(t)}</span>
                <span className="network-count">{counts[t] === 0 ? 'none recorded yet' : counts[t]}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="network-status" aria-live="polite">
        Showing {shown.edges.length} {shown.edges.length === 1 ? 'interaction' : 'interactions'}
        {type && <> of type “{typeLabel(type).toLowerCase()}”</>} between {shown.cells} cells
        {shown.places > 0 && ` and ${shown.places} ${shown.places === 1 ? 'place' : 'places'}`}.
      </p>

      {view === 'graph' ? (
        <div className="network-workspace">
          <div>
            <NodeKey />
            <Suspense fallback={<p className="network-loading">Loading the graph…</p>}>
              <NetworkGraph
                network={net}
                type={type}
                arm={arm}
                selectedEdge={selectedEdge}
                onSelectEdge={setChosen}
                onOpenNode={(node) => navigate(node.path)}
                onHoverNode={setHovered}
              />
            </Suspense>
          </div>
          <aside className={`network-side${chosenRow ? ' has-edge' : ''}`} aria-label="Selected interaction">
            {chosenRow ? (
              <>
                <div className="panel-head">
                  <h2>{typeLabel(chosenRow.edge.type)}</h2>
                  <button type="button" className="network-close" aria-label="Close" onClick={() => setChosen(null)}>
                    ×
                  </button>
                </div>
                <RowBody row={chosenRow} />
              </>
            ) : hovered ? (
              <>
                <h2>{hovered.name}</h2>
                <p className="panel-meta">
                  {hovered.family ? FAMILY_COLOURS[hovered.family].label : 'Place'} · {hoveredCount}{' '}
                  {hoveredCount === 1 ? 'interaction' : 'interactions'} shown
                </p>
                <p>Click to open {hovered.kind === 'cell' ? 'its panel' : 'its scene'}.</p>
              </>
            ) : (
              <p className="panel-meta">
                Tap or click a line to read that interaction. Tap or click a cell to open its panel in its home scene,
                or a place to zoom to it. On a phone, pinch to zoom in.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <div className="network-list">
          {listGroups.map((g) => (
            <section key={g.type} aria-labelledby={`network-list-${g.type}`}>
              <h2 id={`network-list-${g.type}`}>
                <EdgeSample type={g.type} /> {typeLabel(g.type)} <span className="network-count">{g.rows.length}</span>
              </h2>
              <ul>
                {g.rows.map((row) => (
                  <li key={row.edge.id} className={arm && !touchesArm(row, arm) ? 'is-off' : undefined}>
                    <RowBody row={row} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}

/** True when either end of the record is a cell of this arm. */
const touchesArm = (row: Row, arm: Arm) => row.source.arm === arm || row.target.arm === arm

/** "Macrophage recruits Neutrophil", the description, and the molecules and places involved. */
function RowBody({ row }: { row: Row }) {
  return (
    <>
      <p className="ix-head">
        <Link to={row.source.path}>{row.source.name}</Link>{' '}
        <span className="ix-verb">{typeLabel(row.edge.type).toLowerCase()}</span>{' '}
        <Link to={row.target.path}>{row.target.name}</Link>
      </p>
      <p>
        <MoleculeText parts={row.description} />
      </p>
      {row.via.length > 0 && (
        <p className="ix-meta">
          Via:{' '}
          {row.via.map((m, i) => (
            <span key={m.id}>
              {i > 0 && ', '}
              <Link to={glossaryPathFor(m.id)}>{m.name}</Link>
            </span>
          ))}
        </p>
      )}
      {row.where.length > 0 && (
        <p className="ix-meta">
          Where:{' '}
          {row.where.map((l, i) => (
            <span key={l.id}>
              {i > 0 && ', '}
              {l.path ? <Link to={l.path}>{l.name}</Link> : l.name}
            </span>
          ))}
        </p>
      )}
    </>
  )
}

/** A short line in a type's colour and pattern, ending in a drawing of its arrowhead (as Cytoscape draws it). */
function EdgeSample({ type }: { type: InteractionType }) {
  const s = EDGE_STYLES[type]
  const c = s.colour
  const end = 38
  const heads: Record<typeof s.arrow, ReactNode> = {
    triangle: <path d={`M${end - 8},2 L${end},6 L${end - 8},10 Z`} fill={c} />,
    vee: <path d={`M${end - 8},1.5 L${end},6 L${end - 8},10.5 L${end - 5},6 Z`} fill={c} />,
    diamond: <path d={`M${end - 10},6 L${end - 5},2 L${end},6 L${end - 5},10 Z`} fill={c} />,
    'triangle-cross': (
      <>
        <path d={`M${end - 7},2 L${end},6 L${end - 7},10 Z`} fill={c} />
        <path d={`M${end - 11},1.5 L${end - 11},10.5`} stroke={c} strokeWidth="2" />
      </>
    ),
    circle: <circle cx={end - 4} cy="6" r="4" fill={c} />,
    chevron: <path d={`M${end - 7},1.5 L${end},6 L${end - 7},10.5`} fill="none" stroke={c} strokeWidth="2.5" />,
    tee: <path d={`M${end - 1.5},1 L${end - 1.5},11`} stroke={c} strokeWidth="3" />,
    'triangle-backcurve': <path d={`M${end - 9},1.5 L${end},6 L${end - 9},10.5 Q${end - 5},6 ${end - 9},1.5 Z`} fill={c} />,
    square: <rect x={end - 7} y="2.5" width="7" height="7" fill={c} />,
  }
  const lineEnd = s.arrow === 'tee' ? end - 2 : end - 6
  return (
    <svg className="network-sample" viewBox="0 0 40 12" width="40" height="12" aria-hidden="true">
      <line
        x1="2"
        y1="6"
        x2={lineEnd}
        y2="6"
        stroke={c}
        strokeWidth={s.width}
        strokeDasharray={s.dash.length ? s.dash.join(' ') : undefined}
        strokeLinecap="round"
      />
      {heads[s.arrow]}
    </svg>
  )
}

/** Which shape and colour is which family, and how a place is drawn. */
function NodeKey() {
  const families = Object.keys(FAMILY_COLOURS) as Cell['family'][]
  return (
    <ul className="network-key" aria-label="Node shapes">
      {families.map((f) => (
        <li key={f}>
          <NodeShape shape={FAMILY_SHAPES[f]} fill={FAMILY_COLOURS[f].tint} stroke={FAMILY_COLOURS[f].base} />
          {FAMILY_COLOURS[f].label}
        </li>
      ))}
      <li>
        <NodeShape shape={PLACE_STYLE.shape} fill={PLACE_STYLE.fill} stroke={PLACE_STYLE.border} />
        Place
      </li>
    </ul>
  )
}

function NodeShape({ shape, fill, stroke }: { shape: string; fill: string; stroke: string }) {
  const props = { fill, stroke, strokeWidth: 1.5, strokeLinejoin: 'round' as const }
  const drawn: Record<string, ReactNode> = {
    ellipse: <circle cx="9" cy="9" r="7" {...props} />,
    'round-diamond': <path d="M9,1.5 L16.5,9 L9,16.5 L1.5,9 Z" {...props} strokeWidth={2} />,
    'round-rectangle': <rect x="2" y="2" width="14" height="14" rx="3.5" {...props} />,
    hexagon: <path d="M5,2.5 L13,2.5 L17,9 L13,15.5 L5,15.5 L1,9 Z" {...props} />,
    'round-triangle': <path d="M9,2 L16.5,15.5 L1.5,15.5 Z" {...props} strokeWidth={2} />,
    barrel: <path d="M2,5 Q2,3.5 5,3.5 L13,3.5 Q16,3.5 16,5 L16,13 Q16,14.5 13,14.5 L5,14.5 Q2,14.5 2,13 Z" {...props} />,
  }
  return (
    <svg viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">
      {drawn[shape]}
    </svg>
  )
}
