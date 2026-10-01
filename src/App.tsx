import { Link, Navigate, NavLink, Route, Routes } from 'react-router'
import IconSprite from './components/IconSprite.tsx'
import SearchBox from './components/SearchBox.tsx'
import GlossaryEntry from './routes/GlossaryEntry.tsx'
import GlossaryIndex from './routes/GlossaryIndex.tsx'
import Network from './routes/Network.tsx'
import NotFound from './routes/NotFound.tsx'
import SceneRoute from './routes/SceneRoute.tsx'
import StyleGuide from './routes/StyleGuide.tsx'

export default function App() {
  return (
    <>
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
    </>
  )
}
