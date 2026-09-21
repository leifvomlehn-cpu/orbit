import { useState } from 'react'
import { useAppDispatch, useAppState, useSimClock } from '../state/AppContext'
import { useSimDate, useSimMs } from '../hooks/useSimDate'
import { MS_PER_DAY } from '../simulation/kepler'
import { resetView, zoomIn, zoomOut } from '../utils/cameraBus'

/** Zeit-Presets in Tagen/Sekunde (Welle 1): Realzeit → 1 Jahr/Sekunde. */
const SPEED_PRESETS: { label: string; daysPerSecond: number }[] = [
  { label: 'Realzeit', daysPerSecond: 1 / 86400 },
  { label: '1 min/s', daysPerSecond: 1 / 1440 },
  { label: '1 h/s', daysPerSecond: 1 / 24 },
  { label: '1 T/s', daysPerSecond: 1 },
  { label: '1 M/s', daysPerSecond: 30.44 },
  { label: '1 J/s', daysPerSecond: 365.25 },
]

const SCRUB_MIN_MS = Date.UTC(1900, 0, 1)
const SCRUB_MAX_MS = Date.UTC(2200, 11, 31, 23, 59, 59)

/** Anzeige der aktuellen Geschwindigkeit, an die Preset-Einheiten angelehnt. */
function speedLabel(daysPerSecond: number): string {
  if (daysPerSecond <= 1 / 86400 + 1e-12) return 'Realzeit'
  if (daysPerSecond < 1 / 24) return `${Math.max(1, Math.round(daysPerSecond * 1440))} min/s`
  if (daysPerSecond < 1) return `${(daysPerSecond * 24).toFixed(daysPerSecond * 24 < 10 ? 1 : 0)} h/s`
  if (daysPerSecond < 30.44) return `${daysPerSecond.toFixed(daysPerSecond < 10 ? 1 : 0)} T/s`
  if (daysPerSecond < 365.25) return `${(daysPerSecond / 30.44).toFixed(1)} M/s`
  return `${(daysPerSecond / 365.25).toFixed(1)} J/s`
}

/**
 * Untere Leiste: Zoom (via cameraBus zu den CameraControls), Zeitsprünge
 * (echte Kalendermonate/-jahre via SimClock), Play/Pause, Zeit-Presets,
 * Datums-Scrubber (1900–2200), Datums-Input.
 */
export default function TimeControls() {
  const dispatch = useAppDispatch()
  const { playing, speedDaysPerSecond } = useAppState()
  const clock = useSimClock()
  const simDate = useSimDate()
  const simMs = useSimMs()
  // Draft-State: während der Datums-Input fokussiert ist, folgt er nicht der Sim
  const [dateDraft, setDateDraft] = useState<string | null>(null)
  // Draft-State: während gescrubbt wird, folgt der Slider nicht der Sim
  const [scrubDraft, setScrubDraft] = useState<number | null>(null)

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

      <div className="time-scrubber">
        <input
          id="time-scrubber-input"
          type="range"
          aria-label="Datum scrubben"
          min={SCRUB_MIN_MS}
          max={SCRUB_MAX_MS}
          step={MS_PER_DAY}
          value={scrubDraft ?? simMs}
          onPointerDown={() => setScrubDraft(simMs)}
          onChange={(e) => {
            const v = Number(e.target.value)
            setScrubDraft(v)
            clock.setSimMs(v)
          }}
          onPointerUp={() => setScrubDraft(null)}
          onBlur={() => setScrubDraft(null)}
        />
      </div>

      <div className="speed-control-group">
        <div className="time-presets">
          {SPEED_PRESETS.map((p) => (
            <button
              key={p.label}
              className={
                Math.abs(speedDaysPerSecond - p.daysPerSecond) < 1e-12
                  ? 'preset-btn active'
                  : 'preset-btn'
              }
              onClick={() => dispatch({ type: 'time/setSpeed', daysPerSecond: p.daysPerSecond })}
            >
              {p.label}
            </button>
          ))}
          <span id="speed-value">{speedLabel(speedDaysPerSecond)}</span>
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
