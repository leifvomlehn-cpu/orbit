import { OrbitControls, OrthographicCamera, PerspectiveCamera } from '@react-three/drei'
import type { ViewMode } from '../state/reducer'
import { registerControls } from '../utils/cameraBus'

/**
 * 2D = orthografische Draufsicht von Norden (nur Pan + Zoom, keine Rotation),
 * 3D = perspektivische Ansicht, frei drehbar mit OrbitControls (Touch-fähig).
 * up=[0,0,-1] in 2D: Bild-oben zeigt +y der Ekliptik — die übliche
 * Draufsicht, in der die Bahnen gegen den Uhrzeigersinn laufen.
 */
export default function CameraRig({ mode }: { mode: ViewMode }) {
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
        <OrbitControls
          makeDefault
          ref={registerControls}
          enableRotate={false}
          enablePan
          enableZoom
          minZoom={0.4}
          maxZoom={400}
        />
      </>
    )
  }
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 35, 65]} fov={55} near={0.05} far={4000} />
      <OrbitControls
        makeDefault
        ref={registerControls}
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={800}
      />
    </>
  )
}
