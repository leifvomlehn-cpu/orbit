import type { CelestialBody } from '../types'

/** Kilometer pro Astronomische Einheit (IAU-2012, exakt). */
export const KM_PER_AU = 149_597_870.7

/**
 * Bildschirm-Untergrenze: Radius in px für einen erdgroßen Körper. Fällt
 * die projizierte Größe darunter, wird das Mesh hochskaliert
 * (Planetarium-Verhalten wie Celestia/Stellarium) — sonst wären Körper in
 * der Gesamtansicht (Sedna-Aphel ~937 AU, 1 px ≈ 2.5 AU) Bruchteile eines
 * Pixels. Kleinere Körper bekommen eine kleinere Untergrenze
 * (minRadiusPx), damit die Größenordnungen sichtbar bleiben, statt dass
 * alle Körper am selben Floor kleben.
 */
export const MIN_RADIUS_PX = 2.5

/**
 * Absolute Sichtbarkeits-Untergrenze in px: kein Körper wird kleiner
 * gerendert — darunter wäre er nicht mehr als Punkt erkennbar.
 */
export const MIN_RADIUS_PX_FLOOR = 1.0

/** Referenzradius für die Untergrenzen-Staffelung (Erde). */
export const EARTH_RADIUS_KM = 6371

/**
 * Staffelungs-Exponent der Untergrenze: 0 = alle Körper gleiche Untergrenze
 * (altes Verhalten), 1 = echte Proportion. 0.4 hält Kleinkörper sichtbar
 * und lässt gleichzeitig die Ordnung Erde > Mars > Merkur > Pluto
 * erkennen (Mars ≈ 1.9 px, Merkur ≈ 1.7 px, Pluto ≈ 1.3 px).
 */
export const MIN_PX_EXPONENT = 0.4

/**
 * Körperabhängige Bildschirm-Untergrenze in px: MIN_RADIUS_PX für
 * erdgroße und größere Körper, gestaffelt nach unten für kleinere, nie
 * unter MIN_RADIUS_PX_FLOOR. Ungültige Radien fallen auf MIN_RADIUS_PX
 * zurück (altes, sicheres Verhalten).
 */
export function minRadiusPx(radiusKm: number): number {
  if (!(radiusKm > 0) || !Number.isFinite(radiusKm)) return MIN_RADIUS_PX
  const scaled = MIN_RADIUS_PX * Math.pow(radiusKm / EARTH_RADIUS_KM, MIN_PX_EXPONENT)
  return Math.min(MIN_RADIUS_PX, Math.max(MIN_RADIUS_PX_FLOOR, scaled))
}

/**
 * Übertreibung gegenüber physikalischen Radien (Erde real: 0.00004 AU —
 * unsichtbar). Alle Körper einer Kategorie teilen denselben Faktor, die
 * Verhältnisse bleiben also echt: Jupiter ≈ 11× Erde, Sonne ≈ 109× Erde.
 * Die Sonne hat einen eigenen, kleineren Faktor, damit sie in die
 * Merkurbahn (0.39 AU) passt.
 */
export const EXAGGERATION = {
  star: 60,
  planet: 1500,
  dwarf_planet: 1500,
  tno: 1500,
  planet9: 1500,
} as const

/**
 * Kategorie-Untergrenzen in Scene-Units (1 AU = 1 Unit). Zwergplaneten
 * und TNOs lägen sonst auch bei moderatem Zoom unter der Wahrnehmung —
 * sie bekommen einen Floor, bleiben aber kleiner als Planeten.
 */
export const CATEGORY_FLOOR = {
  planet: 0,
  dwarf_planet: 0.03,
  tno: 0.022,
  planet9: 0,
} as const

/** Sonne & stationäre Objekte haben a = 0 (orbital_data.py). */
export function isStationary(body: CelestialBody): boolean {
  return body.orbital_elements.semi_major_axis_au === 0
}

/**
 * Basis-Anzeigeradius in Scene-Units: physikalischer Radius (aus
 * physical_data.radius_km der API) × Übertreibung, nach unten durch die
 * Kategorie-Untergrenze begrenzt.
 */
export function baseRadiusUnits(body: CelestialBody): number {
  const realAu = body.physical_data.radius_km / KM_PER_AU
  if (isStationary(body)) return realAu * EXAGGERATION.star
  const ex = EXAGGERATION[body.category] ?? EXAGGERATION.tno
  const floor = CATEGORY_FLOOR[body.category] ?? CATEGORY_FLOOR.tno
  return Math.max(realAu * ex, floor)
}

/**
 * Skalierfaktor für die Bildschirm-Untergrenze: 1 = echte Proportion
 * (nah genug herangezoomt), > 1 = auf minPx hochskaliert. minPx kommt
 * körperabhängig aus minRadiusPx (Default: MIN_RADIUS_PX).
 * unitsPerPixel = sichtbare Scene-Units je Bildschirm-Pixel (ortho:
 * Frustum-Höhe / zoom / Höhe px; perspektivisch: 2·d·tan(fov/2) / Höhe px).
 */
export function screenFloorScale(
  radiusUnits: number,
  unitsPerPixel: number,
  minPx: number = MIN_RADIUS_PX,
): number {
  if (radiusUnits <= 0 || !(unitsPerPixel > 0) || !Number.isFinite(unitsPerPixel)) return 1
  if (!(minPx > 0) || !Number.isFinite(minPx)) return 1
  return Math.max(1, (minPx * unitsPerPixel) / radiusUnits)
}

/**
 * Ring-Radien (km, aus physical_data.rings) in Scene-Units — derselbe
 * Faktor wie der Körperradius, damit Ring und Planet proportional
 * zueinander bleiben. Nur für Körper ohne Kategorie-Floor sinnvoll
 * (Planeten): bei gefloorten Kleinkörpern läge ein echter Ring sonst
 * UNTER der sichtbaren Oberfläche.
 */
export function ringRadiusUnits(body: CelestialBody, km: number): number {
  const ex = EXAGGERATION[body.category] ?? EXAGGERATION.tno
  return (km / KM_PER_AU) * ex
}
