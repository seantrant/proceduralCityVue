import { createStore } from 'vuex';
import navModule from './modules/nav'
import sceneViewModule from './modules/sceneView'
import simulationModule from './modules/simulation'
import simulationGridModule from './modules/simulationGrid'
import simulationCameraModule from './modules/simulationCamera'

export default createStore({
  state: {
    sceneVersion: 0,
  },
  modules: {
    nav: navModule,
    sceneView: sceneViewModule,
    simulation: simulationModule,
    simulationGrid: simulationGridModule,
    simulationCamera: simulationCameraModule,
  },
  getters: {
    navState: state => state.nav.items,
    getScene: state => state.sceneView,
  },
  mutations: {
    incrementSceneVersion (state) {
      state.sceneVersion += 1
    },

    changeNav (state, payload) {
      const navItem = state.nav.items.find(n => n.name === payload)
      if(navItem) navItem.open = !navItem.open
    },

    updateScene (state, payload) {
      state.sceneView = Object.assign({}, state.sceneView, payload)
    },

    updateDrawOnScene (state, payload) {
      state.sceneView.drawOnScene = Object.assign({}, state.sceneView.drawOnScene, payload)
    },

    updateGrid (state, payload) {
      state.sceneView.grid = Object.assign({}, state.sceneView.grid, payload)
    },

    updateCamera (state, payload) {
      state.sceneView.camera = Object.assign({}, state.sceneView.camera, payload)
    },

    replaceScene (state, payload) {
      const defaults = {
        drawOnScene: {
          gridLayout: false,
          buildings: true,
          floor: true
        },
        grid: {
          gridSize: 8,
          spacing: 1,
        },
        camera: {
          helicopter: false
        }
      }
      const incoming = payload || {}
      state.sceneView = {
        drawOnScene: Object.assign({}, defaults.drawOnScene, incoming.drawOnScene || {}),
        grid: Object.assign({}, defaults.grid, incoming.grid || {}),
        camera: Object.assign({}, defaults.camera, incoming.camera || {})
      }
      state.sceneVersion += 1
    }
  },
  actions: {}
});
