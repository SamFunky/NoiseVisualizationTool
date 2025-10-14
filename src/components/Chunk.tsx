import { useMemo, useRef, useEffect } from 'react'
import FastNoiseLite from 'fastnoise-lite'
import { InstancedMesh, Object3D, BufferGeometry, BufferAttribute, Mesh } from 'three'
import { generateMarchingCubes } from '../utils/marchingCubes'

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
  isSmooth?: boolean // Whether to use smooth (marching cubes) or blocky rendering
}

export function Chunk({ sizeX = 32, sizeY = 32, sizeZ = 32, isolevel = 0.0, amplitude = 8, verticalOffset = 8, noiseSettings, updateTrigger, use3D = false, isSmooth = false }: ChunkProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const smoothMeshRef = useRef<Mesh>(null)
  
  // Helper function to configure FastNoiseLite based on settings
  const createNoiseGenerator = () => {
    const fastNoise = new FastNoiseLite()
    fastNoise.SetSeed(noiseSettings?.seed || 12345)
    fastNoise.SetFrequency(noiseSettings?.frequency || 0.01)
    
    // Configure noise type based on settings
    switch (noiseSettings?.noiseType) {
      case 'perlin':
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.Perlin)
        break
      case 'opensimplex2':
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
        break
      case 'opensimplex2s':
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2S)
        break
      case 'cellular':
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.Cellular)
        fastNoise.SetCellularDistanceFunction(FastNoiseLite.CellularDistanceFunction.EuclideanSq)
        fastNoise.SetCellularReturnType(FastNoiseLite.CellularReturnType.Distance)
        break
      case 'value_cubic':
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.ValueCubic)
        break
      case 'value':
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.Value)
        break
      default:
        fastNoise.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
    }

    // Configure fractals if enabled
    if (noiseSettings && noiseSettings.fractalType !== 'None') {
      // Map fractal type from settings
      switch (noiseSettings.fractalType) {
        case 'FBm':
          fastNoise.SetFractalType(FastNoiseLite.FractalType.FBm)
          break
        case 'Ridged':
          fastNoise.SetFractalType(FastNoiseLite.FractalType.Ridged)
          break
        case 'PingPong':
          fastNoise.SetFractalType(FastNoiseLite.FractalType.PingPong)
          break
        case 'DomainWarpProgressive':
          fastNoise.SetFractalType(FastNoiseLite.FractalType.DomainWarpProgressive)
          break
        case 'DomainWarpIndependent':
          fastNoise.SetFractalType(FastNoiseLite.FractalType.DomainWarpIndependent)
          break
        default:
          fastNoise.SetFractalType(FastNoiseLite.FractalType.FBm)
      }
      
      fastNoise.SetFractalOctaves(noiseSettings.fractalOctaves)
      fastNoise.SetFractalLacunarity(noiseSettings.fractalLacunarity)
      fastNoise.SetFractalGain(noiseSettings.fractalGain)
      
      // Set additional fractal properties if available
      if (noiseSettings.fractalWeightedStrength !== undefined) {
        fastNoise.SetFractalWeightedStrength(noiseSettings.fractalWeightedStrength)
      }
      if (noiseSettings.fractalPingPongStrength !== undefined) {
        fastNoise.SetFractalPingPongStrength(noiseSettings.fractalPingPongStrength)
      }
    }

    // Configure domain warp if enabled
    if (noiseSettings && noiseSettings.domainWarpAmp > 0) {
      fastNoise.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2)
      fastNoise.SetDomainWarpAmp(noiseSettings.domainWarpAmp)
    }
    
    return fastNoise
  }

  // Create density function for marching cubes
  const createDensityFunction = () => {
    const fastNoise = createNoiseGenerator()
    
    return (x: number, y: number, z: number): number => {
      if (use3D) {
        // Use 3D noise directly - invert for proper marching cubes convention
        return -fastNoise.GetNoise(x, y, z)
      } else {
        // Use 2D noise for height-based terrain
        const heightNoise = fastNoise.GetNoise(x, z)
        const terrainHeight = verticalOffset + (heightNoise * amplitude)
        
        // Convert to signed distance field
        // Negative values = inside surface, positive = outside
        return y - terrainHeight
      }
    }
  }

  // Generate smooth geometry using marching cubes
  const smoothGeometry = useMemo(() => {
    if (!isSmooth) return null
    
    const densityFunction = createDensityFunction()
    const result = generateMarchingCubes(sizeX, sizeY, sizeZ, densityFunction, isolevel, use3D)
    
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(result.vertices, 3))
    geometry.setAttribute('normal', new BufferAttribute(result.normals, 3))
    geometry.setIndex(new BufferAttribute(result.indices, 1))
    
    return geometry
  }, [sizeX, sizeY, sizeZ, isolevel, amplitude, verticalOffset, noiseSettings, updateTrigger, use3D, isSmooth])

  // Generate cube positions based on noise and isolevel
  const cubePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    
    // Noise parameters
    const heightMultiplier = amplitude // How tall the terrain can be (controlled by amplitude)
    const baseHeight = verticalOffset // Base terrain height (controlled by verticalOffset)
    
    if (use3D) {
      // Use 3D noise for true volumetric generation
      const fastNoise = createNoiseGenerator()
      
      for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
          for (let z = 0; z < sizeZ; z++) {
            // Generate 3D noise value for this position
            const noiseValue = fastNoise.GetNoise(x, y, z)
            
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
      const fastNoise = createNoiseGenerator()
      const isoNoise = createNoiseGenerator()
      isoNoise.SetSeed((noiseSettings?.seed || 12345) + 1000) // Different seed for isolation
      
      // Pre-calculate noise values for better performance
      const noiseMap = new Array(sizeX * sizeZ)
      const isoNoiseMap = new Array(sizeX * sizeZ)
      
      for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
          const index = x * sizeZ + z
          noiseMap[index] = fastNoise.GetNoise(x, z)
          isoNoiseMap[index] = isoNoise.GetNoise(x + 1000, z + 1000)
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

  // Conditional rendering based on smooth/blocky mode
  if (isSmooth) {
    return smoothGeometry ? (
      <mesh ref={smoothMeshRef} geometry={smoothGeometry}>
        <meshLambertMaterial color="#9c9c9cff" />
      </mesh>
    ) : null
  }

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxCubes]}>
      <boxGeometry args={[1.0, 1.0, 1.0]} />
      <meshLambertMaterial color="#9c9c9cff" />
    </instancedMesh>
  )
}
