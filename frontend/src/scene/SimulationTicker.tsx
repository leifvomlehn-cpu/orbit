import { useFrame } from '@react-three/fiber'
import { useSimClock } from '../state/AppContext'

/**
 * Treibt die SimClock im Render-Loop an.
 * delta ist in Sekunden; gedeckelt auf 100 ms, damit ein Tab-Wechsel
 * (keine Frames, dann ein Riesen-delta) keinen Zeitsprung auslöst.
 */
export default function SimulationTicker() {
  const clock = useSimClock()
  useFrame((_, delta) => {
    clock.tick(Math.min(delta, 0.1))
  })
  return null
}
