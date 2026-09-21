import { useCallback } from 'react'
import { CameraControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import { CameraControlsImpl } from '@react-three/drei'
import type { CameraControls as CameraControlsType } from '@react-three/drei'
import type { ViewMode } from '../state/reducer'
import { useAppState } from '../state/AppContext'
import { registerControls } from '../utils/cameraBus'

/**
 * 2D = orthografische Draufsicht von Norden (nur Pan + Zoom, keine Rotation —
 * Rotation über Polar-/Azimut-Lock, Pan auf der linken Taste via TRUCK),
 * 3D = perspektivische Ansicht, frei drehbar (Touch-fähig).
 * CameraControls (yomotsu) statt OrbitControls seit Welle 1: eingebautes
 * Damping + programmatische setLookAt-Transitions für die Fokus-Flüge.
 * Einstellungen laufen imperativ über den Ref — die drei-Props-Typen
 * listen nur makeDefault/regress/events, die Instanz-Properties sind API.
 * up=[0,0,-1] in 2D: Bild-oben zeigt +y der Ekliptik — die übliche
 * Draufsicht, in der die Bahnen gegen den Uhrzeigersinn laufen.
 */
export default function CameraRig({ mode }: { mode: ViewMode }) {
  const scaleMode = useAppState().scaleMode
  const setup = useCallback(
    (controls: CameraControlsType | null) => {
      registerControls(controls)
      if (!controls) return
      controls.smoothTime = 0.35
      controls.draggingSmoothTime = 0.12
      if (mode === '2d') {
        controls.minPolarAngle = 0
        controls.maxPolarAngle = 0
        controls.minAzimuthAngle = 0
        controls.maxAzimuthAngle = 0
        controls.minZoom = 0.4
        // Echtmaßstab: Erde ist 4,3e-5 Units — Zoom-Grenze weit höher
        controls.maxZoom = scaleMode === 'real' ? 1e8 : 400
        controls.mouseButtons.left = CameraControlsImpl.ACTION.TRUCK
        controls.mouseButtons.middle = CameraControlsImpl.ACTION.ZOOM
        controls.mouseButtons.right = CameraControlsImpl.ACTION.TRUCK
        controls.mouseButtons.wheel = CameraControlsImpl.ACTION.ZOOM
        controls.touches.one = CameraControlsImpl.ACTION.TOUCH_TRUCK
        controls.touches.two = CameraControlsImpl.ACTION.TOUCH_ZOOM
        controls.touches.three = CameraControlsImpl.ACTION.TOUCH_TRUCK
      } else {
        // Echtmaßstab: Fokus-Distanzen bis ~1e-6 (Erde), Übersicht bis Sedna
        controls.minDistance = scaleMode === 'real' ? 1e-7 : 0.5
        controls.maxDistance = scaleMode === 'real' ? 3000 : 1500
      }
    },
    [mode, scaleMode],
  )

  if (mode === '2d') {
    return (
      <>
        <OrthographicCamera
          makeDefault
          position={[0, 100, 0]}
          up={[0, 0, -1]}
          zoom={8}
          near={0.1}
          far={2000}
        />
        <CameraControls makeDefault ref={setup} />
      </>
    )
  }
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 35, 65]} fov={55} near={0.05} far={4000} />
      <CameraControls makeDefault ref={setup} />
    </>
  )
}
