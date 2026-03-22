<template>
  <transition name="panel">
    <aside
      v-if="openWindow"
      class="option-panel"
      :style="panelStyle"
    >
      <p>Layers</p>
      <ul class="noselect">
        <li class="panel-row">
          <span class="panel-key">Buildings</span>
          <input
            v-model="showBuildings"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Roof lights</span>
          <input
            v-model="showRoofLights"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Traffic</span>
          <input
            v-model="showTraffic"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Air Traffic</span>
          <input
            v-model="showAirTraffic"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Grid layout</span>
          <input
            v-model="showGrid"
            type="checkbox"
          >
        </li>
        <li class="panel-row">
          <span class="panel-key">Floor</span>
          <input
            v-model="showFloor"
            type="checkbox"
          >
        </li>
      </ul>
    </aside>
  </transition>
</template>

<script>
export default {
  name: 'Layers',
  data() {
    const scene = this.$store.state.sceneView || {};
    return {
      showBuildings: !!(scene.drawOnScene && scene.drawOnScene.buildings),
      showRoofLights: !!(scene.drawOnScene && scene.drawOnScene.roofLights),
      showTraffic: !!(scene.drawOnScene && scene.drawOnScene.traffic),
      showAirTraffic: !!(scene.drawOnScene && scene.drawOnScene.airTraffic),
      showGrid: !!(scene.drawOnScene && scene.drawOnScene.gridLayout),
      showFloor: !!(scene.drawOnScene && scene.drawOnScene.floor),
    };
  },
  computed: {
    openWindow() {
      const item = (this.$store.state.nav.items || []).find(n => n.name === 'layers');
      return !!(item && item.open);
    },
    panelIndex() {
      const openPanels = (this.$store.state.nav.items || []).filter(n => n.open);
      return openPanels.findIndex(n => n.name === 'layers');
    },
    panelStyle() {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex,
      };
    },
  },
  watch: {
    showBuildings(newVal) { this.$store.commit('sceneView/updateDrawOnScene', { buildings: !!newVal }); },
    showRoofLights(newVal) { this.$store.commit('sceneView/updateDrawOnScene', { roofLights: !!newVal }); },
    showTraffic(newVal) { this.$store.commit('sceneView/updateDrawOnScene', { traffic: !!newVal }); },
    showAirTraffic(newVal) { this.$store.commit('sceneView/updateDrawOnScene', { airTraffic: !!newVal }); },
    showGrid(newVal) { this.$store.commit('sceneView/updateDrawOnScene', { gridLayout: !!newVal }); },
    showFloor(newVal) { this.$store.commit('sceneView/updateDrawOnScene', { floor: !!newVal }); },
  },
};
</script>

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
</style>
