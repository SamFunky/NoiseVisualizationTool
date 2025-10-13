import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group } from 'three'
import { useRef } from 'react'

interface CloudSkyProps {
  cloudCount?: number
  radius?: number
}

export function CloudSky({ cloudCount = 25, radius = 1000 }: CloudSkyProps) {
  const groupRef = useRef<Group>(null)
  const { camera } = useThree()

  // Generate cloud positions in a sphere around the scene
  const cloudPositions = useMemo(() => {
    const positions: Array<{ position: [number, number, number], scale: number }> = []
    
    for (let i = 0; i < cloudCount; i++) {
      // Generate random spherical coordinates covering full sphere
      const phi = Math.acos(1 - 2 * Math.random()) // Full sphere coverage
      const theta = 2 * Math.PI * Math.random()
      
      // Convert to cartesian coordinates at fixed radius
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi) // Full Y range, including below
      const z = radius * Math.sin(phi) * Math.sin(theta)
      
      // Random scale for variety
      const scale = 8 + Math.random() * 12 // Larger clouds for distant viewing
      
      positions.push({
        position: [x, y, z],
        scale
      })
    }
    
    return positions
  }, [cloudCount, radius])

  // True skybox behavior - clouds follow camera to appear infinitely distant
  useFrame(() => {
    if (groupRef.current && camera) {
      // Clouds follow camera exactly to appear at infinite distance
      groupRef.current.position.copy(camera.position)
    }
  })

  return (
    <group ref={groupRef}>
      {cloudPositions.map((cloud, index) => (
        <group key={index} position={cloud.position} scale={cloud.scale}>
          {/* Single large cloud sphere with proper skybox depth handling */}
          <mesh renderOrder={-1000}>
            <sphereGeometry args={[20, 8, 6]} />
            <meshBasicMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.8}
              depthTest={true}   // Enable depth testing
              depthWrite={false} // Don't write to depth buffer so terrain can render over
            />
          </mesh>
          
          {/* Additional smaller spheres for cloud detail */}
          <mesh position={[15, 5, 8]} renderOrder={-999}>
            <sphereGeometry args={[12, 6, 4]} />
            <meshBasicMaterial 
              color="#f8f8f8" 
              transparent 
              opacity={0.6}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
          
          <mesh position={[-12, 3, -6]} renderOrder={-998}>
            <sphereGeometry args={[15, 6, 4]} />
            <meshBasicMaterial 
              color="#f0f0f0" 
              transparent 
              opacity={0.7}
              depthTest={true}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
