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

    updateScene (state, payload) {
      state.scene = payload
    },

    // updateDrawOnScene (state, payload) {
    //   state.scene.drawOnScene = payload // problem this is not an observable
    // }
  },
  actions: {}
});
