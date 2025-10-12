import { useMemo } from 'react'

interface ChunkProps {
  size?: number // Size of the chunk (default 4 for testing, will be 32 later)
}

function Cube({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position}>
      <boxGeometry args={[1.0, 1.0, 1.0]} /> {/* Full size cubes touching each other */}
      <meshLambertMaterial color="#9c9c9cff" /> {/* Stone gray color */}
    </mesh>
  )
}

export function Chunk({ size = 4 }: ChunkProps) {
  // Generate all cube positions
  const cubePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        for (let z = 0; z < size; z++) {
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
