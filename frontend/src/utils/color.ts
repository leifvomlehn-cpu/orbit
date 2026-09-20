/** Hex-Farbe Richtung Weiß aufhellen (Portierung aus app.js:2086-2093). */
export function lightenColor(hex: string, factor: number): string {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex || '#ffffff'
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * factor)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
