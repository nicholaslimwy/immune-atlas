import { ANATOMY, INK } from '../art/palette.ts'

/** The networks a scene can mark with data-network (the validator allows only these), legend order. */
const NETWORKS = {
  blood: { name: 'Blood vessels', how: 'a loop from the heart and back', short: 'Blood' },
  lymph: { name: 'Lymph vessels and nodes', how: 'one way, back to the blood', short: 'Lymph' },
} as const

export type NetworkId = keyof typeof NETWORKS
/** Which networks the scene shows: all of them, or just one. */
export type NetworkShow = 'all' | NetworkId

/** A short stretch of each network, drawn as in the scene: solid and dark for blood, thin and beaded for lymph. */
function Sample({ id }: { id: NetworkId }) {
  return (
    <svg className="network-sample" viewBox="0 0 40 12" width="40" height="12" aria-hidden="true">
      {id === 'blood' ? (
        <path d="M2 6 H38" stroke={ANATOMY.bloodVessel} strokeWidth="4" strokeLinecap="round" />
      ) : (
        <>
          <path d="M2 6 H38" stroke={ANATOMY.lymphVessel} strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="20" cy="6" rx="5.5" ry="3.8" fill={ANATOMY.lymphBase} stroke={INK} strokeWidth="1.5" />
        </>
      )}
    </svg>
  )
}

interface Props {
  /** The networks the scene's art contains (LoadedScene.networks). */
  networks: readonly string[]
  show: NetworkShow
  onShow: (show: NetworkShow) => void
}

/**
 * Legend and Show toggle under a scene drawn with networks (the whole body: blood and lymph). The toggle
 * hides the other network, hotspots and all, through `data-show` on the workspace (CSS in index.css).
 */
export default function SceneNetworks({ networks, show, onShow }: Props) {
  const present = (Object.keys(NETWORKS) as NetworkId[]).filter((id) => networks.includes(id))
  // A toggle needs two networks to choose between.
  if (present.length < 2) return null
  return (
    <div className="scene-networks">
      <ul className="network-legend" aria-label="Key">
        {present.map((id) => (
          <li key={id} className={show !== 'all' && show !== id ? 'network-off' : undefined}>
            <Sample id={id} />
            <span>
              <strong>{NETWORKS[id].name}</strong>: {NETWORKS[id].how}
            </span>
          </li>
        ))}
      </ul>
      <div className="network-show">
        <span id="network-show-label">Show</span>
        <div className="filter-group" role="group" aria-labelledby="network-show-label">
          <button type="button" aria-pressed={show === 'all'} onClick={() => onShow('all')}>
            Both
          </button>
          {present.map((id) => (
            <button key={id} type="button" aria-pressed={show === id} onClick={() => onShow(id)}>
              {NETWORKS[id].short}
            </button>
          ))}
        </div>
      </div>
      <p className="visually-hidden" role="status">
        {show === 'all'
          ? 'Showing blood and lymph vessels.'
          : `Showing ${NETWORKS[show].name.toLowerCase()} only; the other network is hidden.`}
      </p>
    </div>
  )
}
