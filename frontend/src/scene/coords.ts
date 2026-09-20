import type { Vec3 } from '../types'

/**
 * Backend-Ekliptik (x, y, z — z = Himmelsnordpol) → three.js-Szene (y = up).
 * (x, y, z) → (x, z, −y) ist eine Rotation um +90° um die x-Achse
 * (Determinante +1, die Händigkeit des Systems bleibt erhalten).
 */
export function toScene(v: Vec3): [number, number, number] {
  return [v.x, v.z, -v.y]
}
