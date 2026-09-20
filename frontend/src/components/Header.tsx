import { useAppDispatch } from '../state/AppContext'
import { useSimDate } from '../hooks/useSimDate'

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

export default function Header() {
  const dispatch = useAppDispatch()
  const simDate = useSimDate()

  return (
    <header id="header">
      <div className="header-left">
        <button
          id="sidebar-toggle"
          className="icon-btn sidebar-toggle-btn"
          aria-label="Menü"
          onClick={() => dispatch({ type: 'sidebar/toggle' })}
        >
          ☰
        </button>
        <h1>🌌 Orbital Simulator</h1>
        <span className="subtitle">Erkunde unser Sonnensystem</span>
      </div>
      <div className="header-right">
        <div className="time-display">
          <span id="current-date">{dateFormatter.format(simDate)} UTC</span>
        </div>
        <button
          id="help-btn"
          className="icon-btn"
          title="Hilfe"
          onClick={() => dispatch({ type: 'help/set', open: true })}
        >
          ❓
        </button>
      </div>
    </header>
  )
}
