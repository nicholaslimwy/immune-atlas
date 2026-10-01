// The /network graph itself, drawn by Cytoscape.js. Loaded lazily (Network.tsx uses React.lazy), so
// Cytoscape sits in its own chunk and costs nothing until someone opens the network page.
import cytoscape, { type Core, type Css, type EventObject, type StylesheetJson } from 'cytoscape'
import { useEffect, useRef } from 'react'
import { EDGE_STYLES, FAMILY_SHAPES, PLACE_STYLE } from '../art/networkStyles.ts'
import { FAMILY_COLOURS, INK } from '../art/palette.ts'
import { type InteractionType, type LayoutMode, layoutNetwork, type NetNode, type Network } from '../engine/network.ts'

export interface NetworkGraphProps {
  network: Network
  /** Show only this type's edges (and fade the cells it does not touch); null shows every type. */
  type: InteractionType | null
  selectedEdge: string | null
  onSelectEdge: (id: string | null) => void
  onOpenNode: (node: NetNode) => void
  /** A mouse pointer is over this node (null when it leaves). Never called for touch. */
  onHoverNode: (node: NetNode | null) => void
}

/** Below this container width every label goes under its node and the graph is as tall as it needs. */
const NARROW_PX = 640
const MAX_ZOOM_STEPS = 4

function stylesheet(): StylesheetJson {
  const families = Object.entries(FAMILY_COLOURS).map(([family, c]) => ({
    selector: `node[family = "${family}"]`,
    style: {
      shape: FAMILY_SHAPES[family as keyof typeof FAMILY_SHAPES],
      'background-color': c.tint,
      'border-color': c.base,
    },
  }))
  const types = Object.entries(EDGE_STYLES).map(([type, s]) => ({
    selector: `edge[type = "${type}"]`,
    style: {
      'line-color': s.colour,
      'target-arrow-color': s.colour,
      'target-arrow-shape': s.arrow,
      'line-style': (s.dash.length ? 'dashed' : 'solid') as Css.LineStyle,
      ...(s.dash.length ? { 'line-dash-pattern': s.dash } : {}),
      width: s.width,
    },
  }))
  return [
    {
      selector: 'node',
      style: {
        width: 30,
        height: 30,
        'border-width': 2.5,
        label: 'data(label)',
        color: INK,
        'font-size': 16,
        'text-wrap': 'wrap',
        'text-max-width': '260px',
        'text-background-color': '#ffffff',
        'text-background-opacity': 0.85,
        'text-background-padding': '2px',
        'text-background-shape': 'roundrectangle',
        'min-zoomed-font-size': 5,
      },
    },
    ...families,
    { selector: 'node[family = "support"]', style: { width: 34, height: 32 } },
    {
      selector: 'node[kind = "place"]',
      style: {
        shape: PLACE_STYLE.shape,
        width: 46,
        height: 26,
        'background-color': PLACE_STYLE.fill,
        'border-color': PLACE_STYLE.border,
        'font-style': 'italic',
      },
    },
    { selector: 'node.label-left', style: { 'text-halign': 'left', 'text-valign': 'center', 'text-margin-x': -6 } },
    { selector: 'node.label-right', style: { 'text-halign': 'right', 'text-valign': 'center', 'text-margin-x': 6 } },
    {
      selector: 'node.label-below',
      style: { 'text-halign': 'center', 'text-valign': 'bottom', 'text-margin-y': 4, 'text-max-width': '260px' },
    },
    { selector: 'node.narrow', style: { 'font-size': 13, 'text-max-width': '100px' } },
    {
      selector: 'edge',
      style: {
        'curve-style': 'unbundled-bezier',
        'control-point-distances': 'data(bend)',
        'control-point-weights': 0.5,
        'arrow-scale': 1.15,
        'line-cap': 'round',
        opacity: 0.7,
      },
    },
    ...types,
    { selector: '.hidden', style: { display: 'none' } },
    { selector: 'node.faded', style: { opacity: 0.3 } },
    { selector: '.dim', style: { opacity: 0.1 } },
    { selector: 'edge.lit', style: { opacity: 1, 'z-index': 5 } },
    { selector: 'node.lit', style: { 'border-color': INK, 'font-weight': 'bold' } },
    { selector: 'edge.chosen', style: { opacity: 1, width: 5, 'z-index': 10, 'arrow-scale': 1.4 } },
    { selector: 'node.end', style: { 'border-color': INK, 'border-width': 4, 'font-weight': 'bold' } },
  ]
}

const isMouse = (e: EventObject) => e.originalEvent instanceof MouseEvent && !(e.originalEvent instanceof TouchEvent)

export default function NetworkGraph(props: NetworkGraphProps) {
  const { network, type, selectedEdge } = props
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  /** The zoom of the overview: fit to the box (wide) or to its width (narrow). The floor for zooming out. */
  const baseRef = useRef<{ zoom: number; pan: { x: number; y: number }; mode: LayoutMode } | null>(null)
  // Callbacks change every render; the Cytoscape handlers read the latest through this ref.
  const handlers = useRef(props)
  useEffect(() => {
    handlers.current = props
  })

  // Create the graph once.
  useEffect(() => {
    const canvas = canvasRef.current!
    const byId = new Map(network.nodes.map((n) => [n.id, n]))
    const cy = cytoscape({
      container: canvas,
      elements: [
        ...network.nodes.map((n) => ({
          group: 'nodes' as const,
          data: { id: n.id, label: n.label, kind: n.kind, family: n.family ?? '' },
        })),
        ...network.edges.map((e) => ({
          group: 'edges' as const,
          data: { id: e.id, source: e.source, target: e.target, type: e.type, bend: 0 },
        })),
      ],
      style: stylesheet(),
      layout: { name: 'preset' },
      autoungrabify: true,
      autounselectify: true,
      boxSelectionEnabled: false,
      minZoom: 0.1,
      maxZoom: 4,
    })
    cyRef.current = cy

    /** Put every node where the layout for this width says, and fit the overview. */
    const arrange = () => {
      const width = canvas.parentElement!.clientWidth
      if (!width) return
      const mode: LayoutMode = width < NARROW_PX ? 'narrow' : 'wide'
      if (baseRef.current?.mode !== mode) {
        const layout = layoutNetwork(network, mode)
        cy.batch(() => {
          cy.nodes().forEach((node) => {
            const p = layout.positions.get(node.id())!
            node.position({ x: p.x, y: p.y })
            node.removeClass('label-left label-right label-below narrow')
            node.addClass(`label-${p.label}`)
            if (mode === 'narrow') node.addClass('narrow')
          })
          cy.edges().forEach((edge) => {
            edge.data('bend', layout.bends.get(edge.id()) ?? 0)
          })
        })
      }
      // Measure the whole drawing, hidden edges and faded cells included, so the frame never jumps with the filter.
      const bb = cy.elements().boundingBox({ includeLabels: true })
      // Wide: room at the top for the zoom buttons, which sit over the canvas.
      const pad = mode === 'narrow' ? 8 : 44
      if (mode === 'narrow') {
        // As wide as the screen and as tall as the drawing: the page scrolls past it until the visitor pinches in.
        const zoom = (width - 2 * pad) / bb.w
        canvas.style.height = `${Math.ceil(bb.h * zoom + 2 * pad)}px`
        cy.resize()
        cy.minZoom(zoom)
        cy.maxZoom(zoom * MAX_ZOOM_STEPS)
        cy.zoom(zoom)
        cy.pan({ x: pad - bb.x1 * zoom, y: pad - bb.y1 * zoom })
      } else {
        canvas.style.height = ''
        cy.resize()
        cy.minZoom(0.1)
        cy.maxZoom(4)
        cy.fit(undefined, pad)
        cy.minZoom(cy.zoom() * 0.8)
        cy.maxZoom(cy.zoom() * MAX_ZOOM_STEPS)
      }
      baseRef.current = { zoom: cy.zoom(), pan: { ...cy.pan() }, mode }
      cy.userPanningEnabled(mode === 'wide')
      boxRef.current?.classList.toggle('is-narrow', mode === 'narrow')
      boxRef.current?.classList.remove('is-zoomed')
    }

    // On a phone the overview is part of the page: one finger scrolls the page. Once the visitor
    // pinches in, one finger pans the graph instead, until they zoom back out to the overview.
    // Cytoscape only pinch-zooms while panning is on, so panning is also switched on the moment a
    // second finger lands (this listener runs in the capture phase, before Cytoscape's own).
    const box = boxRef.current!
    let fingers = 0
    const isZoomedIn = () => {
      const base = baseRef.current
      return !!base && cy.zoom() > base.zoom * 1.02
    }
    const onTouch = (e: TouchEvent) => {
      fingers = e.touches.length
      const base = baseRef.current
      if (base?.mode !== 'narrow') return
      // A pinch that ends close to the overview settles on it, so the page scrolls again.
      if (fingers === 0 && cy.zoom() < base.zoom * 1.12) {
        cy.zoom(base.zoom)
        cy.pan(base.pan)
      }
      cy.userPanningEnabled(fingers >= 2 || isZoomedIn())
    }
    box.addEventListener('touchstart', onTouch, { capture: true, passive: true })
    box.addEventListener('touchend', onTouch, { capture: true, passive: true })
    box.addEventListener('touchcancel', onTouch, { capture: true, passive: true })
    cy.on('zoom', () => {
      const base = baseRef.current
      if (!base || base.mode !== 'narrow') return
      const zoomed = isZoomedIn()
      if (fingers < 2) cy.userPanningEnabled(zoomed)
      box.classList.toggle('is-zoomed', zoomed)
      if (!zoomed && cy.zoom() <= base.zoom) cy.pan(base.pan)
    })

    cy.on('tap', 'node', (e) => {
      const node = byId.get(e.target.id())
      if (node) handlers.current.onOpenNode(node)
    })
    cy.on('tap', 'edge', (e) => handlers.current.onSelectEdge(e.target.id()))
    cy.on('tap', (e) => {
      if (e.target === cy) handlers.current.onSelectEdge(null)
    })
    // Hover lights a cell's own interactions. Touch raises mouseover without a matching mouseout, so touch is ignored.
    cy.on('mouseover', 'node', (e) => {
      if (!isMouse(e)) return
      const node = e.target
      const edges = node.connectedEdges().not('.hidden')
      const near = edges.connectedNodes().union(node)
      cy.elements().not(near).not(edges).addClass('dim')
      edges.addClass('lit')
      node.addClass('lit')
      canvas.style.cursor = 'pointer'
      handlers.current.onHoverNode(byId.get(node.id()) ?? null)
    })
    const unhover = () => {
      cy.elements().removeClass('dim lit')
      canvas.style.cursor = ''
      handlers.current.onHoverNode(null)
    }
    cy.on('mouseout', 'node', (e) => {
      if (isMouse(e)) unhover()
    })
    // A fast pointer can leave the canvas straight from a node, and Cytoscape then sends no mouseout.
    canvas.addEventListener('mouseleave', unhover)
    cy.on('mouseover', 'edge', (e) => {
      if (isMouse(e)) canvas.style.cursor = 'pointer'
    })
    cy.on('mouseout', 'edge', (e) => {
      if (isMouse(e)) canvas.style.cursor = ''
    })

    arrange()
    let lastWidth = canvas.parentElement!.clientWidth
    const observer = new ResizeObserver(() => {
      const width = canvas.parentElement!.clientWidth
      if (width === lastWidth) return
      lastWidth = width
      arrange()
    })
    observer.observe(canvas.parentElement!)
    return () => {
      observer.disconnect()
      canvas.removeEventListener('mouseleave', unhover)
      for (const type of ['touchstart', 'touchend', 'touchcancel'] as const) box.removeEventListener(type, onTouch, { capture: true })
      cy.destroy()
      cyRef.current = null
      baseRef.current = null
    }
  }, [network])

  // The type filter: other types' edges are hidden, cells they leave without an edge are faded.
  // Nothing moves.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      cy.elements().removeClass('hidden faded dim lit')
      if (!type) return
      const shown = cy.edges(`[type = "${type}"]`)
      cy.edges().not(shown).addClass('hidden')
      cy.nodes().not(shown.connectedNodes()).addClass('faded')
    })
  }, [type])

  // The chosen edge is drawn thick, with its two ends outlined.
  useEffect(() => {
    const cy = cyRef.current
    if (!cy) return
    cy.batch(() => {
      cy.elements().removeClass('chosen end')
      if (!selectedEdge) return
      const edge = cy.getElementById(selectedEdge)
      edge.addClass('chosen')
      edge.connectedNodes().addClass('end')
    })
  }, [selectedEdge])

  const zoomBy = (factor: number) => {
    const cy = cyRef.current
    if (!cy) return
    const width = cy.width()
    const height = cy.height()
    const canvasBox = canvasRef.current!.getBoundingClientRect()
    // Zoom around the middle of what is on screen (on a phone the canvas can be taller than the screen).
    const top = Math.max(0, -canvasBox.top)
    const bottom = Math.min(height, window.innerHeight - canvasBox.top)
    const y = bottom > top ? (top + bottom) / 2 : height / 2
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: width / 2, y } })
  }

  const reset = () => {
    const cy = cyRef.current
    const base = baseRef.current
    if (!cy || !base) return
    cy.zoom(base.zoom)
    cy.pan(base.pan)
  }

  return (
    <div className="network-graph" ref={boxRef}>
      <div className="network-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1.4)} aria-label="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      <div
        className="network-canvas"
        ref={canvasRef}
        role="img"
        aria-label={`Graph of ${network.edges.length} interactions between cells and places. The List view gives the same records as text.`}
      />
    </div>
  )
}
