import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import Breadcrumbs from '../components/Breadcrumbs.tsx'
import ZoomStage from '../components/ZoomStage.tsx'
import { getLocation } from '../engine/content.ts'
import { pathFor, resolvePath } from '../engine/paths.ts'
import NotFound from './NotFound.tsx'

export default function SceneRoute() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const loc = resolvePath(pathname)
  const headingRef = useRef<HTMLHeadingElement>(null)

  // The hotspot that was clicked disappears with its scene, so move focus to the new title.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    headingRef.current?.focus()
  }, [loc?.id])

  if (!loc) return <NotFound />
  const parent = loc.parent ? getLocation(loc.parent) : undefined

  return (
    <main>
      <div className="topbar">
        {/* Back goes up one level, so it always zooms out; the browser's own back button
            replays history through the same transition. */}
        <button type="button" className="back" disabled={!parent} onClick={() => parent && navigate(pathFor(parent))}>
          ← Back
        </button>
        <Breadcrumbs location={loc} />
      </div>
      <h1 tabIndex={-1} ref={headingRef}>
        {loc.name}
      </h1>
      <p>{loc.summary}</p>
      <ZoomStage location={loc} />
    </main>
  )
}
