import { useMemo, useRef, useEffect } from 'react'
import { makeNoise2D, makeNoise3D } from 'open-simplex-noise'
import { InstancedMesh, Object3D } from 'three'

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
  sizeX?: number // X dimension of the chunk (default 32)
  sizeY?: number // Y dimension of the chunk (default 32)
  sizeZ?: number // Z dimension of the chunk (default 32)
  isolevel?: number // Isolevel threshold for showing/hiding cubes
  amplitude?: number // How much height variation (default 8)
  verticalOffset?: number // Where the baseline terrain sits (default 8)
  noiseSettings?: NoiseSettings // FastNoise Lite settings
  updateTrigger?: number // Trigger value to force updates when auto-update is off
  use3D?: boolean // Whether to use 3D noise or 2D noise
}

export function Chunk({ sizeX = 32, sizeY = 32, sizeZ = 32, isolevel = 0.0, amplitude = 8, verticalOffset = 8, noiseSettings, updateTrigger, use3D = false }: ChunkProps) {
  const meshRef = useRef<InstancedMesh>(null)
  // Generate cube positions based on noise and isolevel
  const cubePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    
    // Noise parameters
    const noiseFrequency = noiseSettings?.frequency || 0.01 // Use settings frequency
    const heightMultiplier = amplitude // How tall the terrain can be (controlled by amplitude)
    const baseHeight = verticalOffset // Base terrain height (controlled by verticalOffset)
    
    if (use3D) {
      // Use 3D noise for true volumetric generation
      const noise3D = makeNoise3D(noiseSettings?.seed || 12345)
      
      for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
          for (let z = 0; z < sizeZ; z++) {
            // Generate 3D noise value for this position
            const noiseValue = noise3D(x * noiseFrequency, y * noiseFrequency, z * noiseFrequency)
            
            // Only show cube if noise value is above isolevel
            if (noiseValue > isolevel) {
              // Center the chunk around origin
              const centeredX = x - sizeX / 2 + 0.5
              const centeredY = y - sizeY / 2 + 0.5
              const centeredZ = z - sizeZ / 2 + 0.5
              
              positions.push([centeredX, centeredY, centeredZ])
            }
          }
        }
      }
    } else {
      // Use 2D noise for traditional height-based terrain
      const noise2D = makeNoise2D(noiseSettings?.seed || 12345)
      
      // Pre-calculate noise values for better performance
      const noiseMap = new Array(sizeX * sizeZ)
      const isoNoiseMap = new Array(sizeX * sizeZ)
      
      for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
          const index = x * sizeZ + z
          noiseMap[index] = noise2D(x * noiseFrequency, z * noiseFrequency)
          isoNoiseMap[index] = noise2D((x + 1000) * noiseFrequency, (z + 1000) * noiseFrequency)
        }
      }
      
      for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
          const index = x * sizeZ + z
          const noiseValue = noiseMap[index]
          const height = Math.floor(baseHeight + (noiseValue * heightMultiplier))
          
          // Generate cubes from bottom up to the height, but only if above isolevel
          for (let y = 0; y <= height && y < sizeY; y++) {
            const isoNoiseValue = isoNoiseMap[index]
            
            // Only show cube if noise value is above isolevel
            if (isoNoiseValue > isolevel) {
              // Center the chunk around origin
              const centeredX = x - sizeX / 2 + 0.5
              const centeredY = y - sizeY / 2 + 0.5
              const centeredZ = z - sizeZ / 2 + 0.5
              
              positions.push([centeredX, centeredY, centeredZ])
            }
          }
        }
      }
    }
    
    return positions
  }, [sizeX, sizeY, sizeZ, isolevel, amplitude, verticalOffset, noiseSettings, updateTrigger, use3D])

  // Update instanced mesh positions
  useEffect(() => {
    if (!meshRef.current) return
    
    const dummy = new Object3D()
    
    cubePositions.forEach((position, i) => {
      dummy.position.set(...position)
      dummy.updateMatrix()
      meshRef.current!.setMatrixAt(i, dummy.matrix)
    })
    
    meshRef.current.instanceMatrix.needsUpdate = true
    meshRef.current.count = cubePositions.length
    
    // Fix frustum culling by manually setting bounding sphere
    // Calculate the maximum extent of the chunk
    const maxExtent = Math.max(sizeX, sizeY, sizeZ) / 2
    const center = [0, 0, 0] // Centered around origin
    const radius = maxExtent * Math.sqrt(3) * 1.1 // Diagonal distance with some padding
    
    if (meshRef.current.geometry.boundingSphere) {
      meshRef.current.geometry.boundingSphere.center.set(center[0], center[1], center[2])
      meshRef.current.geometry.boundingSphere.radius = radius
    }
    
    // Disable automatic frustum culling to prevent disappearing
    meshRef.current.frustumCulled = false
  }, [cubePositions, sizeX, sizeY, sizeZ])

  // Calculate max possible cubes for buffer allocation
  const maxCubes = sizeX * sizeY * sizeZ

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxCubes]}>
      <boxGeometry args={[1.0, 1.0, 1.0]} />
      <meshLambertMaterial color="#9c9c9cff" />
    </instancedMesh>
  )
}
