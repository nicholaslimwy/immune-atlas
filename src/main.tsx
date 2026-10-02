import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ArmFilterProvider } from './components/ArmFilterContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BASE_URL is "/" locally and the repository folder on GitHub Pages ("/immune-atlas/"). */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ArmFilterProvider>
        <App />
      </ArmFilterProvider>
    </BrowserRouter>
  </StrictMode>,
)
