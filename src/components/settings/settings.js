export default {
  name: 'Camera',
  data() {
    return {
      noOfBuildings: this.$store.getters.getScene.buildings.noOfBuildings,
      noOfRows: this.$store.getters.getScene.buildings.noOfRows,
      wireFrame: this.$store.getters.getScene.buildings.wireFrame
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
      // console.log('hello')
      this.$store.commit("updateSceneBuildings", {
        // 'buildings': {
          noOfBuildings: this.noOfBuildings,
          noOfRows: this.noOfRows,
          wireFrame: this.wireFrame
        // }
      });
    }
  },

};
