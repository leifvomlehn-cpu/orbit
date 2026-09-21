import type { Group } from 'three'
import type { LineMaterial } from 'three-stdlib'
import type { OrbitalElements } from '../types'
import type { PrecomputedOrbit } from '../simulation/kepler'

/**
 * Szene-Registry: BodyNode/OrbitLine registrieren ihre three.js-Refs hier,
 * der Loop-Owner (SimulationTicker) iteriert sie pro Frame — ohne React-State
 * und ohne dass jeder Körper einen eigenen useFrame-Hook braucht (Welle 1).
 */
export interface BodyEntry {
  id: string
  elements: OrbitalElements
  category: string
  radiusUnits: number
  group: Group
  scaleGroup: Group
  labelAnchor: Group
  /** drei-Html-Portal: die Div kann per Callback-Ref erst NACH der Registrierung ankommen */
  labelDiv: HTMLDivElement | null
  /** letzter Label-Sichtbarkeitszustand — DOM-Schreibzugriff nur bei Wechsel */
  labelVisible: boolean
  /** Lazy-Cache, wird vom Loop-Owner beim ersten Frame gefüllt */
  pre: PrecomputedOrbit | null
}

export interface OrbitEntry {
  category: string
  material: LineMaterial
}

const bodies = new Map<string, BodyEntry>()
const orbits = new Map<string, OrbitEntry>()

export function registerBody(entry: BodyEntry): void {
  bodies.set(entry.id, entry)
}

export function unregisterBody(id: string): void {
  bodies.delete(id)
}

export function getBodyEntry(id: string): BodyEntry | undefined {
  return bodies.get(id)
}

export function eachBody(): IterableIterator<BodyEntry> {
  return bodies.values()
}

export function registerOrbit(id: string, entry: OrbitEntry): void {
  orbits.set(id, entry)
}

export function unregisterOrbit(id: string): void {
  orbits.delete(id)
}

export function eachOrbit(): IterableIterator<OrbitEntry> {
  return orbits.values()
}
