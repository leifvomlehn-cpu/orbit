import { useEffect, useState } from 'react'
import { debugErrors, debugSnapshot, installDebugErrorHooks } from '../scene/debugSnapshot'

/**
 * Diagnose-Overlay (Rendering-Bug): sichtbar nur mit ?debug=1 in der URL.
 * Zeigt den Loop-Snapshot des SimulationTickers und ungefangene Fehler als
 * DOM-Text — Diagnose ohne Browser-Konsole (Paste-Schutz, iPad).
 * pointerEvents: none, damit es die Szene nicht blockiert.
 */
export default function DebugOverlay() {
  const [enabled] = useState(
    () => new URLSearchParams(window.location.search).has('debug'),
  )
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) return
    installDebugErrorHooks()
    const id = window.setInterval(() => setTick((n) => n + 1), 500)
    return () => window.clearInterval(id)
  }, [enabled])

  if (!enabled) return null

  const s = debugSnapshot
  const num = (v: number): string => (Number.isFinite(v) ? v.toFixed(3) : String(v))
  const lines: string[] = [
    `frames:          ${s.frame}`,
    `bodies/orbits:   ${s.bodies} / ${s.orbits}`,
    `labels sichtbar: ${s.labelsVisible}`,
    `1. koerper:      ${s.firstId}`,
    `  position:      ${num(s.firstX)}, ${num(s.firstY)}, ${num(s.firstZ)}${s.firstFinite ? '' : '  <- NaN!'}`,
    `systemUpp:       ${num(s.systemUpp)}`,
    `kamera:          ${s.camType}, zoom/dist ${num(s.camZoom)}`,
    `draw calls:      ${s.drawCalls}`,
    `dreiecke:        ${s.triangles}`,
    `canvas css:      ${s.canvasW} x ${s.canvasH}`,
  ]

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#7fff7f',
        fontFamily: 'monospace',
        fontSize: 11,
        lineHeight: 1.5,
        padding: '8px 10px',
        borderRadius: 6,
        pointerEvents: 'none',
        whiteSpace: 'pre',
        maxWidth: '46vw',
      }}
    >
      {lines.join('\n')}
      {debugErrors.length > 0 && (
        <div style={{ color: '#ff7777', marginTop: 6, whiteSpace: 'pre-wrap' }}>
          {`FEHLER:\n${debugErrors.join('\n')}`}
        </div>
      )}
    </div>
  )
}
