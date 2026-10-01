import { Link } from 'react-router'
import { getCell } from '../engine/content.ts'
import { interactionLine } from '../engine/interactions.ts'
import { tourStepPath } from '../engine/tours.ts'
import type { Tour } from '../types/tour.ts'

interface Props {
  tour: Tour
  index: number
  onBack: () => void
  onNext: () => void
  onExit: () => void
}

/** The caption panel and controls of a guided tour. Everything it says comes from the tour's JSON. */
export default function TourPanel({ tour, index, onBack, onNext, onExit }: Props) {
  const step = tour.steps[index]
  const first = index === 0
  const last = index === tour.steps.length - 1
  const lines = step.interactions.flatMap((id) => interactionLine(id) ?? [])
  const highlighted = step.highlight.map((id) => getCell(id)?.name ?? id)

  return (
    <aside className="panel tour-panel" aria-labelledby="tour-panel-title">
      <div className="panel-head">
        <h2 id="tour-panel-title">{tour.title}</h2>
        <button type="button" className="tour-exit" onClick={onExit}>
          Exit tour
        </button>
      </div>

      <nav aria-label="Tour progress" className="tour-progress">
        <p className="panel-meta">
          Step {index + 1} of {tour.steps.length}
        </p>
        <ol>
          {tour.steps.map((_, i) => (
            <li key={i}>
              <Link
                to={tourStepPath(tour, i)}
                className={i === index ? 'current' : i < index ? 'done' : undefined}
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Step ${i + 1}`}
              />
            </li>
          ))}
        </ol>
      </nav>

      {/* Announced when the step changes, so the controls can keep focus. */}
      <div aria-live="polite">
        <p className="tour-caption">{step.caption}</p>
        {highlighted.length > 0 && (
          <p className="panel-meta">
            <span className="tour-ring" aria-hidden="true" /> Highlighted: {highlighted.join(', ')}
          </p>
        )}
      </div>

      <div className="tour-controls">
        {/* aria-disabled, not disabled, so a keyboard user who just pressed Back keeps focus on it. */}
        <button type="button" aria-disabled={first} onClick={() => !first && onBack()}>
          ← Back
        </button>
        <button type="button" className="primary" onClick={last ? onExit : onNext}>
          {last ? 'Finish' : 'Next →'}
        </button>
      </div>
      <p className="panel-meta tour-keys">Arrow keys also move between steps.</p>

      {lines.length > 0 && (
        <section>
          <h3>In this step</h3>
          <ul className="interactions">
            {lines.map((ix) => (
              <li key={ix.id}>
                <p className="ix-head">
                  {ix.source} <span className="ix-verb">{ix.verb}</span> {ix.target}
                </p>
                <p>{ix.description}</p>
                {(ix.via.length > 0 || ix.where.length > 0) && (
                  <p className="ix-meta">
                    {ix.via.length > 0 && <>Via {ix.via.join(', ')}</>}
                    {ix.via.length > 0 && ix.where.length > 0 && ' · '}
                    {ix.where.length > 0 && <>In {ix.where.join(', ')}</>}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}
