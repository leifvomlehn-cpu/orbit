import type { NbodyResult, Vec3 } from '../types'

/** Perturber-Set aller N-Body-Läufe: Sonne + Gasriesen (app.js:2100). */
export const DEMO_PERTURBERS = ['sun', 'jupiter', 'saturn', 'uranus', 'neptune'] as const

/** Die sechs Sednoiden der Cluster-Demos (app.js:2099). */
export const DEMO_SEDNOIDS = [
  'sedna',
  '2012_vp113',
  '2023_kq14',
  '2013_ft28',
  '2014_sr349',
  '2010_gb174',
] as const

export interface NbodyParams {
  durationDays: number
  stepDays: number
  sampleEvery: number
}

const DAYS_PER_YEAR = 365.25

/**
 * Parameter für den interaktiven N-Body-Vergleich.
 * Portiert aus app.js:1966-1970: ~4000 Schritte, ~200 Snapshots,
 * über 500 Jahre mindestens 5 Tage Schrittweite.
 */
export function nbodyCompareParams(years: number): NbodyParams {
  const durationDays = years * DAYS_PER_YEAR
  let stepDays = Math.max(1, Math.round(durationDays / 4000))
  if (years > 500) stepDays = Math.max(stepDays, 5)
  const nSteps = Math.floor(durationDays / stepDays)
  const sampleEvery = Math.max(1, Math.floor(nSteps / 200))
  return { durationDays, stepDays, sampleEvery }
}

/**
 * Parameter für die Demo-Szenarien (app.js:2253-2262):
 * feste Schrittweite, Ziel-Snapshotzahl bestimmt sample_every.
 */
export function nbodyDemoParams(years: number, stepDays: number, samples: number): NbodyParams {
  const durationDays = years * DAYS_PER_YEAR
  const nSteps = Math.floor(durationDays / stepDays)
  const sampleEvery = Math.max(1, Math.floor(nSteps / samples))
  return { durationDays, stepDays, sampleEvery }
}

/**
 * Baryzentrisch → heliozentrisch: Sonnenposition je Snapshot abziehen.
 * Portiert aus app.js:2284-2298 (extractTrajectories).
 */
export function extractTrajectories(
  sim: NbodyResult,
  bodyIds: readonly string[],
): Record<string, Vec3[]> {
  const sunIdx = sim.body_ids.indexOf('sun')
  const result: Record<string, Vec3[]> = {}
  for (const id of bodyIds) {
    const idx = sim.body_ids.indexOf(id)
    if (idx === -1) continue
    result[id] = sim.positions.map((snapshot) => {
      const b = snapshot[idx]
      const s = sunIdx >= 0 ? snapshot[sunIdx] : [0, 0, 0]
      return { x: b[0] - s[0], y: b[1] - s[1], z: b[2] - s[2] }
    })
  }
  return result
}

const AU_IN_KM = 149_597_870.7

/** Drift-Anzeige wie im alten Frontend (app.js:2038-2045). */
export function formatDrift(driftAu: number): string {
  if (driftAu < 0.001) return `${((driftAu * AU_IN_KM) / 1e6).toFixed(2)} Mio km`
  if (driftAu < 0.01) return `${driftAu.toFixed(5)} AU`
  return `${driftAu.toFixed(4)} AU`
}
