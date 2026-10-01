import { useEffect, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import Breadcrumbs from '../components/Breadcrumbs.tsx'
import CellPanel from '../components/CellPanel.tsx'
import TourPanel from '../components/TourPanel.tsx'
import ZoomStage from '../components/ZoomStage.tsx'
import { getLocation } from '../engine/content.ts'
import { pathFor, resolvePath } from '../engine/paths.ts'
import { loadScene } from '../engine/sceneCache.ts'
import { focusHotspot, resolveTourPath, stepLocation, tourStepPath } from '../engine/tours.ts'
import NotFound from './NotFound.tsx'

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
  const resolved = tourMatch ? undefined : resolvePath(pathname)
  const loc = step ? stepLocation(step) : resolved?.location
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
    if (!step) (panelHeadingRef.current ?? headingRef.current)?.focus()
  }, [view, step])

  // Steps move with the arrow keys too (not while typing, and not with a modifier held).
  const stepCount = tour?.steps.length ?? 0
  const goStep = (i: number) => tour && navigate(tourStepPath(tour, i))
  useEffect(() => {
    if (!tour || index === undefined) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [contenteditable]')) return
      const next = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : -1
      if (next < 0 || next >= stepCount) return
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

  if (tour && index === undefined) return <Navigate to={tourStepPath(tour, 0)} replace />
  if (!loc) return <NotFound />
  // Back goes up one level: from a cell panel to its scene, from a scene to its parent.
  const up = cell ? loc : loc.parent ? getLocation(loc.parent) : undefined
  const exit = () => navigate(pathFor(loc))

  return (
    <main>
      <div className="topbar">
        {step ? (
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
      <h1 tabIndex={-1} ref={headingRef}>
        {loc.name}
      </h1>
      {!step && <p>{loc.summary}</p>}
      <div className={cell || step ? 'workspace with-panel' : 'workspace'}>
        <ZoomStage
          location={loc}
          focus={step && focusHotspot(loc, step)?.target}
          highlight={step?.highlight}
          cut={!!step}
        />
        {tour && step && index !== undefined ? (
          <TourPanel
            tour={tour}
            index={index}
            onBack={() => goStep(index - 1)}
            onNext={() => goStep(index + 1)}
            onExit={exit}
          />
        ) : (
          cell && <CellPanel cell={cell} location={loc} headingRef={panelHeadingRef} />
        )}
      </div>
    </main>
  )
}
