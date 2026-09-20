import { describe, expect, it } from 'vitest'
import { SimClock } from './SimClock'

const MS_PER_DAY = 86_400_000

describe('SimClock', () => {
  it('tickt nur, wenn playing aktiv ist', () => {
    const c = new SimClock(0)
    c.tick(1)
    expect(c.getSimMs()).toBe(0)
    c.setPlaying(true)
    c.tick(1) // Default-Speed: 50 Tage/Sekunde
    expect(c.getSimMs()).toBe(50 * MS_PER_DAY)
  })

  it('Speed wirkt linear auf die Simulationszeit', () => {
    const c = new SimClock(0)
    c.setPlaying(true)
    c.setSpeed(10)
    c.tick(2) // 2 s à 10 Tage = 20 Tage
    expect(c.getSimMs()).toBe(20 * MS_PER_DAY)
  })

  it('addDays springt vor und zurück', () => {
    const c = new SimClock(0)
    c.addDays(30)
    expect(c.getSimMs()).toBe(30 * MS_PER_DAY)
    c.addDays(-30)
    expect(c.getSimMs()).toBe(0)
  })

  it('addMonths nutzt echte Kalendermonate (kein 30-Tage-Ersatz)', () => {
    const c = new SimClock(Date.UTC(2026, 5, 15, 12)) // 15.06.2026
    c.addMonths(1)
    expect(c.getSimDate().toISOString().slice(0, 10)).toBe('2026-07-15')
    c.addMonths(-2)
    expect(c.getSimDate().toISOString().slice(0, 10)).toBe('2026-05-15')
  })

  it('addYears rollt Schalttag korrekt über (29.02. → 01.03.)', () => {
    const c = new SimClock(Date.UTC(2024, 1, 29, 12)) // 29.02.2024
    c.addYears(1)
    expect(c.getSimDate().toISOString().slice(0, 10)).toBe('2025-03-01')
  })

  it('setSimMs/addDays benachrichtigen Subscriber sofort', () => {
    const c = new SimClock(0)
    let calls = 0
    const unsub = c.subscribe(() => {
      calls++
    })
    c.setSimMs(1000)
    c.addDays(1)
    expect(calls).toBe(2)
    unsub()
    c.addDays(1)
    expect(calls).toBe(2)
  })

  it('tick benachrichtigt gedrosselt (zweiter Tick innerhalb 200 ms ohne notify)', () => {
    const c = new SimClock(0)
    c.setPlaying(true)
    let calls = 0
    c.subscribe(() => {
      calls++
    })
    c.tick(0.016)
    c.tick(0.016)
    expect(calls).toBe(1)
  })
})
