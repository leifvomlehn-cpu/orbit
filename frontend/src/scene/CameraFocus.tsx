import { useEffect } from 'react'
import { useAppState } from '../state/AppContext'
import { getBodyEntry } from './registry'
import { focusOnBody } from '../utils/cameraBus'

/**
 * Fliegt die Kamera gedämpft zum neu ausgewählten Körper (Welle 1).
 * Liest die Live-Position aus der Szene-Registry — der Körper bewegt sich
 * während des Flugs weiter, der Flug zielt auf die Position beim Klick.
 * Abwahl (null) löst bewusst keinen Flug aus.
 */
export default function CameraFocus() {
  const selectedBodyId = useAppState().selectedBodyId
  useEffect(() => {
    if (!selectedBodyId) return
    const entry = getBodyEntry(selectedBodyId)
    if (!entry) return
    const p = entry.group.position
    focusOnBody(p.x, p.y, p.z, entry.radiusUnits)
  }, [selectedBodyId])
  return null
}
