import { useEffect } from 'react'
import { useAppDispatch, useAppState } from '../state/AppContext'
import { nbodyCacheKey } from '../state/reducer'
import { runNbodySimulation } from '../api/endpoints'
import {
  DEMO_PERTURBERS,
  extractTrajectories,
  formatDrift,
  nbodyCompareParams,
} from '../simulation/nbody'
import { calculateBodyPosition } from '../simulation/kepler'

/**
 * N-Body-Vergleich (Kepler vs. N-Body): Toggle + Zeitraum-Slider + Drift-Anzeige.
 * Fetch-Logik portiert aus app.js:1947-2016 (400-ms-Debounce, Client-Cache).
 */
export default function NbodyControls() {
  const dispatch = useAppDispatch()
  const { nbody, selectedBodyId, bodies } = useAppState()

  useEffect(() => {
    if (!nbody.active || selectedBodyId === null) return
    // Race-Guard (Deep-Recon #5): wechselt der Nutzer den Körper, während ein
    // Fetch noch läuft, darf die überholte Response die Anzeige nicht
    // überschreiben — cleanup setzt cancelled, Guards droppen die Response.
    let cancelled = false
    const bodyId = selectedBodyId
    const years = nbody.years
    const key = nbodyCacheKey(bodyId, years)

    const timer = window.setTimeout(() => {
      const cached = nbody.cache[key]
      if (cached) {
        dispatch({ type: 'nbody/cached', bodyId, key, entry: cached })
        return
      }

      const params = nbodyCompareParams(years)
      const simBodies: string[] = [...DEMO_PERTURBERS]
      if (!simBodies.includes(bodyId)) simBodies.push(bodyId)

      dispatch({ type: 'nbody/started', bodyId })
      runNbodySimulation({
        bodies: simBodies,
        start_time: new Date().toISOString(),
        duration_days: params.durationDays,
        step_days: params.stepDays,
        sample_every: params.sampleEvery,
      })
        .then((res) => {
          if (cancelled) return
          const trajectories = extractTrajectories(res.simulation, [bodyId])
          const points = trajectories[bodyId]
          if (!points) throw new Error(`Body ${bodyId} nicht in der Simulation`)
          dispatch({
            type: 'nbody/cached',
            bodyId,
            key,
            entry: {
              years,
              points,
              timestamps: res.simulation.timestamps,
              stepDays: res.simulation.metadata.step_days,
            },
          })
        })
        .catch((err: unknown) => {
          if (cancelled) return
          dispatch({
            type: 'nbody/failed',
            message: err instanceof Error ? err.message : String(err),
          })
        })
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // nbody.cache bewusst NICHT in den Deps — sonst loopt der Effekt nach jedem Cache-Eintrag
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nbody.active, selectedBodyId, nbody.years, dispatch])

  // Drift = Kepler-Endposition vs. letzter N-Body-Punkt (app.js:2018-2050)
  const entry = nbody.bodyId ? nbody.cache[nbodyCacheKey(nbody.bodyId, nbody.years)] : undefined
  const body = bodies.find((b) => b.id === nbody.bodyId) ?? null
  let driftText = 'Lade...'
  if (!nbody.loading && entry && body) {
    const endDate = new Date(entry.timestamps[entry.timestamps.length - 1])
    const kep = calculateBodyPosition(body.orbital_elements, endDate)
    const nb = entry.points[entry.points.length - 1]
    if (kep && nb && !Number.isNaN(endDate.getTime())) {
      const d = Math.sqrt((kep.x - nb.x) ** 2 + (kep.y - nb.y) ** 2 + (kep.z - nb.z) ** 2)
      driftText = formatDrift(d)
    } else {
      driftText = '--'
    }
  }

  const showDrift = nbody.active && nbody.bodyId !== null

  return (
    <>
      <div className="nbody-controls">
        <button
          className={nbody.active ? 'nbody-btn active' : 'nbody-btn'}
          title="Kepler-Bahn vs N-Body-Bahn vergleichen"
          onClick={() => dispatch({ type: 'nbody/toggle' })}
        >
          ⚛ N-Body Vergleich
        </button>
        <div className={nbody.active ? 'nbody-config' : 'nbody-config hidden'}>
          <label htmlFor="nbody-years">
            Zeitraum: <span>{nbody.years}</span> Jahre
          </label>
          <input
            type="range"
            id="nbody-years"
            min={10}
            max={1000}
            step={10}
            value={nbody.years}
            onChange={(e) => dispatch({ type: 'nbody/setYears', years: Number(e.target.value) })}
          />
          <div className="nbody-hint">
            Wähle einen Körper aus, um den Bahn-Drift zu sehen. Sednoide/TNOs zeigen die größten
            Effekte.
          </div>
        </div>
      </div>

      <div className={showDrift ? 'drift-display' : 'drift-display hidden'}>
        <div className="drift-label">Drift Kepler vs N-Body</div>
        <div className="drift-value">{driftText}</div>
        <div className="drift-body">
          {body ? `${body.name_de} · ${nbody.years} Jahre` : '--'}
        </div>
      </div>
    </>
  )
}
