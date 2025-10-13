import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Chunk } from './components/Chunk'
import { ChunkFrame } from './components/ChunkFrame'
import './App.css'

function App() {
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
        <Chunk size={32} />
        
        {/* Wireframe showing chunk boundaries */}
        <ChunkFrame size={32} />
        
        {/* Camera controls */}
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App
