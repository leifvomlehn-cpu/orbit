import { describe, expect, it } from 'vitest'
import {
  J2000_MS,
  MS_PER_DAY,
  calculateBodyPosition,
  precomputeOrbit,
  solveKeplerPosition,
} from './kepler'
import type { OrbitalElements, Vec3 } from '../types'

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

// Golden-Werte: erzeugt aus backend/physics.py calculate_position
// (Generator: _kladde/gen_orbit_goldens.py). Parität Frontend ↔ Backend
// ist Pflicht — die Drift-Anzeige vergleicht beide Pfade.
interface GoldenCase {
  iso: string
  x: number
  y: number
  z: number
}

const EARTH_CASES: GoldenCase[] = [
  { iso: '2000-01-01T12:00:00Z', x: -0.9733918871584891, y: -0.2431505834887428, z: 0 },
  { iso: '2026-09-21T12:00:00Z', x: -0.0292745561219705, y: 0.9828641270302587, z: 0 },
  { iso: '2031-06-15T12:00:00Z', x: 0.9946758413597057, y: -0.12310587966865175, z: 0 },
]

const SEDNA_CASES: GoldenCase[] = [
  { iso: '2000-01-01T12:00:00Z', x: 51.202317414672876, y: 67.60547388730417, z: -17.912615432797697 },
  { iso: '2026-09-21T12:00:00Z', x: 26.9994217799753, y: 73.49371718837877, z: -15.935508280727596 },
  { iso: '2031-06-15T12:00:00Z', x: 22.53253954687681, y: 74.14322214146198, z: -15.495633082983671 },
]

const SEDNA: OrbitalElements = {
  semi_major_axis_au: 506.8,
  eccentricity: 0.8496,
  inclination_deg: 11.93,
  longitude_ascending_node_deg: 144.26,
  argument_perihelion_deg: 311.12,
  mean_anomaly_deg: 358.01,
  orbital_period_days: 4_160_000,
}

function solveAt(elements: OrbitalElements, isoDate: string): Vec3 {
  const pre = precomputeOrbit(elements)
  expect(pre).not.toBeNull()
  const out: Vec3 = { x: 0, y: 0, z: 0 }
  solveKeplerPosition(pre!, (new Date(isoDate).getTime() - J2000_MS) / MS_PER_DAY, out)
  return out
}

describe('solveKeplerPosition (Golden-Werte aus backend/physics.py)', () => {
  it.each(EARTH_CASES)('Erde $iso: positionsgleich mit dem Backend', ({ iso, x, y, z }) => {
    const out = solveAt(EARTH, iso)
    // 6 Dezimalen absolut: fängt Achsfehler (≈ AU-Größenordnung), toleriert
    // aber Rundungswege (Backend rechnet M in Grad, Frontend in Radiant)
    expect(out.x).toBeCloseTo(x, 6)
    expect(out.y).toBeCloseTo(y, 6)
    expect(out.z).toBeCloseTo(z, 6)
  })

  it.each(SEDNA_CASES)('Sedna $iso: positionsgleich mit dem Backend', ({ iso, x, y, z }) => {
    const out = solveAt(SEDNA, iso)
    expect(out.x).toBeCloseTo(x, 6)
    expect(out.y).toBeCloseTo(y, 6)
    expect(out.z).toBeCloseTo(z, 6)
  })

  it('calculateBodyPosition bleibt deckungsgleich mit der schnellen Variante', () => {
    for (const c of SEDNA_CASES) {
      const legacy = calculateBodyPosition(SEDNA, new Date(c.iso))!
      const fast = solveAt(SEDNA, c.iso)
      expect(fast.x).toBeCloseTo(legacy.x, 12)
      expect(fast.y).toBeCloseTo(legacy.y, 12)
      expect(fast.z).toBeCloseTo(legacy.z, 12)
    }
  })
})
