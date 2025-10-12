<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Noise Visualization Tool - Copilot Instructions

This is a 3D noise visualization web application built with React, TypeScript, and Three.js. The project creates a Minecraft-style chunk visualization with the following architecture:

## Tech Stack
- **React**: App logic, state management, JSX
- **React Three Fiber (R3F)**: React renderer for Three.js scenes
- **Three.js**: WebGL 3D rendering, cubes, lights, shadows
- **Drei**: Handy utilities like OrbitControls for R3F
- **Leva**: UI controls and parameter sliders
- **Open Simplex Noise**: Terrain pattern generation
- **Vite**: Build pipeline and dev server
- **TypeScript**: Type safety

## Project Goals
- Display a 32x32x32 chunk cube made of smaller cubes
- Use isometric/3D view with camera controls
- Generate terrain patterns using noise functions
- Provide UI controls to adjust noise parameters
- Render cubes vs air based on noise values
- Keep the codebase simple and experimental

## Coding Guidelines
- Use React Three Fiber for 3D components
- Prefer functional components with hooks
- Use TypeScript for all files
- Keep 3D logic modular and reusable
- Use Leva for parameter controls
- Follow React best practices
