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
}

export interface GridConfig {
  gridSize: number
  spacing?: number
}

export interface CameraConfig {
  helicopter: boolean
}

export interface SceneViewState {
  drawOnScene: DrawOnScene
  grid: GridConfig
  camera: CameraConfig
}

export interface MiniMapClickPayload {
  x: number
  z: number
}

export const defaultDrawOnScene: DrawOnScene = {
  gridLayout: false,
  buildings: true,
  floor: true,
}

export const defaultGridConfig: GridConfig = {
  gridSize: 8,
  spacing: 1,
}

export const defaultCameraConfig: CameraConfig = {
  helicopter: false,
}
