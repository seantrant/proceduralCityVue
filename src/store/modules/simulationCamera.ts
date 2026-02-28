export interface SimulationCameraState {
  target: {
    x: number
    y: number
    z: number
  }
}

const createDefaultState = (): SimulationCameraState => ({
  target: {
    x: 0,
    y: 4.5,
    z: 0,
  }
})

export default {
  namespaced: true,
  state: (): SimulationCameraState => createDefaultState(),
  getters: {
    target: (state: SimulationCameraState) => state.target,
  },
  mutations: {
    setTarget(state: SimulationCameraState, payload: Partial<SimulationCameraState['target']>): void {
      state.target = Object.assign({}, state.target, payload || {})
    },
    reset(state: SimulationCameraState): void {
      state.target = createDefaultState().target
    },
  },
}
