import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { getLocation } from '../engine/content.ts'
import { pathFor } from '../engine/paths.ts'
import type { Location } from '../types/location.ts'

// The SVG text is preloaded by ZoomStage and inlined here so hotspot regions are real DOM elements.
export default function Scene({ location, svg }: { location: Location; svg: string }) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  // Make each hotspot region a focusable, labelled button.
  useEffect(() => {
    for (const { region, target } of location.hotspots) {
      const el = containerRef.current?.querySelector(`[id="${region}"]`)
      if (!el) continue
      el.setAttribute('role', 'button')
      el.setAttribute('tabindex', '0')
      el.setAttribute('aria-label', getLocation(target)?.name ?? target)
      el.classList.add('hotspot')
    }
  }, [svg, location])

  const go = (el: Element | null) => {
    const hotspot = location.hotspots.find((h) => h.region === el?.id)
    const target = hotspot && getLocation(hotspot.target)
    if (target) navigate(pathFor(target))
  }

  const hotspotOf = (node: EventTarget) =>
    (node as Element).closest?.('.hotspot') ?? null

  return (
    <div
      ref={containerRef}
      className="scene"
      onClick={(e) => go(hotspotOf(e.target))}
      onKeyDown={(e) => {
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
  )
}
