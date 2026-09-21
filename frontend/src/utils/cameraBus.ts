import { MathUtils, Vector3 } from 'three'
import type { OrthographicCamera } from 'three'
import type { CameraControls } from '@react-three/drei'

/**
 * Brücke zwischen DOM-Seite (Buttons, Tastenkürzel, Fokus-Flüge) und den
 * CameraControls im Canvas — ohne React-State dazwischen.
 * CameraRig registriert seine Instanz; Aufrufer bekommen gedämpfte
 * Übergänge (enableTransition=true), keine Sprünge mehr (Welle 1).
 */
let controls: CameraControls | null = null

// Klick-Zeit-Allokationen sind ok — nicht im Frame-Loop.
const tmpTarget = new Vector3()

export function registerControls(instance: CameraControls | null): void {
  controls = instance
}

function isOrtho(cam: unknown): cam is OrthographicCamera {
  return (cam as OrthographicCamera).isOrthographicCamera === true
}

export function zoomIn(): void {
  if (!controls) return
  const cam = controls.camera
  if (isOrtho(cam)) {
    void controls.zoomTo(cam.zoom * 1.25, true).catch(() => undefined)
  } else {
    void controls.dollyTo(controls.distance / 1.25, true).catch(() => undefined)
  }
}

export function zoomOut(): void {
  if (!controls) return
  const cam = controls.camera
  if (isOrtho(cam)) {
    void controls.zoomTo(cam.zoom / 1.25, true).catch(() => undefined)
  } else {
    void controls.dollyTo(controls.distance * 1.25, true).catch(() => undefined)
  }
}

export function resetView(): void {
  if (!controls) return
  void controls.reset(true).catch(() => undefined)
}

/**
 * Kamera-Fokus-Flug zu einem Körper (Szenen-Koordinaten, sichtbarer Radius
 * in Units). 2D (ortho): Ziel anfliegen + Zoom auf Körpergröße, Kamera
 * bleibt senkrecht über der Ekliptik. 3D (perspektivisch): Blickrichtung
 * beibehalten, Distanz auf das 20-Fache des sichtbaren Radius.
 */
export function focusOnBody(x: number, y: number, z: number, radiusUnits: number): void {
  if (!controls) return
  const cam = controls.camera
  const dist = Math.max(radiusUnits * 20, 0.5)

  if (isOrtho(cam)) {
    const zoom = MathUtils.clamp((cam.top - cam.bottom) / (2 * dist), 0.4, 400)
    // minimaler z-Versatz: exakt senkrecht wäre degeneriert (up ∥ Blickachse)
    void controls
      .setLookAt(x, cam.position.y, z + 0.0001, x, 0, z, true)
      .then(() => controls?.zoomTo(zoom, true))
      .catch(() => undefined)
    return
  }

  tmpTarget.set(x, y, z)
  const dir = cam.position.clone().sub(tmpTarget)
  if (dir.lengthSq() < 1e-12) dir.set(0, 1, 0)
  dir.normalize().multiplyScalar(dist)
  void controls
    .setLookAt(x + dir.x, y + dir.y, z + dir.z, x, y, z, true)
    .catch(() => undefined)
}
