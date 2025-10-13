import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import { Chunk } from './components/Chunk'
import { ChunkFrame } from './components/ChunkFrame'
import './App.css'

function App() {
  // Leva controls for terrain parameters
  const { isolevel, amplitude, verticalOffset } = useControls({
    isolevel: { value: 0.0, min: -1.0, max: 1.0, step: 0.05 },
    amplitude: { value: 8, min: 1, max: 100, step: 1 },
    verticalOffset: { value: 8, min: 0, max: 24, step: 1 }
  })

  return (
    <div className="app">
      <Canvas
        camera={{
          position: [10, 10, 10], // Isometric-style position
          fov: 75
        }}
      >
        {/* Basic lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* Our chunk of cubes */}
        <Chunk size={32} isolevel={isolevel} amplitude={amplitude} verticalOffset={verticalOffset} />
        
        {/* Wireframe showing chunk boundaries */}
        <ChunkFrame size={32} />
        
        {/* Camera controls */}
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
