import type { OrbitalElements, Vec3 } from '../types'

export const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0) // 2000-01-01T12:00:00Z
export const MS_PER_DAY = 86_400_000
const TWO_PI = Math.PI * 2
const DEG2RAD = Math.PI / 180

export interface KeplerPosition {
  x: number
  y: number
  z: number
  r: number
}

/**
 * Einmalig berechnete, frame-invariante Anteile einer Keplerbahn:
 * Bahnelemente + die konstante Rotationsmatrix (Bahnebene → Ekliptik).
 * Pro Frame ändern sich nur M, E, ν, r — der Rest bleibt (Welle 1,
 * Loop-Hygiene: keine Trigonometrie-Neuberechnung pro Körper/Frame).
 */
export interface PrecomputedOrbit {
  a: number
  e: number
  period: number
  M0: number
  m11: number
  m12: number
  m21: number
  m22: number
  m31: number
  m32: number
}

/** Baut die vorberechnete Bahn; null bei a == 0 (Sonne/stationär). */
export function precomputeOrbit(elements: OrbitalElements): PrecomputedOrbit | null {
  if (elements.semi_major_axis_au === 0) return null
  const e = elements.eccentricity || 0
  const i = (elements.inclination_deg || 0) * DEG2RAD
  const omega = (elements.longitude_ascending_node_deg || 0) * DEG2RAD
  const w = (elements.argument_perihelion_deg || 0) * DEG2RAD
  const cosW = Math.cos(w)
  const sinW = Math.sin(w)
  const cosOmega = Math.cos(omega)
  const sinOmega = Math.sin(omega)
  const cosI = Math.cos(i)
  const sinI = Math.sin(i)
  return {
    a: elements.semi_major_axis_au,
    e,
    period: elements.orbital_period_days || 365.25,
    M0: (elements.mean_anomaly_deg || 0) * DEG2RAD,
    m11: cosOmega * cosW - sinOmega * sinW * cosI,
    m12: -cosOmega * sinW - sinOmega * cosW * cosI,
    m21: sinOmega * cosW + cosOmega * sinW * cosI,
    m22: -sinOmega * sinW + cosOmega * cosW * cosI,
    m31: sinW * sinI,
    m32: cosW * sinI,
  }
}

/**
 * Heliozentrische Position zum Zeitpunkt daysSinceJ2000, geschrieben in
 * `out` (allokationsfrei — der Render-Loop ruft das 31×/Frame auf).
 * Dieselbe Mathematik wie physics.py calculate_position (Pflicht für die
 * Drift-Anzeige); Golden-Werte dagegen getestet in kepler.test.ts.
 * Gilt nur für geschlossene Bahnen (e < 1) — wie das Backend.
 */
export function solveKeplerPosition(
  orbit: PrecomputedOrbit,
  daysSinceJ2000: number,
  out: Vec3,
): void {
  const n = TWO_PI / orbit.period
  let M = orbit.M0 + n * daysSinceJ2000
  M = ((M % TWO_PI) + TWO_PI) % TWO_PI

  const e = orbit.e
  let E = M
  for (let iter = 0; iter < 50; iter++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-10) break
  }

  const nu =
    2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2))
  const r = orbit.a * (1 - e * Math.cos(E))

  const xOrb = r * Math.cos(nu)
  const yOrb = r * Math.sin(nu)

  out.x = orbit.m11 * xOrb + orbit.m12 * yOrb
  out.y = orbit.m21 * xOrb + orbit.m22 * yOrb
  out.z = orbit.m31 * xOrb + orbit.m32 * yOrb
}

/**
 * Komfort-Wrapper für Einzelabfragen (Tests, Drift-Anzeige):
 * allokiert — im Render-Loop stattdessen precomputeOrbit +
 * solveKeplerPosition mit wiederverwendetem out-Vektor nutzen.
 */
export function calculateBodyPosition(
  elements: OrbitalElements,
  date: Date,
): KeplerPosition | null {
  const orbit = precomputeOrbit(elements)
  if (!orbit) return null
  const out: Vec3 = { x: 0, y: 0, z: 0 }
  solveKeplerPosition(orbit, (date.getTime() - J2000_MS) / MS_PER_DAY, out)
  return { x: out.x, y: out.y, z: out.z, r: Math.hypot(out.x, out.y, out.z) }
}
