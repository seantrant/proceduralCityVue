<template>
  <transition name="panel">
    <aside
      v-if="openWindow"
      class="option-panel"
      :style="panelStyle"
    >
      <p>Camera</p>
      <ul class="noselect">
        <li class="panel-row">
          <span class="panel-key">FPS Controls</span>
          <button @click="requestPointerLock">
            Enable
          </button>
        </li>
        <li class="panel-row">
          <span class="panel-key">Pointer lock</span>
          <small><strong>{{ pointerLocked ? 'Locked' : 'Unlocked' }}</strong></small>
        </li>
        <li class="panel-row">
          <span class="panel-key">Helicopter mode</span>
          <input
            v-model="cameraHelicopter"
            type="checkbox"
          >
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script>
export default {
  name: 'Camera',
  data() {
    return {
      pointerLocked: false
    }
  },
  computed: {
    openWindow () {
      const item = (this.$store.getters.navState || []).find(n => n.name === 'camera')
      return !!(item && item.open)
    },
    panelIndex () {
      const openPanels = (this.$store.getters.navState || []).filter(n => n.open)
      return openPanels.findIndex(n => n.name === 'camera')
    },
    panelStyle () {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex
      }
    },
    cameraHelicopter: {
      get() {
        const scene = this.$store.getters.getScene || {}
        return !!(scene.camera && scene.camera.helicopter)
      },
      set(val) {
        this.$store.commit('updateCamera', { helicopter: !!val })
      }
    }
  },
  watch: {
    openWindow () {
      // no-op watcher (avoid logging in production)
    }
  },
  mounted(){
    this.pointerLocked = document.pointerLockElement !== null
    document.addEventListener('pointerlockchange', this._onPointerLockChange)
  },
  beforeUnmount(){
    document.removeEventListener('pointerlockchange', this._onPointerLockChange)
  },
  methods:{
    requestPointerLock(){
      // ask the scene to request pointer lock on the canvas
      document.dispatchEvent(new CustomEvent('request-pointer-lock'))
    },
    _onPointerLockChange(){
      this.pointerLocked = document.pointerLockElement !== null
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "./optionsPanel.scss";

.option-panel{
  p{
    margin-bottom:0;
  }

  ul{
    padding-left:0;
    margin:0;
    color:white;
    list-style:none;
    padding-top:1rem;

    li{
      margin-bottom:10px;
    }
  }
}
</style>
