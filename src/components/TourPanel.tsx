import { Link } from 'react-router'
import { getCell, getLocation } from '../engine/content.ts'
import { mentionAnnotator } from '../engine/glossary.ts'
import { interactionLine } from '../engine/interactions.ts'
import { tourStepPath } from '../engine/tours.ts'
import MoleculeText, { MoleculeList } from './MoleculeText.tsx'
import type { Tour } from '../types/tour.ts'

interface Props {
  tour: Tour
  /** 0-based step; the step count itself is the end screen. */
  index: number
  onBack: () => void
  onNext: () => void
  onExit: () => void
  /** From the end screen: play the tour again from step 1. */
  onRestart: () => void
}

/**
 * The caption panel and controls of a guided tour. Step wording comes from the tour's JSON.
 * On the end screen the Back and primary buttons stay mounted (so keyboard focus survives pressing
 * Finish) and the primary one becomes Restart.
 */
export default function TourPanel({ tour, index, onBack, onNext, onExit, onRestart }: Props) {
  const ended = index >= tour.steps.length
  const step = ended ? undefined : tour.steps[index]
  const first = index === 0
  const last = index === tour.steps.length - 1
  const lines = step?.interactions.flatMap((id) => interactionLine(id) ?? []) ?? []
  // One annotator for the step, in reading order: the caption first, then the interactions below it.
  const mark = mentionAnnotator()
  const caption = step ? mark(step.caption) : undefined
  const highlighted = step?.highlight.map((id) => getCell(id)?.name ?? id) ?? []

  return (
    <aside className="panel tour-panel" aria-labelledby="tour-panel-title">
      <div className="panel-head">
        <h2 id="tour-panel-title">{tour.title}</h2>
        {!ended && (
          <button type="button" className="tour-exit" onClick={onExit}>
            Exit tour
          </button>
        )}
      </div>

      <nav aria-label="Tour progress" className="tour-progress">
        <p className="panel-meta">{ended ? 'Tour complete' : `Step ${index + 1} of ${tour.steps.length}`}</p>
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
        {step ? (
          <>
            {/* Spoken first, so a screen reader hears which scene the step is in, as well as the caption. */}
            <p className="visually-hidden">
              Step {index + 1} of {tour.steps.length}, {getLocation(step.location)?.name}.
            </p>
            <p className="tour-caption">
              <MoleculeText parts={caption!} />
            </p>
          </>
        ) : (
          <div className="tour-end">
            <p className="tour-caption">
              That is the end of the tour. Play it again, or explore the atlas freely: every cell in the scene opens its
              profile.
            </p>
          </div>
        )}
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
        <button type="button" className="primary" onClick={ended ? onRestart : onNext}>
          {ended ? '↺ Restart tour' : last ? 'Finish' : 'Next →'}
        </button>
      </div>
      {ended ? (
        <button type="button" className="tour-explore" onClick={onExit}>
          Explore freely
        </button>
      ) : (
        <p className="panel-meta tour-keys">Swipe, or use the arrow keys, to move between steps.</p>
      )}

      {lines.length > 0 && (
        <section>
          <h3>In this step</h3>
          <ul className="interactions">
            {lines.map((ix) => (
              <li key={ix.id}>
                <p className="ix-head">
                  {ix.source} <span className="ix-verb">{ix.verb}</span> {ix.target}
                </p>
                <p>
                  <MoleculeText parts={mark(ix.description)} />
                </p>
                {(ix.via.length > 0 || ix.where.length > 0) && (
                  <p className="ix-meta">
                    {ix.via.length > 0 && <>
                        Via <MoleculeList items={ix.via.map(mark)} />
                      </>}
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
