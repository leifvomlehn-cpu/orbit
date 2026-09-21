/**
 * Diagnose-Snapshot (Rendering-Bug): der Loop-Owner (SimulationTicker)
 * schreibt pro Frame flache Zahlen hier rein, das DebugOverlay (?debug=1)
 * liest sie gedrosselt — kein React-State, kein Konsolen-Zugriff nötig.
 * Bewusst ein schlichtes Modul-Singleton: Schreiben darf nie rendern.
 */
export interface DebugSnapshot {
  /** Tick-Zähler — bleibt er stehen, läuft der Render-Loop nicht */
  frame: number
  /** registrierte Körper / Bahnen in der Szene-Registry */
  bodies: number
  orbits: number
  /** Labels, die der Ticker in diesem Frame als sichtbar bewertet */
  labelsVisible: number
  /** erster Körper des Frames: ID + Position NACH dem Setzen */
  firstId: string
  firstX: number
  firstY: number
  firstZ: number
  firstFinite: boolean
  /** sichtbare Scene-Units je Bildschirm-Pixel (systemweit) */
  systemUpp: number
  camType: string
  /** ortho: zoom; perspektivisch: Distanz zum Ursprung */
  camZoom: number
  drawCalls: number
  triangles: number
  /** CSS-Größe des Canvas — 0 × n wäre ein Layout-Problem */
  canvasW: number
  canvasH: number
}

export const debugSnapshot: DebugSnapshot = {
  frame: 0,
  bodies: 0,
  orbits: 0,
  labelsVisible: 0,
  firstId: '-',
  firstX: 0,
  firstY: 0,
  firstZ: 0,
  firstFinite: false,
  systemUpp: 0,
  camType: '?',
  camZoom: 0,
  drawCalls: 0,
  triangles: 0,
  canvasW: 0,
  canvasH: 0,
}

/** Letzte ungefangene Fehler (window.onerror + unhandledrejection), max. 6. */
export const debugErrors: string[] = []

let hooksInstalled = false

/** Einmalig Fehler-Hooks installieren (DebugOverlay bei ?debug=1). */
export function installDebugErrorHooks(): void {
  if (hooksInstalled) return
  hooksInstalled = true
  window.addEventListener('error', (e) => {
    pushDebugError(`${e.message} @ ${e.filename}:${e.lineno}`)
  })
  window.addEventListener('unhandledrejection', (e) => {
    pushDebugError(`rejection: ${String(e.reason)}`)
  })
}

function pushDebugError(msg: string): void {
  if (debugErrors.length >= 6) debugErrors.shift()
  debugErrors.push(msg)
}
