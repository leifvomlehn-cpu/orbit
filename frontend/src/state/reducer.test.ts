import { describe, expect, it } from 'vitest'
import { appReducer, initialState, nbodyCacheKey, selectVisibleBodies } from './reducer'
import type { AppState } from './reducer'
import type { CelestialBody } from '../types'

function makeBody(overrides: Partial<CelestialBody> = {}): CelestialBody {
  return {
    id: 'earth',
    name: 'Earth',
    name_de: 'Erde',
    category: 'planet',
    color: '#6B93D6',
    orbital_elements: {
      semi_major_axis_au: 1,
      eccentricity: 0.0167,
      inclination_deg: 0,
      longitude_ascending_node_deg: -11.26,
      argument_perihelion_deg: 102.94,
      mean_anomaly_deg: 100.46,
      orbital_period_days: 365.256,
    },
    physical_data: { mass_kg: 5.97237e24, radius_km: 6371 },
    description_de: 'Test',
    ...overrides,
  }
}

const BODIES: CelestialBody[] = [
  makeBody(),
  makeBody({ id: 'pluto', name: 'Pluto', name_de: 'Pluto', category: 'dwarf_planet' }),
  makeBody({ id: 'sedna', name: 'Sedna', name_de: 'Sedna', category: 'tno', tno_type: 'sednoid' }),
  makeBody({
    id: '2012_vp113',
    name: '2012 VP113',
    name_de: '2012 VP113',
    category: 'tno',
    tno_type: 'extreme_tno',
  }),
  makeBody({ id: '2007_or10', name: '2007 OR10', name_de: '2007 OR10', category: 'tno' }),
]

function withBodies(extra: Partial<AppState> = {}): AppState {
  return { ...initialState, bodies: BODIES, bodiesLoaded: true, ...extra }
}

describe('appReducer', () => {
  it('bodies/loaded setzt Liste und löscht Fehler', () => {
    const s = appReducer(
      { ...initialState, error: 'alt' },
      { type: 'bodies/loaded', bodies: BODIES },
    )
    expect(s.bodies).toHaveLength(5)
    expect(s.bodiesLoaded).toBe(true)
    expect(s.error).toBeNull()
  })

  it('body/select öffnet das Info-Panel', () => {
    const s = appReducer(initialState, { type: 'body/select', id: 'mars' })
    expect(s.selectedBodyId).toBe('mars')
    expect(s.infoPanelOpen).toBe(true)
  })

  it('body/select null ändert den Panel-Zustand nicht', () => {
    const s = appReducer(
      { ...initialState, infoPanelOpen: true },
      { type: 'body/select', id: null },
    )
    expect(s.selectedBodyId).toBeNull()
    expect(s.infoPanelOpen).toBe(true)
  })

  it('body/hover mit gleicher ID gibt denselben State zurück (kein Rerender)', () => {
    const s1: AppState = { ...initialState, hoveredBodyId: 'mars' }
    const s2 = appReducer(s1, { type: 'body/hover', id: 'mars' })
    expect(s2).toBe(s1)
  })

  it('ui/closePanels schließt alle Panels', () => {
    const s = appReducer(
      { ...initialState, infoPanelOpen: true, planet9PanelOpen: true, helpOpen: true },
      { type: 'ui/closePanels' },
    )
    expect(s.infoPanelOpen).toBe(false)
    expect(s.planet9PanelOpen).toBe(false)
    expect(s.helpOpen).toBe(false)
  })

  it('nbody/cached legt Eintrag ab und behält bestehende', () => {
    const entry = { years: 100, points: [{ x: 1, y: 2, z: 3 }], timestamps: ['2026-01-01'], stepDays: 9 }
    const s1 = appReducer(initialState, {
      type: 'nbody/cached',
      bodyId: 'sedna',
      key: 'sedna_100',
      entry,
    })
    const s2 = appReducer(s1, {
      type: 'nbody/cached',
      bodyId: 'sedna',
      key: 'sedna_200',
      entry: { ...entry, years: 200 },
    })
    expect(Object.keys(s2.nbody.cache)).toEqual(['sedna_100', 'sedna_200'])
    expect(s2.nbody.loading).toBe(false)
    expect(s2.nbody.bodyId).toBe('sedna')
  })

  it('demo-Lifecycle: started → succeeded → cleared', () => {
    const s1 = appReducer(initialState, {
      type: 'demo/started',
      title: 'T',
      detail: 'lädt',
    })
    expect(s1.demo.loading).toBe(true)
    expect(s1.demo.active).toBeNull()

    const run = { id: 'sedna10k' as const, trajectories: { sedna: [{ x: 0, y: 0, z: 0 }] }, durationYears: 10000 }
    const s2 = appReducer(s1, { type: 'demo/succeeded', run, title: 'T', detail: 'fertig' })
    expect(s2.demo.loading).toBe(false)
    expect(s2.demo.active?.id).toBe('sedna10k')

    const s3 = appReducer(s2, { type: 'demo/cleared' })
    expect(s3.demo.active).toBeNull()
    expect(s3.demo.statusTitle).toBeNull()
  })

  it('error/set und error/dismiss', () => {
    const s1 = appReducer(initialState, { type: 'error/set', message: 'kaputt' })
    expect(s1.error).toBe('kaputt')
    const s2 = appReducer(s1, { type: 'error/dismiss' })
    expect(s2.error).toBeNull()
  })
})

describe('selectVisibleBodies', () => {
  it('all zeigt alles', () => {
    expect(selectVisibleBodies(withBodies())).toHaveLength(5)
  })

  it('planets / dwarf_planets / tnos filtern nach category', () => {
    expect(
      selectVisibleBodies(withBodies({ categoryFilter: 'planets' })).map((b) => b.id),
    ).toEqual(['earth'])
    expect(
      selectVisibleBodies(withBodies({ categoryFilter: 'dwarf_planets' })).map((b) => b.id),
    ).toEqual(['pluto'])
    expect(
      selectVisibleBodies(withBodies({ categoryFilter: 'tnos' })).map((b) => b.id),
    ).toEqual(['sedna', '2012_vp113', '2007_or10'])
  })

  it('extreme filtert über tno_type (Sprint-B-API-Patch)', () => {
    // Vor dem Patch war der Tab still leer, weil category immer 'tno' war.
    expect(
      selectVisibleBodies(withBodies({ categoryFilter: 'extreme' })).map((b) => b.id),
    ).toEqual(['sedna', '2012_vp113'])
  })

  it('Suche matcht name und name_de, case-insensitiv', () => {
    expect(selectVisibleBodies(withBodies({ searchQuery: 'sed' })).map((b) => b.id)).toEqual([
      'sedna',
    ])
    expect(selectVisibleBodies(withBodies({ searchQuery: 'ERDE' })).map((b) => b.id)).toEqual([
      'earth',
    ])
    expect(selectVisibleBodies(withBodies({ searchQuery: 'vp113' })).map((b) => b.id)).toEqual([
      '2012_vp113',
    ])
  })

  it('Suche + Filter kombinieren', () => {
    const s = withBodies({ categoryFilter: 'tnos', searchQuery: '2012' })
    expect(selectVisibleBodies(s).map((b) => b.id)).toEqual(['2012_vp113'])
  })
})

describe('nbodyCacheKey', () => {
  it('baut den Key aus Body und Jahren', () => {
    expect(nbodyCacheKey('sedna', 100)).toBe('sedna_100')
  })
})
