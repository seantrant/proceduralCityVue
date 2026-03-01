<template>
  <transition name="panel">
    <aside
      v-if="openWindow"
      class="option-panel"
      :style="panelStyle"
    >
      <p>Weather</p>
      <ul class="noselect">
        <li class="panel-row">
          <span class="panel-key">Preset</span>
          <select v-model="preset">
            <option value="dusk">
              Dusk
            </option>
            <option value="night">
              Night
            </option>
          </select>
        </li>
        <li class="panel-row">
          <span class="panel-key">Fog</span>
          <input
            v-model="fogEnabled"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Fog density</span>
          <input
            v-model.number="fogDensity"
            class="range-input"
            type="range"
            :min="0"
            :max="0.01"
            :step="0.0001"
            :disabled="!fogEnabled"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Density value</span>
          <strong>{{ fogDensityDisplay }}</strong>
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script>
export default {
  name: 'Weather',
  data() {
    const scene = this.$store.state.sceneView || {}
    const atmosphere = scene.atmosphere || {}
    return {
      isSyncingFromStore: false,
      preset: (atmosphere.preset === 'dusk' || atmosphere.preset === 'night') ? atmosphere.preset : 'night',
      fogEnabled: !!atmosphere.fogEnabled,
      fogDensity: Number(atmosphere.fogDensity) || 0.0007,
    }
  },
  computed: {
    openWindow() {
      const item = (this.$store.state.nav.items || []).find(n => n.name === 'weather')
      return !!(item && item.open)
    },
    panelIndex() {
      const openPanels = (this.$store.state.nav.items || []).filter(n => n.open)
      return openPanels.findIndex(n => n.name === 'weather')
    },
    panelStyle() {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex
      }
    },
    fogDensityDisplay() {
      return (Number(this.fogDensity) || 0).toFixed(4)
    }
  },
  watch: {
    '$store.state.sceneView.atmosphere': {
      handler(newVal) {
        const next = newVal || {}
        this.isSyncingFromStore = true
        this.preset = (next.preset === 'dusk' || next.preset === 'night') ? next.preset : 'night'
        this.fogEnabled = !!next.fogEnabled
        this.fogDensity = Number(next.fogDensity) || 0.0007
        this.$nextTick(() => {
          this.isSyncingFromStore = false
        })
      },
      deep: true
    },
    preset(newVal) {
      if (this.isSyncingFromStore) return
      const nextPreset = newVal === 'dusk' ? 'dusk' : 'night'
      this.$store.commit('sceneView/updateAtmosphere', { preset: nextPreset })
    },
    fogEnabled(newVal) {
      if (this.isSyncingFromStore) return
      this.$store.commit('sceneView/updateAtmosphere', { fogEnabled: !!newVal })
    },
    fogDensity(newVal) {
      if (this.isSyncingFromStore) return
      const parsed = Number(newVal)
      if (!Number.isFinite(parsed)) return
      const clamped = Math.min(0.01, Math.max(0, parsed))
      this.$store.commit('sceneView/updateAtmosphere', { fogDensity: clamped })
    }
  }
}
</script>

<!-- reuse shared option-panel styles -->
<style scoped lang="scss">
@import "./optionsPanel.scss";

.option-panel{
  ul{
    list-style:none;
    margin:0;
    padding:1rem 0 0;

    li{
      margin-bottom:10px;
    }
  }
}

.range-input{
  width:110px;
}
</style>
