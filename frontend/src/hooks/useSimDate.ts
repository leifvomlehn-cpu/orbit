import { useSyncExternalStore } from 'react'
import { useSimClock } from '../state/AppContext'

/**
 * Gedrosselter UI-Spiegel der SimClock (~5 Hz).
 * NIE die Clock selbst in React-State spiegeln — sonst 60 Renders/Sekunde.
 */
export function useSimDate(): Date {
  const ms = useSimMs()
  return new Date(ms)
}

/** Gedrosselter Rohwert in ms (~5 Hz) — u. a. für den Datums-Scrubber. */
export function useSimMs(): number {
  const clock = useSimClock()
  return useSyncExternalStore(clock.subscribe, clock.getSnapshotMs)
}
