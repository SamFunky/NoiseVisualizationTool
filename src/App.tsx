import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useControls } from 'leva'
import { useState } from 'react'
import { Chunk } from './components/Chunk'
import { ChunkFrame } from './components/ChunkFrame'
import { NoisePreview } from './components/NoisePreview'
import { ChunkSizeControls } from './components/ChunkSizeControls'
import { CloudSky } from './components/CloudSky'
import './App.css'

function App() {
  // State for controlling when to update the 3D terrain
  const [autoUpdate, setAutoUpdate] = useState(true)
  const [manualUpdateTrigger, setManualUpdateTrigger] = useState(0)
  const [use3D, setUse3D] = useState(false) // Track 3D noise mode
  const [isSmooth, setIsSmooth] = useState(false) // Track smooth rendering mode
  const [mathExpression, setMathExpression] = useState("N") // Math expression for transforming noise
  
  // State for chunk dimensions
  const [chunkSize, setChunkSize] = useState({ x: 32, y: 32, z: 32 })
  
  // Snapshot values when auto-update is turned off or manual update button is clicked
  const [frozenValues, setFrozenValues] = useState({
    isolevel: -1.0,
    amplitude: 8,
    verticalOffsetPercent: 25,
    noiseSettings: {} as any
  })

  // Calculate frozen vertical offset based on percentage
  const frozenVerticalOffset = Math.floor((frozenValues.verticalOffsetPercent / 100) * chunkSize.y)
  // Leva controls for terrain parameters
  const { isolevel, amplitude, verticalOffsetPercent } = useControls('Terrain', {
    isolevel: { value: -1.0, min: -1.0, max: 1.0, step: 0.05 },
    amplitude: 8,
    verticalOffsetPercent: { value: 25, min: 0, max: 100, step: 5, label: 'vertical offset %' }
  })

  // Calculate actual vertical offset based on percentage of chunk height
  const verticalOffset = Math.floor((verticalOffsetPercent / 100) * chunkSize.y)

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
    seed: 1337,
    frequency: { value: 0.01, pad: 4 }
  })

  // Fractal settings
  const fractalSettings = useControls('Fractal', {
    type: { 
      value: 'None', 
      options: ['None', 'FBm', 'Ridged', 'PingPong', 'DomainWarpProgressive', 'DomainWarpIndependent']
    },
    octaves: { value: 3, min: 1, max: 16, step: 1 },
    lacunarity: { value: 2.0, min: 0.1, max: 4.0, step: 0.1 },
    gain: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 },
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
    jitter: { value: 1.0, min: 0.0, max: 2.0, step: 0.05 }
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
    octaves: { value: 3, min: 1, max: 16, step: 1 },
    lacunarity: { value: 2.0, min: 0.1, max: 4.0, step: 0.1 },
    gain: { value: 0.5, min: 0.0, max: 1.0, step: 0.01 }
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
          position: [
            chunkSize.x * 1.2, 
            chunkSize.y * 1.0, 
            chunkSize.z * 1.2
          ], // Dynamic camera position based on chunk size
          fov: 60
        }}
        gl={{ 
          antialias: false, // Disable antialiasing for better performance
          powerPreference: "high-performance" // Use dedicated GPU if available
        }}
        dpr={[1, 2]} // Limit device pixel ratio for performance
      >
        {/* Basic lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* Cloud skybox - always renders behind terrain */}
        <CloudSky cloudCount={25} radius={1000} />
        
        {/* Our chunk of cubes */}
        <Chunk 
          sizeX={chunkSize.x}
          sizeY={chunkSize.y}
          sizeZ={chunkSize.z}
          isolevel={autoUpdate ? isolevel : frozenValues.isolevel} 
          amplitude={autoUpdate ? amplitude : frozenValues.amplitude} 
          verticalOffset={autoUpdate ? verticalOffset : frozenVerticalOffset}
          noiseSettings={autoUpdate ? noiseSettings : frozenValues.noiseSettings}
          updateTrigger={manualUpdateTrigger}
          use3D={use3D}
          isSmooth={isSmooth}
          mathExpression={mathExpression}
        />
        
        {/* Wireframe showing chunk boundaries */}
        <ChunkFrame 
          sizeX={chunkSize.x}
          sizeY={chunkSize.y}
          sizeZ={chunkSize.z}
        />
        
        {/* Camera controls - center on chunk */}
        <OrbitControls 
          target={[0, 0, 0]}
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={300}
        />
      </Canvas>
      
      {/* Draggable noise preview */}
      <NoisePreview 
        noiseSettings={noiseSettings}
        autoUpdate={autoUpdate}
        mathExpression={mathExpression}
        onMathExpressionChange={setMathExpression}
        onAutoUpdateChange={(value) => {
          if (!value) {
            // Freeze current values when turning auto-update off
            setFrozenValues({ isolevel, amplitude, verticalOffsetPercent, noiseSettings })
          }
          setAutoUpdate(value)
        }}
        onManualUpdate={() => {
          setFrozenValues({ isolevel, amplitude, verticalOffsetPercent, noiseSettings })
          setManualUpdateTrigger(prev => prev + 1)
        }}
        on3DModeChange={setUse3D}
        onSmoothModeChange={setIsSmooth}
      />
      
      {/* Chunk size controls at bottom */}
      <ChunkSizeControls onSizeChange={setChunkSize} />
    </div>
  )
}

export default App
