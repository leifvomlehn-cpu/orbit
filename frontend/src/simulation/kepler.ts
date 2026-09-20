import type { OrbitalElements } from '../types'

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0) // 2000-01-01T12:00:00Z
const MS_PER_DAY = 86_400_000
const TWO_PI = Math.PI * 2
const DEG2RAD = Math.PI / 180

export interface KeplerPosition {
  x: number
  y: number
  z: number
  r: number
}

/**
 * Heliozentrische Position aus Kepler-Elementen (J2000-Epoche).
 * 1:1-Portierung von app.js:801-854 — dieselbe Mathematik wie
 * physics.py calculate_position, damit Frontend und Backend
 * positionsgleich rechnen (Pflicht für die Drift-Anzeige).
 * Gilt nur für geschlossene Bahnen (e < 1) — wie das Backend.
 */
export function calculateBodyPosition(
  elements: OrbitalElements,
  date: Date,
): KeplerPosition | null {
  if (elements.semi_major_axis_au === 0) return null

  const a = elements.semi_major_axis_au
  const e = elements.eccentricity || 0
  const i = (elements.inclination_deg || 0) * DEG2RAD
  const omega = (elements.longitude_ascending_node_deg || 0) * DEG2RAD
  const w = (elements.argument_perihelion_deg || 0) * DEG2RAD
  const period = elements.orbital_period_days || 365.25
  const M0 = (elements.mean_anomaly_deg || 0) * DEG2RAD

  const days = (date.getTime() - J2000_MS) / MS_PER_DAY
  const n = TWO_PI / period
  let M = M0 + n * days
  M = ((M % TWO_PI) + TWO_PI) % TWO_PI

  // Newton-Iteration für die exzentrische Anomalie (Kepler-Gleichung)
  let E = M
  for (let iter = 0; iter < 50; iter++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-10) break
  }

  const nu =
    2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
  const r = a * (1 - e * Math.cos(E))

  const xOrb = r * Math.cos(nu)
  const yOrb = r * Math.sin(nu)

  const cosW = Math.cos(w)
  const sinW = Math.sin(w)
  const cosOmega = Math.cos(omega)
  const sinOmega = Math.sin(omega)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)

  const x =
    (cosOmega * cosW - sinOmega * sinW * cosI) * xOrb +
    (-cosOmega * sinW - sinOmega * cosW * cosI) * yOrb
  const y =
    (sinOmega * cosW + cosOmega * sinW * cosI) * xOrb +
    (-sinOmega * sinW + cosOmega * cosW * cosI) * yOrb
  const z = sinW * sinI * xOrb + cosW * sinI * yOrb

  return { x, y, z, r }
}
