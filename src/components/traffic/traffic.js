export default {
  name: 'traffic',
  data() {
    const scene = this.$store.state.sceneView || {};
    return {
      isSyncingTraffic: 0,
      traffic: Object.assign({}, scene.trafficConfig || {}),
    };
  },
  computed: {
    openWindow() {
      const item = (this.$store.state.nav.items || []).find(n => n.name === 'traffic');
      return !!(item && item.open);
    },
    panelIndex() {
      const openPanels = (this.$store.state.nav.items || []).filter(n => n.open);
      return openPanels.findIndex(n => n.name === 'traffic');
    },
    panelStyle() {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex,
      };
    },
    showTrafficPaths: {
      get() {
        const tc = (this.$store.state.sceneView || {}).trafficConfig || {};
        return !!tc.showTrafficPaths;
      },
      set(val) {
        this.$store.commit('sceneView/updateScene', {
          trafficConfig: Object.assign(
            {},
            (this.$store.state.sceneView || {}).trafficConfig || {},
            { showTrafficPaths: !!val },
          ),
        });
      },
    },
  },
  watch: {
    '$store.state.sceneView.trafficConfig': {
      handler(newVal) {
        this.isSyncingTraffic++;
        this.traffic = Object.assign({}, newVal || {});
        this.$nextTick(() => { this.isSyncingTraffic--; });
      },
      deep: true,
    },
    traffic: {
      handler() {
        if (this.isSyncingTraffic) return;
        // do not auto-commit; user clicks Apply
      },
      deep: true,
    },
  },
  methods: {
    applyTrafficSettings() {
      const payload = {
        density: Number(this.traffic.density) || 0,
        minSpeed: Number(this.traffic.minSpeed) || 0,
        maxSpeed: Number(this.traffic.maxSpeed) || 0,
        showTrafficPaths: !!this.traffic.showTrafficPaths,
      };
      this.$store.commit('sceneView/updateScene', { trafficConfig: payload });
      // bump scene version so drawing will recreate traffic
      this.$store.commit('incrementSceneVersion');
    },
  },
};
