import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

/**
 * Brücke zwischen den DOM-Zoom-Buttons (TimeControls) und den
 * OrbitControls im Canvas — ohne React-State dazwischen.
 * CameraRig registriert seine Instanz, Buttons rufen zoomIn/Out/reset.
 */
let controls: OrbitControlsImpl | null = null

export function registerControls(instance: OrbitControlsImpl | null): void {
  controls = instance
}

export function zoomIn(): void {
  if (!controls) return
  controls.dollyIn(1.25)
  controls.update()
}

export function zoomOut(): void {
  if (!controls) return
  controls.dollyOut(1.25)
  controls.update()
}

export function resetView(): void {
  if (!controls) return
  controls.reset()
}
