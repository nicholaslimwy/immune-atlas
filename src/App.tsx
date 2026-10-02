import { useEffect, useRef } from 'react'
import { MotionConfig } from 'framer-motion'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router'
import ArmFilterBar from './components/ArmFilterBar.tsx'
import IconSprite from './components/IconSprite.tsx'
import SearchBox from './components/SearchBox.tsx'
import GlossaryEntry from './routes/GlossaryEntry.tsx'
import GlossaryIndex from './routes/GlossaryIndex.tsx'
import Network from './routes/Network.tsx'
import NotFound from './routes/NotFound.tsx'
import SceneRoute from './routes/SceneRoute.tsx'
import StyleGuide from './routes/StyleGuide.tsx'

/** Moves keyboard focus to the page's title: what "skip to content" and a change of page both need. */
function focusTitle() {
  const title = document.querySelector<HTMLElement>('main h1')
  title?.setAttribute('tabindex', '-1')
  title?.focus()
}

/**
 * A link click replaces the page but not the focus: the link is gone and focus falls to the top of the
 * document. Pages outside the scenes (glossary, network...) move it to their title when the address
 * changes; the scene views do that themselves, with finer rules (a closed panel returns to its hotspot).
 */
function MoveFocusOnNavigate() {
  const { pathname } = useLocation()
  const shown = useRef(pathname)
  useEffect(() => {
    if (shown.current === pathname) return
    shown.current = pathname
    if (!/^\/(body|tours)(\/|$)/.test(pathname)) focusTitle()
  }, [pathname])
  return null
}

export default function App() {
  return (
    // Visitors who ask for reduced motion get no movement from Framer Motion; fades stay.
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault()
          focusTitle()
        }}
      >
        Skip to main content
      </a>
      <MoveFocusOnNavigate />
      <IconSprite />
      <header className="site-header">
        <nav className="site-nav" aria-label="Site">
          <Link to="/body" className="site-title">
            Immune System Atlas
          </Link>
          <NavLink to="/glossary" className="site-link">
            Glossary
          </NavLink>
          <NavLink to="/network" className="site-link">
            Network
          </NavLink>
        </nav>
        <SearchBox />
      </header>
      <ArmFilterBar />
      <Routes>
        <Route path="/" element={<Navigate to="/body" replace />} />
        {/* One element for both, so exiting a tour keeps the stage (and its scene) mounted. */}
        <Route path="/body/*" element={<SceneRoute />} />
        <Route path="/tours/*" element={<SceneRoute />} />
        <Route path="/glossary" element={<GlossaryIndex />} />
        <Route path="/glossary/:id" element={<GlossaryEntry />} />
        <Route path="/network" element={<Network />} />
        <Route path="/styleguide" element={<StyleGuide />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MotionConfig>
  )
}
