import type { ApiErrorBody } from '../types'

/** API-Fehler mit HTTP-Status und Backend-Detail (error/message aus handle_errors). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const API_BASE = '/api'

export async function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * fetch-Wrapper mit Pflicht-response.ok-Check.
 * Mittel-Prio-Erbe: das alte Frontend prüfte response.ok nicht überall
 * und zeigte Fehler nur per console.error — jetzt landet jeder Fehler
 * als ApiError im sichtbaren Fehlerbanner.
 */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, init)
  } catch {
    throw new ApiError(0, 'Backend nicht erreichbar — läuft der Container?')
  }
  if (!response.ok) {
    let message = `HTTP ${response.status}`
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.error && body.message) message = `${body.error}: ${body.message}`
      else if (body.error) message = body.error
    } catch {
      // Kein JSON-Body — bei der HTTP-Status-Meldung bleiben
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as T
}
