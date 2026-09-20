import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useAppState } from '../state/AppContext'
import { nbodyCacheKey } from '../state/reducer'
import { lightenColor } from '../utils/color'
import type { Vec3 } from '../types'

function TrajectoryLine({
  points,
  color,
  dashed = false,
}: {
  points: Vec3[]
  color: string
  dashed?: boolean
}) {
  const pts = useMemo(
    () => points.map((p) => [p.x, p.z, -p.y] as [number, number, number]),
    [points],
  )
  return (
    <Line
      points={pts}
      color={color}
      lineWidth={1.8}
      transparent
      opacity={0.85}
      dashed={dashed}
      dashSize={0.6}
      gapSize={0.4}
    />
  )
}

const FALLBACK_COLORS = ['#4a9eff', '#ff6b6b', '#4ecdc4', '#ffd93d', '#9b59b6', '#e67e22']

/**
 * N-Body-Überlagerungen in der Szene:
 * - Vergleichsmodus: aufgehellte, gestrichelte N-Body-Bahn des gewählten Körpers
 * - Demos: Trajektorien (durchgezogen), beim Planet-9-Test zusätzlich gestrichelt mit P9
 */
export default function TrajectoryLines() {
  const { nbody, demo, bodies } = useAppState()

  const compareEntry = nbody.bodyId
    ? nbody.cache[nbodyCacheKey(nbody.bodyId, nbody.years)]
    : undefined
  const compareBody = bodies.find((b) => b.id === nbody.bodyId) ?? null

  return (
    <>
      {nbody.active && compareEntry && (
        <TrajectoryLine
          points={compareEntry.points}
          color={compareBody ? lightenColor(compareBody.color, 0.4) : '#ffffff'}
          dashed
        />
      )}

      {demo.active &&
        Object.entries(demo.active.trajectories).map(([id, points], i) => {
          const body = bodies.find((b) => b.id === id)
          const color = body?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
          return <TrajectoryLine key={`demo-${id}`} points={points} color={color} />
        })}

      {demo.active?.trajectoriesP9 &&
        Object.entries(demo.active.trajectoriesP9).map(([id, points], i) => {
          const body = bodies.find((b) => b.id === id)
          const color = body?.color ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length]
          return (
            <TrajectoryLine key={`demo-p9-${id}`} points={points} color={color} dashed />
          )
        })}
    </>
  )
}
