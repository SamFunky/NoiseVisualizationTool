import { useRef, useEffect, useState } from 'react'
import FastNoiseLite from 'fastnoise-lite'
import type { NoiseSettings } from './Chunk'

interface NoisePreviewProps {
  noiseSettings: NoiseSettings
  autoUpdate: boolean
  onAutoUpdateChange: (value: boolean) => void
  onManualUpdate: () => void
  on3DModeChange: (is3D: boolean) => void
  onSmoothModeChange: (isSmooth: boolean) => void
  onMathExpressionChange: (expression: string) => void
  mathExpression?: string
  // New: external offsets binding so App can sync chunk
  offsetX?: number
  offsetZ?: number
  onOffsetsChange?: (x: number, z: number) => void
}

export function NoisePreview({ noiseSettings, autoUpdate, onAutoUpdateChange, onManualUpdate, on3DModeChange, onSmoothModeChange, onMathExpressionChange, mathExpression = "N", offsetX: propOffsetX, offsetZ: propOffsetZ, onOffsetsChange }: NoisePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 }) // Start in top left corner
  const [is3D, setIs3D] = useState(false) // Toggle between 2D and 3D noise for chunk generation
  const [zoomLevel, setZoomLevel] = useState(1.0) // Zoom level for noise preview (1.0 = normal, higher = more zoomed in)
  const [isSmooth, setIsSmooth] = useState(false) // Toggle between blocky and smooth rendering
  const dragOffset = useRef({ x: 0, y: 0 })
  // Offsets: use controlled props when provided, otherwise local state
  const [offsetXState, setOffsetXState] = useState(0)
  const [offsetZState, setOffsetZState] = useState(0)
  const offsetX = propOffsetX ?? offsetXState
  const offsetZ = propOffsetZ ?? offsetZState

  const setOffsetX = (v: number) => {
    if (onOffsetsChange) onOffsetsChange(v, offsetZ)
    else setOffsetXState(v)
  }
  const setOffsetZ = (v: number) => {
    if (onOffsetsChange) onOffsetsChange(offsetX, v)
    else setOffsetZState(v)
  }

  // Helper to build base and warp engines (mirrors Chunk.tsx)
  const buildEngines = () => {
    const seed = noiseSettings.seed
    const frequency = noiseSettings.frequency

    const base = new FastNoiseLite()
    base.SetSeed(seed)
    base.SetFrequency(frequency)
    switch (noiseSettings.noiseType) {
      case 'Perlin': base.SetNoiseType(FastNoiseLite.NoiseType.Perlin); break
      case 'OpenSimplex2': base.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2); break
      case 'OpenSimplex2S': base.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2S); break
      case 'Cellular':
        base.SetNoiseType(FastNoiseLite.NoiseType.Cellular)
        base.SetCellularDistanceFunction(FastNoiseLite.CellularDistanceFunction.EuclideanSq)
        base.SetCellularReturnType(FastNoiseLite.CellularReturnType.Distance)
        break
      case 'ValueCubic': base.SetNoiseType(FastNoiseLite.NoiseType.ValueCubic); break
      case 'Value': base.SetNoiseType(FastNoiseLite.NoiseType.Value); break
      default: base.SetNoiseType(FastNoiseLite.NoiseType.OpenSimplex2)
    }
    if (noiseSettings.fractalType !== 'None') {
      switch (noiseSettings.fractalType) {
        case 'FBm': base.SetFractalType(FastNoiseLite.FractalType.FBm); break
        case 'Ridged': base.SetFractalType(FastNoiseLite.FractalType.Ridged); break
        case 'PingPong': base.SetFractalType(FastNoiseLite.FractalType.PingPong); break
        default: base.SetFractalType(FastNoiseLite.FractalType.None); break
      }
      if (noiseSettings.fractalType === 'FBm' || noiseSettings.fractalType === 'Ridged' || noiseSettings.fractalType === 'PingPong') {
        base.SetFractalOctaves(noiseSettings.fractalOctaves)
        base.SetFractalLacunarity(noiseSettings.fractalLacunarity)
        base.SetFractalGain(noiseSettings.fractalGain)
        if (noiseSettings.fractalWeightedStrength !== undefined) base.SetFractalWeightedStrength(noiseSettings.fractalWeightedStrength)
        if (noiseSettings.fractalPingPongStrength !== undefined) base.SetFractalPingPongStrength(noiseSettings.fractalPingPongStrength)
      }
    }

    let warp: FastNoiseLite | undefined
    let warpY: FastNoiseLite | undefined
    const warpAmp = noiseSettings.domainWarpAmp ?? 0
    const warpFractalType = noiseSettings.domainWarpFractalType ?? 'None'
    if (warpAmp !== 0 || warpFractalType !== 'None') {
      const wSeed = (noiseSettings.domainWarpSeed ?? seed + 9999)
      const wFreq = (noiseSettings.domainWarpFrequency ?? frequency)
      warp = new FastNoiseLite()
      warp.SetSeed(wSeed)
      warp.SetFrequency(wFreq)
      switch (noiseSettings.domainWarpType) {
        case 'OpenSimplex2Reduced': warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2Reduced); break
        case 'BasicGrid': warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.BasicGrid); break
        default: warp.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2); break
      }
      warp.SetDomainWarpAmp(warpAmp)
      if (typeof warp.SetDomainWarpFrequency === 'function' && noiseSettings.domainWarpFrequency != null) {
        warp.SetDomainWarpFrequency(noiseSettings.domainWarpFrequency)
      }
      switch (warpFractalType) {
        case 'Progressive':
          if (typeof warp.SetDomainWarpFractalType === 'function') warp.SetDomainWarpFractalType(FastNoiseLite.DomainWarpFractalType.Progressive)
          else warp.SetFractalType(FastNoiseLite.FractalType.DomainWarpProgressive)
          break
        case 'Independent':
          if (typeof warp.SetDomainWarpFractalType === 'function') warp.SetDomainWarpFractalType(FastNoiseLite.DomainWarpFractalType.Independent)
          else warp.SetFractalType(FastNoiseLite.FractalType.DomainWarpIndependent)
          break
        default:
          if (typeof warp.SetDomainWarpFractalType === 'function') warp.SetDomainWarpFractalType(FastNoiseLite.DomainWarpFractalType.None)
          else warp.SetFractalType(FastNoiseLite.FractalType.None)
          break
      }
      if (warpFractalType !== 'None') {
        if (typeof warp.SetDomainWarpFractalOctaves === 'function') warp.SetDomainWarpFractalOctaves(noiseSettings.domainWarpFractalOctaves)
        else warp.SetFractalOctaves(noiseSettings.domainWarpFractalOctaves)
        if (typeof warp.SetDomainWarpFractalLacunarity === 'function') warp.SetDomainWarpFractalLacunarity(noiseSettings.domainWarpFractalLacunarity)
        else warp.SetFractalLacunarity(noiseSettings.domainWarpFractalLacunarity)
        if (typeof warp.SetDomainWarpFractalGain === 'function') warp.SetDomainWarpFractalGain(noiseSettings.domainWarpFractalGain)
        else warp.SetFractalGain(noiseSettings.domainWarpFractalGain)
      }

      // Second axis for manual fallback
      warpY = new FastNoiseLite()
      warpY.SetSeed(wSeed + 1337)
      warpY.SetFrequency(wFreq)
    }
    return { base, warp, warpY }
  }

  // FBM helper used for manual warp
  const fbm2D = (noise: FastNoiseLite, x: number, y: number, oct: number, lac: number, gain: number) => {
    let amp = 1, freq = 1, sum = 0, norm = 0
    for (let i = 0; i < Math.max(1, oct); i++) {
      sum += amp * noise.GetNoise(x * freq, y * freq)
      norm += amp
      amp *= gain
      freq *= lac
    }
    return sum / (norm || 1)
  }

  // Generate noise texture - always show 2D preview
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 128  // Reduced from 256 for better performance
    const height = 128
    canvas.width = width
    canvas.height = height

    const imageData = ctx.createImageData(width, height)
    const data = imageData.data

    const { base, warp, warpY } = buildEngines()

    const amp = noiseSettings.domainWarpAmp ?? 0
    const useWarp = !!warp && amp !== 0
    const oct = noiseSettings.domainWarpFractalType !== 'None' ? noiseSettings.domainWarpFractalOctaves : 1
    const lac = noiseSettings.domainWarpFractalLacunarity ?? 2.0
    const gain = noiseSettings.domainWarpFractalGain ?? 0.5

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Apply zoom level and offsets
        const centerOffset = 16 // Half of 32 (chunk size)
        let nx = ((x / width * 32) - centerOffset) / zoomLevel + centerOffset + offsetX
        let nz = ((y / height * 32) - centerOffset) / zoomLevel + centerOffset + offsetZ

        if (useWarp) {
          // Manual domain warp: two independent offsets
          const wy = warpY ?? warp!
          const dx = fbm2D(warp!, nx, nz, oct, lac, gain) * amp
          const dy = fbm2D(wy, nx + 123.45, nz - 987.65, oct, lac, gain) * amp
          nx += dx
          nz += dy
        }

        // Generate raw noise value
        // Domain warp is applied automatically by FastNoiseLite when configured
        const noiseValue = base.GetNoise(nx, nz)
        
        // Convert raw noise (-1 to 1) directly to grayscale (0-255)
        // This shows the pure noise pattern without terrain modifications
        const intensity = Math.floor(((noiseValue + 1) / 2) * 255)

        const index = (y * width + x) * 4
        data[index] = intensity     // Red
        data[index + 1] = intensity // Green  
        data[index + 2] = intensity // Blue
        data[index + 3] = 255       // Alpha
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }, [noiseSettings, zoomLevel, offsetX, offsetZ])

  // Dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return
    
    // Only allow dragging from the header area, not the canvas
    const rect = containerRef.current.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    
    // Only drag if clicking in the header area (first 30px)
    if (clickY > 30) return
    
    e.preventDefault()
    setIsDragging(true)
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return
    
    setPosition({
      x: e.clientX - dragOffset.current.x,
      y: e.clientY - dragOffset.current.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className="noise-preview"
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: '280px',
        background: '#181c20',
        border: '1px solid #3c4043',
        borderRadius: '8px',
        padding: '12px',
        zIndex: 1000,
        cursor: 'default',
        fontFamily: 'system-ui, sans-serif',
        color: '#ffffff',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
      }}
      onMouseDown={handleMouseDown}
    >
      <div style={{ 
        marginBottom: '8px', 
        fontWeight: 'bold',
        borderBottom: '1px solid #3c4043',
        paddingBottom: '6px',
        cursor: 'move',
        userSelect: 'none'
      }}>
        🔧 Noise Preview
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '200px',
            height: '200px',
            border: '1px solid #3c4043',
            borderRadius: '4px',
            imageRendering: 'pixelated'
          }}
        />
      </div>
      
      <div style={{
        fontSize: '10px',
        color: '#888',
        textAlign: 'center',
        marginBottom: '8px'
      }}>
        32×32 2D noise preview<br/>
        {is3D ? 'Terrain uses 3D noise' : 'Terrain uses 2D noise'}<br/>
        White: High | Black: Low
      </div>
      
      {/* Zoom Control */}
      <div style={{
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #3c4043'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <label style={{
            fontSize: '11px',
            color: '#ccc',
            fontWeight: 'bold'
          }}>
            Preview Zoom
          </label>
          <span style={{
            fontSize: '10px',
            color: '#888',
            fontFamily: 'monospace'
          }}>
            {zoomLevel.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min="0.01"
          max="1.00"
          step="0.01"
          value={zoomLevel}
          onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            background: 'linear-gradient(to right, #4CAF50 0%, #4CAF50 ' + ((zoomLevel - 0.01) / 0.99 * 100) + '%, #3c4043 ' + ((zoomLevel - 0.01) / 0.99 * 100) + '%, #3c4043 100%)',
            outline: 'none',
            borderRadius: '3px',
            appearance: 'none',
            cursor: 'pointer',
            border: '1px solid #2a2d30'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '9px',
          color: '#666',
          marginTop: '2px'
        }}>
          <span>0.01x</span>
          <span>1.00x</span>
        </div>
      </div>
      
      {/* Offsets Control */}
      <div style={{
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #3c4043'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <label style={{ fontSize: '11px', color: '#ccc', fontWeight: 'bold' }}>Offsets</label>
          <button
            onClick={() => { setOffsetX(0); setOffsetZ(0) }}
            style={{
              padding: '2px 6px',
              fontSize: '10px',
              backgroundColor: '#2a2d30',
              color: '#ccc',
              border: '1px solid #3c4043',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >Reset</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{ width: 14, color: '#aaa', fontSize: '10px' }}>X</span>
          <input
            type="range"
            min={-64}
            max={64}
            step={0.1}
            value={offsetX}
            onChange={(e) => setOffsetX(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={offsetX}
            step={0.1}
            onChange={(e) => setOffsetX(Number(e.target.value))}
            style={{ width: '70px', background: '#2a2d30', color: '#fff', border: '1px solid #3c4043', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 14, color: '#aaa', fontSize: '10px' }}>Z</span>
          <input
            type="range"
            min={-64}
            max={64}
            step={0.1}
            value={offsetZ}
            onChange={(e) => setOffsetZ(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <input
            type="number"
            value={offsetZ}
            step={0.1}
            onChange={(e) => setOffsetZ(Number(e.target.value))}
            style={{ width: '70px', background: '#2a2d30', color: '#fff', border: '1px solid #3c4043', borderRadius: 4, padding: '4px 6px', fontSize: 11 }}
          />
        </div>
      </div>
      
      {/* Math Expression Control */}
      <div style={{
        marginBottom: '8px',
        paddingBottom: '8px',
        borderBottom: '1px solid #3c4043'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '4px'
        }}>
          <label style={{
            fontSize: '11px',
            color: '#ccc',
            fontWeight: 'bold'
          }}>
            Math Expression
          </label>
          <span style={{
            fontSize: '9px',
            color: '#888'
          }}>
            Use "N" for noise
          </span>
        </div>
        <input
          type="text"
          value={mathExpression}
          onChange={(e) => onMathExpressionChange(e.target.value)}
          placeholder="N"
          style={{
            width: '100%',
            padding: '6px 8px',
            fontSize: '11px',
            backgroundColor: '#2a2d30',
            border: '1px solid #3c4043',
            borderRadius: '4px',
            color: '#ffffff',
            fontFamily: 'monospace',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#4CAF50'}
          onBlur={(e) => e.target.style.borderColor = '#3c4043'}
        />
        <div style={{
          fontSize: '9px',
          color: '#666',
          marginTop: '3px',
          lineHeight: '1.2'
        }}>
          Examples: N^2, |N|*1000, |N+0.5|^3, (N+1)^3*500
        </div>
      </div>
      
      {/* Update Controls */}
      <div style={{
        paddingTop: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px'
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px',
            cursor: 'pointer',
            userSelect: 'none'
          }}>
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => onAutoUpdateChange(e.target.checked)}
              style={{
                width: '12px',
                height: '12px',
                accentColor: '#4CAF50'
              }}
            />
            Auto Update
          </label>
          
          <button
            onClick={onManualUpdate}
            disabled={autoUpdate}
            style={{
              padding: '4px 8px',
              fontSize: '10px',
              backgroundColor: autoUpdate ? '#2a2d30' : '#4CAF50',
              color: autoUpdate ? '#666' : '#ffffff',
              border: '1px solid #3c4043',
              borderRadius: '3px',
              cursor: autoUpdate ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            Update 3D
          </button>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '11px'
        }}>
          <span style={{ color: '#ccc', fontSize: '10px' }}>2D</span>
          <div 
            onClick={() => {
              const newIs3D = !is3D
              setIs3D(newIs3D)
              on3DModeChange(newIs3D)
            }}
            style={{
              position: 'relative',
              width: '44px',
              height: '20px',
              backgroundColor: is3D ? '#4CAF50' : '#3c4043',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              border: '1px solid #2a2d30'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '1px',
              left: is3D ? '23px' : '1px',
              width: '18px',
              height: '18px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }} />
          </div>
          <span style={{ color: '#ccc', fontSize: '10px' }}>3D</span>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '11px'
        }}>
          <span style={{ color: '#ccc', fontSize: '10px', width: '35px', textAlign: 'right' }}>Blocky</span>
          <div 
            onClick={() => {
              const newIsSmooth = !isSmooth
              setIsSmooth(newIsSmooth)
              onSmoothModeChange(newIsSmooth)
            }}
            style={{
              position: 'relative',
              width: '44px',
              height: '20px',
              backgroundColor: isSmooth ? '#4CAF50' : '#3c4043',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
              border: '1px solid #2a2d30'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '1px',
              left: isSmooth ? '24px' : '2px',
              width: '18px',
              height: '18px',
              backgroundColor: '#ffffff',
              borderRadius: '50%',
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
            }} />
          </div>
          <span style={{ color: '#ccc', fontSize: '10px', width: '35px', textAlign: 'left' }}>Smooth</span>
        </div>
      </div>
    </div>
  )
}
