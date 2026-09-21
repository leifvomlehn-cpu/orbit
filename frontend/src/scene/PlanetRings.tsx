import { useEffect, useMemo } from 'react'
import { DoubleSide, RingGeometry } from 'three'
import type { CelestialBody, RingData } from '../types'
import { ringRadiusUnits } from './sizing'
import { SATURN_RING_TEXTURE_FILE, useBodyTexture } from './textures'

/** Unter dieser optischen Tiefe ist ein Ring praktisch unsichtbar und wird
 *  nicht gerendert (Jupiters Gossamer-Ringe τ ~ 1e-7, Saturn D/G/E). */
const MIN_OPTICAL_DEPTH = 1e-4
/** Planetarium-Mindestbreite: schmale Ringe (Uranus, ~10 km) wären sonst
 *  auch im Anflug sub-pixel. */
const MIN_WIDTH_FRACTION = 0.004

/** Deckkraft aus optischer Tiefe: physikalisch 1 − e^−τ, nach unten
 *  planetariums-lesbar begrenzt. */
function ringOpacity(opticalDepth: number | null): number {
  if (opticalDepth == null) return 0.15
  return Math.min(0.85, Math.max(0.05, 1 - Math.exp(-opticalDepth)))
}

/** RingGeometry-UVs radial mappen (u = 0 innen … 1 außen), damit die
 *  Saturn-Alpha-Textur ihre Ringstruktur in der richtigen Richtung zeigt. */
function remapRadialUVs(geometry: RingGeometry, inner: number, outer: number): void {
  const pos = geometry.attributes.position
  const uv = geometry.attributes.uv
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i))
    uv.setXY(i, (r - inner) / (outer - inner), 0.5)
  }
  uv.needsUpdate = true
}

/** Saturn: eine texturierte Scheibe über die Hauptringe C → A (Radien aus
 *  den Backend-Daten); D/G/E sind praktisch unsichtbar und fehlen bewusst. */
function SaturnRings({ body, rings }: { body: CelestialBody; rings: RingData[] }) {
  const texture = useBodyTexture(SATURN_RING_TEXTURE_FILE)
  const main = rings.filter((r) => r.name === 'C' || r.name === 'B' || r.name === 'A')
  const innerKm = Math.min(...main.map((r) => r.inner_radius_km))
  const outerKm = Math.max(...main.map((r) => r.outer_radius_km))
  const inner = ringRadiusUnits(body, innerKm)
  const outer = ringRadiusUnits(body, outerKm)
  const geometry = useMemo(() => {
    const geo = new RingGeometry(inner, outer, 128, 1)
    remapRadialUVs(geo, inner, outer)
    return geo
  }, [inner, outer])
  useEffect(() => () => geometry.dispose(), [geometry])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={geometry}>
      <meshBasicMaterial
        key={texture ? 'textur' : 'flat'}
        color={texture ? '#ffffff' : '#d8c9a3'}
        map={texture ?? null}
        transparent
        opacity={0.9}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

/**
 * Datengetriebene Ringe aus physical_data.rings (NSSDCA, Welle 2).
 * Die Neigung kommt über den Achsen-Tilt in BodyNode (obliquity_deg).
 */
export default function PlanetRings({ body }: { body: CelestialBody }) {
  const rings = body.physical_data.rings
  if (!rings || rings.length === 0) return null
  if (body.id === 'saturn') return <SaturnRings body={body} rings={rings} />
  const visible = rings.filter(
    (r) => r.optical_depth == null || r.optical_depth >= MIN_OPTICAL_DEPTH,
  )
  return (
    <>
      {visible.map((ring) => {
        const inner = ringRadiusUnits(body, ring.inner_radius_km)
        const width = Math.max(
          ringRadiusUnits(body, ring.outer_radius_km) - inner,
          inner * MIN_WIDTH_FRACTION,
        )
        return (
          <mesh key={ring.name} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[inner, inner + width, 64]} />
            <meshBasicMaterial
              color="#c8c4bc"
              transparent
              opacity={ringOpacity(ring.optical_depth)}
              side={DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )
      })}
    </>
  )
}
