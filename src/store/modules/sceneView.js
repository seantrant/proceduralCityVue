import {
  defaultCameraConfig,
  defaultDrawOnScene,
  defaultGridConfig,
} from '@/types/city'

export const buildDefaultSceneView = () => ({
  drawOnScene: { ...defaultDrawOnScene },
  grid: { ...defaultGridConfig },
  camera: { ...defaultCameraConfig }
})

export default {
  namespaced: true,
  state: () => buildDefaultSceneView(),
  getters: {
    getScene: state => state,
  },
  mutations: {
    updateScene(state, payload) {
      Object.assign(state, payload || {})
    },
    updateDrawOnScene(state, payload) {
      state.drawOnScene = Object.assign({}, state.drawOnScene, payload || {})
    },
    updateGrid(state, payload) {
      state.grid = Object.assign({}, state.grid, payload || {})
    },
    updateCamera(state, payload) {
      state.camera = Object.assign({}, state.camera, payload || {})
    },
    replaceScene(state, payload) {
      const base = buildDefaultSceneView()
      const incoming = payload || {}
      state.drawOnScene = Object.assign({}, base.drawOnScene, incoming.drawOnScene || {})
      state.grid = Object.assign({}, base.grid, incoming.grid || {})
      state.camera = Object.assign({}, base.camera, incoming.camera || {})
    }
  }
}
