import { useMemo } from 'react'
import { makeNoise2D } from 'open-simplex-noise'

interface ChunkProps {
  size?: number // Size of the chunk (default 16 for testing, will be 32 later)
}

function Cube({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1.0, 1.0, 1.0]} /> {/* Full size cubes touching each other */}
      <meshLambertMaterial color="#9c9c9cff" /> {/* Stone gray color */}
    </mesh>
  )
}

export function Chunk({ size = 32 }: ChunkProps) {
  // Generate cube positions based on 2D noise
  const cubePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    
    // Create noise function
    const noise2D = makeNoise2D(Date.now()) // Random seed
    
    // Noise parameters
    const noiseScale = 0.1 // How zoomed in the noise is
    const heightMultiplier = 8 // How tall the terrain can be
    const baseHeight = size / 4 // Base terrain height
    
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        // Generate height using 2D noise
        const noiseValue = noise2D(x * noiseScale, z * noiseScale)
        const height = Math.floor(baseHeight + (noiseValue * heightMultiplier))
        
        // Generate cubes from bottom up to the height
        for (let y = 0; y <= height && y < size; y++) {
          // Center the chunk around origin
          const centeredX = x - size / 2 + 0.5
          const centeredY = y - size / 2 + 0.5
          const centeredZ = z - size / 2 + 0.5
          
          positions.push([centeredX, centeredY, centeredZ])
        }
      }
    }
    
    return positions
  }, [size])

  return (
    <group>
      {cubePositions.map((position, index) => (
        <Cube key={index} position={position} />
      ))}
    </group>
  )
}
