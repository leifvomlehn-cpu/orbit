import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PerformanceMonitor, Stars } from '@react-three/drei'
import { useAppDispatch, useAppState } from '../state/AppContext'
import BodyNode from './BodyNode'
import OrbitLine from './OrbitLine'
import CameraRig from './CameraRig'
import CameraFocus from './CameraFocus'
import SimulationTicker from './SimulationTicker'
import TrajectoryLines from './TrajectoryLines'
import { moonOrbitScale } from './sizing'

/**
 * Die eine three.js-Szene: 2D ist die orthografische Draufsicht,
 * 3D die frei drehbare Perspektive (Sprint-B-Entscheidung).
 * Bodies + Bahnen kommen aus GET /api/bodies?include_orbits=true.
 * iPad-Wächter (Welle 1): PerformanceMonitor senkt bei anhaltend
 * niedriger fps DPR + Details, bei Flipflops endgültig (onFallback).
 */
export default function SolarSystemScene() {
  const { bodies, viewMode, scaleMode } = useAppState()
  const dispatch = useAppDispatch()
  const [dpr, setDpr] = useState<[number, number]>([1, 2])
  const [lowQuality, setLowQuality] = useState(false)

  return (
    <div className="scene-container">
      <Canvas
        dpr={dpr}
        gl={{ antialias: true }}
        onPointerMissed={() => dispatch({ type: 'body/select', id: null })}
      >
        <color attach="background" args={['#0a0a1a']} />
        <PerformanceMonitor
          ms={300}
          flipflops={3}
          onDecline={() => {
            setDpr([1, 1])
            setLowQuality(true)
          }}
          onIncline={() => {
            setDpr([1, 2])
            setLowQuality(false)
          }}
          onFallback={() => {
            setDpr([1, 1])
            setLowQuality(true)
          }}
        />
        {/* Helligkeitsbalance nach Live-Check (Welle 2): decay=1 statt
            physikalischem 1/d² — bei 1 AU = 1 Scene-Unit ist Merkur:Neptun
            real 5900:1 (innen ausgebrannt weiß, Neptun-Tagseite dunkler als
            die Ambient-Nachtseite → keine sonnengewandte Seite erkennbar).
            decay=1 hält einen lesbaren Verlauf (77:1); intensity so, dass
            die Erde (d=1) normbelichtet ist. Ambient hält Nachtseiten
            sichtbar, klar UNTER der Tagseiten-Helligkeit. */}
        <ambientLight intensity={0.08} />
        <pointLight position={[0, 0, 0]} intensity={2.5} decay={1} color="#fff5e0" />
        <Stars radius={300} depth={100} count={lowQuality ? 1500 : 4000} factor={4} fade speed={0} />
        <SimulationTicker />
        <CameraFocus />
        <CameraRig mode={viewMode} />
        {bodies.map((body) => (
          <BodyNode key={body.id} body={body} lowQuality={lowQuality} />
        ))}
        {bodies.map((body) =>
          body.orbit_path ? (
            <OrbitLine
              key={`orbit-${body.id}`}
              bodyId={body.id}
              category={body.category}
              path={body.orbit_path}
              color={body.color}
              dashed={body.category === 'planet9'}
              parentId={body.parent_id ?? undefined}
              scale={body.parent_id ? moonOrbitScale(scaleMode) : 1}
            />
          ) : null,
        )}
        <TrajectoryLines />
      </Canvas>
    </div>
  )
}
