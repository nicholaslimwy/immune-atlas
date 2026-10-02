import { useEffect, useState } from 'react'

const KEY = 'immune-atlas:motion-paused'

/** The saved choice; storage can be blocked or throw, in which case the scenes simply move. */
function load(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Pause button for the gentle motion in scenes (flowing red cells, bobbing white cells). Movement that starts
 * by itself and runs for more than a few seconds needs a way to stop it, even for visitors whose system
 * does not ask for reduced motion; those visitors never see it move, so the button is shown only to the rest.
 */
export default function MotionToggle() {
  const [paused, setPaused] = useState(load)
  const [system, setSystem] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    document.documentElement.classList.toggle('motion-paused', paused)
    try {
      localStorage.setItem(KEY, paused ? '1' : '0')
    } catch {
      /* not saved; the choice lasts for this visit */
    }
  }, [paused])

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setSystem(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  if (system) return null
  return (
    <button type="button" className="motion-toggle" aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
      {paused ? 'Resume scene motion' : 'Pause scene motion'}
    </button>
  )
}
