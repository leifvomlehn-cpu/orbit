import { useAppState } from '../state/AppContext'

/** Ladebildschirm bis die Bodies da sind — bei Fehler weicht er dem ErrorBanner. */
export default function LoadingScreen() {
  const { bodiesLoaded, error } = useAppState()
  if (bodiesLoaded || error !== null) return null
  return (
    <div id="loading-screen">
      <div className="loader-content">
        <div className="orbit-loader">
          <div className="sun-loader" />
          <div className="planet-loader" />
        </div>
        <h2>Orbital Simulator</h2>
        <p>Lade Himmelskörper...</p>
      </div>
    </div>
  )
}
