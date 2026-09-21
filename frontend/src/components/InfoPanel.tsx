import { useAppDispatch, useAppState } from '../state/AppContext'
import { useSimDate } from '../hooks/useSimDate'
import { calculateBodyPosition } from '../simulation/kepler'

function formatMass(kg: number): string {
  return `${kg.toExponential(2)} kg`
}

function formatPeriod(days: number): string {
  if (days >= 365.25 * 2) return `${(days / 365.25).toFixed(1)} Jahre`
  return `${days.toFixed(0)} Tage`
}

/** Rotationsperiode in h; negativ = retrograd (Welle 2, NSSDCA). */
function formatRotation(hours: number): string {
  const abs = Math.abs(hours)
  const retro = hours < 0 ? ' (rückläufig)' : ''
  if (abs >= 100) return `${(abs / 24).toFixed(1)} Tage${retro}`
  return `${abs.toFixed(1)} h${retro}`
}

/** Detail-Panel rechts: alle Daten stecken schon im bodies-Bootstrap. */
export default function InfoPanel() {
  const dispatch = useAppDispatch()
  const { bodies, selectedBodyId, infoPanelOpen } = useAppState()
  const simDate = useSimDate()

  const body = bodies.find((b) => b.id === selectedBodyId) ?? null
  const el = body?.orbital_elements
  const phys = body?.physical_data
  const currentR =
    body && el && el.semi_major_axis_au > 0
      ? (calculateBodyPosition(el, simDate)?.r ?? null)
      : null

  return (
    <div id="info-panel" className={infoPanelOpen ? 'open' : undefined}>
      <div className="info-header">
        <h2>{body ? body.name_de : 'Details'}</h2>
        <button
          className="close-btn"
          aria-label="Schließen"
          onClick={() => dispatch({ type: 'info/close' })}
        >
          ×
        </button>
      </div>
      <div id="info-content">
        {body === null ? (
          <div className="info-placeholder">
            <p>Wähle einen Himmelskörper aus der Liste oder klicke auf einen Planeten.</p>
          </div>
        ) : (
          <div className="info-body">
            <div className="info-title-section">
              <div
                className="info-body-icon"
                style={{ backgroundColor: body.color, color: body.color }}
              />
              <div className="info-body-name">{body.name_de}</div>
              <div className="info-body-name-de">{body.name}</div>
            </div>

            {el && (
            <div className="info-section">
              <h3>📐 Bahn</h3>
              <div className="info-stats">
                <div className="stat-box">
                  <span className="stat-label">Große Halbachse</span>
                  <span className="stat-value">{el.semi_major_axis_au.toFixed(2)} AU</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Exzentrizität</span>
                  <span className="stat-value">{el.eccentricity.toFixed(4)}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Bahnneigung</span>
                  <span className="stat-value">{el.inclination_deg.toFixed(2)}°</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Umlaufzeit</span>
                  <span className="stat-value">{formatPeriod(el.orbital_period_days)}</span>
                </div>
                {currentR !== null && (
                  <div className="stat-box">
                    <span className="stat-label">Aktuelle Entfernung</span>
                    <span className="stat-value">{currentR.toFixed(2)} AU</span>
                  </div>
                )}
              </div>
            </div>
            )}

            {phys && (
              <div className="info-section">
                <h3>🪨 Physik</h3>
                <div className="info-stats">
                  <div className="stat-box">
                    <span className="stat-label">Masse</span>
                    <span className="stat-value">{formatMass(phys.mass_kg)}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">Radius</span>
                    <span className="stat-value">{phys.radius_km.toLocaleString('de-DE')} km</span>
                  </div>
                  {typeof phys.moons === 'number' && (
                    <div className="stat-box">
                      <span className="stat-label">Monde</span>
                      <span className="stat-value">{phys.moons}</span>
                    </div>
                  )}
                  {typeof phys.rotation_period_hours === 'number' && (
                    <div className="stat-box">
                      <span className="stat-label">Rotation</span>
                      <span className="stat-value">{formatRotation(phys.rotation_period_hours)}</span>
                    </div>
                  )}
                  {typeof phys.obliquity_deg === 'number' && (
                    <div className="stat-box">
                      <span className="stat-label">Achsneigung</span>
                      <span className="stat-value">{phys.obliquity_deg.toFixed(1)}°</span>
                    </div>
                  )}
                  {typeof phys.albedo_geometric === 'number' && (
                    <div className="stat-box">
                      <span className="stat-label">Albedo</span>
                      <span className="stat-value">{phys.albedo_geometric.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="info-section">
              <p className="info-description">{body.description_de}</p>
            </div>

            {body.fun_fact_de && (
              <div className="fun-fact">
                <h3>💡 Wusstest du?</h3>
                <p>{body.fun_fact_de}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
