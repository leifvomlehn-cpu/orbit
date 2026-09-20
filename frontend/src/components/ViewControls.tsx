import { useAppDispatch, useAppState } from '../state/AppContext'

/** 2D = orthografische Draufsicht, 3D = frei drehbare Perspektive. */
export default function ViewControls() {
  const viewMode = useAppState().viewMode
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
    </div>
  )
}
