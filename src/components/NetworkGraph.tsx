import cytoscape, { type Core, type ElementDefinition } from 'cytoscape'
import { useEffect, useRef } from 'react'
import { FAMILY_COLOURS, INK } from '../art/palette.ts'
import { EDGE_STYLES, NODE_SHAPES } from '../art/networkStyles.ts'
import type { Network } from '../engine/network.ts'

const LOCATION_COLOURS = { tint: '#F4E7B8', base: '#C9A13B' }

interface Props {
  network: Network
  /** Edge id whose line is drawn thick, or null. */
  selectedEdge: string | null
  onNodeTap: (id: string) => void
  onEdgeTap: (id: string | null) => void
}

/**
 * The Cytoscape canvas (loaded lazily, so Cytoscape stays out of the main bundle). A node tap opens
 * that cell or place; an edge tap selects the interaction. Panning, wheel zoom and two-finger pinch are
 * Cytoscape's; the buttons below do the same for anyone who cannot pinch.
 */
export default function NetworkGraph({ network, selectedEdge, onNodeTap, onEdgeTap }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const cy = useRef<Core | null>(null)
  // The callbacks change every render; the graph is built once per network, so it calls through these.
  const nodeTap = useRef(onNodeTap)
  const edgeTap = useRef(onEdgeTap)
  useEffect(() => {
    nodeTap.current = onNodeTap
    edgeTap.current = onEdgeTap
  })

  useEffect(() => {
    if (!container.current) return
    const elements: ElementDefinition[] = [
      ...network.nodes.map((n, i) => {
        const colours = n.family ? FAMILY_COLOURS[n.family] : LOCATION_COLOURS
        const angle = (i / network.nodes.length) * 2 * Math.PI
        return {
          group: 'nodes' as const,
          data: { id: n.id, label: n.name, tint: colours.tint, base: colours.base, shape: NODE_SHAPES[n.family ?? 'location'] },
          // Seed on a circle; the layout moves them from here, so it gives the same picture every time.
          position: { x: Math.cos(angle) * 400, y: Math.sin(angle) * 400 },
          classes: n.path ? 'linked' : '',
        }
      }),
      ...network.edges.map((e) => ({
        group: 'edges' as const,
        data: { id: e.id, source: e.source.id, target: e.target.id, ...EDGE_STYLES[e.type] },
      })),
    ]

    const graph = cytoscape({
      container: container.current,
      elements,
      minZoom: 0.2,
      maxZoom: 4,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
      autounselectify: true,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'data(shape)' as never,
            width: 32,
            height: 32,
            'background-color': 'data(tint)',
            'border-color': 'data(base)',
            'border-width': 3,
            label: 'data(label)',
            color: INK,
            'font-size': 14,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-wrap': 'wrap',
            'text-max-width': '110px',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': '1px',
            // Names too small to read are left out; zooming in brings them back.
            'min-zoomed-font-size': 6,
          },
        },
        { selector: 'node.linked', style: { cursor: 'pointer' } as never },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            width: 'data(width)',
            'line-color': 'data(colour)',
            'line-style': 'data(line)' as never,
            'target-arrow-color': 'data(colour)',
            'target-arrow-shape': 'data(arrow)' as never,
            'arrow-scale': 1.4,
            opacity: 0.8,
          },
        },
        { selector: 'edge.selected', style: { width: 6, opacity: 1, 'z-index': 10 } },
        { selector: '.faded', style: { opacity: 0.12 } },
        { selector: 'node.hover', style: { 'border-width': 5 } },
      ],
      layout: {
        name: 'cose',
        animate: false,
        randomize: false,
        fit: true,
        padding: 30,
        nodeDimensionsIncludeLabels: true,
        nodeRepulsion: () => 250000,
        idealEdgeLength: () => 150,
        nodeOverlap: 60,
        componentSpacing: 120,
        gravity: 0.25,
        numIter: 2500,
      },
    })
    cy.current = graph

    graph.on('tap', 'node', (evt) => nodeTap.current(evt.target.id()))
    graph.on('tap', 'edge', (evt) => edgeTap.current(evt.target.id()))
    graph.on('tap', (evt) => {
      if (evt.target === graph) edgeTap.current(null)
    })
    // Hovering a node fades everything it is not connected to.
    // A touch also raises mouseover but never a matching mouseout, so only a real mouse does this.
    graph.on('mouseover', 'node', (evt) => {
      if (evt.originalEvent && 'touches' in evt.originalEvent) return
      const around = evt.target.closedNeighborhood()
      graph.elements().not(around).addClass('faded')
      evt.target.addClass('hover')
    })
    graph.on('mouseout', 'node', () => graph.elements().removeClass('faded hover'))

    return () => {
      graph.destroy()
      cy.current = null
    }
  }, [network])

  useEffect(() => {
    const graph = cy.current
    if (!graph) return
    graph.edges().removeClass('selected')
    if (selectedEdge) graph.getElementById(selectedEdge).addClass('selected')
  }, [selectedEdge, network])

  const zoomBy = (factor: number) => {
    const graph = cy.current
    if (!graph) return
    graph.zoom({ level: graph.zoom() * factor, renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 } })
  }

  return (
    <div className="network-graph">
      <div
        ref={container}
        className="network-canvas"
        role="img"
        aria-label="Network graph of cell interactions. A list of the same interactions is available as the list view."
      />
      <div className="network-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={() => cy.current?.fit(undefined, 30)}>
          Reset
        </button>
      </div>
    </div>
  )
}
