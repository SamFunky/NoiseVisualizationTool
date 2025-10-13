import { useState, useEffect } from 'react'

interface ChunkSizeControlsProps {
  onSizeChange: (size: { x: number; y: number; z: number }) => void
}

export function ChunkSizeControls({ onSizeChange }: ChunkSizeControlsProps) {
  const [sizeX, setSizeX] = useState(32)
  const [sizeY, setSizeY] = useState(32) 
  const [sizeZ, setSizeZ] = useState(32)

  // Handle mouse events to prevent camera controls interference
  const handleSliderMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handleSliderMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  // Call onSizeChange whenever size values change
  useEffect(() => {
    onSizeChange({ x: sizeX, y: sizeY, z: sizeZ })
  }, [sizeX, sizeY, sizeZ, onSizeChange])

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#181c20',
        border: '1px solid #3c4043',
        borderRadius: '8px',
        padding: '12px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        fontFamily: 'system-ui, sans-serif',
        color: '#ffffff',
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 1000
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseMove={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 'bold', marginRight: '8px' }}>
        📐 Chunk Size:
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ minWidth: '20px', color: '#888' }}>X:</label>
        <input
          type="range"
          min="8"
          max="128"
          step="1"
          value={sizeX}
          onChange={(e) => setSizeX(Number(e.target.value))}
          onMouseDown={handleSliderMouseDown}
          onMouseMove={handleSliderMouseMove}
          style={{
            width: '80px',
            accentColor: '#4CAF50'
          }}
        />
        <div style={{ 
          background: '#2a2d30', 
          padding: '4px 8px', 
          borderRadius: '4px',
          minWidth: '30px',
          textAlign: 'center'
        }}>
          {sizeX}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ minWidth: '20px', color: '#888' }}>Y:</label>
        <input
          type="range"
          min="8"
          max="128"
          step="1"
          value={sizeY}
          onChange={(e) => setSizeY(Number(e.target.value))}
          onMouseDown={handleSliderMouseDown}
          onMouseMove={handleSliderMouseMove}
          style={{
            width: '80px',
            accentColor: '#4CAF50'
          }}
        />
        <div style={{ 
          background: '#2a2d30', 
          padding: '4px 8px', 
          borderRadius: '4px',
          minWidth: '30px',
          textAlign: 'center'
        }}>
          {sizeY}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ minWidth: '20px', color: '#888' }}>Z:</label>
        <input
          type="range"
          min="8"
          max="128"
          step="1"
          value={sizeZ}
          onChange={(e) => setSizeZ(Number(e.target.value))}
          onMouseDown={handleSliderMouseDown}
          onMouseMove={handleSliderMouseMove}
          style={{
            width: '80px',
            accentColor: '#4CAF50'
          }}
        />
        <div style={{ 
          background: '#2a2d30', 
          padding: '4px 8px', 
          borderRadius: '4px',
          minWidth: '30px',
          textAlign: 'center'
        }}>
          {sizeZ}
        </div>
      </div>
      
      <div style={{ 
        fontSize: '10px', 
        color: '#666',
        marginLeft: '12px'
      }}>
        Total: {(sizeX * sizeY * sizeZ).toLocaleString()} voxels
      </div>
    </div>
  )
}
