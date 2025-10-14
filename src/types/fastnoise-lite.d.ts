declare module 'fastnoise-lite' {
  export default class FastNoiseLite {
    constructor()
    
    // Noise generation methods
    GetNoise(x: number, y: number): number
    GetNoise(x: number, y: number, z: number): number
    
    // Configuration methods
    SetSeed(seed: number): void
    SetFrequency(frequency: number): void
    SetNoiseType(noiseType: string): void
    SetRotationType3D(rotationType3D: string): void
    
    // Fractal configuration
    SetFractalType(fractalType: string): void
    SetFractalOctaves(octaves: number): void
    SetFractalLacunarity(lacunarity: number): void
    SetFractalGain(gain: number): void
    SetFractalWeightedStrength(weightedStrength: number): void
    SetFractalPingPongStrength(pingPongStrength: number): void
    
    // Cellular configuration
    SetCellularDistanceFunction(cellularDistanceFunction: string): void
    SetCellularReturnType(cellularReturnType: string): void
    SetCellularJitter(cellularJitter: number): void
    
    // Domain warp configuration
    SetDomainWarpType(domainWarpType: string): void
    SetDomainWarpAmp(domainWarpAmp: number): void
    SetDomainWarpFractalType(domainWarpFractalType: string): void
    SetDomainWarpFractalOctaves(octaves: number): void
    SetDomainWarpFractalLacunarity(lacunarity: number): void
    SetDomainWarpFractalGain(gain: number): void
    
    // Static properties
    static NoiseType: {
      OpenSimplex2: string
      OpenSimplex2S: string
      Cellular: string
      Perlin: string
      ValueCubic: string
      Value: string
    }
    
    static RotationType3D: {
      None: string
      ImproveXYPlanes: string
      ImproveXZPlanes: string
    }
    
    static FractalType: {
      None: string
      FBm: string
      Ridged: string
      PingPong: string
      DomainWarpProgressive: string
      DomainWarpIndependent: string
    }
    
    static CellularDistanceFunction: {
      Euclidean: string
      EuclideanSq: string
      Manhattan: string
      Hybrid: string
    }
    
    static CellularReturnType: {
      CellValue: string
      Distance: string
      Distance2: string
      Distance2Add: string
      Distance2Sub: string
      Distance2Mul: string
      Distance2Div: string
    }
    
    static DomainWarpType: {
      OpenSimplex2: string
      OpenSimplex2Reduced: string
      BasicGrid: string
    }
    
    static DomainWarpFractalType: {
      None: string
      Progressive: string
      Independent: string
    }
  }
}
