import { Line } from '@react-three/drei'

interface ChunkFrameProps {
  size: number
}

export function ChunkFrame({ size }: ChunkFrameProps) {
  // Calculate the bounds of the chunk
  const halfSize = size / 2

  // Define the 8 corners of the cube as typed tuples
  const corners: [number, number, number][] = [
    [-halfSize, -halfSize, -halfSize], // bottom front left
    [halfSize, -halfSize, -halfSize],  // bottom front right
    [halfSize, halfSize, -halfSize],   // top front right
    [-halfSize, halfSize, -halfSize],  // top front left
    [-halfSize, -halfSize, halfSize],  // bottom back left
    [halfSize, -halfSize, halfSize],   // bottom back right
    [halfSize, halfSize, halfSize],    // top back right
    [-halfSize, halfSize, halfSize],   // top back left
  ]

  // Define the 12 edges of the cube
  const edges: [[number, number, number], [number, number, number]][] = [
    // Bottom face
    [corners[0], corners[1]], // front edge
    [corners[1], corners[5]], // right edge
    [corners[5], corners[4]], // back edge
    [corners[4], corners[0]], // left edge
    
    // Top face
    [corners[2], corners[3]], // front edge
    [corners[3], corners[7]], // left edge
    [corners[7], corners[6]], // back edge
    [corners[6], corners[2]], // right edge
    
    // Vertical edges
    [corners[0], corners[3]], // front left
    [corners[1], corners[2]], // front right
    [corners[4], corners[7]], // back left
    [corners[5], corners[6]], // back right
  ]

  return (
    <group>
      {edges.map((edge, index) => (
        <Line
          key={index}
          points={edge}
          color="#ffffff"
          lineWidth={2}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  )
}
