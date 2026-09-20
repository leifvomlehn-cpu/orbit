import { useEffect, useState } from 'react'
import { AppProvider, useAppDispatch, useAppState, useSimClock } from './state/AppContext'
import { fetchBodies } from './api/endpoints'
import { resetView, zoomIn, zoomOut } from './utils/cameraBus'
import SolarSystemScene from './scene/SolarSystemScene'
import ErrorBanner from './components/ErrorBanner'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import ViewControls from './components/ViewControls'
import TimeControls from './components/TimeControls'
import InfoPanel from './components/InfoPanel'
import Planet9Panel from './components/Planet9Panel'
import HelpModal from './components/HelpModal'
import NbodyControls from './components/NbodyControls'
import DemoPanel from './components/DemoPanel'
import LoadingScreen from './components/LoadingScreen'

function Shell() {
  const dispatch = useAppDispatch()
  const clock = useSimClock()
  const { playing, speedDaysPerSecond } = useAppState()
  const [uiIdle, setUiIdle] = useState(false)

  // Einbahn-Sync Reducer → SimClock (die Clock selbst lebt nie in React-State)
  useEffect(() => {
    clock.setPlaying(playing)
  }, [clock, playing])
  useEffect(() => {
    clock.setSpeed(speedDaysPerSecond)
  }, [clock, speedDaysPerSecond])

  // Daten-Bootstrap: alle Bodies inkl. Bahnpfade und Planet-9-Vorhersage
  useEffect(() => {
    let cancelled = false
    fetchBodies({ includeOrbits: true, includePlanet9: true })
      .then((res) => {
        if (!cancelled) dispatch({ type: 'bodies/loaded', bodies: res.bodies })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({
            type: 'bodies/loadFailed',
            message: err instanceof Error ? err.message : String(err),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [dispatch])

  // Tastenkürzel (Leertaste, Pfeile, +/-, R, ESC)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          dispatch({ type: 'time/togglePlaying' })
          break
        case 'ArrowLeft':
          clock.addDays(-1)
          break
        case 'ArrowRight':
          clock.addDays(1)
          break
        case 'Equal':
        case 'NumpadAdd':
          zoomIn()
          break
        case 'Minus':
        case 'NumpadSubtract':
          zoomOut()
          break
        case 'KeyR':
          resetView()
          break
        case 'Escape':
          dispatch({ type: 'ui/closePanels' })
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clock, dispatch])

  // UI-Auto-Hide nach 5 Sekunden Inaktivität (iPad-Vollbild)
  useEffect(() => {
    let timer = 0
    const arm = () => {
      setUiIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setUiIdle(true), 5000)
    }
    window.addEventListener('pointermove', arm)
    window.addEventListener('pointerdown', arm)
    window.addEventListener('keydown', arm)
    arm()
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', arm)
      window.removeEventListener('pointerdown', arm)
      window.removeEventListener('keydown', arm)
    }
  }, [])

  return (
    <div id="app" className={uiIdle ? 'ui-idle' : undefined}>
      <SolarSystemScene />
      <Header />
      <Sidebar />
      <ViewControls />
      <NbodyControls />
      <DemoPanel />
      <TimeControls />
      <InfoPanel />
      <Planet9Panel />
      <HelpModal />
      <ErrorBanner />
      <LoadingScreen />
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
