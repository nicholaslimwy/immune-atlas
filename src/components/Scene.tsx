import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { getCell, getLocation } from '../engine/content.ts'
import { cellPathFor, pathFor } from '../engine/paths.ts'
import type { Location } from '../types/location.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

// The SVG text is preloaded by ZoomStage and inlined here so hotspot regions are real DOM elements.
export default function Scene({ location, svg }: { location: Location; svg: string }) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  // A place that is not built yet, picked from this scene: shown as a notice instead of zooming.
  const [soon, setSoon] = useState<Location>()

  // Make each hotspot region a focusable, labelled button, and fill its label (if the art has one)
  // with the target's name, so names live only in /content.
  useEffect(() => {
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
      const label = el.querySelector('.scene-label')
      if (label) {
        label.textContent = name
        if (stub) {
          const tag = document.createElementNS(SVG_NS, 'tspan')
          tag.setAttribute('class', 'scene-label-soon')
          tag.setAttribute('x', label.getAttribute('x') ?? '0')
          tag.setAttribute('dy', '1.1em')
          tag.textContent = 'coming soon'
          label.append(tag)
        }
      }
    }
  }, [svg, location])

  // A hotspot zooms into a child location, or opens a cell's panel over this scene.
  // Anything else clicked (empty scene, or a built place) clears the notice.
  const go = (el: Element | null) => {
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
      <div
        ref={containerRef}
        className="scene"
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
