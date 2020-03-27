export default {
  name: 'settings',
  data() {
    return {
      drawOnScene: this.$store.getters.getScene.drawOnScene,
      grid: this.$store.getters.getScene.grid,
    }
  },
  computed: {
    openWindow () {
      return this.$store.getters.navState[2].open
    }
  },
  watch: {
    // openWindow (newCount, oldCount) {
    //   // console.log(`new be ${newCount} old be ${oldCount}`)
    // }
  },
  mounted(){
  },
  methods:{
    reGenerate: function(){
      this.$store.commit("updateScene", {
          noOfBuildings: this.noOfBuildings,
          noOfRows: this.noOfRows,
          isWireFrame: this.isWireFrame,
          drawOnScene: this.drawOnScene,
          grid: this.grid,
      });
    }
  },

};
