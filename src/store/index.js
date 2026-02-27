import Vue from "vue";
import Vuex from "vuex";

Vue.use(Vuex);

export default new Vuex.Store({
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
    getScene: getScene => getScene.scene,
  },
  mutations: {
    changeNav (state, payload) {
      state.nav.map( (navItem) => {
        if(navItem.name === payload){
          navItem.open = true
        }else{
          navItem.open = false
        }
      })
    },

    // Merge partial updates into the existing scene object so incremental
    // changes are reactive and don't trigger a full rebuild unless desired.
    updateScene (state, payload) {
      state.scene = Object.assign({}, state.scene, payload)
    },

    updateDrawOnScene (state, payload) {
      state.scene.drawOnScene = Object.assign({}, state.scene.drawOnScene, payload)
    },

    updateGrid (state, payload) {
      state.scene.grid = Object.assign({}, state.scene.grid, payload)
    },

    // Full replace used by the Generate action to trigger a complete rebuild
    replaceScene (state, payload) {
      state.scene = payload
    }
  },
  actions: {}
});
