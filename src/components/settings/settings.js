export default {
  name: 'settings',
  data() {
    const scene = this.$store.state.sceneView || {}
    return {
      drawOnScene: Object.assign({}, scene.drawOnScene || {}),
      grid: Object.assign({}, scene.grid || {}),
      fps: {
        mouseSensitivity: 0.0025,
        moveSpeed: 5.0,
        acceleration: 30.0,
        friction: 10.0,
      }
    }
  },
  computed: {
    openWindow () {
      const item = (this.$store.state.nav.items || []).find(n => n.name === 'settings')
      return !!(item && item.open)
    },
    panelIndex () {
      const openPanels = (this.$store.state.nav.items || []).filter(n => n.open)
      return openPanels.findIndex(n => n.name === 'settings')
    },
    panelStyle () {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex
      }
    },
    simulationTick () {
      return ((this.$store.state.simulation || {}).tick) || 0
    },
    simulationRunning: {
      get() {
        return !!(((this.$store.state.simulation || {}).running))
      },
      set(value) {
        this.$store.commit('simulation/setRunning', !!value)
      }
    },
    simulationSpeed: {
      get() {
        const speed = ((this.$store.state.simulation || {}).speedMultiplier)
        return Number(speed) || 1
      },
      set(value) {
        this.$store.commit('simulation/setSpeedMultiplier', value)
      }
    }
  },
  watch: {
    '$store.state.sceneView.drawOnScene': {
      handler(newVal) {
        this.drawOnScene = Object.assign({}, newVal || {})
      },
      deep: true
    },
    '$store.state.sceneView.grid': {
      handler(newVal) {
        this.grid = Object.assign({}, newVal || {})
      },
      deep: true
    },
    // commit drawOnScene changes immediately so the scene can update incrementally
    drawOnScene: {
      handler(newVal) {
        this.$store.commit('sceneView/updateDrawOnScene', newVal)
      },
      deep: true
    },
    // commit grid changes immediately (grid size etc)
    grid: {
      handler(newVal) {
        this.$store.commit('sceneView/updateGrid', newVal)
      },
      deep: true
    }
  },
  mounted(){
  },
  methods:{
    reGenerate: function(){
      // perform a full replace so Scene.vue's full-scene watcher triggers
      this.$store.commit("sceneView/replaceScene", {
          drawOnScene: this.drawOnScene,
          grid: this.grid,
      });
      this.$store.commit('incrementSceneVersion')
    }
    ,applyFpsSettings(){
      // broadcast new FPS settings so Scene/InputManager can pick them up
      document.dispatchEvent(new CustomEvent('update-input-settings', { detail: this.fps }))
    },
    resetSimulation(){
      this.$store.commit('simulation/reset')
    }
  },

};
