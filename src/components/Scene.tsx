import { useEffect, useRef, useState } from 'react'
import { useIsPresent } from 'framer-motion'
import { useNavigate } from 'react-router'
import { matchesArm } from '../engine/armFilter.ts'
import { getCell, getLocation } from '../engine/content.ts'
import { cellPathFor, pathFor, regionPathFor } from '../engine/paths.ts'
import type { Location } from '../types/location.ts'
import { useArmFilter } from './armFilterState.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

interface Props {
  location: Location
  svg: string
  /** Cell ids whose hotspots a tour step highlights. */
  highlight?: readonly string[]
  /** The hotspot target or region id a tour or process step points at. */
  focus?: string
  /** Font size, in scene units, for highlighted labels (a tour makes them bigger on a small screen). */
  labelSize?: number
}

/** Scenes are authored 800 units wide; a grown label must stay this far inside their edge. */
const SCENE_W = 800
const EDGE = 4
const LABEL_BASE = 15

/** Fill a hotspot's or region's empty .scene-label (if the art has one) with its name from content. */
function fillLabel(el: Element, name: string, stub: boolean) {
  const label = el.querySelector('.scene-label')
  if (!label) return
  // A name with a gloss, "NK cell (natural killer cell)", puts the gloss on a smaller second line.
  const glossed = name.match(/^(.*?) \((.*)\)$/)
  const gloss = glossed?.[2]
  label.textContent = glossed?.[1] ?? name
  const line = (className: string, text: string) => {
    const tag = document.createElementNS(SVG_NS, 'tspan')
    tag.setAttribute('class', className)
    tag.setAttribute('x', label.getAttribute('x') ?? '0')
    tag.setAttribute('dy', '1.1em')
    tag.textContent = text
    label.append(tag)
  }
  if (gloss) line('scene-label-sub', gloss)
  if (stub) line('scene-label-soon', 'coming soon')
}

// The SVG text is preloaded by ZoomStage and inlined here so hotspot regions are real DOM elements.
export default function Scene({ location, svg, highlight, focus, labelSize }: Props) {
  const navigate = useNavigate()
  const { arm } = useArmFilter()
  // The scene that is zooming away stays in the page for a moment: keep it out of the tab order and reading order.
  const present = useIsPresent()
  const descId = `scene-desc-${location.id}`
  const containerRef = useRef<HTMLDivElement>(null)
  // A place that is not built yet, picked from this scene: shown as a notice instead of zooming.
  const [soon, setSoon] = useState<Location>()

  // Make each hotspot region a focusable, labelled button, and fill its label (if the art has one)
  // with the target's name, so names live only in /content.
  useEffect(() => {
    // The picture as a whole: a named group that points at the written description.
    const root = containerRef.current?.querySelector('svg')
    root?.setAttribute('aria-label', `${location.name} scene`)
    if (location.description) root?.setAttribute('aria-describedby', descId)
    for (const { region, target } of location.hotspots) {
      const el = containerRef.current?.querySelector(`[id="${region}"]`)
      if (!el) continue
      const place = getLocation(target)
      const stub = place?.status === 'stub'
      const name = place?.name ?? getCell(target)?.name ?? target
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      el.setAttribute('aria-label', stub ? `${name} (coming soon)` : name)
      el.classList.add('hotspot')
      el.classList.toggle('hotspot-soon', stub)
      fillLabel(el, name, stub)
    }
    // A region is a labelled area: a button too, but it opens an info panel over the scene.
    for (const { id, name } of location.regions ?? []) {
      const el = containerRef.current?.querySelector(`[id="${id}"]`)
      if (!el) continue
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      el.setAttribute('aria-label', name)
      el.setAttribute('aria-description', 'Area. Press Enter to read about it.')
      el.classList.add('hotspot', 'scene-region')
      fillLabel(el, name, false)
    }
  }, [svg, location, descId])

  // The arm filter dims cells outside the chosen arm: hotspot cells, and the unlabelled copies of
  // cell icons that fill a scene (a hotspot's own art is dimmed with its group). Places stay as they are.
  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    for (const { region, target } of location.hotspots) {
      const dim = !!getCell(target) && !matchesArm(arm, target)
      root.querySelector(`[id="${region}"]`)?.classList.toggle('filter-dim', dim)
    }
    for (const use of root.querySelectorAll('use')) {
      if (use.closest('.hotspot')) continue
      const id = use.getAttribute('href')?.match(/^#icon-(.+)$/)?.[1]
      use.classList.toggle('filter-dim', !!id && !!getCell(id) && !matchesArm(arm, id))
    }
  }, [svg, location, arm])

  // A tour step marks the cells it is about and the hotspot it points at; free exploration clears both.
  useEffect(() => {
    for (const { id } of location.regions ?? []) {
      containerRef.current?.querySelector(`[id="${id}"]`)?.classList.toggle('tour-focus', id === focus)
    }
    for (const { region, target } of location.hotspots) {
      const el = containerRef.current?.querySelector(`[id="${region}"]`)
      const highlighted = highlight?.includes(target) ?? false
      el?.classList.toggle('tour-highlight', highlighted)
      // What the button does, read after its name: the kind of thing it is and what Enter will do.
      const place = getLocation(target)
      const what =
        place?.status === 'stub'
          ? 'Place. This scene is coming soon.'
          : place
            ? 'Place. Press Enter to zoom in.'
            : 'Cell. Press Enter to open its profile.'
      el?.setAttribute('aria-description', highlighted ? `${what} Highlighted in this step.` : what)
      el?.classList.toggle('tour-focus', target === focus)
      // A highlighted label grows to labelSize, then shrinks back until it fits inside the scene's
      // edges (a label near the margin would otherwise be cut off).
      const label = el?.querySelector<SVGTextElement>('.scene-label')
      if (!label) continue
      label.style.removeProperty('font-size')
      if (!highlight?.includes(target) || !labelSize || labelSize <= LABEL_BASE) continue
      label.style.fontSize = `${labelSize}px`
      const box = label.getBBox()
      const anchor = label.getAttribute('text-anchor')
      const room =
        anchor === 'middle'
          ? 2 * Math.min(box.x + box.width / 2 - EDGE, SCENE_W - EDGE - (box.x + box.width / 2))
          : anchor === 'end'
            ? box.x + box.width - EDGE
            : SCENE_W - EDGE - box.x
      if (box.width > room) {
        const fitted = Math.max(LABEL_BASE, (labelSize * room) / box.width)
        if (fitted > LABEL_BASE) label.style.fontSize = `${fitted}px`
        else label.style.removeProperty('font-size')
      }
    }
  }, [svg, location, highlight, focus, labelSize])

  // A hotspot zooms into a child location, or opens a cell's panel over this scene; a region opens its panel.
  // Anything else clicked (empty scene, or a built place) clears the notice.
  const go = (el: Element | null) => {
    const region = location.regions?.find((r) => r.id === el?.id)
    if (region) {
      setSoon(undefined)
      navigate(regionPathFor(location, region.id))
      return
    }
    const hotspot = location.hotspots.find((h) => h.region === el?.id)
    const child = hotspot && getLocation(hotspot.target)
    setSoon(child?.status === 'stub' ? child : undefined)
    if (!hotspot || child?.status === 'stub') return
    if (child) navigate(pathFor(child))
    else if (getCell(hotspot.target)) navigate(cellPathFor(location, hotspot.target))
  }

  const hotspotOf = (node: EventTarget) =>
    (node as Element).closest?.('.hotspot') ?? null

  return (
    <>
      {location.description && (
        <p id={descId} className="visually-hidden">
          {location.description}
        </p>
      )}
      <div
        ref={containerRef}
        className="scene"
        inert={!present}
        onClick={(e) => go(hotspotOf(e.target))}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setSoon(undefined)
          if (e.key === 'Enter' || e.key === ' ') {
            const el = hotspotOf(e.target)
            if (el) {
              e.preventDefault()
              go(el)
            }
          }
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {/* Always mounted so screen readers announce the text when it appears. */}
      <div className="scene-notice" role="status">
        {soon && (
          <p>
            <span>
              <strong>{soon.name}</strong>: this scene is coming soon.
            </span>
            <button type="button" aria-label="Dismiss" onClick={() => setSoon(undefined)}>
              ×
            </button>
          </p>
        )}
      </div>
    </>
  )
}
