import { useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import { AdditiveBlending, DoubleSide, MathUtils } from 'three'
import type { Group } from 'three'
import type { CelestialBody } from '../types'
import { useAppDispatch, useAppState } from '../state/AppContext'
import { baseRadiusUnits, isStationary } from './sizing'
import { registerBody, unregisterBody } from './registry'

/** Saturn: reale Ring-Ausdehnung (C-Ring innen ≈ 1.24 R, A-Ring außen ≈ 2.27 R) */
const SATURN_RING_INNER = 1.24
const SATURN_RING_OUTER = 2.27
/** Saturn-Achsneigung gegen die Bahnebene */
const SATURN_TILT_RAD = MathUtils.degToRad(26.7)

interface BodyNodeProps {
  body: CelestialBody
  /** iPad-Wächter: bei niedriger Qualitätsstufe kein Label-Occlusion (Raycast-/Blend-Kosten) */
  lowQuality?: boolean
}

/**
 * Ein Himmelskörper: Mesh + Label. Position, Bildschirm-Skalierung und
 * Label-Sichtbarkeit setzt der Loop-Owner (SimulationTicker) pro Frame —
 * diese Komponente registriert nur ihre Refs in der Szene-Registry.
 * Größen folgen echten Radius-Verhältnissen (sizing.ts); weit rausgezoomt
 * hält eine Planetarium-Untergrenze jeden Körper bei ≥ MIN_RADIUS_PX.
 */
export default function BodyNode({ body, lowQuality = false }: BodyNodeProps) {
  const groupRef = useRef<Group>(null)
  const scaleRef = useRef<Group>(null)
  const labelAnchorRef = useRef<Group>(null)
  const labelDivRef = useRef<HTMLDivElement>(null)
  const dispatch = useAppDispatch()
  const selected = useAppState().selectedBodyId === body.id
  const isSun = isStationary(body)
  const radius = baseRadiusUnits(body)

  useEffect(() => {
    const group = groupRef.current
    const scaleGroup = scaleRef.current
    const labelAnchor = labelAnchorRef.current
    const labelDiv = labelDivRef.current
    if (!group || !scaleGroup || !labelAnchor || !labelDiv) return
    registerBody({
      id: body.id,
      elements: body.orbital_elements,
      category: body.category,
      radiusUnits: radius,
      group,
      scaleGroup,
      labelAnchor,
      labelDiv,
      labelVisible: true,
      pre: null,
    })
    return () => unregisterBody(body.id)
  }, [body, radius])

  return (
    <group ref={groupRef}>
      <group ref={scaleRef}>
        <mesh
          onClick={(e) => {
            e.stopPropagation()
            dispatch({ type: 'body/select', id: body.id })
          }}
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
        <Html center zIndexRange={[5, 0]} occlude={lowQuality ? undefined : 'blending'}>
          <div
            ref={labelDivRef}
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
