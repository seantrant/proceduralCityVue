import { createStore } from 'vuex';
import navModule from './modules/nav';
import sceneViewModule from './modules/sceneView';
import simulationModule from './modules/simulation';
import simulationGridModule from './modules/simulationGrid';
import simulationCameraModule from './modules/simulationCamera';

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
    incrementSceneVersion(state) {
      state.sceneVersion += 1;
    },
  },
  actions: {},
});
