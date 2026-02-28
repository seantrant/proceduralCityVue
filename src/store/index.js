import { createStore } from 'vuex';

export default createStore({
  state: {
    nav: [
      { name: 'todo', open: false },
      { name: 'camera', open: false },
      { name: 'settings', open: true }
    ],
    scene: {
      drawOnScene: {
        gridLayout: false,
        buildings: true,
        floor: true
      },
      grid:{
        gridSize: 8,
      }
    }

  },
  getters: {
    navState: state => state.nav,
    getScene: state => state.scene,
  },
  mutations: {
    changeNav (state, payload) {
      state.nav.forEach( (navItem) => {
        navItem.open = (navItem.name === payload)
      })
    },

    updateScene (state, payload) {
      state.scene = Object.assign({}, state.scene, payload)
    },

    updateDrawOnScene (state, payload) {
      state.scene.drawOnScene = Object.assign({}, state.scene.drawOnScene, payload)
    },

    updateGrid (state, payload) {
      state.scene.grid = Object.assign({}, state.scene.grid, payload)
    },

    replaceScene (state, payload) {
      state.scene = payload
    }
  },
  actions: {}
});
