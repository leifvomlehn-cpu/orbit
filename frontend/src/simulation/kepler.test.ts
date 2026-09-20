import { describe, expect, it } from 'vitest'
import { calculateBodyPosition } from './kepler'
import type { OrbitalElements } from '../types'

// J2000-Elemente der Erde (orbital_data.py)
const EARTH: OrbitalElements = {
  semi_major_axis_au: 1.0,
  eccentricity: 0.0167,
  inclination_deg: 0.0,
  longitude_ascending_node_deg: -11.26064,
  argument_perihelion_deg: 102.94719,
  mean_anomaly_deg: 100.46435,
  orbital_period_days: 365.256,
}

const J2000 = new Date('2000-01-01T12:00:00Z')

describe('calculateBodyPosition (Kepler, J2000-Epoche)', () => {
  it('Sonne (a = 0) liefert null', () => {
    expect(calculateBodyPosition({ ...EARTH, semi_major_axis_au: 0 }, J2000)).toBeNull()
  })

  it('Erde bei J2000: r liegt zwischen Perihel und Aphel', () => {
    const pos = calculateBodyPosition(EARTH, J2000)
    expect(pos).not.toBeNull()
    expect(pos!.r).toBeGreaterThan(0.98)
    expect(pos!.r).toBeLessThan(1.02)
  })

  it('r ist konsistent mit dem Betrag von (x, y, z)', () => {
    const pos = calculateBodyPosition(EARTH, J2000)!
    expect(Math.hypot(pos.x, pos.y, pos.z)).toBeCloseTo(pos.r, 10)
  })

  it('ein halbes Jahr später steht die Erde ~2 AU von der J2000-Position entfernt', () => {
    const p1 = calculateBodyPosition(EARTH, J2000)!
    const p2 = calculateBodyPosition(EARTH, new Date('2000-07-02T12:00:00Z'))!
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z)
    expect(dist).toBeGreaterThan(1.9)
    expect(dist).toBeLessThan(2.1)
  })

  it('Erde mit i=0 bleibt in der Ekliptikebene (z ≈ 0)', () => {
    const pos = calculateBodyPosition(EARTH, J2000)!
    expect(Math.abs(pos.z)).toBeLessThan(1e-6)
  })

  it('Sedna (hohe Exzentrizität e≈0.85) konvergiert ebenfalls', () => {
    const SEDNA: OrbitalElements = {
      semi_major_axis_au: 506.8,
      eccentricity: 0.8496,
      inclination_deg: 11.93,
      longitude_ascending_node_deg: 144.26,
      argument_perihelion_deg: 311.12,
      mean_anomaly_deg: 358.01,
      orbital_period_days: 4_160_000,
    }
    const pos = calculateBodyPosition(SEDNA, J2000)
    expect(pos).not.toBeNull()
    expect(pos!.r).toBeGreaterThan(70) // nahe Perihel (~76 AU)
    expect(pos!.r).toBeLessThan(1000)
  })
})
