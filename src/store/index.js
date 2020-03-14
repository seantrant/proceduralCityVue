// store/index.js

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
      buildings: {
        noOfBuildings: 20,
        noOfRows: 5,
        wireFrame: true
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

    updateSceneBuildings (state, payload) {
      state.scene.buildings = payload // problem this is not an observable
    }
  },
  actions: {}
});
