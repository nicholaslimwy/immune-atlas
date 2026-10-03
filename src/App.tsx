import { lazy, Suspense, useEffect, useRef } from 'react'
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router'
import ArmFilterBar from './components/ArmFilterBar.tsx'
import IconSprite from './components/IconSprite.tsx'
import SearchBox from './components/SearchBox.tsx'
import NotFound from './routes/NotFound.tsx'
import SceneRoute from './routes/SceneRoute.tsx'

// Everything outside the scenes is fetched when the visitor goes there, not on the first page load.
const About = lazy(() => import('./routes/About.tsx'))
const GlossaryEntry = lazy(() => import('./routes/GlossaryEntry.tsx'))
const GlossaryIndex = lazy(() => import('./routes/GlossaryIndex.tsx'))
const Network = lazy(() => import('./routes/Network.tsx'))
const StyleGuide = lazy(() => import('./routes/StyleGuide.tsx'))

/**
 * Moves keyboard focus to the page's title: what "skip to content" and a change of page both need.
 * A page that is still being fetched has no title yet, so wait (briefly) for it to appear.
 */
function focusTitle() {
  const focus = () => {
    const title = document.querySelector<HTMLElement>('main h1')
    title?.setAttribute('tabindex', '-1')
    title?.focus()
    return !!title
  }
  if (focus()) return
  const watch = new MutationObserver(() => focus() && watch.disconnect())
  watch.observe(document.body, { childList: true, subtree: true })
  setTimeout(() => watch.disconnect(), 5000)
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
    if (!/^\/(body|tours|processes)(\/|$)/.test(pathname)) focusTitle()
  }, [pathname])
  return null
}

export default function App() {
  return (
    // Visitors who ask for reduced motion get no movement from Framer Motion; fades stay.
    <LazyMotion features={domAnimation} strict>
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
            <NavLink to="/about" className="site-link">
              About
            </NavLink>
          </nav>
          <SearchBox />
        </header>
        <ArmFilterBar />
        <Suspense fallback={<main className="page-loading" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<Navigate to="/body" replace />} />
          {/* One element for all three, so exiting a tour or process keeps the stage (and its scene) mounted. */}
          <Route path="/body/*" element={<SceneRoute />} />
          <Route path="/tours/*" element={<SceneRoute />} />
          <Route path="/processes/*" element={<SceneRoute />} />
          <Route path="/glossary" element={<GlossaryIndex />} />
          <Route path="/glossary/:id" element={<GlossaryEntry />} />
          <Route path="/network" element={<Network />} />
          <Route path="/styleguide" element={<StyleGuide />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </MotionConfig>
    </LazyMotion>
  )
}
