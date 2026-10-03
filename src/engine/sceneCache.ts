import type { Location } from '../types/location.ts'

export interface LoadedScene {
  svg: string
  /** Hotspot and region centres as fractions (0-1) of the scene box, keyed by the hotspot's target id
   *  or the region's id (the validator keeps those apart). */
  centres: Record<string, { x: number; y: number }>
  /** The networks the art marks with data-network (the body scene: blood, lymph), in first-seen order. */
  networks: string[]
}

// Scenes are authored at this size so one fixed stage aspect ratio fits them all.
export const SCENE_W = 800
export const SCENE_H = 500

const cache = new Map<string, Promise<LoadedScene>>()

/** Fetch a scene once and measure its hotspots; later calls reuse the result. */
export function loadScene(loc: Location): Promise<LoadedScene> {
  let hit = cache.get(loc.id)
  if (!hit) {
    hit = fetch(import.meta.env.BASE_URL + loc.scene)
      .then((res) => {
        if (!res.ok) throw new Error(`${loc.scene}: HTTP ${res.status}`)
        return res.text()
      })
      .then((svg) => ({ svg, centres: measureHotspots(svg, loc), networks: networksIn(svg) }))
    hit.catch(() => cache.delete(loc.id)) // allow a retry after a failure
    cache.set(loc.id, hit)
  }
  return hit
}

const networksIn = (svg: string) => [...new Set([...svg.matchAll(/\sdata-network="([^"]+)"/g)].map((m) => m[1]))]

// Render the SVG off-screen at stage size so the zoom can aim at each hotspot,
// transforms and all, whatever the final art looks like.
function measureHotspots(svg: string, loc: Location): LoadedScene['centres'] {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = `position:fixed;left:-99999px;top:0;width:${SCENE_W}px;height:${SCENE_H}px;visibility:hidden`
  host.innerHTML = svg
  const root = host.querySelector('svg')
  root?.setAttribute('width', '100%')
  root?.setAttribute('height', '100%')
  document.body.appendChild(host)
  const centres: LoadedScene['centres'] = {}
  try {
    const box = root?.getBoundingClientRect()
    if (box && box.width > 0) {
      const places = [
        ...loc.hotspots.map(({ region, target }) => ({ el: region, key: target })),
        ...(loc.regions ?? []).map(({ id }) => ({ el: id, key: id })),
      ]
      for (const { el: elId, key } of places) {
        // Aim at the hotspot's [data-zoom-anchor] element when it has one (a spread-out region such as
        // the lymph nodes would otherwise zoom into the middle of its bounding box), else the region.
        const el = host.querySelector(`[id="${elId}"]`)
        const r = (el?.querySelector('[data-zoom-anchor]') ?? el)?.getBoundingClientRect()
        if (!r) continue
        centres[key] = {
          x: (r.left + r.width / 2 - box.left) / box.width,
          y: (r.top + r.height / 2 - box.top) / box.height,
        }
      }
    }
  } finally {
    host.remove()
  }
  return centres
}
