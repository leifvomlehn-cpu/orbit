import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { OrbitPath } from '../types'
import { toScene } from './coords'

interface OrbitLineProps {
  path: OrbitPath
  color: string
  /** Planet-9-Vorhersagebahn wird gestrichelt gezeichnet */
  dashed?: boolean
}

/** Kepler-Bahnpfad als Linie (Ekliptik → Szene via toScene). */
export default function OrbitLine({ path, color, dashed = false }: OrbitLineProps) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let k = 0; k < path.x.length; k++) {
      pts.push(toScene({ x: path.x[k], y: path.y[k], z: path.z[k] }))
    }
    return pts
  }, [path])

  return (
    <Line
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
