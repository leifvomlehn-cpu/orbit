import { apiGet, apiPost } from './client'
import type { BodiesResponse, NbodyResponse, Planet9SearchResponse } from '../types'

export interface FetchBodiesOptions {
  includeOrbits?: boolean
  includePlanet9?: boolean
}

/** GET /api/bodies — immer category=all, Filter läuft clientseitig im Reducer. */
export function fetchBodies(options: FetchBodiesOptions = {}): Promise<BodiesResponse> {
  const params = new URLSearchParams({ category: 'all' })
  if (options.includeOrbits) params.set('include_orbits', 'true')
  if (options.includePlanet9) params.set('include_planet9', 'true')
  return apiGet<BodiesResponse>(`/bodies?${params.toString()}`)
}

export interface NbodyRequest {
  bodies: string[]
  /** ISO 8601 mit Z (parse_iso_utc im Backend konvertiert korrekt) */
  start_time: string
  /** duration_days statt end_time — umgeht das datetime-Limit Jahr 9999 */
  duration_days: number
  step_days: number
  sample_every: number
  include_planet9?: boolean
}

/** POST /api/simulate/nbody — RK4/Verlet, baryzentrisch. Läuft bis zu 10 min (nginx-Timeout). */
export function runNbodySimulation(req: NbodyRequest): Promise<NbodyResponse> {
  return apiPost<NbodyResponse>('/simulate/nbody', req)
}

export type Planet9Confidence = 'conservative' | 'moderate' | 'optimistic'

/** GET /api/planet9/search */
export function fetchPlanet9Search(
  confidence: Planet9Confidence = 'moderate',
): Promise<Planet9SearchResponse> {
  return apiGet<Planet9SearchResponse>(`/planet9/search?confidence=${confidence}`)
}
