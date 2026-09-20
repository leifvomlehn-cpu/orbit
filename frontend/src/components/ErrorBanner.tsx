import { useAppDispatch, useAppState } from '../state/AppContext'

/**
 * Sichtbares Fehlerbanner oben mittig.
 * Mittel-Prio-Erbe: API-Fehler landeten früher nur in der Konsole.
 */
export default function ErrorBanner() {
  const error = useAppState().error
  const dispatch = useAppDispatch()
  if (error === null) return null
  return (
    <div className="error-banner" role="alert">
      <span className="error-banner-text">⚠️ {error}</span>
      <button
        className="error-banner-close"
        onClick={() => dispatch({ type: 'error/dismiss' })}
        aria-label="Fehler ausblenden"
      >
        ×
      </button>
    </div>
  )
}
