import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils } from 'three'
import type { OrthographicCamera, PerspectiveCamera } from 'three'
import type { Vec3 } from '../types'
import { useAppState, useSimClock } from '../state/AppContext'
import { J2000_MS, MS_PER_DAY, precomputeOrbit, solveKeplerPosition } from '../simulation/kepler'
import { screenFloorScale } from './sizing'
import { orbitOpacity, shouldShowLabel } from './visibility'
import { eachBody, eachOrbit } from './registry'
import { debugSnapshot } from './debugSnapshot'

// Wiederverwendete Instanz — keine Allokationen im Frame-Loop (Welle 1).
const tmpPos: Vec3 = { x: 0, y: 0, z: 0 }

/**
 * Der eine Loop-Owner der Szene (Welle 1, ersetzt 31 Einzel-useFrame-Hooks):
 * treibt die SimClock, positioniert alle Körper aus vorberechneten
 * Kepler-Bahnen (kein `new Date`, keine Trigonometrie pro Körper/Frame),
 * setzt Planetarium-Skalierung + Label-Schwelle und fadet Orbit-Linien
 * zoomabhängig. Läuft mit Priorität -2, also vor den drei-Controls (-1).
 *
 * delta ist in Sekunden; gedeckelt auf 100 ms, damit ein Tab-Wechsel
 * (keine Frames, dann ein Riesen-delta) keinen Zeitsprung auslöst.
 */
export default function SimulationTicker() {
  const clock = useSimClock()
  const selectedBodyId = useAppState().selectedBodyId
  const selectedRef = useRef(selectedBodyId)
  useEffect(() => {
    selectedRef.current = selectedBodyId
  }, [selectedBodyId])

  useFrame(({ camera, size, gl }, delta) => {
    clock.tick(Math.min(delta, 0.1))
    const days = (clock.getSimMs() - J2000_MS) / MS_PER_DAY

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
    for (const entry of eachBody()) {
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

      // Perspektivisch hängt unitsPerPixel vom Körperabstand ab
      let upp = systemUpp
      if (!isOrtho) {
        const dx = persp.position.x - group.position.x
        const dy = persp.position.y - group.position.y
        const dz = persp.position.z - group.position.z
        upp = (2 * Math.hypot(dx, dy, dz) * tanHalfFov) / size.height
      }

      const scale = screenFloorScale(entry.radiusUnits, upp)
      entry.scaleGroup.scale.setScalar(scale)
      // Label knapp über die sichtbare Kugel legen
      entry.labelAnchor.position.y = entry.radiusUnits * scale * 1.3

      const screenPx = upp > 0 ? (entry.radiusUnits * scale) / upp : Number.POSITIVE_INFINITY
      const show = shouldShowLabel(entry.category, screenPx, selectedRef.current === entry.id)
      if (show) labelsVisible += 1
      if (show !== entry.labelVisible) {
        entry.labelVisible = show
        entry.labelDiv.style.display = show ? '' : 'none'
      }
    }

    for (const orbit of eachOrbit()) {
      orbitCount += 1
      orbit.material.opacity = orbitOpacity(orbit.category, systemUpp)
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
