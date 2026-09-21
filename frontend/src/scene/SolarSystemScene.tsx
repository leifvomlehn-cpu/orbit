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

/**
 * Die eine three.js-Szene: 2D ist die orthografische Draufsicht,
 * 3D die frei drehbare Perspektive (Sprint-B-Entscheidung).
 * Bodies + Bahnen kommen aus GET /api/bodies?include_orbits=true.
 * iPad-Wächter (Welle 1): PerformanceMonitor senkt bei anhaltend
 * niedriger fps DPR + Details, bei Flipflops endgültig (onFallback).
 */
export default function SolarSystemScene() {
  const { bodies, viewMode } = useAppState()
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
        <ambientLight intensity={0.45} />
        <pointLight position={[0, 0, 0]} intensity={2.5} decay={0} color="#fff5e0" />
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
            />
          ) : null,
        )}
        <TrajectoryLines />
      </Canvas>
    </div>
  )
}
