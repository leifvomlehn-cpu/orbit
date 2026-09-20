import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AdditiveBlending, DoubleSide, MathUtils } from 'three'
import type { Group, OrthographicCamera, PerspectiveCamera } from 'three'
import type { CelestialBody } from '../types'
import { calculateBodyPosition } from '../simulation/kepler'
import { useAppDispatch, useAppState, useSimClock } from '../state/AppContext'
import { toScene } from './coords'
import { baseRadiusUnits, isStationary, screenFloorScale } from './sizing'

/** Saturn: reale Ring-Ausdehnung (C-Ring innen ≈ 1.24 R, A-Ring außen ≈ 2.27 R) */
const SATURN_RING_INNER = 1.24
const SATURN_RING_OUTER = 2.27
/** Saturn-Achsneigung gegen die Bahnebene */
const SATURN_TILT_RAD = MathUtils.degToRad(26.7)

interface BodyNodeProps {
  body: CelestialBody
}

/**
 * Ein Himmelskörper: Mesh + Label. Position UND Bildschirm-Skalierung
 * laufen im Render-Loop über Refs — nie über React-State (SimClock-Regel).
 * Größen folgen echten Radius-Verhältnissen (sizing.ts); weit rausgezoomt
 * hält eine Planetarium-Untergrenze jeden Körper bei ≥ MIN_RADIUS_PX,
 * sonst wäre bei der Sedna-Gesamtansicht (~937 AU) nichts sichtbar.
 */
export default function BodyNode({ body }: BodyNodeProps) {
  const groupRef = useRef<Group>(null)
  const scaleRef = useRef<Group>(null)
  const labelAnchorRef = useRef<Group>(null)
  const clock = useSimClock()
  const dispatch = useAppDispatch()
  const selected = useAppState().selectedBodyId === body.id
  const isSun = isStationary(body)
  const radius = baseRadiusUnits(body)

  useFrame(({ camera, size }) => {
    const group = groupRef.current
    if (!group) return
    if (isSun) {
      group.position.set(0, 0, 0)
    } else {
      const pos = calculateBodyPosition(body.orbital_elements, clock.getSimDate())
      if (pos) group.position.set(...toScene(pos))
    }

    // Scene-Units je Bildschirm-Pixel aus der aktiven Kamera ableiten
    let unitsPerPixel: number
    const ortho = camera as OrthographicCamera
    if (ortho.isOrthographicCamera) {
      unitsPerPixel = (ortho.top - ortho.bottom) / ortho.zoom / size.height
    } else {
      const persp = camera as PerspectiveCamera
      const dist = persp.position.distanceTo(group.position)
      unitsPerPixel = (2 * dist * Math.tan(MathUtils.degToRad(persp.fov) / 2)) / size.height
    }
    const scale = screenFloorScale(radius, unitsPerPixel)
    scaleRef.current?.scale.setScalar(scale)
    // Label knapp über die sichtbare Kugel legen (sichtbarer Radius = radius·scale)
    labelAnchorRef.current?.position.set(0, radius * scale * 1.3, 0)
  })

  return (
    <group ref={groupRef}>
      <group ref={scaleRef}>
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
          <sphereGeometry args={[radius, 32, 32]} />
          {isSun ? (
            <meshBasicMaterial color={body.color} toneMapped={false} />
          ) : (
            <meshStandardMaterial
              color={body.color}
              roughness={0.85}
              metalness={0.05}
              emissive={selected ? body.color : '#000000'}
              emissiveIntensity={selected ? 0.6 : 0}
            />
          )}
        </mesh>
        {isSun && (
          <mesh>
            <sphereGeometry args={[radius * 1.4, 24, 24]} />
            <meshBasicMaterial
              color={body.color}
              transparent
              opacity={0.18}
              depthWrite={false}
              blending={AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        )}
        {body.id === 'saturn' && (
          <mesh rotation={[-Math.PI / 2 + SATURN_TILT_RAD, 0, 0]}>
            <ringGeometry args={[radius * SATURN_RING_INNER, radius * SATURN_RING_OUTER, 64]} />
            <meshBasicMaterial
              color="#d8c9a3"
              transparent
              opacity={0.75}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )}
      </group>
      <group ref={labelAnchorRef} position={[0, radius * 1.3, 0]}>
        <Html center zIndexRange={[5, 0]}>
          <div
            className={selected ? 'body-label selected' : 'body-label'}
            onClick={() => dispatch({ type: 'body/select', id: body.id })}
          >
            {body.name_de}
          </div>
        </Html>
      </group>
    </group>
  )
}
