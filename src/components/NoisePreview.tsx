import { useRef, useEffect, useState } from 'react'
import { makeNoise2D } from 'open-simplex-noise'
import type { NoiseSettings } from './Chunk'

interface NoisePreviewProps {
  noiseSettings: NoiseSettings
  autoUpdate: boolean
  onAutoUpdateChange: (value: boolean) => void
  onManualUpdate: () => void
}

export function NoisePreview({ noiseSettings, autoUpdate, onAutoUpdateChange, onManualUpdate }: NoisePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: 20, y: 20 }) // Start in top left corner
  const dragOffset = useRef({ x: 0, y: 0 })

  // Generate noise texture
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

    // Create noise generator with current settings
    const noise2D = makeNoise2D(noiseSettings.seed)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width * 32 // Scale to match chunk size
        const nz = y / height * 32

        // Generate raw noise value (pure noise pattern)
        const noiseValue = noise2D(nx * noiseSettings.frequency, nz * noiseSettings.frequency)
        
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
  }, [noiseSettings])

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
        32×32 raw noise pattern<br/>
        White: High | Black: Low
      </div>
      
      {/* Update Controls */}
      <div style={{
        borderTop: '1px solid #3c4043',
        paddingTop: '8px',
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
    </div>
  )
}
