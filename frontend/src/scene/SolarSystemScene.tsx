import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useAppDispatch, useAppState } from '../state/AppContext'
import BodyNode from './BodyNode'
import OrbitLine from './OrbitLine'
import CameraRig from './CameraRig'
import SimulationTicker from './SimulationTicker'
import TrajectoryLines from './TrajectoryLines'

/**
 * Die eine three.js-Szene: 2D ist die orthografische Draufsicht,
 * 3D die frei drehbare Perspektive (Sprint-B-Entscheidung).
 * Bodies + Bahnen kommen aus GET /api/bodies?include_orbits=true.
 */
export default function SolarSystemScene() {
  const { bodies, viewMode } = useAppState()
  const dispatch = useAppDispatch()

  return (
    <div className="scene-container">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onPointerMissed={() => dispatch({ type: 'body/select', id: null })}
      >
        <color attach="background" args={['#0a0a1a']} />
        <ambientLight intensity={0.35} />
        <pointLight position={[0, 0, 0]} intensity={2.5} decay={0} color="#fff5e0" />
        <Stars radius={300} depth={100} count={4000} factor={4} fade speed={0} />
        <SimulationTicker />
        <CameraRig mode={viewMode} />
        {bodies.map((body) => (
          <BodyNode key={body.id} body={body} />
        ))}
        {bodies.map((body) =>
          body.orbit_path ? (
            <OrbitLine
              key={`orbit-${body.id}`}
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
