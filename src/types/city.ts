export type GridContents = 'building' | 'road' | 'junction' | null

export interface GridCoords {
  x: number
  y: number
}

export interface GridCell {
  id: number
  coords: GridCoords
  contents: GridContents
}

export interface DrawOnScene {
  gridLayout: boolean
  buildings: boolean
  floor: boolean
  roofLights: boolean
  traffic: boolean
  airTraffic: boolean
}

export interface GridConfig {
  gridSize: number
  spacing?: number
}

export interface CameraConfig {
  helicopter: boolean
}

export interface InputConfig {
  mouseSensitivity: number
  moveSpeed: number
  acceleration: number
  friction: number
}

export interface AtmosphereConfig {
  preset: 'dusk' | 'night'
  fogEnabled: boolean
  fogDensity: number
}

export interface SceneViewState {
  drawOnScene: DrawOnScene
  grid: GridConfig
  camera: CameraConfig
  atmosphere: AtmosphereConfig
  input: InputConfig
  trafficConfig: TrafficConfig
  airTrafficConfig: AirTrafficConfig
  pointerLockRequestToken: number
}

export interface MiniMapClickPayload {
  x: number
  z: number
}

export const defaultDrawOnScene: DrawOnScene = {
  gridLayout: true,
  buildings: true,
  floor: true,
  roofLights: true,
  traffic: true,
  airTraffic: true,
}

export const defaultGridConfig: GridConfig = {
  gridSize: 40,
  spacing: 1,
}

export const defaultCameraConfig: CameraConfig = {
  helicopter: true,
}

export const defaultAtmosphereConfig: AtmosphereConfig = {
  preset: 'night',
  fogEnabled: true,
  fogDensity: 0.0007,
}

export const defaultInputConfig: InputConfig = {
  mouseSensitivity: 0.0025,
  moveSpeed: 5.0,
  acceleration: 30.0,
  friction: 10.0,
}

export interface TrafficConfig {
  density: number
  minSpeed: number
  maxSpeed: number
  showTrafficPaths: boolean
}

export const defaultTrafficConfig: TrafficConfig = {
  density: 100,
  minSpeed: 0.1,
  maxSpeed: 0.5,
  showTrafficPaths: false,
}

export interface AirTrafficConfig {
  planeCount: number
  helicopterCount: number
  planeMinSpeed: number
  planeMaxSpeed: number
  heliMinSpeed: number
  heliMaxSpeed: number
  planeAltitude: number
  heliAltitude: number
  respawnDelayMin: number
  respawnDelayMax: number
}

export const defaultAirTrafficConfig: AirTrafficConfig = {
  planeCount: 2,
  helicopterCount: 1,
  planeMinSpeed: 8,
  planeMaxSpeed: 14,
  heliMinSpeed: 2,
  heliMaxSpeed: 4,
  planeAltitude: 15,
  heliAltitude: 8,
  respawnDelayMin: 2,
  respawnDelayMax: 8,
}
