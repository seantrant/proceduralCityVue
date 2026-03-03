import {
  defaultAtmosphereConfig,
  defaultCameraConfig,
  defaultDrawOnScene,
  defaultGridConfig,
  defaultInputConfig,
  defaultTrafficConfig,
} from '@/types/city';

export const buildDefaultSceneView = () => ({
  drawOnScene: { ...defaultDrawOnScene },
  grid: { ...defaultGridConfig },
  camera: { ...defaultCameraConfig },
  atmosphere: { ...defaultAtmosphereConfig },
  input: { ...defaultInputConfig },
  trafficConfig: { ...defaultTrafficConfig },
  pointerLockRequestToken: 0,
});

export default {
  namespaced: true,
  state: () => buildDefaultSceneView(),
  getters: {
    getScene: state => state,
  },
  mutations: {
    updateScene(state, payload) {
      Object.assign(state, payload || {});
    },
    updateDrawOnScene(state, payload) {
      state.drawOnScene = Object.assign({}, state.drawOnScene, payload || {});
    },
    updateGrid(state, payload) {
      state.grid = Object.assign({}, state.grid, payload || {});
    },
    updateCamera(state, payload) {
      state.camera = Object.assign({}, state.camera, payload || {});
    },
    updateAtmosphere(state, payload) {
      state.atmosphere = Object.assign({}, state.atmosphere, payload || {});
    },
    updateInput(state, payload) {
      state.input = Object.assign({}, state.input, payload || {});
    },
    requestPointerLock(state) {
      state.pointerLockRequestToken = (Number(state.pointerLockRequestToken) || 0) + 1;
    },
    replaceScene(state, payload) {
      const base = buildDefaultSceneView();
      const incoming = payload || {};
      state.drawOnScene = Object.assign({}, base.drawOnScene, incoming.drawOnScene || {});
      state.grid = Object.assign({}, base.grid, incoming.grid || {});
      state.camera = Object.assign({}, base.camera, incoming.camera || {});
      state.atmosphere = Object.assign({}, base.atmosphere, incoming.atmosphere || {});
      state.trafficConfig = Object.assign({}, base.trafficConfig, incoming.trafficConfig || {});
      state.input = Object.assign({}, base.input, incoming.input || {});
      state.pointerLockRequestToken = base.pointerLockRequestToken;
    },
  },
};
