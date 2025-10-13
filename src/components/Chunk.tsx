import { useMemo } from 'react'
import { makeNoise2D } from 'open-simplex-noise'

export interface NoiseSettings {
  // General
  noiseType: string
  rotationType3D: string
  seed: number
  frequency: number
  // Fractal
  fractalType: string
  fractalOctaves: number
  fractalLacunarity: number
  fractalGain: number
  fractalWeightedStrength: number
  fractalPingPongStrength: number
  // Cellular
  cellularDistanceFunction: string
  cellularReturnType: string
  cellularJitter: number
  // Domain Warp
  domainWarpType: string
  domainWarpAmp: number
  // Domain Warp Fractal
  domainWarpFractalType: string
  domainWarpFractalOctaves: number
  domainWarpFractalLacunarity: number
  domainWarpFractalGain: number
}

interface ChunkProps {
  size?: number // Size of the chunk (default 32)
  isolevel?: number // Isolevel threshold for showing/hiding cubes
  amplitude?: number // How much height variation (default 8)
  verticalOffset?: number // Where the baseline terrain sits (default 8)
  noiseSettings?: NoiseSettings // FastNoise Lite settings
  updateTrigger?: number // Trigger value to force updates when auto-update is off
}

function Cube({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1.0, 1.0, 1.0]} /> {/* Full size cubes touching each other */}
      <meshLambertMaterial color="#9c9c9cff" /> {/* Stone gray color */}
    </mesh>
  )
}

export function Chunk({ size = 32, isolevel = 0.0, amplitude = 8, verticalOffset = 8, noiseSettings, updateTrigger }: ChunkProps) {
  // Generate cube positions based on 2D noise and isolevel
  const cubePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    
    // Create noise function with settings seed
    const noise2D = makeNoise2D(noiseSettings?.seed || 12345)
    
    // Noise parameters
    const noiseFrequency = noiseSettings?.frequency || 0.01 // Use settings frequency
    const heightMultiplier = amplitude // How tall the terrain can be (controlled by amplitude)
    const baseHeight = verticalOffset // Base terrain height (controlled by verticalOffset)
    
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        // Generate height using 2D noise
        const noiseValue = noise2D(x * noiseFrequency, z * noiseFrequency)
        const height = Math.floor(baseHeight + (noiseValue * heightMultiplier))
        
        // Generate cubes from bottom up to the height, but only if above isolevel
        for (let y = 0; y <= height && y < size; y++) {
          // Create a secondary noise value for isolevel comparison
          const isoNoiseValue = noise2D((x + 1000) * noiseFrequency, (z + 1000) * noiseFrequency)
          
          // Only show cube if noise value is above isolevel
          if (isoNoiseValue > isolevel) {
            // Center the chunk around origin
            const centeredX = x - size / 2 + 0.5
            const centeredY = y - size / 2 + 0.5
            const centeredZ = z - size / 2 + 0.5
            
            positions.push([centeredX, centeredY, centeredZ])
          }
        }
      }
    }
    
    return positions
  }, [size, isolevel, amplitude, verticalOffset, noiseSettings, updateTrigger])

  return (
    <group>
      {cubePositions.map((position, index) => (
        <Cube key={index} position={position} />
      ))}
    </group>
  )
}
