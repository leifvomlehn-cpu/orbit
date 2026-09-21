import { describe, expect, it } from 'vitest'
import { bodyTextureFile, SATURN_RING_TEXTURE_FILE, textureUrl } from './textures'

describe('Textur-Mapping (Welle 2)', () => {
  it('bildet Sonne und alle 8 Planeten ab', () => {
    for (const id of ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
      expect(bodyTextureFile(id)).toMatch(/^2k_.+\.(jpg|png)$/)
    }
  })

  it('lässt Pluto, TNOs und Planet 9 flat (keine freie Textur)', () => {
    expect(bodyTextureFile('pluto')).toBeNull()
    expect(bodyTextureFile('sedna')).toBeNull()
    expect(bodyTextureFile('2012_vp113')).toBeNull()
    expect(bodyTextureFile('planet9')).toBeNull()
  })

  it('baut URLs unter /textures/', () => {
    expect(textureUrl('2k_earth_daymap.jpg')).toBe('/textures/2k_earth_daymap.jpg')
  })

  it('nutzt die verifizierte Saturn-Ring-Alpha-Textur', () => {
    expect(SATURN_RING_TEXTURE_FILE).toBe('2k_saturn_ring_alpha.png')
  })
})
