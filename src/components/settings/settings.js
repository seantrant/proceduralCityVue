export default {
  name: 'settings',
  data() {
    return {
      drawOnScene: this.$store.getters.getScene.drawOnScene,
      grid: this.$store.getters.getScene.grid,
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
      const item = (this.$store.getters.navState || []).find(n => n.name === 'settings')
      return !!(item && item.open)
    },
    panelIndex () {
      const openPanels = (this.$store.getters.navState || []).filter(n => n.open)
      return openPanels.findIndex(n => n.name === 'settings')
    },
    panelStyle () {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex
      }
    }
  },
  watch: {
    // commit drawOnScene changes immediately so the scene can update incrementally
    drawOnScene: {
      handler(newVal) {
        this.$store.commit('updateDrawOnScene', newVal)
      },
      deep: true
    },
    // commit grid changes immediately (grid size etc)
    grid: {
      handler(newVal) {
        this.$store.commit('updateGrid', newVal)
      },
      deep: true
    }
  },
  mounted(){
  },
  methods:{
    reGenerate: function(){
      // perform a full replace so Scene.vue's full-scene watcher triggers
      this.$store.commit("replaceScene", {
          drawOnScene: this.drawOnScene,
          grid: this.grid,
      });
    }
    ,applyFpsSettings(){
      // broadcast new FPS settings so Scene/InputManager can pick them up
      document.dispatchEvent(new CustomEvent('update-input-settings', { detail: this.fps }))
    }
  },

};
