import { useAppDispatch, useAppState } from '../state/AppContext'
import { selectVisibleBodies } from '../state/reducer'
import type { CategoryFilter } from '../state/reducer'
import type { CelestialBody } from '../types'
import { KM_PER_AU } from '../scene/sizing'

const FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'Alle' },
  { key: 'planets', label: 'Planeten' },
  { key: 'dwarf_planets', label: 'Zwergplaneten' },
  { key: 'tnos', label: 'TNOs' },
  { key: 'extreme', label: 'Extreme' },
]

const CATEGORY_LABEL: Record<string, string> = {
  planet: 'Planet',
  dwarf_planet: 'Zwergplanet',
  tno: 'TNO',
  planet9: 'Hypothese',
  moon: 'Mond',
}

/** Listen-Distanz: heliozentrisch in AU, bei Parent-Körpern (Mond) in km zum Parent. */
function bodyDistance(body: CelestialBody): string {
  const a = body.orbital_elements.semi_major_axis_au
  if (a <= 0) return '—'
  if (body.parent_id) return `${Math.round(a * KM_PER_AU).toLocaleString('de-DE')} km`
  return `${a.toFixed(1)} AU`
}

function BodyListItem({ body }: { body: CelestialBody }) {
  const dispatch = useAppDispatch()
  const selected = useAppState().selectedBodyId === body.id
  return (
    <div
      className={selected ? 'body-item selected' : 'body-item'}
      role="listitem"
      onClick={() => dispatch({ type: 'body/select', id: body.id })}
    >
      <div className="body-color" style={{ backgroundColor: body.color, color: body.color }} />
      <div className="body-info">
        <div className="body-name">{body.name_de}</div>
        <div className="body-distance">{bodyDistance(body)}</div>
      </div>
      <span className="body-category-tag">{CATEGORY_LABEL[body.category] ?? body.category}</span>
    </div>
  )
}

export default function Sidebar() {
  const dispatch = useAppDispatch()
  const state = useAppState()
  const visible = selectVisibleBodies(state)

  return (
    <aside id="sidebar" className={state.sidebarOpen ? undefined : 'hidden'}>
      <div className="sidebar-header">
        <h2>Himmelskörper</h2>
        <input
          type="text"
          className="search-input"
          placeholder="Suche..."
          autoComplete="off"
          value={state.searchQuery}
          onChange={(e) => dispatch({ type: 'search/set', query: e.target.value })}
        />
      </div>
      <div className="category-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={state.categoryFilter === f.key ? 'filter-btn active' : 'filter-btn'}
            onClick={() => dispatch({ type: 'filter/set', filter: f.key })}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div id="body-list" className="body-list" role="list">
        {visible.map((body) => (
          <BodyListItem key={body.id} body={body} />
        ))}
      </div>
      <div className="sidebar-footer">
        <button
          className="special-btn"
          onClick={() => dispatch({ type: 'planet9/set', open: true })}
        >
          🪐 Planet 9 Suche
        </button>
      </div>
    </aside>
  )
}
