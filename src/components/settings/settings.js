export default {
  name: 'settings',
  data() {
    const scene = this.$store.state.sceneView || {}
    return {
      isSyncingDrawOnScene: 0,
      isSyncingGrid: 0,
      isSyncingInput: 0,
      drawOnScene: Object.assign({}, scene.drawOnScene || {}),
      grid: Object.assign({}, scene.grid || {}),
      fps: Object.assign({}, scene.input || {
        mouseSensitivity: 0.0025,
        moveSpeed: 5.0,
        acceleration: 30.0,
        friction: 10.0,
      })
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
        this.isSyncingDrawOnScene++
        this.drawOnScene = Object.assign({}, newVal || {})
        this.$nextTick(() => {
          this.isSyncingDrawOnScene--
        })
      },
      deep: true
    },
    '$store.state.sceneView.grid': {
      handler(newVal) {
        this.isSyncingGrid++
        this.grid = Object.assign({}, newVal || {})
        this.$nextTick(() => {
          this.isSyncingGrid--
        })
      },
      deep: true
    },
    '$store.state.sceneView.input': {
      handler(newVal) {
        this.isSyncingInput++
        this.fps = Object.assign({}, newVal || {})
        this.$nextTick(() => {
          this.isSyncingInput--
        })
      },
      deep: true
    },
    drawOnScene: {
      handler(newVal) {
        if (this.isSyncingDrawOnScene) return
        const current = (this.$store.state.sceneView || {}).drawOnScene || {}
        const next = newVal || {}
        const same =
          !!next.floor === !!current.floor &&
          !!next.gridLayout === !!current.gridLayout &&
          !!next.buildings === !!current.buildings &&
          !!next.roofLights === !!current.roofLights
        if (same) return
        this.$store.commit('sceneView/updateDrawOnScene', next)
      },
      deep: true
    },
    grid: {
      handler(newVal) {
        if (this.isSyncingGrid) return
        const toNum = value => {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : 0
        }

        const current = (this.$store.state.sceneView || {}).grid || {}
        const next = {
          ...newVal,
          gridSize: toNum((newVal || {}).gridSize),
          spacing: toNum((newVal || {}).spacing ?? current.spacing ?? 1),
        }

        const same =
          toNum(next.gridSize) === toNum(current.gridSize) &&
          toNum(next.spacing) === toNum(current.spacing)
        if (same) return

        this.$store.commit('sceneView/updateGrid', next)
      },
      deep: true
    },
    fps: {
      handler(newVal) {
        if (this.isSyncingInput) return
        const current = (this.$store.state.sceneView || {}).input || {}
        const toNum = value => {
          const parsed = Number(value)
          return Number.isFinite(parsed) ? parsed : 0
        }

        const next = {
          mouseSensitivity: toNum((newVal || {}).mouseSensitivity),
          moveSpeed: toNum((newVal || {}).moveSpeed),
          acceleration: toNum((newVal || {}).acceleration),
          friction: toNum((newVal || {}).friction),
        }

        const same =
          toNum(next.mouseSensitivity) === toNum(current.mouseSensitivity) &&
          toNum(next.moveSpeed) === toNum(current.moveSpeed) &&
          toNum(next.acceleration) === toNum(current.acceleration) &&
          toNum(next.friction) === toNum(current.friction)
        if (same) return

        this.$store.commit('sceneView/updateInput', next)
      },
      deep: true
    }
  },
  methods:{
    reGenerate: function(){
      this.$store.commit('sceneView/replaceScene', {
        drawOnScene: this.drawOnScene,
        grid: this.grid,
        atmosphere: Object.assign({}, ((this.$store.state.sceneView || {}).atmosphere || {})),
      })
      this.$store.commit('incrementSceneVersion')
    },
    applyFpsSettings(){
      this.$store.commit('sceneView/updateInput', this.fps)
    },
    resetSimulation(){
      this.$store.commit('simulation/reset')
    }
  },
}
