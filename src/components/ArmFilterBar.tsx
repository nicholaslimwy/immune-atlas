import { useLocation } from 'react-router'
import { ARM_LABELS, countArm, getArms } from '../engine/armFilter.ts'
import { getCells } from '../engine/content.ts'
import { useArmFilter } from './armFilterState.ts'

/** "Highlight: All / Innate / Adaptive / Support", under the site header. Buttons come from the arms the content has. */
export default function ArmFilterBar() {
  const { arm, setArm } = useArmFilter()
  const inTour = useLocation().pathname.startsWith('/tours')
  // Tours choose which cells to point at, so the filter is not offered (or applied) there.
  if (inTour) return null
  const arms = getArms()
  return (
    <div className="filter-bar">
      <span className="filter-label" id="filter-label">
        Highlight
      </span>
      <div className="filter-group" role="group" aria-labelledby="filter-label">
        <button type="button" aria-pressed={arm === null} onClick={() => setArm(null)}>
          All
        </button>
        {arms.map((a) => (
          <button key={a} type="button" aria-pressed={arm === a} onClick={() => setArm(arm === a ? null : a)}>
            {ARM_LABELS[a]}
          </button>
        ))}
      </div>
      <p className="visually-hidden" role="status">
        {arm
          ? `Highlighting ${ARM_LABELS[arm].toLowerCase()} cells: ${countArm(arm)} of ${getCells().length}. Other cells are dimmed.`
          : 'Highlighting all cells.'}
      </p>
    </div>
  )
}
