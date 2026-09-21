import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { OrthographicCamera, PerspectiveCamera } from 'three'
import type { Vec3 } from '../types'
import { useAppState, useSimClock } from '../state/AppContext'
import { J2000_MS, MS_PER_DAY, precomputeOrbit, solveKeplerPosition } from '../simulation/kepler'
import { moonOrbitScale, screenFloorScale } from './sizing'
import { orbitOpacity, shouldShowLabel } from './visibility'
import { eachBody, eachOrbit, getBodyEntry } from './registry'
import { debugSnapshot } from './debugSnapshot'
import { getControlsDistance } from '../utils/cameraBus'

// Wiederverwendete Instanz — keine Allokationen im Frame-Loop (Welle 1).
const tmpPos: Vec3 = { x: 0, y: 0, z: 0 }

/**
 * Der eine Loop-Owner der Szene (Welle 1, ersetzt 31 Einzel-useFrame-Hooks):
 * treibt die SimClock, positioniert alle Körper aus vorberechneten
 * Kepler-Bahnen (kein `new Date`, keine Trigonometrie pro Körper/Frame),
 * setzt Planetarium-Skalierung + Label-Schwelle und fadet Orbit-Linien
 * zoomabhängig. Läuft mit Priorität -2, also vor den drei-Controls (-1).
 *
 * Drei Phasen pro Frame:
 * 1. Heliozentrische (und stationäre) Körper positionieren.
 * 2. Körper mit Parent (Mond): geozentrischer Kepler-Orbit ×
 *    MOON_ORBIT_EXAGGERATION, aufgesetzt auf die Parent-Position DIESES
 *    Frames (deshalb getrennte Schleife — die Reihenfolge der Registry
 *    ist nicht garantiert).
 * 3. Skalierung + Label-Schwelle für alle Körper (Positionen stehen dann).
 *
 * delta ist in Sekunden; gedeckelt auf 100 ms, damit ein Tab-Wechsel
 * (keine Frames, dann ein Riesen-delta) keinen Zeitsprung auslöst.
 */
export default function SimulationTicker() {
  const clock = useSimClock()
  const { selectedBodyId, scaleMode } = useAppState()
  const selectedRef = useRef(selectedBodyId)
  useEffect(() => {
    selectedRef.current = selectedBodyId
  }, [selectedBodyId])
  // Modus per Ref in den Frame-Loop spiegeln (die useFrame-Closure liest
  // nie React-State direkt — sonst bliebe der Toggle ohne Wirkung)
  const scaleModeRef = useRef(scaleMode)
  useEffect(() => {
    scaleModeRef.current = scaleMode
  }, [scaleMode])

  useFrame(({ camera, size, gl }, delta) => {
    clock.tick(Math.min(delta, 0.1))
    const days = (clock.getSimMs() - J2000_MS) / MS_PER_DAY
    const real = scaleModeRef.current === 'real'
    const moonScale = moonOrbitScale(scaleModeRef.current)

    const ortho = camera as OrthographicCamera
    const persp = camera as PerspectiveCamera
    const isOrtho = ortho.isOrthographicCamera === true
    const tanHalfFov = isOrtho ? 0 : Math.tan(MathUtils.degToRad(persp.fov) / 2)

    // Systemweite unitsPerPixel für den Orbit-Fade (perspektivisch:
    // Distanz zum Ursprung als Maß für "wie weit rausgezoomt").
    let systemUpp: number
    if (isOrtho) {
      systemUpp = (ortho.top - ortho.bottom) / ortho.zoom / size.height
    } else {
      const d = Math.hypot(persp.position.x, persp.position.y, persp.position.z)
      systemUpp = (2 * d * tanHalfFov) / size.height
    }

    let bodyCount = 0
    let orbitCount = 0
    let labelsVisible = 0

    // Phase 1: heliozentrische Körper
    for (const entry of eachBody()) {
      if (entry.parentId) continue
      bodyCount += 1
      const group = entry.group
      if (entry.elements.semi_major_axis_au === 0) {
        group.position.set(0, 0, 0)
      } else {
        if (!entry.pre) entry.pre = precomputeOrbit(entry.elements)
        if (!entry.pre) continue
        solveKeplerPosition(entry.pre, days, tmpPos)
        // Ekliptik → Szene: (x, y, z) → (x, z, −y), wie toScene in coords.ts
        group.position.set(tmpPos.x, tmpPos.z, -tmpPos.y)
      }

      // Diagnose: ersten Körper des Frames festhalten (Position NACH dem Setzen)
      if (bodyCount === 1) {
        debugSnapshot.firstId = entry.id
        debugSnapshot.firstX = group.position.x
        debugSnapshot.firstY = group.position.y
        debugSnapshot.firstZ = group.position.z
        debugSnapshot.firstFinite =
          Number.isFinite(group.position.x) &&
          Number.isFinite(group.position.y) &&
          Number.isFinite(group.position.z)
      }
    }

    // Phase 2: Körper mit Parent (Mond) — Parent-Position steht jetzt fest
    for (const entry of eachBody()) {
      if (!entry.parentId) continue
      const parent = getBodyEntry(entry.parentId)
      if (!parent) continue
      bodyCount += 1
      if (!entry.pre) entry.pre = precomputeOrbit(entry.elements)
      if (!entry.pre) continue
      solveKeplerPosition(entry.pre, days, tmpPos)
      // Ekliptik → Szene wie Phase 1, dann × Übertreibung + Parent-Offset
      entry.group.position.set(
        parent.group.position.x + tmpPos.x * moonScale,
        parent.group.position.y + tmpPos.z * moonScale,
        parent.group.position.z - tmpPos.y * moonScale,
      )
    }

    // Phase 3: Planetarium-Skalierung + Label-Schwelle (alle Körper)
    for (const entry of eachBody()) {
      const group = entry.group
      // Perspektivisch hängt unitsPerPixel vom Körperabstand ab
      let upp = systemUpp
      if (!isOrtho) {
        const dx = persp.position.x - group.position.x
        const dy = persp.position.y - group.position.y
        const dz = persp.position.z - group.position.z
        upp = (2 * Math.hypot(dx, dy, dz) * tanHalfFov) / size.height
      }

      // Echtmaßstab: keine px-Hochskalierung — Körper bleiben echt (und
      // sind in der Systemansicht bewusst unsichtbar klein).
      const scale = real ? 1 : screenFloorScale(entry.radiusUnits, upp, entry.minPx)
      entry.scaleGroup.scale.setScalar(scale)
      // Label knapp über die sichtbare Kugel legen
      entry.labelAnchor.position.y = entry.radiusUnits * scale * 1.3

      const screenPx = upp > 0 ? (entry.radiusUnits * scale) / upp : Number.POSITIVE_INFINITY
      // Echtmaßstab: Labels sind die einzige Sichtbarkeit der Körper in der
      // Systemansicht — immer zeigen.
      const show = real
        ? true
        : shouldShowLabel(entry.category, screenPx, selectedRef.current === entry.id)
      if (show) labelsVisible += 1
      if (show !== entry.labelVisible) {
        entry.labelVisible = show
        // labelDiv kann per Callback-Ref noch nicht angekommen sein (Html-Portal)
        if (entry.labelDiv) entry.labelDiv.style.display = show ? '' : 'none'
      }
    }

    // Echtmaßstab (persp.): near/far an die Fokus-Distanz koppeln — feste
    // Werte (0.05/4000) würden bei Körper-Distanzen ~1e-4 Units clippen,
    // und die volle Dynamik 1e-9…4000 ließe den 24-bit-Depth-Buffer
    // kollabieren (z-fighting).
    // Bekannte Grenze des Real-Modus: float32 quantisiert Vertex-Positionen
    // bei ~500 AU auf ~6e-5 AU — ferne Kleinkörper (TNO-Radius ~8e-6 AU)
    // degenerieren beim Anflug. Langfristiger Fix: kamerarelative Koordinaten.
    if (!isOrtho) {
      if (real) {
        const dist = getControlsDistance()
        if (dist !== null && dist > 0) {
          const near = Math.max(dist * 1e-3, 1e-9)
          const far = dist + 3000
          if (persp.near !== near || persp.far !== far) {
            persp.near = near
            persp.far = far
            persp.updateProjectionMatrix()
          }
        }
      } else if (persp.near !== 0.05 || persp.far !== 4000) {
        // Rückkehr ins Planetarium: feste Werte wiederherstellen — sonst
        // bliebe das winzige near des Real-Modus stehen (z-fighting).
        persp.near = 0.05
        persp.far = 4000
        persp.updateProjectionMatrix()
      }
    }

    for (const orbit of eachOrbit()) {
      orbitCount += 1
      orbit.material.opacity = orbitOpacity(orbit.category, systemUpp)
      // Parent-Bahn (Mond): die Ellipse ist relativ zum Parent gezeichnet —
      // ihre Wrapper-Gruppe folgt hier der Parent-Position.
      if (orbit.parentId && orbit.group) {
        const parent = getBodyEntry(orbit.parentId)
        if (parent) orbit.group.position.copy(parent.group.position)
      }
    }

    // Diagnose-Snapshot (Rendering-Bug): flache Zahlen für das DebugOverlay
    // (?debug=1) — keine Allokationen, kein React-State.
    debugSnapshot.frame += 1
    debugSnapshot.bodies = bodyCount
    debugSnapshot.orbits = orbitCount
    debugSnapshot.labelsVisible = labelsVisible
    debugSnapshot.systemUpp = systemUpp
    debugSnapshot.camType = isOrtho ? 'ortho' : 'persp'
    debugSnapshot.camZoom = isOrtho
      ? ortho.zoom
      : Math.hypot(persp.position.x, persp.position.y, persp.position.z)
    debugSnapshot.drawCalls = gl.info.render.calls
    debugSnapshot.triangles = gl.info.render.triangles
    debugSnapshot.canvasW = gl.domElement.clientWidth
    debugSnapshot.canvasH = gl.domElement.clientHeight
  }, -2)

  return null
}
