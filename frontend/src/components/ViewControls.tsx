import { useAppDispatch, useAppState } from '../state/AppContext'

/** 2D = orthografische Draufsicht, 3D = frei drehbare Perspektive.
 *  Maßstab: Planetarium = lesbare Übertreibungen, 1:1 = Echtmaßstab. */
export default function ViewControls() {
  const { viewMode, scaleMode } = useAppState()
  const dispatch = useAppDispatch()
  return (
    <div className="view-controls">
      <button
        className={viewMode === '2d' ? 'view-btn active' : 'view-btn'}
        onClick={() => dispatch({ type: 'view/set', mode: '2d' })}
      >
        2D
      </button>
      <button
        className={viewMode === '3d' ? 'view-btn active' : 'view-btn'}
        onClick={() => dispatch({ type: 'view/set', mode: '3d' })}
      >
        3D
      </button>
      <span style={{ width: '0.6rem' }} aria-hidden="true" />
      <button
        className={scaleMode === 'planetarium' ? 'view-btn active' : 'view-btn'}
        title="Lesbare Ansicht: Körpergrößen und Mondbahn übertrieben"
        onClick={() => dispatch({ type: 'scaleMode/set', mode: 'planetarium' })}
      >
        Planetarium
      </button>
      <button
        className={scaleMode === 'real' ? 'view-btn active' : 'view-btn'}
        title="Echtmaßstab 1:1 — Körper sind in der Systemansicht winzig; per Klick anfliegen"
        onClick={() => dispatch({ type: 'scaleMode/set', mode: 'real' })}
      >
        1:1
      </button>
    </div>
  )
}
