const defaultNavItems = () => ([
  { name: 'todo', open: true },
  { name: 'camera', open: true },
  { name: 'layers', open: true },
    { name: 'weather', open: true },
  { name: 'settings', open: true }
])

export default {
  namespaced: true,
  state: () => ({
    items: defaultNavItems()
  }),
  getters: {
    navState: state => state.items
  },
  mutations: {
    changeNav(state, payload) {
      const navItem = state.items.find((item) => item.name === payload)
      if (navItem) navItem.open = !navItem.open
    },
    resetNav(state) {
      state.items = defaultNavItems()
    }
  }
}
