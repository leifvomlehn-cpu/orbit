import { useEffect, useState } from 'react'
import { SRGBColorSpace, TextureLoader } from 'three'
import type { Texture } from 'three'

/**
 * Textur-Mapping (Welle 2). Quelle: Solar System Scope, CC BY 4.0 —
 * Attribution in public/textures/TEXTURES.md und im Hilfe-Dialog.
 * Dateien liegen unter public/textures/ (Download: scripts/fetch_textures.sh).
 * Körper ohne Eintrag bleiben flat-farbig (Pluto, TNOs, Planet 9:
 * keine freie Textur verfügbar). *_fictional = künstlerische Darstellung.
 */
const TEXTURE_FILES: Partial<Record<string, string>> = {
  sun: '2k_sun.jpg',
  mercury: '2k_mercury.jpg',
  venus: '2k_venus_surface.jpg',
  earth: '2k_earth_daymap.jpg',
  moon: '2k_moon.jpg',
  mars: '2k_mars.jpg',
  jupiter: '2k_jupiter.jpg',
  saturn: '2k_saturn.jpg',
  uranus: '2k_uranus.jpg',
  neptune: '2k_neptune.jpg',
  ceres: '2k_ceres_fictional.jpg',
  haumea: '2k_haumea_fictional.jpg',
  makemake: '2k_makemake_fictional.jpg',
  eris: '2k_eris_fictional.jpg',
}

export const SATURN_RING_TEXTURE_FILE = '2k_saturn_ring_alpha.png'

export function bodyTextureFile(bodyId: string): string | null {
  return TEXTURE_FILES[bodyId] ?? null
}

export function textureUrl(file: string): string {
  return `${import.meta.env.BASE_URL}textures/${file}`
}

const sharedLoader = new TextureLoader()

/**
 * Lädt eine Textur ohne Suspense: solange sie lädt (oder fehlt), liefert
 * der Hook null und der Körper behält seine Flat-Farbe. Bewusst kein
 * Dispose — max. 14 Dateien, über die App-Lebensdauer genutzt.
 */
export function useBodyTexture(file: string | null): Texture | null {
  const [texture, setTexture] = useState<Texture | null>(null)
  useEffect(() => {
    if (!file) {
      setTexture(null)
      return
    }
    let alive = true
    const tex = sharedLoader.load(
      textureUrl(file),
      (loaded) => {
        if (alive) setTexture(loaded)
      },
      undefined,
      () => {
        if (alive) setTexture(null)
      },
    )
    tex.colorSpace = SRGBColorSpace
    return () => {
      alive = false
    }
  }, [file])
  return texture
}
