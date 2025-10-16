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
  domainWarpSeed?: number
  domainWarpFrequency?: number
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
  mathExpression?: string // Math expression to transform noise values
  // New: offsets applied to X and Z axes before warping
  offsetX?: number
  offsetZ?: number
}

export function Chunk({ sizeX = 32, sizeY = 32, sizeZ = 32, isolevel = 0.0, amplitude = 8, verticalOffset = 8, noiseSettings, updateTrigger, use3D = false, isSmooth = false, mathExpression = "N", offsetX = 0, offsetZ = 0 }: ChunkProps) {
  const meshRef = useRef<InstancedMesh>(null)
  const smoothMeshRef = useRef<Mesh>(null)
  
  // Helper function to safely evaluate math expressions
  const evaluateMathExpression = (expression: string, noiseValue: number): number => {
    try {
      // Create a safe evaluation environment
      const N = noiseValue
      
      // Replace common math functions and operators
      let safeExpression = expression
        .replace(/\bN\b/g, N.toString())
        .replace(/Math\./g, 'Math.')
        // Convert |expression| to Math.abs(expression)
        .replace(/\|([^|]+)\|/g, 'Math.abs($1)')
        // Convert ^ operator to Math.pow() - handle parentheses and complex expressions
        .replace(/([^()]+|\([^)]*\))\s*\^\s*([^()]+|\([^)]*\))/g, 'Math.pow($1, $2)')
        // Handle nested ^ operators (right to left associativity)
        .replace(/([^()]+|\([^)]*\))\s*\^\s*([^()]+|\([^)]*\))/g, 'Math.pow($1, $2)')
      
      // Create a function that evaluates the expression safely
      const func = new Function('Math', `return ${safeExpression}`)
      const result = func(Math)
      
      // Return the result if it's a valid number, otherwise return original noise
      return isFinite(result) ? result : noiseValue
    } catch (error) {
      // If expression is invalid, return original noise value
      return noiseValue
    }
  }
  
  // Helper function to configure FastNoiseLite engines (base + optional warp)
  const createNoiseEngines = () => {
    const seed = noiseSettings?.seed ?? 12345
    const frequency = noiseSettings?.frequency ?? 0.01

    // Base noise used for sampling
    const base = new FastNoiseLite()
    base.SetSeed(seed)
    base.SetFrequency(frequency)
    // Map noise type from UI (capitalized values)
    switch (noiseSettings?.noiseType) {
      case 'Perlin':
        base.SetNoiseType(FastNoiseLite.NoiseType.Perlin)
        break
      case 'OpenSimplex2':
        base.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
        break
      case 'OpenSimplex2S':
        base.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2S)
        break
      case 'Cellular':
        base.SetNoiseType(FastNoiseLite.NoiseType.Cellular)
        base.SetCellularDistanceFunction(FastNoiseLite.CellularDistanceFunction.EuclideanSq)
        base.SetCellularReturnType(FastNoiseLite.CellularReturnType.Distance)
        break
      case 'ValueCubic':
        base.SetNoiseType(FastNoiseLite.NoiseType.ValueCubic)
        break
      case 'Value':
        base.SetNoiseType(FastNoiseLite.NoiseType.Value)
        break
      default:
        base.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
    }

    // Regular fractal for base sampling only (ignore DomainWarp* here)
    if (noiseSettings && noiseSettings.fractalType && noiseSettings.fractalType !== 'None') {
      switch (noiseSettings.fractalType) {
        case 'FBm':
          base.SetFractalType(FastNoiseLite.FractalType.FBm)
          break
        case 'Ridged':
          base.SetFractalType(FastNoiseLite.FractalType.Ridged)
          break
        case 'PingPong':
          base.SetFractalType(FastNoiseLite.FractalType.PingPong)
          break
        default:
          // If UI has DomainWarp* selected in the Fractal panel, don't apply to base
          base.SetFractalType(FastNoiseLite.FractalType.None)
          break
      }
      if (noiseSettings.fractalType === 'FBm' || noiseSettings.fractalType === 'Ridged' || noiseSettings.fractalType === 'PingPong') {
        base.SetFractalOctaves(noiseSettings.fractalOctaves)
        base.SetFractalLacunarity(noiseSettings.fractalLacunarity)
        base.SetFractalGain(noiseSettings.fractalGain)
        if (noiseSettings.fractalWeightedStrength !== undefined) base.SetFractalWeightedStrength(noiseSettings.fractalWeightedStrength)
        if (noiseSettings.fractalPingPongStrength !== undefined) base.SetFractalPingPongStrength(noiseSettings.fractalPingPongStrength)
      }
    }

    // Optional warp engine; use separate instance so settings don't conflict
    let warp: FastNoiseLite | undefined
    let warpY: FastNoiseLite | undefined // second axis for manual warp
    const warpAmp = noiseSettings?.domainWarpAmp ?? 0
    const warpFractalType = noiseSettings?.domainWarpFractalType ?? 'None'

    if (warpAmp !== 0 || warpFractalType !== 'None') {
      const wSeed = (noiseSettings?.domainWarpSeed ?? seed + 9999)
      const wFreq = (noiseSettings?.domainWarpFrequency ?? frequency)

      warp = new FastNoiseLite()
      warp.SetSeed(wSeed)
      warp.SetFrequency(wFreq)
      // Domain warp type
      switch (noiseSettings?.domainWarpType) {
        case 'OpenSimplex2Reduced':
          warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2Reduced)
          break
        case 'BasicGrid':
          warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.BasicGrid)
          break
        default:
          warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2)
          break
      }
      warp.SetDomainWarpAmp(warpAmp)
      // Dedicated domain warp frequency if API exists
      if (typeof warp.SetDomainWarpFrequency === 'function' && noiseSettings?.domainWarpFrequency != null) {
        warp.SetDomainWarpFrequency(noiseSettings.domainWarpFrequency)
      }
      // Domain warp fractal controls live in the same FractalType enum
      switch (warpFractalType) {
        case 'Progressive':
          // Prefer dedicated DomainWarpFractalType API if available
          if (typeof warp.SetDomainWarpFractalType === 'function') {
            warp.SetDomainWarpFractalType(FastNoiseLite.DomainWarpFractalType.Progressive)
          } else {
            warp.SetFractalType(FastNoiseLite.FractalType.DomainWarpProgressive)
          }
          break
        case 'Independent':
          if (typeof warp.SetDomainWarpFractalType === 'function') {
            warp.SetDomainWarpFractalType(FastNoiseLite.DomainWarpFractalType.Independent)
          } else {
            warp.SetFractalType(FastNoiseLite.FractalType.DomainWarpIndependent)
          }
          break
        default:
          if (typeof warp.SetDomainWarpFractalType === 'function') {
            warp.SetDomainWarpFractalType(FastNoiseLite.DomainWarpFractalType.None)
          } else {
            warp.SetFractalType(FastNoiseLite.FractalType.None)
          }
          break
      }
      if (warpFractalType !== 'None') {
        if (typeof warp.SetDomainWarpFractalOctaves === 'function') warp.SetDomainWarpFractalOctaves(noiseSettings!.domainWarpFractalOctaves)
        else warp.SetFractalOctaves(noiseSettings!.domainWarpFractalOctaves)
        if (typeof warp.SetDomainWarpFractalLacunarity === 'function') warp.SetDomainWarpFractalLacunarity(noiseSettings!.domainWarpFractalLacunarity)
        else warp.SetFractalLacunarity(noiseSettings!.domainWarpFractalLacunarity)
        if (typeof warp.SetDomainWarpFractalGain === 'function') warp.SetDomainWarpFractalGain(noiseSettings!.domainWarpFractalGain)
        else warp.SetFractalGain(noiseSettings!.domainWarpFractalGain)
      }

      // Prepare second axis for manual warp
      warpY = new FastNoiseLite()
      warpY.SetSeed(wSeed + 1337)
      warpY.SetFrequency(wFreq)
    }

    return { base, warp, warpY }
  }

  // FBM helpers for manual warp
  const fbm2D = (n: FastNoiseLite, x: number, y: number, oct: number, lac: number, gain: number) => {
    let amp = 1, freq = 1, sum = 0, norm = 0
    for (let i = 0; i < Math.max(1, oct); i++) {
      sum += amp * n.GetNoise(x * freq, y * freq)
      norm += amp
      amp *= gain
      freq *= lac
    }
    return sum / (norm || 1)
  }
  const fbm3D = (n: FastNoiseLite, x: number, y: number, z: number, oct: number, lac: number, gain: number) => {
    let amp = 1, freq = 1, sum = 0, norm = 0
    for (let i = 0; i < Math.max(1, oct); i++) {
      sum += amp * n.GetNoise(x * freq, y * freq, z * freq)
      norm += amp
      amp *= gain
      freq *= lac
    }
    return sum / (norm || 1)
  }

  // Create density function for marching cubes
  const createDensityFunction = () => {
    const { base, warp, warpY } = createNoiseEngines()

    // Pre-read warp params
    const ampW = noiseSettings?.domainWarpAmp ?? 0
    const octW = noiseSettings?.domainWarpFractalType !== 'None' ? noiseSettings!.domainWarpFractalOctaves : 1
    const lacW = noiseSettings?.domainWarpFractalLacunarity ?? 2.0
    const gainW = noiseSettings?.domainWarpFractalGain ?? 0.5

    const applyWarp2D = (x: number, y: number) => {
      if (!warp || ampW === 0) return { x, y }
      const wy = warpY ?? warp
      const dx = fbm2D(warp, x, y, octW, lacW, gainW) * ampW
      const dy = fbm2D(wy, x + 123.45, y - 987.65, octW, lacW, gainW) * ampW
      return { x: x + dx, y: y + dy }
    }

    const applyWarp3D = (x: number, y: number, z: number) => {
      if (!warp || ampW === 0) return { x, y, z }
      const wy = warpY ?? warp
      const dx = fbm3D(warp, x, y, z, octW, lacW, gainW) * ampW
      const dy = fbm3D(wy, x + 11.11, y + 22.22, z - 33.33, octW, lacW, gainW) * ampW
      const dz = fbm3D(warp, x - 44.44, y + 55.55, z + 66.66, octW, lacW, gainW) * ampW
      return { x: x + dx, y: y + dy, z: z + dz }
    }

    return (x: number, y: number, z: number): number => {
      if (use3D) {
        // Apply offsets on X/Z first
        const p = applyWarp3D(x + offsetX, y, z + offsetZ)
        const rawNoise = -base.GetNoise(p.x, p.y, p.z)
        return evaluateMathExpression(mathExpression, rawNoise)
      } else {
        const p = applyWarp2D(x + offsetX, z + offsetZ)
        const heightNoise = base.GetNoise(p.x, p.y)
        const transformedNoise = evaluateMathExpression(mathExpression, heightNoise)
        const terrainHeight = verticalOffset + (transformedNoise * amplitude)
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
  }, [sizeX, sizeY, sizeZ, isolevel, amplitude, verticalOffset, noiseSettings, updateTrigger, use3D, isSmooth, mathExpression, offsetX, offsetZ])

  // Generate cube positions based on noise and isolevel
  const cubePositions = useMemo(() => {
    const positions: [number, number, number][] = []
    const heightMultiplier = amplitude
    const baseHeight = verticalOffset

    if (use3D) {
      const { base, warp, warpY } = createNoiseEngines()
      const ampW = noiseSettings?.domainWarpAmp ?? 0
      const octW = noiseSettings?.domainWarpFractalType !== 'None' ? noiseSettings!.domainWarpFractalOctaves : 1
      const lacW = noiseSettings?.domainWarpFractalLacunarity ?? 2.0
      const gainW = noiseSettings?.domainWarpFractalGain ?? 0.5
      for (let x = 0; x < sizeX; x++) {
        for (let y = 0; y < sizeY; y++) {
          for (let z = 0; z < sizeZ; z++) {
            let wx = x + offsetX, wy = y, wz = z + offsetZ
            if (warp && ampW !== 0) {
              const wyN = warpY ?? warp
              const dx = fbm3D(warp, wx, wy, wz, octW, lacW, gainW) * ampW
              const dy = fbm3D(wyN, wx + 11.11, wy + 22.22, wz - 33.33, octW, lacW, gainW) * ampW
              const dz = fbm3D(warp, wx - 44.44, wy + 55.55, wz + 66.66, octW, lacW, gainW) * ampW
              wx += dx; wy += dy; wz += dz
            }
            const rawNoise = base.GetNoise(wx, wy, wz)
            const noiseValue = evaluateMathExpression(mathExpression, rawNoise)
            if (noiseValue > isolevel) {
              const centeredX = x - sizeX / 2 + 0.5
              const centeredY = y - sizeY / 2 + 0.5
              const centeredZ = z - sizeZ / 2 + 0.5
              positions.push([centeredX, centeredY, centeredZ])
            }
          }
        }
      }
    } else {
      const { base, warp, warpY } = createNoiseEngines()
      const ampW = noiseSettings?.domainWarpAmp ?? 0
      const octW = noiseSettings?.domainWarpFractalType !== 'None' ? noiseSettings!.domainWarpFractalOctaves : 1
      const lacW = noiseSettings?.domainWarpFractalLacunarity ?? 2.0
      const gainW = noiseSettings?.domainWarpFractalGain ?? 0.5
      const iso = createNoiseEngines().base
      iso.SetSeed((noiseSettings?.seed || 12345) + 1000)
      const noiseMap = new Array(sizeX * sizeZ)
      const isoNoiseMap = new Array(sizeX * sizeZ)
      for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
          const index = x * sizeZ + z
          let wx = x + offsetX, wz = z + offsetZ
          if (warp && ampW !== 0) {
            const wyN = warpY ?? warp
            const dx = fbm2D(warp, wx, wz, octW, lacW, gainW) * ampW
            const dy = fbm2D(wyN, wx + 123.45, wz - 987.65, octW, lacW, gainW) * ampW
            wx += dx; wz += dy
          }
          noiseMap[index] = base.GetNoise(wx, wz)
          isoNoiseMap[index] = iso.GetNoise(x + 1000, z + 1000)
        }
      }
      for (let x = 0; x < sizeX; x++) {
        for (let z = 0; z < sizeZ; z++) {
          const index = x * sizeZ + z
          const rawNoise = noiseMap[index]
          const transformedNoise = evaluateMathExpression(mathExpression, rawNoise)
          const height = Math.floor(baseHeight + (transformedNoise * heightMultiplier))
          for (let y = 0; y <= height && y < sizeY; y++) {
            const isoNoiseValue = isoNoiseMap[index]
            if (isoNoiseValue > isolevel) {
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
  }, [sizeX, sizeY, sizeZ, isolevel, amplitude, verticalOffset, noiseSettings, updateTrigger, use3D, mathExpression, offsetX, offsetZ])

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
