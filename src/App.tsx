import { Navigate, Route, Routes } from 'react-router'
import NotFound from './routes/NotFound.tsx'
import SceneRoute from './routes/SceneRoute.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/body" replace />} />
      <Route path="/body/*" element={<SceneRoute />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
