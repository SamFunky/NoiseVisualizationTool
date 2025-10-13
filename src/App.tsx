import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import { Chunk } from './components/Chunk'
import { ChunkFrame } from './components/ChunkFrame'
import { NoisePreview } from './components/NoisePreview'
import './App.css'

function App() {
  // Leva controls for terrain parameters
  const { isolevel, amplitude, verticalOffset } = useControls('Terrain', {
    isolevel: { value: -1.0, min: -1.0, max: 1.0, step: 0.05 },
    amplitude: { value: 8, min: 1, max: 100, step: 1 },
    verticalOffset: { value: 8, min: 0, max: 24, step: 1 }
  })

  // General noise settings
  const generalSettings = useControls('General', {
    noiseType: { 
      value: 'OpenSimplex2', 
      options: ['OpenSimplex2', 'OpenSimplex2S', 'Cellular', 'Perlin', 'ValueCubic', 'Value']
    },
    rotationType3D: { 
      value: 'None', 
      options: ['None', 'ImproveXYPlanes', 'ImproveXZPlanes']
    },
    seed: { value: 1337, min: 0, max: 9999, step: 1 },
    frequency: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 }
  })

  // Fractal settings
  const fractalSettings = useControls('Fractal', {
    type: { 
      value: 'None', 
      options: ['None', 'FBm', 'Ridged', 'PingPong', 'DomainWarpProgressive', 'DomainWarpIndependent']
    },
    octaves: { value: 3, min: 1, max: 10, step: 1 },
    lacunarity: { value: 2.0, min: 0.1, max: 4.0, step: 0.1 },
    gain: { value: 0.5, min: 0.0, max: 1.0, step: 0.1 },
    weightedStrength: { value: 0.0, min: -2.0, max: 2.0, step: 0.1 },
    pingPongStrength: { value: 2.0, min: 0.0, max: 10.0, step: 0.1 }
  })

  // Cellular settings
  const cellularSettings = useControls('Cellular', {
    distanceFunction: { 
      value: 'EuclideanSq', 
      options: ['Euclidean', 'EuclideanSq', 'Manhattan', 'Hybrid']
    },
    returnType: { 
      value: 'Distance', 
      options: ['CellValue', 'Distance', 'Distance2', 'Distance2Add', 'Distance2Sub', 'Distance2Mul', 'Distance2Div']
    },
    jitter: { value: 1.0, min: 0.0, max: 2.0, step: 0.1 }
  })

  // Domain Warp settings
  const domainWarpSettings = useControls('Domain Warp', {
    type: { 
      value: 'OpenSimplex2', 
      options: ['OpenSimplex2', 'OpenSimplex2Reduced', 'BasicGrid']
    },
    amplitude: { value: 1.0, min: 0.0, max: 10.0, step: 0.1 }
  })

  // Domain Warp Fractal settings
  const domainWarpFractalSettings = useControls('Domain Warp Fractal', {
    type: { 
      value: 'None', 
      options: ['None', 'Progressive', 'Independent']
    },
    octaves: { value: 3, min: 1, max: 10, step: 1 },
    lacunarity: { value: 2.0, min: 0.1, max: 4.0, step: 0.1 },
    gain: { value: 0.5, min: 0.0, max: 1.0, step: 0.1 }
  })

  // Combine all noise settings with proper mapping
  const noiseSettings = {
    // General
    noiseType: generalSettings.noiseType,
    rotationType3D: generalSettings.rotationType3D,
    seed: generalSettings.seed,
    frequency: generalSettings.frequency,
    // Fractal
    fractalType: fractalSettings.type,
    fractalOctaves: fractalSettings.octaves,
    fractalLacunarity: fractalSettings.lacunarity,
    fractalGain: fractalSettings.gain,
    fractalWeightedStrength: fractalSettings.weightedStrength,
    fractalPingPongStrength: fractalSettings.pingPongStrength,
    // Cellular
    cellularDistanceFunction: cellularSettings.distanceFunction,
    cellularReturnType: cellularSettings.returnType,
    cellularJitter: cellularSettings.jitter,
    // Domain Warp
    domainWarpType: domainWarpSettings.type,
    domainWarpAmp: domainWarpSettings.amplitude,
    // Domain Warp Fractal
    domainWarpFractalType: domainWarpFractalSettings.type,
    domainWarpFractalOctaves: domainWarpFractalSettings.octaves,
    domainWarpFractalLacunarity: domainWarpFractalSettings.lacunarity,
    domainWarpFractalGain: domainWarpFractalSettings.gain
  }

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
        <Chunk 
          size={32} 
          isolevel={isolevel} 
          amplitude={amplitude} 
          verticalOffset={verticalOffset}
          noiseSettings={noiseSettings}
        />
        
        {/* Wireframe showing chunk boundaries */}
        <ChunkFrame size={32} />
        
        {/* Camera controls */}
        <OrbitControls />
      </Canvas>
      
      {/* Draggable noise preview */}
      <NoisePreview 
        noiseSettings={noiseSettings}
      />
    </div>
  )
}

export default App
