import { useEffect } from 'react'
import { useAppState } from '../state/AppContext'
import { getBodyEntry } from './registry'
import { baseRadiusUnits } from './sizing'
import { focusOnBody } from '../utils/cameraBus'

/**
 * Fliegt die Kamera gedämpft zum neu ausgewählten Körper (Welle 1).
 * Liest die Live-Position aus der Szene-Registry — der Körper bewegt sich
 * während des Flugs weiter, der Flug zielt auf die Position beim Klick.
 * Abwahl (null) löst bewusst keinen Flug aus.
 */
export default function CameraFocus() {
  const { bodies, selectedBodyId, scaleMode } = useAppState()
  useEffect(() => {
    if (!selectedBodyId) return
    const entry = getBodyEntry(selectedBodyId)
    const body = bodies.find((b) => b.id === selectedBodyId)
    if (!entry || !body) return
    const p = entry.group.position
    // Radius frisch aus den Body-Daten berechnen — NICHT entry.radiusUnits:
    // die Registry wird von BodyNode erst NACH diesem Effect neu registriert
    // (Sibling-Reihenfolge) und läge bei einem Moduswechsel einen Modus
    // hinterher (Abnahme-Befund 21.09.2026).
    focusOnBody(p.x, p.y, p.z, baseRadiusUnits(body, scaleMode), scaleMode)
  }, [selectedBodyId, scaleMode, bodies])
  return null
}
