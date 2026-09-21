export type ClockListener = (simMs: number) => void

const MS_PER_DAY = 86_400_000
/** UI-Spiegel-Frequenz: 5 Hz reichen für die Datumsanzeige, der 3D-Loop liest direkt. */
const UI_NOTIFY_INTERVAL_MS = 200

/**
 * Die Simulationsuhr — lebt AUSSERHALB von React-State.
 *
 * Kernregel von Sprint B: currentDate löst nie einen React-Rerender aus.
 * Der Render-Loop (useFrame) ruft tick() und liest getSimMs() direkt;
 * UI-Komponenten abonnieren den gedrosselten Spiegel via useSimDate().
 */
export class SimClock {
  private simMs: number
  /** Was useSyncExternalStore als Snapshot sieht — ändert sich NUR in notify(). */
  private notifiedMs: number
  private speedDaysPerSecond = 1
  private playing = false
  private listeners = new Set<ClockListener>()
  private lastNotify = 0

  constructor(now?: number) {
    this.simMs = now ?? Date.now()
    this.notifiedMs = this.simMs
  }

  /** Vom Render-Loop aufgerufen. deltaSeconds = echte vergangene Sekunden. */
  tick(deltaSeconds: number): void {
    if (!this.playing) return
    this.simMs += deltaSeconds * this.speedDaysPerSecond * MS_PER_DAY
    const now = performance.now()
    if (now - this.lastNotify >= UI_NOTIFY_INTERVAL_MS) {
      this.lastNotify = now
      this.notify()
    }
  }

  private notify(): void {
    // Snapshot erst hier fortschreiben: tick() mutiert simMs pro Frame,
    // notified aber gedrosselt — sonst Tearing im useSyncExternalStore.
    this.notifiedMs = this.simMs
    for (const listener of this.listeners) listener(this.simMs)
  }

  /** useSyncExternalStore-kompatibel. Arrow-Property = stabile Referenz. */
  subscribe = (listener: ClockListener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Live-Wert für den Render-Loop (useFrame). Arrow-Property = stabile Referenz. */
  getSimMs = (): number => this.simMs

  /**
   * Snapshot für useSyncExternalStore: ändert sich NUR bei notify().
   * getSimMs() ist dafür ungeeignet — der Wert driftet zwischen den
   * Benachrichtigungen (tick pro Frame) und bricht damit den Vertrag
   * (Tearing / "getSnapshot should be cached"). Deep-Recon #4.
   */
  getSnapshotMs = (): number => this.notifiedMs

  getSimDate(): Date {
    return new Date(this.simMs)
  }

  setSimMs(ms: number): void {
    this.simMs = ms
    this.notify()
  }

  addDays(days: number): void {
    this.simMs += days * MS_PER_DAY
    this.notify()
  }

  /** Echte Kalendermonate (setUTCMonth), nicht 30-Tage-Näherung. */
  addMonths(months: number): void {
    const d = new Date(this.simMs)
    d.setUTCMonth(d.getUTCMonth() + months)
    this.simMs = d.getTime()
    this.notify()
  }

  addYears(years: number): void {
    const d = new Date(this.simMs)
    d.setUTCFullYear(d.getUTCFullYear() + years)
    this.simMs = d.getTime()
    this.notify()
  }

  resetToNow(): void {
    this.setSimMs(Date.now())
  }

  setPlaying(playing: boolean): void {
    this.playing = playing
  }

  isPlaying(): boolean {
    return this.playing
  }

  setSpeed(daysPerSecond: number): void {
    this.speedDaysPerSecond = daysPerSecond
  }

  getSpeed(): number {
    return this.speedDaysPerSecond
  }
}
