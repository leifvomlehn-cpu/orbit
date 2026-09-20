/**
 * API-Verträge für das Orbital-Backend (Flask, Port 5556→5000).
 * Abgeleitet aus backend/app.py, backend/physics.py, backend/nbody.py —
 * bei Backend-Änderungen hier nachziehen.
 */

/** Bahnelemente (J2000), so geliefert aus orbital_data.py */
export interface OrbitalElements {
  semi_major_axis_au: number
  eccentricity: number
  inclination_deg: number
  longitude_ascending_node_deg: number
  argument_perihelion_deg: number
  mean_anomaly_deg: number
  orbital_period_days: number
  perihelion_au?: number
  aphelion_au?: number
  mean_motion_deg_day?: number
}

/** Physikalische Daten; Pflicht sind mass_kg/radius_km, Rest optional */
export interface PhysicalData {
  mass_kg: number
  radius_km: number
  surface_gravity_m_s2?: number
  escape_velocity_km_s?: number
  moons?: number
}

/** Heliozentrische Position (physics.py calculate_position), x/y/z/r in AU */
export interface BodyPosition {
  x: number
  y: number
  z: number
  r: number
  true_anomaly_deg: number
  eccentric_anomaly_deg: number
  mean_anomaly_deg: number
  /** fehlt im Sonderfall a==0 (Sonne) */
  argument_latitude_deg?: number
}

/** Bahnpfad als getrennte Koordinaten-Arrays (physics.py calculate_orbit_path) */
export interface OrbitPath {
  x: number[]
  y: number[]
  z: number[]
}

/** Einfacher 3D-Vektor (AU), z. B. heliozentrische Trajektorien-Punkte */
export interface Vec3 {
  x: number
  y: number
  z: number
}

export type BodyCategory = 'planet' | 'dwarf_planet' | 'tno' | 'planet9'

/** Ein Himmelskörper aus GET /api/bodies */
export interface CelestialBody {
  id: string
  name: string
  name_de: string
  category: BodyCategory
  color: string
  orbital_elements: OrbitalElements
  physical_data: PhysicalData
  description_de: string
  fun_fact_de?: string
  significance_de?: string
  discovery?: Record<string, unknown>
  /** nur Planet-9 */
  hypothetical?: boolean
  confidence_level?: string
  /** TNO-Untertyp (wird seit dem Sprint-B-API-Patch vom Backend mitgeliefert) */
  tno_type?: 'sednoid' | 'extreme_tno'
  /** nur wenn include_orbits=true */
  orbit_path?: OrbitPath
}

/** GET /api/bodies?category&include_orbits&include_planet9 */
export interface BodiesResponse {
  bodies: CelestialBody[]
  count: number
  categories: Record<string, string>
  timestamp: string
}

/** Ein Zeitschritt aus POST /api/simulate (Kepler-Pfad) */
export interface SimulationStep {
  step: number
  timestamp: string
  positions: Record<string, BodyPosition>
}

export interface KeplerSimulationResponse {
  simulation: {
    bodies: string[]
    start_time: string
    end_time: string
    steps: number
    time_step_days: number
    results: SimulationStep[]
  }
  metadata: {
    calculation_method: string
    include_perturbations: boolean
    note: string
  }
}

/** POST /api/simulate/nbody — baryzentrisch, RK4/Verlet */
export interface NbodyResult {
  body_ids: string[]
  /** ISO-Strings; jenseits von Jahr 9999 als "T+<tage>d" */
  timestamps: string[]
  days_since_start: number[]
  /** [sample][body][x,y,z] in AU */
  positions: number[][][]
  /** [sample][body][vx,vy,vz] in AU/Tag */
  velocities: number[][][]
  energy: number[]
  /** [sample][lx,ly,lz] */
  angular_momentum: number[][]
  metadata: {
    step_days: number
    n_steps: number
    n_samples: number
    n_bodies: number
    integrator: string
    frame: string
    duration_days: number
  }
}

export interface NbodyResponse {
  simulation: NbodyResult
  method: string
  units: { length: string; time: string; mass: string }
}

/** Planet-9-Vorhersage-Objekt (PLANET_9_PREDICTION, ohne id/category) */
export interface Planet9Prediction {
  name: string
  name_de: string
  color: string
  orbital_elements: OrbitalElements
  physical_data: PhysicalData
  description_de: string
  confidence_level?: string
}

/**
 * GET /api/planet9/search?confidence=...
 * search_zone/tno_clustering sind tief verschachtelt — wir tippen nur,
 * was das Frontend wirklich liest, den Rest strukturell offen.
 */
export interface Planet9SearchResponse {
  planet9_prediction: Planet9Prediction
  search_zone: Record<string, unknown>
  tno_clustering: Record<string, unknown>
  theory_summary_de: {
    title: string
    description: string
    evidence: string[]
    predicted_mass: string
    predicted_distance: string
    predicted_orbit: string
    search_status: string
  }
  latest_research_2025: Record<string, string>
}

/** Fehlerantwort des Backends (handle_errors / 400er) */
export interface ApiErrorBody {
  error: string
  message?: string
}
