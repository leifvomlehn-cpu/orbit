import { describe, expect, it } from 'vitest'
import {
  LABEL_MIN_PX,
  ORBIT_FADE_FULL,
  ORBIT_FADE_MIN,
  ORBIT_MIN_OPACITY_FACTOR,
  orbitOpacity,
  shouldShowLabel,
} from './visibility'

describe('shouldShowLabel', () => {
  it('ausgewählter Körper behält das Label immer', () => {
    expect(shouldShowLabel('tno', 0.1, true)).toBe(true)
    expect(shouldShowLabel('planet', 0, true)).toBe(true)
  })

  it('unter der Kategorie-Schwelle kein Label', () => {
    expect(shouldShowLabel('tno', LABEL_MIN_PX.tno - 0.1, false)).toBe(false)
    expect(shouldShowLabel('dwarf_planet', LABEL_MIN_PX.dwarf_planet - 0.1, false)).toBe(false)
    expect(shouldShowLabel('planet', LABEL_MIN_PX.planet - 0.1, false)).toBe(false)
  })

  it('ab der Kategorie-Schwelle Label', () => {
    expect(shouldShowLabel('tno', LABEL_MIN_PX.tno, false)).toBe(true)
    expect(shouldShowLabel('dwarf_planet', LABEL_MIN_PX.dwarf_planet, false)).toBe(true)
    expect(shouldShowLabel('planet', LABEL_MIN_PX.planet, false)).toBe(true)
  })

  it('unbekannte Kategorie fällt auf den Default zurück', () => {
    expect(shouldShowLabel('stern', 7.9, false)).toBe(false)
    expect(shouldShowLabel('stern', 8, false)).toBe(true)
  })

  it('nicht-endliche Größe (Schutzdivision) zeigt das Label', () => {
    expect(shouldShowLabel('planet', Number.POSITIVE_INFINITY, false)).toBe(true)
  })
})

describe('orbitOpacity', () => {
  it('Planeten und Planet 9 faden nie', () => {
    expect(orbitOpacity('planet', 100)).toBe(0.45)
    expect(orbitOpacity('planet9', 100)).toBe(0.45)
    expect(orbitOpacity('planet', 0.001)).toBe(0.45)
  })

  it('unterhalb der FULL-Schwelle volle Opazität', () => {
    expect(orbitOpacity('tno', ORBIT_FADE_FULL.tno)).toBe(0.45)
    expect(orbitOpacity('dwarf_planet', ORBIT_FADE_FULL.dwarf_planet)).toBe(0.45)
  })

  it('ab der MIN-Schwelle Restopazität', () => {
    expect(orbitOpacity('tno', ORBIT_FADE_MIN.tno)).toBeCloseTo(0.45 * ORBIT_MIN_OPACITY_FACTOR, 10)
    expect(orbitOpacity('dwarf_planet', ORBIT_FADE_MIN.dwarf_planet)).toBeCloseTo(
      0.45 * ORBIT_MIN_OPACITY_FACTOR,
      10,
    )
  })

  it('monoton fallend zwischen den Schwellen', () => {
    const steps = [0.08, 0.12, 0.2, 0.3, 0.4]
    const values = steps.map((u) => orbitOpacity('tno', u))
    for (let k = 1; k < values.length; k++) {
      expect(values[k]).toBeLessThanOrEqual(values[k - 1])
    }
  })

  it('ungültige unitsPerPixel liefert volle Opazität', () => {
    expect(orbitOpacity('tno', 0)).toBe(0.45)
    expect(orbitOpacity('tno', Number.NaN)).toBe(0.45)
    expect(orbitOpacity('tno', Number.POSITIVE_INFINITY)).toBeCloseTo(
      0.45 * ORBIT_MIN_OPACITY_FACTOR,
      10,
    )
  })
})
