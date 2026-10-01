import { useEffect, useRef, type PointerEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import Breadcrumbs from '../components/Breadcrumbs.tsx'
import CellPanel from '../components/CellPanel.tsx'
import TourPanel from '../components/TourPanel.tsx'
import ZoomStage from '../components/ZoomStage.tsx'
import { getLocation, getTours } from '../engine/content.ts'
import { pathFor, resolvePath } from '../engine/paths.ts'
import { loadScene } from '../engine/sceneCache.ts'
import { focusHotspot, resolveTourPath, stepLocation, tourStepPath } from '../engine/tours.ts'
import NotFound from './NotFound.tsx'

/** How far a finger must travel sideways, in CSS px, to count as a swipe. */
const SWIPE_MIN = 50

/**
 * Free exploration (/body/...) and guided tours (/tours/<id>/<step>) share this one view, so the
 * stage stays mounted when a visitor exits a tour: the scene settles back to its whole frame
 * instead of reloading.
 */
export default function SceneRoute() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const tourMatch = resolveTourPath(pathname)
  const tour = tourMatch?.tour
  const index = tourMatch?.index
  const step = tour && index !== undefined ? tour.steps[index] : undefined
  // The end screen (index == step count) stays in the last step's scene, with nothing marked.
  const ended = !!tour && index === tour.steps.length
  const inTour = !!tour && index !== undefined
  const resolved = tourMatch ? undefined : resolvePath(pathname)
  const lastStep = tour?.steps[tour.steps.length - 1]
  const loc = step ? stepLocation(step) : ended && lastStep ? stepLocation(lastStep) : resolved?.location
  const cell = resolved?.cell
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelHeadingRef = useRef<HTMLHeadingElement>(null)

  // The hotspot or link that was clicked may disappear, so move focus to the new title:
  // the panel's when a cell is open, otherwise the scene's. Comparing with the previous view
  // (not a "first render" flag) keeps a direct page load, and StrictMode's re-run, from stealing focus.
  // In a tour the Next and Back buttons stay put, so focus stays on them and the caption is announced.
  const view = `${loc?.id}/${cell?.id ?? ''}`
  const shownView = useRef(view)
  useEffect(() => {
    if (shownView.current === view) return
    shownView.current = view
    if (!inTour) (panelHeadingRef.current ?? headingRef.current)?.focus()
  }, [view, inTour])

  // Steps move with the arrow keys too (not while typing, and not with a modifier held). One step
  // past the last is the end screen.
  const stepCount = tour?.steps.length ?? 0
  const goStep = (i: number) => tour && navigate(tourStepPath(tour, i))
  useEffect(() => {
    if (!tour || index === undefined) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable]')) return
      const next = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : -1
      if (next < 0 || next > stepCount) return
      e.preventDefault()
      navigate(tourStepPath(tour, next))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tour, index, stepCount, navigate])

  // Fetch the next step's scene ahead of time, so Next does not wait on the network.
  const nextStep = tour && index !== undefined ? tour.steps[index + 1] : undefined
  useEffect(() => {
    const next = nextStep && stepLocation(nextStep)
    if (next) loadScene(next).catch(() => {})
  }, [nextStep])

  // Swiping moves between steps on a touch screen: left for next, right for back. Mouse drags are ignored.
  // The page allows vertical scrolling and pinch-zoom only in a tour (touch-action in the CSS), so the
  // browser keeps those gestures and the swipe arrives as a plain pointer sequence.
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const swipe = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      swipeStart.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
    },
    onPointerCancel: () => {
      swipeStart.current = null
    },
    onPointerUp: (e: PointerEvent<HTMLElement>) => {
      const from = swipeStart.current
      swipeStart.current = null
      if (!from || index === undefined) return
      const dx = e.clientX - from.x
      const dy = e.clientY - from.y
      if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < 1.5 * Math.abs(dy)) return
      const next = index + (dx < 0 ? 1 : -1)
      if (next >= 0 && next <= stepCount) goStep(next)
    },
  }

  if (tour && index === undefined) return <Navigate to={tourStepPath(tour, 0)} replace />
  if (!loc) return <NotFound />
  // Back goes up one level: from a cell panel to its scene, from a scene to its parent.
  const up = cell ? loc : loc.parent ? getLocation(loc.parent) : undefined
  const exit = () => navigate(pathFor(loc))
  // A visitor on the whole-body view can start any tour from here.
  const tours = !inTour && !cell && !loc.parent ? getTours() : []

  return (
    <main {...(inTour ? { ...swipe, 'data-tour': '' } : {})}>
      <div className="topbar">
        {inTour ? (
          <p className="tour-badge">Guided tour</p>
        ) : (
          // Back always zooms out (or closes the panel); the browser's own back button
          // replays history through the same transition.
          <button type="button" className="back" disabled={!up} onClick={() => up && navigate(pathFor(up))}>
            ← Back
          </button>
        )}
        <Breadcrumbs location={loc} cell={cell} />
      </div>
      <h1 tabIndex={-1} ref={headingRef} className={inTour ? 'tour-h1' : undefined}>
        {loc.name}
      </h1>
      {!inTour && <p>{loc.summary}</p>}
      {tours.map((t) => (
        <p key={t.id} className="tour-entry">
          <Link to={tourStepPath(t, 0)} className="tour-start">
            Take the tour: {t.title}
          </Link>
          <span className="panel-meta">{t.steps.length} steps</span>
        </p>
      ))}
      <div className={cell || inTour ? 'workspace with-panel' : 'workspace'}>
        <ZoomStage
          location={loc}
          focus={step && focusHotspot(loc, step)?.target}
          highlight={step?.highlight}
          cut={inTour}
        />
        {tour && inTour && index !== undefined ? (
          <TourPanel
            tour={tour}
            index={index}
            onBack={() => goStep(index - 1)}
            onNext={() => goStep(index + 1)}
            onExit={exit}
            onRestart={() => goStep(0)}
          />
        ) : (
          cell && <CellPanel cell={cell} location={loc} headingRef={panelHeadingRef} />
        )}
      </div>
    </main>
  )
}
