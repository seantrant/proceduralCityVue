export default {
  name: 'settings',
  data() {
    const scene = this.$store.state.sceneView || {};
    return {
      isSyncingGrid: 0,
      isSyncingInput: 0,
      grid: Object.assign({}, scene.grid || {}),
      fps: Object.assign({}, scene.input || {
        mouseSensitivity: 0.0025,
        moveSpeed: 5.0,
        acceleration: 30.0,
        friction: 10.0,
      }),
      isSyncingAirTraffic: 0,
      airTraffic: Object.assign({}, scene.airTrafficConfig || {
        planeCount: 2,
        helicopterCount: 1,
        planeMinSpeed: 8,
        planeMaxSpeed: 14,
        heliMinSpeed: 2,
        heliMaxSpeed: 4,
        planeAltitude: 15,
        heliAltitude: 8,
        respawnDelayMin: 2,
        respawnDelayMax: 8,
      }),
    };
  },
  computed: {
    openWindow() {
      const item = (this.$store.state.nav.items || []).find(n => n.name === 'settings');
      return !!(item && item.open);
    },
    panelIndex() {
      const openPanels = (this.$store.state.nav.items || []).filter(n => n.open);
      return openPanels.findIndex(n => n.name === 'settings');
    },
    panelStyle() {
      return {
        '--panel-index': this.panelIndex < 0 ? 0 : this.panelIndex,
      };
    },
  },
  watch: {
    '$store.state.sceneView.grid': {
      handler(newVal) {
        this.isSyncingGrid++;
        this.grid = Object.assign({}, newVal || {});
        this.$nextTick(() => {
          this.isSyncingGrid--;
        });
      },
      deep: true,
    },
    '$store.state.sceneView.input': {
      handler(newVal) {
        this.isSyncingInput++;
        this.fps = Object.assign({}, newVal || {});
        this.$nextTick(() => {
          this.isSyncingInput--;
        });
      },
      deep: true,
    },
    '$store.state.sceneView.airTrafficConfig': {
      handler(newVal) {
        this.isSyncingAirTraffic++;
        this.airTraffic = Object.assign({}, newVal || {});
        this.$nextTick(() => {
          this.isSyncingAirTraffic--;
        });
      },
      deep: true,
    },
    grid: {
      handler(newVal) {
        if (this.isSyncingGrid) return;
        const toNum = (value) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const current = (this.$store.state.sceneView || {}).grid || {};
        const next = {
          ...newVal,
          gridSize: toNum((newVal || {}).gridSize),
          spacing: toNum((newVal || {}).spacing ?? current.spacing ?? 1),
        };

        const same = toNum(next.gridSize) === toNum(current.gridSize)
          && toNum(next.spacing) === toNum(current.spacing);
        if (same) return;

        this.$store.commit('sceneView/updateGrid', next);
      },
      deep: true,
    },
    fps: {
      handler(newVal) {
        if (this.isSyncingInput) return;
        const current = (this.$store.state.sceneView || {}).input || {};
        const toNum = (value) => {
          const parsed = Number(value);
          return Number.isFinite(parsed) ? parsed : 0;
        };

        const next = {
          mouseSensitivity: toNum((newVal || {}).mouseSensitivity),
          moveSpeed: toNum((newVal || {}).moveSpeed),
          acceleration: toNum((newVal || {}).acceleration),
          friction: toNum((newVal || {}).friction),
        };

        const same = toNum(next.mouseSensitivity) === toNum(current.mouseSensitivity)
          && toNum(next.moveSpeed) === toNum(current.moveSpeed)
          && toNum(next.acceleration) === toNum(current.acceleration)
          && toNum(next.friction) === toNum(current.friction);
        if (same) return;

        this.$store.commit('sceneView/updateInput', next);
      },
      deep: true,
    },
  },
  methods: {
    reGenerate() {
      this.$store.commit('sceneView/replaceScene', {
        drawOnScene: (this.$store.state.sceneView || {}).drawOnScene,
        grid: this.grid,
        atmosphere: Object.assign({}, ((this.$store.state.sceneView || {}).atmosphere || {})),
      });
      this.$store.commit('incrementSceneVersion');
    },
    applyFpsSettings() {
      this.$store.commit('sceneView/updateInput', this.fps);
    },
    applyAirTrafficSettings() {
      this.$store.commit('sceneView/updateScene', { airTrafficConfig: Object.assign({}, this.airTraffic) });
      this.$store.commit('incrementSceneVersion');
    },
  },
};
