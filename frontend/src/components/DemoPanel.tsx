import { useRef } from 'react'
import { useAppDispatch, useAppState } from '../state/AppContext'
import { runNbodySimulation } from '../api/endpoints'
import type { DemoId, DemoRun } from '../state/reducer'
import {
  DEMO_PERTURBERS,
  DEMO_SEDNOIDS,
  extractTrajectories,
  nbodyDemoParams,
} from '../simulation/nbody'
import type { NbodyResponse } from '../types'

const DEMOS: { id: DemoId; title: string; sub: string }[] = [
  { id: 'sedna10k', title: '1. Sedna 10.000 Jahre', sub: 'Neptun-Perturbation auf Sednoid-Bahn' },
  { id: 'sednoidCluster', title: '2. Sednoiden-Cluster', sub: '6 TNOs · 100.000 Jahre' },
  { id: 'planet9Test', title: '3. Planet-9 testen', sub: 'mit/ohne P9 vergleichen, 50.000 Jahre' },
]

/**
 * Die drei Long-term-Demos (Portierung aus app.js:2102-2251).
 * Ergebnisse werden komponenten-intern gecacht (useRef) — wie der
 * alte AppState.demoCache.
 */
export default function DemoPanel() {
  const dispatch = useAppDispatch()
  const demo = useAppState().demo
  const cacheRef = useRef<Partial<Record<DemoId, { run: DemoRun; title: string; detail: string }>>>({})

  const fetchTrajectory = (
    bodies: string[],
    years: number,
    stepDays: number,
    samples: number,
    includeP9 = false,
  ): Promise<NbodyResponse> => {
    const params = nbodyDemoParams(years, stepDays, samples)
    return runNbodySimulation({
      bodies,
      start_time: new Date().toISOString(),
      duration_days: params.durationDays,
      step_days: params.stepDays,
      sample_every: params.sampleEvery,
      include_planet9: includeP9,
    })
  }

  const runDemo = async (id: DemoId) => {
    if (demo.loading) return

    const cached = cacheRef.current[id]
    if (cached) {
      dispatch({ type: 'demo/succeeded', run: cached.run, title: cached.title, detail: cached.detail })
      return
    }

    try {
      if (id === 'sedna10k') {
        const title = 'Sedna - 10.000 Jahre'
        dispatch({ type: 'demo/started', title, detail: 'Lade Simulation (RK4/Verlet)...' })
        const data = await fetchTrajectory([...DEMO_PERTURBERS, 'sedna'], 10000, 30, 365)
        const run: DemoRun = {
          id,
          trajectories: extractTrajectories(data.simulation, ['sedna']),
          durationYears: 10000,
        }
        const detail =
          `Sedna-Bahnperiode ~11.400 Jahre. Diese Sim zeigt fast eine komplette Umrundung der Sonne ` +
          `mit gravitativer Wechselwirkung der Gasriesen. ${data.simulation.metadata.n_samples} Snapshots, ` +
          `Schrittweite ${data.simulation.metadata.step_days} Tage.`
        cacheRef.current[id] = { run, title, detail }
        dispatch({ type: 'demo/succeeded', run, title, detail })
      } else if (id === 'sednoidCluster') {
        const title = 'Sednoiden-Cluster - 100.000 Jahre'
        dispatch({
          type: 'demo/started',
          title,
          detail: 'Lade 6 TNO-Bahnen (kann 10-20 Sek dauern)...',
        })
        const data = await fetchTrajectory(
          [...DEMO_PERTURBERS, ...DEMO_SEDNOIDS],
          100000,
          100,
          400,
        )
        const run: DemoRun = {
          id,
          trajectories: extractTrajectories(data.simulation, DEMO_SEDNOIDS),
          durationYears: 100000,
        }
        const detail =
          `${DEMO_SEDNOIDS.length} extreme TNOs simuliert. Die Bahnen zeigen die charakteristische ` +
          `Clusterung der Periheldistanzen und Argumentwinkel - eines der Hauptargumente für Planet-9. ` +
          `Schrittweite ${data.simulation.metadata.step_days} Tage.`
        cacheRef.current[id] = { run, title, detail }
        dispatch({ type: 'demo/succeeded', run, title, detail })
      } else {
        const title = 'Planet-9-Effekt - 50.000 Jahre'
        const sednoids = DEMO_SEDNOIDS.slice(0, 4)
        const bodiesBase = [...DEMO_PERTURBERS, ...sednoids]
        dispatch({ type: 'demo/started', title, detail: 'Lade Simulation OHNE Planet-9...' })
        const dataNoP9 = await fetchTrajectory(bodiesBase, 50000, 50, 300, false)
        dispatch({ type: 'demo/status', title, detail: 'Lade Simulation MIT Planet-9...' })
        const dataWithP9 = await fetchTrajectory(bodiesBase, 50000, 50, 300, true)

        const run: DemoRun = {
          id,
          trajectories: extractTrajectories(dataNoP9.simulation, sednoids),
          trajectoriesP9: extractTrajectories(dataWithP9.simulation, sednoids),
          sednoids: [...sednoids],
          durationYears: 50000,
        }

        // Summary: mittlerer und maximaler Endpunkt-Drift (app.js:2225-2251)
        let totalDrift = 0
        let maxDrift = 0
        let maxBody = ''
        for (const sid of run.sednoids ?? []) {
          const t1 = run.trajectories[sid]
          const t2 = run.trajectoriesP9?.[sid]
          if (!t1 || !t2) continue
          const e1 = t1[t1.length - 1]
          const e2 = t2[t2.length - 1]
          const drift = Math.sqrt((e1.x - e2.x) ** 2 + (e1.y - e2.y) ** 2 + (e1.z - e2.z) ** 2)
          totalDrift += drift
          if (drift > maxDrift) {
            maxDrift = drift
            maxBody = sid
          }
        }
        const avg = totalDrift / (run.sednoids?.length || 1)
        const detail =
          `Durchgezogen: ohne P9 - Gestrichelt: mit P9. Mittlerer Bahn-Drift durch P9: ` +
          `${avg.toFixed(2)} AU. Größter Effekt auf ${maxBody}: ${maxDrift.toFixed(2)} AU. ` +
          `Bei langen Zeitskalen zeigt sich Planet-9 als systematischer Störer der Sednoid-Population.`
        cacheRef.current[id] = { run, title, detail }
        dispatch({ type: 'demo/succeeded', run, title, detail })
      }
    } catch (err) {
      dispatch({
        type: 'demo/failed',
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return (
    <>
      <div className="demo-panel">
        <h3>🔭 Demo-Szenarien</h3>
        {DEMOS.map((d) => (
          <button
            key={d.id}
            className={demo.active?.id === d.id ? 'demo-btn active' : 'demo-btn'}
            type="button"
            disabled={demo.loading}
            onClick={() => void runDemo(d.id)}
          >
            <strong>{d.title}</strong>
            <small>{d.sub}</small>
          </button>
        ))}
        <button
          className="demo-btn-secondary"
          type="button"
          onClick={() => dispatch({ type: 'demo/cleared' })}
        >
          Demo löschen
        </button>
      </div>

      <div className={demo.statusTitle ? 'demo-status' : 'demo-status hidden'}>
        <div className="demo-title">{demo.statusTitle ?? '--'}</div>
        <div className="demo-detail">{demo.statusDetail ?? '--'}</div>
      </div>
    </>
  )
}
