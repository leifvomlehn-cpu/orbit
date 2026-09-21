/**
 * Sichtbarkeitsregeln der Szene (Welle 1) — pure Funktionen, vitest-getestet.
 *
 * Label-Schwelle: ein Körper bekommt erst dann ein Namens-Label, wenn sein
 * sichtbarer Radius groß genug ist (Planetarium-Prinzip, vgl. MIN_RADIUS_PX
 * in sizing.ts). Der aktuell ausgewählte Körper behält sein Label immer.
 *
 * Orbit-Fade: Bahnlinien kleiner Kategorien blenden beim Rauszoomen weich
 * aus, damit die Gesamtansicht (Sedna ~937 AU) lesbar bleibt. Planeten-
 * und Planet-9-Bahnen bleiben immer voll sichtbar.
 */

/** Mindestgröße des sichtbaren Radius in px, ab der ein Label erscheint. */
export const LABEL_MIN_PX: Record<string, number> = {
  planet: 3,
  dwarf_planet: 6,
  tno: 10,
  planet9: 3,
  moon: 4,
}
const LABEL_MIN_PX_DEFAULT = 8

export function shouldShowLabel(
  category: string,
  screenPx: number,
  selected: boolean,
): boolean {
  if (selected) return true
  if (!Number.isFinite(screenPx)) return true
  const min = LABEL_MIN_PX[category] ?? LABEL_MIN_PX_DEFAULT
  return screenPx >= min
}

/**
 * unitsPerPixel-Schwellen für den Fade je Kategorie: bis FULL volle
 * Opazität, ab MIN die Restopazität (ORBIT_MIN_OPACITY_FACTOR), dazwischen
 * Smoothstep. Kategorien ohne Eintrag (planet, planet9) faden nie.
 * Die Mondbahn fadet wie TNO-Bahnen: in der Gesamtansicht ist sie ohnehin
 * kleiner als ein Pixel und würde nur als Fleck an der Erde kleben.
 */
export const ORBIT_FADE_FULL: Record<string, number> = {
  dwarf_planet: 0.3,
  tno: 0.08,
  moon: 0.08,
}
export const ORBIT_FADE_MIN: Record<string, number> = {
  dwarf_planet: 1.5,
  tno: 0.4,
  moon: 0.4,
}
export const ORBIT_MIN_OPACITY_FACTOR = 0.12

export function orbitOpacity(
  category: string,
  unitsPerPixel: number,
  baseOpacity = 0.45,
): number {
  const full = ORBIT_FADE_FULL[category]
  if (full === undefined) return baseOpacity
  // fängt NaN, 0 und Negative ab; Infinity fällt bewusst auf die Restopazität
  if (!(unitsPerPixel > 0)) return baseOpacity
  const min = ORBIT_FADE_MIN[category] ?? full
  if (unitsPerPixel <= full) return baseOpacity
  if (unitsPerPixel >= min) return baseOpacity * ORBIT_MIN_OPACITY_FACTOR
  const t = (unitsPerPixel - full) / (min - full)
  const s = t * t * (3 - 2 * t)
  return baseOpacity * (1 - s * (1 - ORBIT_MIN_OPACITY_FACTOR))
}
