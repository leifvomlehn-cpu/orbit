import { useEffect, useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
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
}

/**
 * Kepler-Bahnpfad als Linie (Ekliptik → Szene via toScene).
 * Die Opazität steuert der Loop-Owner zoomabhängig (Orbit-Fade, Welle 1) —
 * hier nur Material registrieren. depthWrite=false, damit die Linien die
 * Labels (occlude="blending") nicht verdecken.
 */
export default function OrbitLine({ bodyId, category, path, color, dashed = false }: OrbitLineProps) {
  const lineRef = useRef<Line2>(null)

  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let k = 0; k < path.x.length; k++) {
      pts.push(toScene({ x: path.x[k], y: path.y[k], z: path.z[k] }))
    }
    return pts
  }, [path])

  useEffect(() => {
    const line = lineRef.current
    if (!line) return
    const material = line.material as LineMaterial
    material.depthWrite = false
    registerOrbit(bodyId, { category, material })
    return () => unregisterOrbit(bodyId)
  }, [bodyId, category])

  return (
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
}
