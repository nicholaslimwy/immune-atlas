import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, type Transition, type Variants } from 'framer-motion'
import { getLocation } from '../engine/content.ts'
import { loadScene } from '../engine/sceneCache.ts'
import { CENTRE, computeNav, frameAround, sameFrame, type Shown, type ZoomNav } from '../engine/zoom.ts'
import type { Location } from '../types/location.ts'
import Scene from './Scene.tsx'

/** How far the outer scene scales toward the hotspot (and arrives from when zooming out). */
const ZOOM = 8
/** How small an inner scene starts before settling to 1x. */
const SMALL = 0.85

interface Custom extends ZoomNav {
  reduced: boolean
  /** Reduced motion in a tour: swap scenes in a single frame instead of fading. */
  cut: boolean
}

const scaleEase = [0.65, 0, 0.35, 1] as const
const CUT: Transition = { duration: 0 }

const variants: Variants = {
  enter: ({ direction, origin, reduced }: Custom) => {
    if (reduced || direction === 'cross') return { opacity: 0 }
    return direction === 'in'
      ? { opacity: 0, scale: SMALL, transformOrigin: CENTRE }
      : { opacity: 0, scale: ZOOM, transformOrigin: origin }
  },
  center: ({ direction, reduced, cut }: Custom) => ({
    opacity: 1,
    scale: 1,
    transition: cut
      ? CUT
      : {
          opacity: { duration: 0.5, delay: reduced || direction === 'cross' ? 0 : 0.2, ease: 'easeOut' },
          scale: { duration: reduced ? 0 : 0.85, ease: scaleEase },
        },
  }),
  exit: ({ direction, origin, reduced, cut }: Custom) => {
    if (cut) return { opacity: 0, pointerEvents: 'none', transition: CUT }
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

interface Props {
  location: Location
  /** A hotspot target in this scene to frame (tour steps); absent = the whole scene. */
  focus?: string
  /** Cell ids whose hotspots are highlighted (tour steps); a focused frame keeps them in view. */
  highlight?: readonly string[]
  /** Under reduced motion, cut between scenes and frames instead of fading (tours). */
  cut?: boolean
}

const NONE: readonly string[] = []

/**
 * Shows `location`'s scene and animates between scenes. The incoming scene is fetched first, so the
 * old one stays on screen until the new one can fade in; both are then ready to aim at the hotspot.
 * Inside each scene a second layer frames the focus hotspot, if any, so a tour can point at it.
 */
export default function ZoomStage({ location, focus, highlight = NONE, cut = false }: Props) {
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
          const frame = frameAround(
            focus === undefined ? undefined : scene.centres[focus],
            highlight.flatMap((id) => scene.centres[id] ?? []),
          )
          if (prev?.shown.location.id === location.id) {
            // Same scene, new framing: only the inner layer moves.
            return sameFrame(prev.shown.frame, frame) ? prev : { ...prev, shown: { ...prev.shown, frame } }
          }
          const shown = { location, scene, frame }
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
  }, [location, focus, highlight])

  // Warm the cache for the scenes one click away so zooming in does not wait on the network.
  const shownLocation = state?.shown.location
  useEffect(() => {
    for (const { target } of shownLocation?.hotspots ?? []) {
      const next = getLocation(target)
      if (next && next.status !== 'stub') loadScene(next).catch(() => {})
    }
  }, [shownLocation])

  const custom: Custom | undefined = state ? { ...state.nav, reduced, cut: cut && reduced } : undefined
  const frame = state?.shown.frame
  // Highlights belong to the scene they were meant for; the outgoing scene keeps its own as it leaves.
  const shownHighlight = state?.shown.location.id === location.id ? highlight : NONE
  const shownFocus = state?.shown.location.id === location.id ? focus : undefined

  return (
    <div className="stage">
      {error && <p role="alert">Could not load scene ({error})</p>}
      <AnimatePresence initial={false} custom={custom}>
        {state && frame && (
          <motion.div
            key={state.shown.location.id}
            className="zoom-layer"
            custom={custom}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <motion.div
              className="frame-layer"
              style={{ originX: 0, originY: 0 }}
              initial={false}
              animate={{ scale: frame.scale, x: `${frame.x * 100}%`, y: `${frame.y * 100}%` }}
              transition={reduced ? CUT : { duration: 0.9, ease: scaleEase }}
            >
              <Scene
                location={state.shown.location}
                svg={state.shown.scene.svg}
                highlight={shownHighlight}
                focus={shownFocus}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
