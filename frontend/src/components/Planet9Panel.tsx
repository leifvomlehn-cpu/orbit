import { useAppDispatch, useAppState } from '../state/AppContext'

/** Planet-9-Infopanel (Inhalte 1:1 aus dem alten Frontend übernommen). */
export default function Planet9Panel() {
  const dispatch = useAppDispatch()
  const open = useAppState().planet9PanelOpen

  return (
    <div id="planet9-panel" className={open ? undefined : 'hidden'}>
      <div className="panel-header">
        <h2>🔍 Planet 9 Suche</h2>
        <button
          className="close-btn"
          aria-label="Schließen"
          onClick={() => dispatch({ type: 'planet9/set', open: false })}
        >
          ×
        </button>
      </div>
      <div id="planet9-content">
        <div className="planet9-intro">
          <h3>Was ist Planet 9?</h3>
          <p>
            Ein hypothetischer neunter Planet im äußeren Sonnensystem, der durch gravitative
            Anomalien bei TNOs vorhergesagt wird.
          </p>
        </div>
        <div className="planet9-stats">
          <div className="stat-item">
            <span className="stat-label">Masse</span>
            <span className="stat-value highlight">~5-10 Erdmassen</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Umlaufzeit</span>
            <span className="stat-value">~10.000-20.000 Jahre</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Entfernung</span>
            <span className="stat-value">~400-800 AU</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Exzentrizität</span>
            <span className="stat-value">~0.2-0.5</span>
          </div>
        </div>
        <div className="planet9-evidence">
          <h3>Indizien</h3>
          <ul>
            <li>Gruppierung der Bahnen extremer TNOs</li>
            <li>Neigung der Bahnebenen</li>
            <li>Fehlende große Objekte im Kuipergürtel</li>
          </ul>
        </div>
        <div className="planet9-search-zone">
          <h3>Suchzone</h3>
          <div className="constellation-grid">
            <div className="constellation">Widder</div>
            <div className="constellation">Stier</div>
            <div className="constellation">Walfisch</div>
            <div className="constellation">Eridanus</div>
          </div>
        </div>
        <div className="planet9-timeline">
          <h3>Entdeckungsgeschichte</h3>
          <div className="timeline-item">
            <span className="year">2014</span>
            <span className="event">Erste Hinweise durch Chad Trujillo &amp; Scott Sheppard</span>
          </div>
          <div className="timeline-item">
            <span className="year">2016</span>
            <span className="event">Batygin &amp; Brown veröffentlichen detaillierte Vorhersage</span>
          </div>
          <div className="timeline-item future">
            <span className="year">2026+</span>
            <span className="event">Vera C. Rubin Observatory beginnt Suche</span>
          </div>
        </div>
        <button
          className="action-btn"
          onClick={() => {
            dispatch({ type: 'body/select', id: 'planet9' })
            dispatch({ type: 'planet9/set', open: false })
          }}
        >
          🪐 Zeige Planet 9 Vorhersage-Orbit
        </button>
      </div>
    </div>
  )
}
