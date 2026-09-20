import { useState } from 'react'
import { useAppDispatch, useAppState, useSimClock } from '../state/AppContext'
import { useSimDate } from '../hooks/useSimDate'
import { resetView, zoomIn, zoomOut } from '../scene/cameraBus'

/**
 * Untere Leiste: Zoom (via cameraBus zu den OrbitControls), Zeitsprünge
 * (echte Kalendermonate/-jahre via SimClock), Play/Pause, Speed, Datum.
 */
export default function TimeControls() {
  const dispatch = useAppDispatch()
  const { playing, speedDaysPerSecond } = useAppState()
  const clock = useSimClock()
  const simDate = useSimDate()
  // Draft-State: während der Datums-Input fokussiert ist, folgt er nicht der Sim
  const [dateDraft, setDateDraft] = useState<string | null>(null)

  const dateValue = simDate.toISOString().slice(0, 10)

  return (
    <div id="time-controls">
      <div className="zoom-controls-inline">
        <button className="time-btn" title="Vergrößern" onClick={() => zoomIn()}>
          +
        </button>
        <button className="time-btn" title="Verkleinern" onClick={() => zoomOut()}>
          −
        </button>
        <button className="time-btn" title="Zurücksetzen" onClick={() => resetView()}>
          ⟲
        </button>
      </div>

      <div className="time-buttons">
        <button className="time-btn" title="-30 Tage" onClick={() => clock.addDays(-30)}>
          ⏪
        </button>
        <button className="time-btn" title="-1 Monat" onClick={() => clock.addMonths(-1)}>
          ◀
        </button>
        <button className="time-btn" title="-1 Jahr" onClick={() => clock.addYears(-1)}>
          ⏮
        </button>
        <button
          className={playing ? 'time-btn play-btn active' : 'time-btn play-btn'}
          title={playing ? 'Pause' : 'Abspielen'}
          onClick={() => dispatch({ type: 'time/togglePlaying' })}
        >
          {playing ? '⏸' : '▶️'}
        </button>
        <button className="time-btn" title="+1 Jahr" onClick={() => clock.addYears(1)}>
          ⏭
        </button>
        <button className="time-btn" title="+1 Monat" onClick={() => clock.addMonths(1)}>
          ▶
        </button>
        <button className="time-btn" title="+30 Tage" onClick={() => clock.addDays(30)}>
          ⏩
        </button>
      </div>

      <div className="speed-control-group">
        <div className="speed-control">
          <label htmlFor="speed-slider">Speed:</label>
          <input
            id="speed-slider"
            type="range"
            min={25}
            max={5000}
            step={1}
            value={speedDaysPerSecond}
            onChange={(e) =>
              dispatch({ type: 'time/setSpeed', daysPerSecond: Number(e.target.value) })
            }
          />
          <span id="speed-value">{speedDaysPerSecond} T/s</span>
        </div>
        <div className="date-input">
          <input
            id="date-picker"
            type="date"
            value={dateDraft ?? dateValue}
            onFocus={() => setDateDraft(dateValue)}
            onChange={(e) => {
              setDateDraft(e.target.value)
              if (e.target.value) clock.setSimMs(Date.parse(`${e.target.value}T12:00:00Z`))
            }}
            onBlur={() => setDateDraft(null)}
          />
          <button className="small-btn" onClick={() => clock.resetToNow()}>
            Heute
          </button>
        </div>
      </div>
    </div>
  )
}
