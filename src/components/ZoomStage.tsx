import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from 'framer-motion'
import { getLocation } from '../engine/content.ts'
import { loadScene } from '../engine/sceneCache.ts'
import { CENTRE, computeNav, type Shown, type ZoomNav } from '../engine/zoom.ts'
import type { Location } from '../types/location.ts'
import Scene from './Scene.tsx'

/** How far the outer scene scales toward the hotspot (and arrives from when zooming out). */
const ZOOM = 8
/** How small an inner scene starts before settling to 1x. */
const SMALL = 0.85

interface Custom extends ZoomNav {
  reduced: boolean
}

const scaleEase = [0.65, 0, 0.35, 1] as const

const variants: Variants = {
  enter: ({ direction, origin, reduced }: Custom) => {
    if (reduced || direction === 'cross') return { opacity: 0 }
    return direction === 'in'
      ? { opacity: 0, scale: SMALL, transformOrigin: CENTRE }
      : { opacity: 0, scale: ZOOM, transformOrigin: origin }
  },
  center: ({ direction, reduced }: Custom) => ({
    opacity: 1,
    scale: 1,
    transition: {
      opacity: { duration: 0.5, delay: reduced || direction === 'cross' ? 0 : 0.2, ease: 'easeOut' },
      scale: { duration: reduced ? 0 : 0.85, ease: scaleEase },
    },
  }),
  exit: ({ direction, origin, reduced }: Custom) => {
    const fade: Transition = { opacity: { duration: 0.5, ease: 'easeIn' } }
    if (reduced || direction === 'cross') {
      return { opacity: 0, pointerEvents: 'none', transition: fade }
    }
    // The origin must jump, not glide, to the hotspot; the scene is still at 1x so it is invisible.
    const transition: Transition = {
      ...fade,
      scale: { duration: 0.85, ease: scaleEase },
      transformOrigin: { duration: 0 },
    }
    return direction === 'in'
      ? { opacity: 0, scale: ZOOM, transformOrigin: origin, pointerEvents: 'none', transition }
      : { opacity: 0, scale: SMALL, transformOrigin: CENTRE, pointerEvents: 'none', transition }
  },
}

/**
 * Shows `location`'s scene and animates between scenes. The incoming scene is fetched first, so the
 * old one stays on screen until the new one can fade in; both are then ready to aim at the hotspot.
 */
export default function ZoomStage({ location }: { location: Location }) {
  const reduced = useReducedMotion() ?? false
  const [state, setState] = useState<{ shown: Shown; nav: ZoomNav } | null>(null)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let current = true
    loadScene(location).then(
      (scene) => {
        if (!current) return
        setError(undefined)
        setState((prev) => {
          if (prev?.shown.location.id === location.id) return prev
          const shown = { location, scene }
          const nav: ZoomNav = prev
            ? computeNav(prev.shown, shown)
            : { direction: 'cross', origin: CENTRE }
          return { shown, nav }
        })
      },
      (err) => {
        if (current) setError(String(err))
      },
    )
    return () => {
      current = false
    }
  }, [location])

  // Warm the cache for the scenes one click away so zooming in does not wait on the network.
  const shownLocation = state?.shown.location
  useEffect(() => {
    for (const { target } of shownLocation?.hotspots ?? []) {
      const next = getLocation(target)
      if (next && next.status !== 'stub') loadScene(next).catch(() => {})
    }
  }, [shownLocation])

  const custom: Custom | undefined = state ? { ...state.nav, reduced } : undefined

  return (
    <div className="stage">
      {error && <p role="alert">Could not load scene ({error})</p>}
      <AnimatePresence initial={false} custom={custom}>
        {state && (
          <motion.div
            key={state.shown.location.id}
            className="zoom-layer"
            custom={custom}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <Scene location={state.shown.location} svg={state.shown.scene.svg} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
