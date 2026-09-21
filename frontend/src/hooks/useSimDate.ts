import { useSyncExternalStore } from 'react'
import { useSimClock } from '../state/AppContext'

/**
 * Gedrosselter UI-Spiegel der SimClock (~5 Hz).
 * NIE die Clock selbst in React-State spiegeln — sonst 60 Renders/Sekunde.
 */
export function useSimDate(): Date {
  const clock = useSimClock()
  const ms = useSyncExternalStore(clock.subscribe, clock.getSnapshotMs)
  return new Date(ms)
}
