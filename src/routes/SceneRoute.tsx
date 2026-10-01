import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Breadcrumbs from '../components/Breadcrumbs.tsx'
import CellPanel from '../components/CellPanel.tsx'
import ZoomStage from '../components/ZoomStage.tsx'
import { getLocation } from '../engine/content.ts'
import { pathFor, resolvePath } from '../engine/paths.ts'
import NotFound from './NotFound.tsx'

export default function SceneRoute() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const resolved = resolvePath(pathname)
  const loc = resolved?.location
  const cell = resolved?.cell
  const headingRef = useRef<HTMLHeadingElement>(null)
  const panelHeadingRef = useRef<HTMLHeadingElement>(null)

  // The hotspot or link that was clicked may disappear, so move focus to the new title:
  // the panel's when a cell is open, otherwise the scene's. Comparing with the previous view
  // (not a "first render" flag) keeps a direct page load, and StrictMode's re-run, from stealing focus.
  const view = `${loc?.id}/${cell?.id ?? ''}`
  const shownView = useRef(view)
  useEffect(() => {
    if (shownView.current === view) return
    shownView.current = view
    ;(panelHeadingRef.current ?? headingRef.current)?.focus()
  }, [view])

  if (!loc) return <NotFound />
  // Back goes up one level: from a cell panel to its scene, from a scene to its parent.
  const up = cell ? loc : loc.parent ? getLocation(loc.parent) : undefined

  return (
    <main>
      <div className="topbar">
        {/* Back always zooms out (or closes the panel); the browser's own back button
            replays history through the same transition. */}
        <button type="button" className="back" disabled={!up} onClick={() => up && navigate(pathFor(up))}>
          ← Back
        </button>
        <Breadcrumbs location={loc} cell={cell} />
      </div>
      <h1 tabIndex={-1} ref={headingRef}>
        {loc.name}
      </h1>
      <p>{loc.summary}</p>
      <div className={cell ? 'workspace with-panel' : 'workspace'}>
        <ZoomStage location={loc} />
        {cell && <CellPanel cell={cell} location={loc} headingRef={panelHeadingRef} />}
      </div>
    </main>
  )
}
