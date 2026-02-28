export interface SimulationState {
  tick: number
  running: boolean
  speedMultiplier: number
}

const createDefaultState = (): SimulationState => ({
  tick: 0,
  running: false,
  speedMultiplier: 1,
})

export default {
  namespaced: true,
  state: (): SimulationState => createDefaultState(),
  getters: {
    tick: (state: SimulationState): number => state.tick,
    running: (state: SimulationState): boolean => state.running,
    speedMultiplier: (state: SimulationState): number => state.speedMultiplier,
  },
  mutations: {
    incrementTick(state: SimulationState): void {
      state.tick += 1
    },
    setRunning(state: SimulationState, running: boolean): void {
      state.running = !!running
    },
    setSpeedMultiplier(state: SimulationState, speed: number): void {
      state.speedMultiplier = Math.max(0.25, Number(speed) || 1)
    },
    reset(state: SimulationState): void {
      const next = createDefaultState()
      state.tick = next.tick
      state.running = next.running
      state.speedMultiplier = next.speedMultiplier
    },
  },
}
