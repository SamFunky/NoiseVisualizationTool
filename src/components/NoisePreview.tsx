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
}

export function NoisePreview({ noiseSettings, autoUpdate, onAutoUpdateChange, onManualUpdate, on3DModeChange, onSmoothModeChange, onMathExpressionChange, mathExpression = "N" }: NoisePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 }) // Start in top left corner
  const [is3D, setIs3D] = useState(false) // Toggle between 2D and 3D noise for chunk generation
  const [zoomLevel, setZoomLevel] = useState(1.0) // Zoom level for noise preview (1.0 = normal, higher = more zoomed in)
  const [isSmooth, setIsSmooth] = useState(false) // Toggle between blocky and smooth rendering
  const dragOffset = useRef({ x: 0, y: 0 })

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

    // Use FastNoiseLite for preview visualization
    const fastNoise = new FastNoiseLite()
    fastNoise.SetSeed(noiseSettings.seed)
    fastNoise.SetFrequency(noiseSettings.frequency)
    
    // Configure noise type based on settings
    switch (noiseSettings.noiseType) {
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
    if (noiseSettings.fractalType !== 'None') {
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
    if (noiseSettings.domainWarpAmp > 0) {
      fastNoise.SetDomainWarpType(FastNoiseLite.DomainWarpType.OpenSimplex2)
      fastNoise.SetDomainWarpAmp(noiseSettings.domainWarpAmp)
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Apply zoom level to the coordinates - higher zoom = more detailed view
        // Center the zoom by offsetting coordinates to zoom from the center
        const centerOffset = 16 // Half of 32 (chunk size)
        const nx = ((x / width * 32) - centerOffset) / zoomLevel + centerOffset
        const nz = ((y / height * 32) - centerOffset) / zoomLevel + centerOffset

        // Generate raw noise value
        const noiseValue = fastNoise.GetNoise(nx, nz)
        
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
  }, [noiseSettings, zoomLevel])

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
