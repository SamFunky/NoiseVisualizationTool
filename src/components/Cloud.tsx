import { useRef } from 'react'
import { Group } from 'three'

interface CloudProps {
  position: [number, number, number]
  scale?: number
}

export function Cloud({ position, scale = 1 }: CloudProps) {
  const groupRef = useRef<Group>(null)

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main cloud body - largest sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[12, 8, 6]} />
        <meshBasicMaterial 
          color="#f0f0f0" 
          transparent 
          opacity={0.9}
        />
      </mesh>

      {/* Secondary cloud bumps */}
      <mesh position={[8, 3, 4]}>
        <sphereGeometry args={[8, 8, 6]} />
        <meshBasicMaterial 
          color="#f0f0f0" 
          transparent 
          opacity={0.8}
        />
      </mesh>

      <mesh position={[-6, 2, 3]}>
        <sphereGeometry args={[7, 8, 6]} />
        <meshBasicMaterial 
          color="#f0f0f0" 
          transparent 
          opacity={0.8}
        />
      </mesh>

      {/* Smaller detail spheres */}
      <mesh position={[4, -4, -3]}>
        <sphereGeometry args={[5, 8, 6]} />
        <meshBasicMaterial 
          color="#f0f0f0" 
          transparent 
          opacity={0.7}
        />
      </mesh>

      <mesh position={[-8, -3, 2]}>
        <sphereGeometry args={[6, 8, 6]} />
        <meshBasicMaterial 
          color="#f0f0f0" 
          transparent 
          opacity={0.7}
        />
      </mesh>
    </group>
  )
}
