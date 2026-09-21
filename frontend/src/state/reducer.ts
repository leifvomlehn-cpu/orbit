import type { CelestialBody, Vec3 } from '../types'

export type CategoryFilter = 'all' | 'planets' | 'dwarf_planets' | 'tnos' | 'extreme'
export type ViewMode = '2d' | '3d'
export type DemoId = 'sedna10k' | 'sednoidCluster' | 'planet9Test'

/** Ein Cache-Eintrag des N-Body-Vergleichs (heliozentrische Punkte). */
export interface NbodyCompareEntry {
  years: number
  points: Vec3[]
  /** ISO-Timestamps je Sample (für den Drift-Endzeitpunkt) */
  timestamps: string[]
  stepDays: number
}

export interface NbodyCompareState {
  active: boolean
  years: number
  loading: boolean
  /** Key: `${bodyId}_${years}` */
  cache: Record<string, NbodyCompareEntry>
  /** Body, für den der Vergleich aktuell angezeigt wird */
  bodyId: string | null
}

export interface DemoRun {
  id: DemoId
  /** heliozentrische Trajektorien je Body-ID */
  trajectories: Record<string, Vec3[]>
  /** nur planet9Test: Trajektorien MIT Planet-9 */
  trajectoriesP9?: Record<string, Vec3[]>
  sednoids?: string[]
  durationYears: number
}

export interface DemoState {
  loading: boolean
  active: DemoRun | null
  statusTitle: string | null
  statusDetail: string | null
}

export interface AppState {
  bodies: CelestialBody[]
  bodiesLoaded: boolean
  selectedBodyId: string | null
  categoryFilter: CategoryFilter
  searchQuery: string
  sidebarOpen: boolean
  infoPanelOpen: boolean
  planet9PanelOpen: boolean
  helpOpen: boolean
  viewMode: ViewMode
  playing: boolean
  speedDaysPerSecond: number
  nbody: NbodyCompareState
  demo: DemoState
  error: string | null
}

export const initialState: AppState = {
  bodies: [],
  bodiesLoaded: false,
  selectedBodyId: null,
  categoryFilter: 'all',
  searchQuery: '',
  sidebarOpen: true,
  infoPanelOpen: false,
  planet9PanelOpen: false,
  helpOpen: false,
  viewMode: '2d',
  playing: false,
  speedDaysPerSecond: 1,
  nbody: { active: false, years: 100, loading: false, cache: {}, bodyId: null },
  demo: { loading: false, active: null, statusTitle: null, statusDetail: null },
  error: null,
}

export type Action =
  | { type: 'bodies/loaded'; bodies: CelestialBody[] }
  | { type: 'bodies/loadFailed'; message: string }
  | { type: 'body/select'; id: string | null }
  | { type: 'filter/set'; filter: CategoryFilter }
  | { type: 'search/set'; query: string }
  | { type: 'sidebar/toggle' }
  | { type: 'info/close' }
  | { type: 'planet9/set'; open: boolean }
  | { type: 'help/set'; open: boolean }
  | { type: 'ui/closePanels' }
  | { type: 'view/set'; mode: ViewMode }
  | { type: 'time/setPlaying'; playing: boolean }
  | { type: 'time/togglePlaying' }
  | { type: 'time/setSpeed'; daysPerSecond: number }
  | { type: 'nbody/toggle' }
  | { type: 'nbody/setYears'; years: number }
  | { type: 'nbody/started'; bodyId: string }
  | { type: 'nbody/cached'; bodyId: string; key: string; entry: NbodyCompareEntry }
  | { type: 'nbody/failed'; message: string }
  | { type: 'nbody/cleared' }
  | { type: 'demo/started'; title: string; detail: string }
  | { type: 'demo/status'; title: string; detail: string }
  | { type: 'demo/succeeded'; run: DemoRun; title: string; detail: string }
  | { type: 'demo/failed'; message: string }
  | { type: 'demo/cleared' }
  | { type: 'error/set'; message: string }
  | { type: 'error/dismiss' }

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'bodies/loaded':
      return { ...state, bodies: action.bodies, bodiesLoaded: true, error: null }
    case 'bodies/loadFailed':
      return { ...state, bodiesLoaded: false, error: action.message }
    case 'body/select':
      return {
        ...state,
        selectedBodyId: action.id,
        infoPanelOpen: action.id !== null ? true : state.infoPanelOpen,
      }
    case 'filter/set':
      return { ...state, categoryFilter: action.filter }
    case 'search/set':
      return { ...state, searchQuery: action.query }
    case 'sidebar/toggle':
      return { ...state, sidebarOpen: !state.sidebarOpen }
    case 'info/close':
      return { ...state, infoPanelOpen: false }
    case 'planet9/set':
      return { ...state, planet9PanelOpen: action.open }
    case 'help/set':
      return { ...state, helpOpen: action.open }
    case 'ui/closePanels':
      return { ...state, infoPanelOpen: false, planet9PanelOpen: false, helpOpen: false }
    case 'view/set':
      return { ...state, viewMode: action.mode }
    case 'time/setPlaying':
      return { ...state, playing: action.playing }
    case 'time/togglePlaying':
      return { ...state, playing: !state.playing }
    case 'time/setSpeed':
      return { ...state, speedDaysPerSecond: action.daysPerSecond }
    case 'nbody/toggle':
      // loading mit zurücksetzen: ein gecancelter Fetch dispatched nie wieder
      // und würde loading sonst für immer auf true hängen lassen (Deep-Recon #5).
      return { ...state, nbody: { ...state.nbody, active: !state.nbody.active, loading: false } }
    case 'nbody/setYears':
      return { ...state, nbody: { ...state.nbody, years: action.years } }
    case 'nbody/started':
      return { ...state, nbody: { ...state.nbody, loading: true, bodyId: action.bodyId }, error: null }
    case 'nbody/cached':
      return {
        ...state,
        nbody: {
          ...state.nbody,
          loading: false,
          bodyId: action.bodyId,
          cache: { ...state.nbody.cache, [action.key]: action.entry },
        },
      }
    case 'nbody/failed':
      return { ...state, nbody: { ...state.nbody, loading: false }, error: action.message }
    case 'nbody/cleared':
      return { ...state, nbody: { ...state.nbody, active: false, bodyId: null, loading: false } }
    case 'demo/started':
      return {
        ...state,
        demo: { loading: true, active: null, statusTitle: action.title, statusDetail: action.detail },
        error: null,
      }
    case 'demo/status':
      return {
        ...state,
        demo: { ...state.demo, statusTitle: action.title, statusDetail: action.detail },
      }
    case 'demo/succeeded':
      return {
        ...state,
        demo: { loading: false, active: action.run, statusTitle: action.title, statusDetail: action.detail },
      }
    case 'demo/failed':
      return {
        ...state,
        demo: { ...state.demo, loading: false, statusTitle: 'Fehler', statusDetail: action.message },
      }
    case 'demo/cleared':
      return { ...state, demo: { loading: false, active: null, statusTitle: null, statusDetail: null } }
    case 'error/set':
      return { ...state, error: action.message }
    case 'error/dismiss':
      return { ...state, error: null }
    default:
      // Exhaustiveness-Check: fehlt ein case, ist action hier nicht never → TS-Fehler.
      return assertNever(action)
  }
}

/** Compile-Zeit-Wächter: im default-Case darf nur `never` ankommen — sonst fehlt ein case. */
function assertNever(action: never): AppState {
  throw new Error(`appReducer: unbehandelte Action ${JSON.stringify(action)}`)
}

/** Sichtbare Bodies nach Kategorie-Filter + Suche (name/name_de). */
export function selectVisibleBodies(state: AppState): CelestialBody[] {
  const q = state.searchQuery.trim().toLowerCase()
  return state.bodies.filter((b) => {
    if (!matchesFilter(b, state.categoryFilter)) return false
    if (q === '') return true
    return b.name.toLowerCase().includes(q) || b.name_de.toLowerCase().includes(q)
  })
}

function matchesFilter(b: CelestialBody, filter: CategoryFilter): boolean {
  switch (filter) {
    case 'all':
      return true
    case 'planets':
      return b.category === 'planet'
    case 'dwarf_planets':
      return b.category === 'dwarf_planet'
    case 'tnos':
      return b.category === 'tno'
    case 'extreme':
      // tno_type liefert das Backend seit dem Sprint-B-API-Patch mit —
      // davor war der Extreme-Tab still leer (category war immer 'tno').
      return b.tno_type === 'extreme_tno' || b.tno_type === 'sednoid'
  }
}

export function nbodyCacheKey(bodyId: string, years: number): string {
  return `${bodyId}_${years}`
}
