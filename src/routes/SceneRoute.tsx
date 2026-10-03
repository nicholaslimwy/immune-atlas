import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate, useNavigationType } from 'react-router'
import Breadcrumbs from '../components/Breadcrumbs.tsx'
import CellPanel from '../components/CellPanel.tsx'
import MotionToggle from '../components/MotionToggle.tsx'
import RegionPanel from '../components/RegionPanel.tsx'
import SceneList from '../components/SceneList.tsx'
import SceneNetworks, { type NetworkShow } from '../components/SceneNetworks.tsx'
import TourPanel from '../components/TourPanel.tsx'
import { useDocumentTitle } from '../components/useDocumentTitle.ts'
import ZoomStage from '../components/ZoomStage.tsx'
import { getLocation, getProcessesIn, getTours } from '../engine/content.ts'
import { pathFor, resolvePath } from '../engine/paths.ts'
import { loadScene } from '../engine/sceneCache.ts'
import {
  focusKey,
  pointKey,
  processStepPath,
  resolveStoryPath,
  STORY_WORDS,
  stepLocation,
  storyStepPath,
  tourStepPath,
} from '../engine/stories.ts'
import type { Location } from '../types/location.ts'
import NotFound from './NotFound.tsx'

/** How far a finger must travel sideways, in CSS px, to count as a swipe. */
const SWIPE_MIN = 50

/**
 * Free exploration (/body/...), guided tours (/tours/<id>/<step>) and processes (/processes/<id>/<step>)
 * share this one view, so the stage stays mounted when a visitor exits a tour or process: the scene
 * settles back to its whole frame instead of reloading. Tours and processes are both "stories" here.
 */
export default function SceneRoute() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const storyMatch = resolveStoryPath(pathname)
  const story = storyMatch?.story
  const index = storyMatch?.index
  const step = story && index !== undefined ? story.steps[index] : undefined
  // The end screen (index == step count) stays in the last step's scene, with nothing marked.
  const ended = !!story && index === story.steps.length
  // In a tour or a process (the name stayed from when tours were the only kind).
  const inTour = !!story && index !== undefined
  const resolved = storyMatch ? undefined : resolvePath(pathname)
  const lastStep = story?.steps[story.steps.length - 1]
  const loc = step ? stepLocation(step) : ended && lastStep ? stepLocation(lastStep) : resolved?.location
  const cell = resolved?.cell
  const region = resolved?.region
  // What the step zooms toward and the movement it draws, as keys into the scene's measured centres.
  const focus = loc && step ? focusKey(loc, step) : undefined
  const arrows = useMemo(
    () =>
      loc && step
        ? step.arrows.flatMap(({ from, to }) => {
            const [a, b] = [pointKey(loc, from), pointKey(loc, to)]
            return a && b ? [{ from: a, to: b }] : []
          })
        : [],
    [loc, step],
  )
  const headingRef = useRef<HTMLHeadingElement>(null)
  // Which networks a scene drawn with them (the whole body) shows; kept while the visitor moves around.
  const [show, setShow] = useState<NetworkShow>('all')
  const networks = useSceneNetworks(loc)
  const panelHeadingRef = useRef<HTMLHeadingElement>(null)

  // The hotspot or link that was clicked may disappear, so move focus to the new title:
  // the panel's when a cell or region is open, otherwise the scene's. Comparing with the previous view
  // (not a "first render" flag) keeps a direct page load, and StrictMode's re-run, from stealing focus.
  // In a tour the Next and Back buttons stay put, so focus stays on them and the caption is announced.
  // Closing a panel (Escape, the × or Back) returns focus to the hotspot or region that opened it, so a
  // keyboard user carries on from where they were instead of from the top of the page.
  const open = cell?.id ?? region?.id
  const view = `${loc?.id}/${open ?? ''}`
  const shownView = useRef({ view, loc: loc?.id, open })
  useEffect(() => {
    const prev = shownView.current
    shownView.current = { view, loc: loc?.id, open }
    if (prev.view === view || inTour) return
    if (prev.open && !open && prev.loc === loc?.id) {
      const elId =
        loc?.hotspots.find((h) => h.target === prev.open)?.region ?? loc?.regions?.find((r) => r.id === prev.open)?.id
      const opener = elId ? document.getElementById(elId) : null
      if (opener instanceof SVGElement) {
        opener.focus()
        return
      }
    }
    ;(panelHeadingRef.current ?? headingRef.current)?.focus()
  }, [view, inTour, loc, open])

  // Read once, at mount: whether this view was reached by a click from another page.
  const arrivedByClick = useRef(useNavigationType() === 'PUSH')

  // Entering a tour or process from outside it (the entry link, a search result) removes the control that was
  // used, so focus goes to the scene's title. A direct load of a step URL does not steal focus.
  const wasInTour = useRef(inTour)
  // Leaving it (Exit tour, Explore freely) unmounts the button that was pressed, so focus goes to the scene title.
  useEffect(() => {
    if (inTour !== wasInTour.current) headingRef.current?.focus()
    wasInTour.current = inTour
  }, [inTour])

  useDocumentTitle(
    !loc
      ? 'Not found'
      : story && index !== undefined
        ? ended
          ? `${story.title}: ${STORY_WORDS[story.kind].done.toLowerCase()}`
          : `${story.title}: step ${index + 1} of ${story.steps.length}`
        : cell || region
          ? `${(cell ?? region)!.name} in ${loc.name}`
          : loc.name,
  )

  // Arriving from another page by a click (a search result chosen on a glossary entry) mounts this view
  // fresh, with the old page's focus gone: land on the title. A direct page load (not PUSH) does not.
  useEffect(() => {
    if (arrivedByClick.current) (panelHeadingRef.current ?? headingRef.current)?.focus()
  }, [])

  // Steps move with the arrow keys too (not while typing, and not with a modifier held). One step
  // past the last is the end screen.
  const stepCount = story?.steps.length ?? 0
  const goStep = (i: number) => story && navigate(storyStepPath(story, i))
  useEffect(() => {
    if (!story || index === undefined) return
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest?.('input, textarea, select, [contenteditable]')) return
      const next = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : -1
      if (next < 0 || next > stepCount) return
      e.preventDefault()
      navigate(storyStepPath(story, next))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [story, index, stepCount, navigate])

  // Fetch the next step's scene ahead of time, so Next does not wait on the network.
  const nextStep = story && index !== undefined ? story.steps[index + 1] : undefined
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

  if (story && index === undefined) return <Navigate to={storyStepPath(story, 0)} replace />
  if (!loc) return <NotFound />
  // Back goes up one level: from a cell or region panel to its scene, from a scene to its parent.
  const up = cell || region ? loc : loc.parent ? getLocation(loc.parent) : undefined
  const exit = () => navigate(pathFor(loc))
  // A visitor on the whole-body view can start any tour from here.
  const tours = !inTour && !open && !loc.parent ? getTours() : []
  // A scene with processes offers each one: "See how it works".
  const processes = inTour ? [] : getProcessesIn(loc.id)
  // The network key and the caption sit under the stage when nothing is beside it; a tour shows everything.
  const underStage = !inTour && !open

  return (
    <main id="main" {...(inTour ? { ...swipe, 'data-tour': '' } : {})}>
      <div className="topbar">
        {story && inTour ? (
          <p className="tour-badge">{STORY_WORDS[story.kind].badge}</p>
        ) : (
          // Back always zooms out (or closes the panel); the browser's own back button
          // replays history through the same transition.
          <button type="button" className="back" disabled={!up} onClick={() => up && navigate(pathFor(up))}>
            ← Back
          </button>
        )}
        <Breadcrumbs location={loc} cell={cell} region={region} />
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
      {processes.map((p) => (
        <p key={p.id} className="tour-entry">
          <Link to={processStepPath(p, 0)} className="process-start">
            See how it works: {p.title}
          </Link>
          <span className="panel-meta">{p.steps.length} steps</span>
        </p>
      ))}
      <div className={open || inTour ? 'workspace with-panel' : 'workspace'} data-show={inTour ? undefined : show}>
        <ZoomStage
          location={loc}
          focus={focus}
          highlight={step?.highlight}
          arrows={arrows}
          cut={inTour}
          processStep={story?.kind === 'process' && step && index !== undefined ? { id: story.id, step: index + 1 } : undefined}
        />
        {underStage && <SceneNetworks networks={networks} show={show} onShow={setShow} />}
        {underStage && loc.caption && <p className="scene-caption">{loc.caption}</p>}
        {story && inTour && index !== undefined ? (
          <TourPanel
            story={story}
            index={index}
            onBack={() => goStep(index - 1)}
            onNext={() => goStep(index + 1)}
            onExit={exit}
            onRestart={() => goStep(0)}
          />
        ) : cell ? (
          <CellPanel cell={cell} location={loc} headingRef={panelHeadingRef} />
        ) : (
          region && <RegionPanel region={region} location={loc} headingRef={panelHeadingRef} />
        )}
      </div>
      {!inTour && <SceneList location={loc} />}
      <MotionToggle />
    </main>
  )
}

/** The networks drawn in `loc`'s scene (data-network in its SVG), once the scene has loaded. */
function useSceneNetworks(loc: Location | undefined): string[] {
  const [found, setFound] = useState<{ id: string; networks: string[] }>()
  useEffect(() => {
    if (!loc) return
    let current = true
    loadScene(loc).then(
      (scene) => {
        if (current) setFound({ id: loc.id, networks: scene.networks })
      },
      () => {},
    )
    return () => {
      current = false
    }
  }, [loc])
  return found && found.id === loc?.id ? found.networks : []
}
