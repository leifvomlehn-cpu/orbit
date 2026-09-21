import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import type { Group } from 'three'
import type { Line2, LineMaterial } from 'three-stdlib'
import type { OrbitPath } from '../types'
import { toScene } from './coords'
import { registerOrbit, unregisterOrbit } from './registry'

interface OrbitLineProps {
  bodyId: string
  category: string
  path: OrbitPath
  color: string
  /** Planet-9-Vorhersagebahn wird gestrichelt gezeichnet */
  dashed?: boolean
  /** Parent-Bahn (Mond): der Pfad ist relativ zum Parent gezeichnet; die
   *  Linie hängt in einer Wrapper-Gruppe, deren Position der Loop-Owner
   *  pro Frame an die Parent-Position setzt. */
  parentId?: string
  /** Anzeige-Übertreibung des Pfads (Mond: MOON_ORBIT_EXAGGERATION) */
  scale?: number
}

/**
 * Kepler-Bahnpfad als Linie (Ekliptik → Szene via toScene).
 * Die Opazität steuert der Loop-Owner zoomabhängig (Orbit-Fade, Welle 1) —
 * hier nur Material registrieren. depthWrite=false, damit die Linien die
 * Labels (occlude="blending") nicht verdecken.
 */
export default function OrbitLine({ bodyId, category, path, color, dashed = false, parentId, scale = 1 }: OrbitLineProps) {
  const lineRef = useRef<Line2>(null)
  const groupRef = useRef<Group>(null)

  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let k = 0; k < path.x.length; k++) {
      const p = toScene({ x: path.x[k], y: path.y[k], z: path.z[k] })
      pts.push([p[0] * scale, p[1] * scale, p[2] * scale])
    }
    return pts
  }, [path, scale])

  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    const material = line.material as LineMaterial
    material.depthWrite = false
    registerOrbit(bodyId, {
      category,
      material,
      parentId: parentId ?? null,
      group: groupRef.current,
    })
    return () => unregisterOrbit(bodyId)
  }, [bodyId, category, parentId])

  const line = (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.45}
      dashed={dashed}
      dashSize={0.5}
      gapSize={0.25}
    />
  )
  // Parent-Bahnen bekommen eine Wrapper-Gruppe (Position setzt der Ticker);
  // heliozentrische Bahnen bleiben unverändert ohne Extra-Knoten.
  return parentId ? <group ref={groupRef}>{line}</group> : line
}
