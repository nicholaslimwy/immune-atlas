import { Navigate, Route, Routes } from 'react-router'
import IconSprite from './components/IconSprite.tsx'
import NotFound from './routes/NotFound.tsx'
import SceneRoute from './routes/SceneRoute.tsx'
import StyleGuide from './routes/StyleGuide.tsx'

export default function App() {
  return (
    <>
      <IconSprite />
      <Routes>
        <Route path="/" element={<Navigate to="/body" replace />} />
        {/* One element for both, so exiting a tour keeps the stage (and its scene) mounted. */}
        <Route path="/body/*" element={<SceneRoute />} />
        <Route path="/tours/*" element={<SceneRoute />} />
        <Route path="/styleguide" element={<StyleGuide />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
