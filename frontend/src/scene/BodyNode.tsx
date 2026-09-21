import { useCallback, useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import { AdditiveBlending, BackSide, MathUtils, ShaderMaterial } from 'three'
import type { Group } from 'three'
import type { CelestialBody } from '../types'
import { useAppDispatch, useAppState } from '../state/AppContext'
import { baseRadiusUnits, isStationary, minRadiusPx } from './sizing'
import { getBodyEntry, registerBody, unregisterBody } from './registry'
import PlanetRings from './PlanetRings'
import { bodyTextureFile, useBodyTexture } from './textures'

interface BodyNodeProps {
  body: CelestialBody
  /** iPad-Wächter: bei niedriger Qualitätsstufe kein Label-Occlusion (Raycast-/Blend-Kosten) */
  lowQuality?: boolean
}

/** Erd-Atmosphäre (Welle 2): Fresnel-Randglühen, additiv von außen. */
const atmosphereMaterial = new ShaderMaterial({
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vView = normalize(-mvPosition.xyz);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vView;
    void main() {
      float fresnel = pow(1.0 - abs(dot(vNormal, vView)), 3.0);
      gl_FragColor = vec4(0.45, 0.62, 1.0, 1.0) * fresnel * 0.9;
    }
  `,
  side: BackSide,
  transparent: true,
  blending: AdditiveBlending,
  depthWrite: false,
})

/**
 * Ein Himmelskörper: Mesh + Label. Position, Bildschirm-Skalierung und
 * Label-Sichtbarkeit setzt der Loop-Owner (SimulationTicker) pro Frame —
 * diese Komponente registriert nur ihre Refs in der Szene-Registry.
 * Größen folgen echten Radius-Verhältnissen (sizing.ts); weit rausgezoomt
 * hält eine Planetarium-Untergrenze jeden Körper bei ≥ MIN_RADIUS_PX.
 * Welle 2: Textur mit Flat-Farb-Fallback, Achsneigung aus obliquity_deg,
 * datengetriebene Ringe (PlanetRings), Erd-Atmosphäre, Label-Klicks nur
 * wenn nicht verdeckt (onOcclude).
 */
export default function BodyNode({ body, lowQuality = false }: BodyNodeProps) {
  const groupRef = useRef<Group>(null)
  const scaleRef = useRef<Group>(null)
  const labelAnchorRef = useRef<Group>(null)
  const labelDivRef = useRef<HTMLDivElement>(null)
  const occludedRef = useRef(false)
  const dispatch = useAppDispatch()
  const { selectedBodyId, scaleMode } = useAppState()
  const selected = selectedBodyId === body.id
  const isSun = isStationary(body)
  const radius = baseRadiusUnits(body, scaleMode)
  const texture = useBodyTexture(bodyTextureFile(body.id))
  const obliquity = body.physical_data.obliquity_deg

  // Callback-Ref für die Label-Div: drei-<Html> portalt sie in einen eigenen
  // DOM-Zweig — wann sie ankommt, ist nicht garantiert. Die Registrierung darf
  // davon nicht abhängen (sonst: Körper nie in der Registry, alle Meshes im
  // Ursprung gestapelt). Kommt die Div später, patcht dieser Ref sie in den
  // Registry-Eintrag nach und stellt den Sichtbarkeitszustand wieder her.
  const setLabelDivRef = useCallback(
    (el: HTMLDivElement | null) => {
      labelDivRef.current = el
      const entry = getBodyEntry(body.id)
      if (entry) {
        entry.labelDiv = el
        if (el) el.style.display = entry.labelVisible ? '' : 'none'
      }
    },
    [body.id],
  )

  useEffect(() => {
    const group = groupRef.current
    const scaleGroup = scaleRef.current
    const labelAnchor = labelAnchorRef.current
    if (!group || !scaleGroup || !labelAnchor) return
    registerBody({
      id: body.id,
      elements: body.orbital_elements,
      category: body.category,
      radiusUnits: radius,
      minPx: minRadiusPx(body.physical_data.radius_km),
      group,
      scaleGroup,
      labelAnchor,
      labelDiv: labelDivRef.current,
      labelVisible: true,
      pre: null,
      parentId: body.parent_id ?? null,
    })
    return () => unregisterBody(body.id)
  }, [body, radius])

  return (
    <group ref={groupRef}>
      <group ref={scaleRef}>
        <group rotation={[0, 0, obliquity != null ? MathUtils.degToRad(-obliquity) : 0]}>
          <mesh
            onClick={(e) => {
              e.stopPropagation()
              dispatch({ type: 'body/select', id: body.id })
            }}
          >
            <sphereGeometry args={[radius, 32, 32]} />
            {isSun ? (
              <meshBasicMaterial
                key={texture ? 'textur' : 'flat'}
                color={texture ? '#ffffff' : body.color}
                map={texture ?? null}
                toneMapped={false}
              />
            ) : (
              <meshStandardMaterial
                key={texture ? 'textur' : 'flat'}
                color={texture ? '#ffffff' : body.color}
                map={texture ?? null}
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
          {body.id === 'earth' && (
            <mesh material={atmosphereMaterial}>
              <sphereGeometry args={[radius * 1.025, 32, 32]} />
            </mesh>
          )}
          <PlanetRings body={body} />
        </group>
      </group>
      <group ref={labelAnchorRef} position={[0, radius * 1.3, 0]}>
        <Html
          center
          zIndexRange={[5, 0]}
          occlude={lowQuality ? undefined : 'blending'}
          onOcclude={
            lowQuality
              ? undefined
              : (hidden) => {
                  // drei v9: boolean, v10: boolean | null — robust gegen beide
                  occludedRef.current = hidden === true
                }
          }
        >
          <div
            ref={setLabelDivRef}
            className={selected ? 'body-label selected' : 'body-label'}
            onClick={() => {
              if (!occludedRef.current) dispatch({ type: 'body/select', id: body.id })
            }}
          >
            {body.name_de}
          </div>
        </Html>
      </group>
    </group>
  )
}
