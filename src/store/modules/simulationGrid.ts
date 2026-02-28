import type { GridCell } from '@/types/city'

export interface SimulationGridState {
  cells: GridCell[]
  revision: number
}

const createDefaultState = (): SimulationGridState => ({
  cells: [],
  revision: 0,
})

export default {
  namespaced: true,
  state: (): SimulationGridState => createDefaultState(),
  getters: {
    cells: (state: SimulationGridState): GridCell[] => state.cells,
    revision: (state: SimulationGridState): number => state.revision,
  },
  mutations: {
    setCells(state: SimulationGridState, cells: GridCell[]): void {
      state.cells = Array.isArray(cells) ? cells : []
      state.revision += 1
    },
    clearCells(state: SimulationGridState): void {
      state.cells = []
      state.revision += 1
    },
  },
}
