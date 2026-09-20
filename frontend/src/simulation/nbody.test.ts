import { describe, expect, it } from 'vitest'
import {
  extractTrajectories,
  formatDrift,
  nbodyCompareParams,
  nbodyDemoParams,
} from './nbody'
import type { NbodyResult } from '../types'

describe('nbodyCompareParams (Portierung app.js:1966-1970)', () => {
  it('100 Jahre: ~4000 Schritte, ~200 Snapshots', () => {
    const p = nbodyCompareParams(100)
    expect(p.durationDays).toBeCloseTo(36525)
    expect(p.stepDays).toBe(9)
    expect(p.sampleEvery).toBe(20)
  })

  it('über 500 Jahre: mindestens 5 Tage Schrittweite', () => {
    const p = nbodyCompareParams(1000)
    expect(p.stepDays).toBeGreaterThanOrEqual(5)
    expect(p.durationDays).toBeCloseTo(365250)
  })

  it('10 Jahre: Schrittweite 1 Tag', () => {
    const p = nbodyCompareParams(10)
    expect(p.stepDays).toBe(1)
    expect(p.sampleEvery).toBe(18)
  })
})

describe('nbodyDemoParams (Portierung app.js:2253-2262)', () => {
  it('Sedna-10k: 30 Tage Schritt, 365 Ziel-Snapshots', () => {
    const p = nbodyDemoParams(10000, 30, 365)
    expect(p.durationDays).toBeCloseTo(3652500)
    expect(p.stepDays).toBe(30)
    // nSteps = 121750, sampleEvery = floor(121750/365) = 333
    expect(p.sampleEvery).toBe(333)
  })
})

function miniSim(): NbodyResult {
  return {
    body_ids: ['sun', 'earth'],
    timestamps: ['2026-01-01T00:00:00', '2026-01-02T00:00:00'],
    days_since_start: [0, 1],
    positions: [
      [
        [0.001, 0.002, 0.003],
        [1.001, 0.002, 0.003],
      ],
      [
        [0.001, 0.002, 0.003],
        [0.501, 1.002, 0.003],
      ],
    ],
    velocities: [],
    energy: [],
    angular_momentum: [],
    metadata: {
      step_days: 1,
      n_steps: 1,
      n_samples: 2,
      n_bodies: 2,
      integrator: 'RK4',
      frame: 'barycentric',
      duration_days: 1,
    },
  }
}

describe('extractTrajectories (baryzentrisch → heliozentrisch)', () => {
  it('zieht die Sonnenposition je Snapshot ab', () => {
    const t = extractTrajectories(miniSim(), ['earth'])
    expect(t.earth).toEqual([
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: 1, z: 0 },
    ])
  })

  it('unbekannte IDs werden übersprungen', () => {
    const t = extractTrajectories(miniSim(), ['pluto'])
    expect(t.pluto).toBeUndefined()
  })
})

describe('formatDrift', () => {
  it('unter 0.001 AU in Mio km', () => {
    expect(formatDrift(0.0005)).toBe('0.07 Mio km')
  })

  it('unter 0.01 AU mit 5 Nachkommastellen', () => {
    expect(formatDrift(0.005)).toBe('0.00500 AU')
  })

  it('darüber mit 4 Nachkommastellen', () => {
    expect(formatDrift(0.5)).toBe('0.5000 AU')
  })
})
