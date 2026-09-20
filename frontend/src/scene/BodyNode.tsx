import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Group } from 'three'
import type { CelestialBody } from '../types'
import { calculateBodyPosition } from '../simulation/kepler'
import { useAppDispatch, useAppState, useSimClock } from '../state/AppContext'
import { toScene } from './coords'

/**
 * Anzeige-Radien in Scene-Units (1 AU = 1 Unit) — bewusst weit ÜBER
 * physikalisch (Erde real: 0.00004 AU), sonst wäre nichts sichtbar.
 * Feintuning nach dem ersten visuellen Check.
 */
const DISPLAY_RADIUS: Record<string, number> = {
  star: 0.25,
  planet: 0.12,
  dwarf_planet: 0.08,
  tno: 0.06,
  planet9: 0.1,
}

function displayRadius(body: CelestialBody): number {
  // Sonne & stationäre Objekte haben a = 0
  if (body.orbital_elements.semi_major_axis_au === 0) return DISPLAY_RADIUS.star
  return DISPLAY_RADIUS[body.category] ?? 0.06
}

interface BodyNodeProps {
  body: CelestialBody
}

/**
 * Ein Himmelskörper: Mesh + Label. Die Position wird im Render-Loop
 * direkt aus der SimClock berechnet — nie über React-State.
 */
export default function BodyNode({ body }: BodyNodeProps) {
  const groupRef = useRef<Group>(null)
  const clock = useSimClock()
  const dispatch = useAppDispatch()
  const selected = useAppState().selectedBodyId === body.id
  const isSun = body.orbital_elements.semi_major_axis_au === 0

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    if (isSun) {
      group.position.set(0, 0, 0)
      return
    }
    const pos = calculateBodyPosition(body.orbital_elements, clock.getSimDate())
    if (pos) group.position.set(...toScene(pos))
  })

  const radius = displayRadius(body)

  return (
    <group ref={groupRef}>
      <mesh
        onClick={(e) => {
          e.stopPropagation()
          dispatch({ type: 'body/select', id: body.id })
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          dispatch({ type: 'body/hover', id: body.id })
        }}
        onPointerOut={() => dispatch({ type: 'body/hover', id: null })}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        {isSun ? (
          <meshBasicMaterial color={body.color} />
        ) : (
          <meshStandardMaterial
            color={body.color}
            emissive={selected ? body.color : '#000000'}
            emissiveIntensity={selected ? 0.6 : 0}
          />
        )}
      </mesh>
      <Html position={[0, radius + 0.05, 0]} center zIndexRange={[5, 0]}>
        <div
          className={selected ? 'body-label selected' : 'body-label'}
          onClick={() => dispatch({ type: 'body/select', id: body.id })}
        >
          {body.name_de}
        </div>
      </Html>
    </group>
  )
}
