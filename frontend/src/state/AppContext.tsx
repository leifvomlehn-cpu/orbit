import { createContext, useContext, useMemo, useReducer } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { appReducer, initialState } from './reducer'
import type { Action, AppState } from './reducer'
import { SimClock } from '../simulation/SimClock'

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<Action>
  clock: SimClock
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  // Die Clock lebt außerhalb des React-Renders — genau eine Instanz.
  const clock = useMemo(() => new SimClock(), [])
  const value = useMemo(() => ({ state, dispatch, clock }), [state, clock])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp muss innerhalb von <AppProvider> verwendet werden')
  return ctx
}

export function useAppState(): AppState {
  return useApp().state
}

export function useAppDispatch(): Dispatch<Action> {
  return useApp().dispatch
}

export function useSimClock(): SimClock {
  return useApp().clock
}
