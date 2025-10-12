# Noise Visualization Tool

A 3D noise visualization web application that displays Minecraft-style chunk terrain using procedural noise generation.

## Features

- 32x32x32 voxel chunk visualization
- Isometric 3D view with camera controls
- Real-time noise parameter adjustment
- Interactive UI controls
- WebGL-powered 3D rendering

## Tech Stack

- **React** - App logic and state management
- **React Three Fiber (R3F)** - React renderer for Three.js
- **Three.js** - WebGL 3D rendering
- **Drei** - Useful R3F utilities (OrbitControls, etc.)
- **Leva** - GUI controls for parameters
- **Open Simplex Noise** - Terrain generation
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the provided localhost URL

## Development

The project uses Vite for fast development with hot module replacement (HMR).

## Architecture

- **React**: Handles app state and UI logic
- **R3F**: Converts JSX components to Three.js scene objects
- **Three.js**: Performs actual WebGL rendering of cubes, lights, and shadows
- **Drei**: Provides handy utilities like `<OrbitControls />` for camera interaction
- **Leva**: Creates sliders and controls to tweak noise parameters
- **Open Simplex Noise**: Generates terrain patterns for the chunk

## Building

To build for production:
```bash
npm run build
```
