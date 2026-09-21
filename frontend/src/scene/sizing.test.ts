import { describe, expect, it } from 'vitest'
import type { BodyCategory, CelestialBody } from '../types'
import {
  baseRadiusUnits,
  CATEGORY_FLOOR,
  EXAGGERATION,
  KM_PER_AU,
  MIN_RADIUS_PX,
  MIN_RADIUS_PX_FLOOR,
  minRadiusPx,
  ringRadiusUnits,
  screenFloorScale,
} from './sizing'

function makeBody(radiusKm: number, category: BodyCategory, semiMajorAxisAu = 5): CelestialBody {
  return {
    id: 'test',
    name: 'Test',
    name_de: 'Test',
    category,
    color: '#ffffff',
    orbital_elements: {
      semi_major_axis_au: semiMajorAxisAu,
      eccentricity: 0,
      inclination_deg: 0,
      longitude_ascending_node_deg: 0,
      argument_perihelion_deg: 0,
      mean_anomaly_deg: 0,
      orbital_period_days: 365.25,
    },
    physical_data: { mass_kg: 1e24, radius_km: radiusKm },
    description_de: '',
  }
}

describe('baseRadiusUnits', () => {
  it('hält echte Radius-Verhältnisse: Jupiter ≈ 11× Erde', () => {
    const earth = baseRadiusUnits(makeBody(6371.0, 'planet', 1))
    const jupiter = baseRadiusUnits(makeBody(69911, 'planet', 5.2))
    expect(jupiter / earth).toBeCloseTo(69911 / 6371.0, 5)
  })

  it('skaliert die Sonne mit dem Star-Faktor und bleibt innerhalb der Merkurbahn (0.39 AU)', () => {
    // a=0 erzwingt den Star-Pfad über isStationary — 'star' ist kein BodyCategory-Wert
    const sun = baseRadiusUnits(makeBody(696_340, 'planet', 0))
    const expected = (696_340 / KM_PER_AU) * EXAGGERATION.star
    expect(sun).toBeCloseTo(expected, 10)
    expect(sun).toBeLessThan(0.39)
    expect(sun).toBeGreaterThan(0.2)
  })

  it('gibt Kleinkörpern den Kategorie-Floor (TNO mit 100 km)', () => {
    expect(baseRadiusUnits(makeBody(100, 'tno', 80))).toBe(CATEGORY_FLOOR.tno)
  })

  it('gibt Zwergplaneten den Kategorie-Floor (Pluto mit 1188 km)', () => {
    expect(baseRadiusUnits(makeBody(1188.3, 'dwarf_planet', 39.5))).toBe(
      CATEGORY_FLOOR.dwarf_planet,
    )
  })

  it('lässt große Zwergplaneten über dem Floor (echte Proportion schlägt Floor)', () => {
    // 4000 km × 1500 ≈ 0.04 Units > Floor 0.03
    const r = baseRadiusUnits(makeBody(4000, 'dwarf_planet', 40))
    expect(r).toBeCloseTo((4000 / KM_PER_AU) * EXAGGERATION.dwarf_planet, 10)
    expect(r).toBeGreaterThan(CATEGORY_FLOOR.dwarf_planet)
  })

  it('behandelt Planet-9 wie einen Planeten (20000 km ≈ 0.2 Units)', () => {
    const p9 = baseRadiusUnits(makeBody(20_000, 'planet9', 500))
    expect(p9).toBeCloseTo((20_000 / KM_PER_AU) * EXAGGERATION.planet9, 10)
    expect(p9).toBeGreaterThan(0.19)
    expect(p9).toBeLessThan(0.21)
  })
})

describe('minRadiusPx', () => {
  it('gibt erdgroßen Körpern die Referenz-Untergrenze', () => {
    expect(minRadiusPx(6371)).toBe(MIN_RADIUS_PX)
  })

  it('deckelt große Körper bei der Referenz (Jupiter, Sonne)', () => {
    expect(minRadiusPx(69911)).toBe(MIN_RADIUS_PX)
    expect(minRadiusPx(696_340)).toBe(MIN_RADIUS_PX)
  })

  it('staffelt kleine Körper sichtbar: Erde > Mars > Merkur > Pluto', () => {
    const earth = minRadiusPx(6371)
    const mars = minRadiusPx(3390)
    const mercury = minRadiusPx(2440)
    const pluto = minRadiusPx(1188.3)
    expect(earth).toBeGreaterThan(mars)
    expect(mars).toBeGreaterThan(mercury)
    expect(mercury).toBeGreaterThan(pluto)
  })

  it('lässt keinen Körper unter die absolute Sichtbarkeitsgrenze fallen (Ceres)', () => {
    expect(minRadiusPx(473)).toBe(MIN_RADIUS_PX_FLOOR)
  })

  it('fängt ungültige Radien ab (→ Referenz-Untergrenze)', () => {
    expect(minRadiusPx(0)).toBe(MIN_RADIUS_PX)
    expect(minRadiusPx(-5)).toBe(MIN_RADIUS_PX)
    expect(minRadiusPx(Number.NaN)).toBe(MIN_RADIUS_PX)
  })
})

describe('screenFloorScale', () => {
  it('lässt große Körper unverändert (echte Proportion, Faktor 1)', () => {
    // Radius 0.7 Units bei 0.001 Units/px → 700 px weit über dem Floor
    expect(screenFloorScale(0.7, 0.001)).toBe(1)
  })

  it('skaliert sub-pixel-Körper auf MIN_RADIUS_PX hoch', () => {
    // Gesamtansicht: 2.5 Units/px, Erde 0.064 Units → Faktor = 2.5·2.5/0.064
    const scale = screenFloorScale(0.064, 2.5)
    expect(scale).toBeCloseTo((MIN_RADIUS_PX * 2.5) / 0.064, 10)
    expect(scale).toBeGreaterThan(1)
    // Ergebnis: sichtbarer Radius exakt MIN_RADIUS_PX
    expect(0.064 * scale).toBeCloseTo(MIN_RADIUS_PX * 2.5, 10)
  })

  it('fängt degenerierte Eingaben ab (0 oder negativ → 1)', () => {
    expect(screenFloorScale(0, 1)).toBe(1)
    expect(screenFloorScale(0.1, 0)).toBe(1)
    expect(screenFloorScale(-1, -1)).toBe(1)
    expect(screenFloorScale(0.1, 1, 0)).toBe(1)
    expect(screenFloorScale(0.1, 1, Number.NaN)).toBe(1)
  })

  it('respektiert eine körperabhängige Untergrenze (Pluto kleiner als Erde)', () => {
    // Gesamtansicht: 2.5 Units/px, Pluto am Kategorie-Floor 0.03 Units, minPx 1.28
    const plutoMinPx = minRadiusPx(1188.3)
    const scale = screenFloorScale(0.03, 2.5, plutoMinPx)
    expect(scale).toBeCloseTo((plutoMinPx * 2.5) / 0.03, 10)
    // Ergebnis: sichtbarer Radius exakt der körperabhängigen Untergrenze
    expect(0.03 * scale).toBeCloseTo(plutoMinPx * 2.5, 10)
    // … und damit kleiner als ein erdgroßer Körper am selben Zoom
    expect(plutoMinPx).toBeLessThan(MIN_RADIUS_PX)
  })
})

describe('ringRadiusUnits (Welle 2)', () => {
  it('skaliert Ring-Radien mit dem Körperfaktor (Saturn A-Ring außen ≈ 2.35 R)', () => {
    const saturn = makeBody(58232, 'planet', 9.5)
    const bodyRadius = baseRadiusUnits(saturn)
    const aOuter = ringRadiusUnits(saturn, 136780)
    expect(aOuter / bodyRadius).toBeCloseTo(136780 / 58232, 5)
  })

  it('bleibt physikalisch skaliert, auch wenn der Körper am Floor hängt', () => {
    const dwarf = makeBody(1188.3, 'dwarf_planet', 39.5)
    expect(ringRadiusUnits(dwarf, 2000)).toBeCloseTo(
      (2000 / KM_PER_AU) * EXAGGERATION.dwarf_planet,
      10,
    )
  })
})
