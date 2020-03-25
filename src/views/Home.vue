<template>
  <div id="container">
    <appNav />
    <appTodo />
    <appCamera />
    <appSettings />
  </div>
</template>

<script>
import * as Three from 'three'
import appNav from '@/components/nav'
import appTodo from '@/components/todo/todo.vue'
import appCamera from '@/components/camera'
import appSettings from '@/components/settings/settings.vue'

export default {
  name: 'Home',
  components: {
    appNav,
    appTodo,
    appCamera,
    appSettings,
  },
  data() {
    return {
      camera: null,
      renderer: null,
      mesh: null,
      scene: new Three.Scene(),
      camera_x: 6.3,
      camera_y: 2.5,
      container: null,
      middleMouseDown: false,
      noOfBuildings: this.$store.getters.getScene.buildings.noOfBuildings,
      noOfRows: this.$store.getters.getScene.buildings.noOfRows,
      isWireFrame: this.$store.getters.getScene.buildings.isWireFrame,
      isOutline: this.$store.getters.getScene.buildings.isOutline,
      arrayContainingGrids: []
    }
  },
  computed: {
    updateScene () {
      return this.$store.getters.getScene.buildings
    }
  },
  watch: {
    updateScene (newCount, oldCount) {
      console.log(newCount, oldCount)
      this.noOfBuildings = this.$store.getters.getScene.buildings.noOfBuildings
      this.noOfRows = this.$store.getters.getScene.buildings.noOfRows
      this.isWireFrame = this.$store.getters.getScene.buildings.isWireFrame
      this.isOutline = this.$store.getters.getScene.buildings.isOutline // not added yet

      // reset scene then rebuild - need to clean up
      while(this.scene.children.length > 0){
        this.scene.remove(this.scene.children[0]);
      }
      this.scene = null
      this.scene = new Three.Scene()
      this.createAndPlaceFloorMeshInScene();
      this.addArrayOfBoxesToScene()
      this.render()
    }
  },
  mounted() {

    this.setUpRenderer()
    this.createAndPlaceFloorMeshInScene();
    this.setUpCamera();
    this.updateFov();
    this.loadEventListeners();
    this.addArrayOfBoxesToScene()


    this.arrayContainingGrids = this.createGridArray()
    this.setGridContents(this.arrayContainingGrids)
    // console.log('should all be buildings', this.arrayContainingGrids)


    this.render()
  },
  methods: {
    createGridArray: function(){
      let arrayContainingGrids = []
      let currentRow = 0
      let currentColumn = 0
      let gridSize = 8 // must have square root for now
      let totalGrids = 64
      let count = 1
      for(let i = 0; i < totalGrids; i++){
        let grid = { id: i, coords: { x: currentRow, y: currentColumn }, contents: null}
        if(count == gridSize-1){
          count = 1
        }
        if(currentRow == gridSize - 1 ){
          currentRow = 0
          currentColumn++
        }else{
          currentRow++
        }
        count++
        arrayContainingGrids.push(grid)
      }
      // console.log(arrayContainingGrids)
      return arrayContainingGrids
    },
    setGridContents(arrayOfGrids){
      return arrayOfGrids.forEach((grid) => {
        if(this.gridShouldContainBuilding(grid)){
          grid.contents = 'building'
        }else{
          grid.contents = 'road'
        }
      })
    },
    isOdd(num){
      return num % 2
    },
    gridShouldContainBuilding(grid){
      if(this.isOdd(grid.coords.x) && this.isOdd(grid.coords.y)){
        return true
      }
    },
    // isConnectedToARoad(grid){ //TODO worng!!!!!!
    //   let connectedToARoad
    //   let x = grid.coords.x
    //   let y = grid.coords.y
    //   // check the grid at every side , if any are roads then return true
    //   // get co or   eg 2 4
    //   if(this.getGrid( x -1 , y ).contents == 'road'){
    //     connectedToARoad = true
    //   }else if(this.getGrid( x+1 , y).contents == 'road'){
    //     connectedToARoad = true
    //   }else if(this.getGrid( x, y- 1).contents == 'road'){
    //     connectedToARoad = true
    //   }else if(this.getGrid( x, y + 1).contents == 'road'){
    //     connectedToARoad = true
    //   }else{
    //     connectedToARoad = false
    //   }
    //
    //   if(connectedToARoad != null){
    //       connectedToARoad = connectedToARoad[0]
    //   }
    //
    //   return connectedToARoad
    // },
    getGridWithCoords(x, y){
      return this.arrayContainingGrids.filter((grid) => {
        return grid.coords.x == x && grid.coords.y == y
      })
    },

    // drawGrid(grid){
    //
    // },
    // drawGridContents(grid, whatToPutOnGrid){
    //
    // }


    setUpRenderer:function(){
      this.container = document.getElementById('container');
      this.renderer = new Three.WebGLRenderer({antialias: true});
      this.renderer.setSize(this.container.clientWidth-100, this.container.clientHeight-100);
      this.renderer.setClearColor (0x00003d, 1);
      this.container.appendChild(this.renderer.domElement);
    },
    createAndPlaceFloorMeshInScene: function() {
      let geometry = new Three.BoxGeometry(100, 0.1, 100);
      let material = new Three.MeshBasicMaterial( { color: 0x000002, wireframe: false } );
      this.mesh = new Three.Mesh(geometry, material); // floor mesh
      this.mesh.position.set(1, 0, 1);
      this.scene.add(this.mesh);
    },
    setUpCamera: function(){
      let fov = 70;
      let aspect = this.container.clientWidth/this.container.clientHeight;  // the canvas default
      let near = 0.1;
      let far = 500000;
      this.camera = new Three.PerspectiveCamera(fov, aspect, near, far);
      this.camera.position.set(this.camera_x, 4.5, this.camera_y); // Set position like this
      this.camera.lookAt(new Three.Vector3(0,0,0)); // Set look at coordinate like this
      this.camera.position.z = 2;
    },
    createBox: function(l, h, w){
      // const loader = new Three.TextureLoader();
      let geometry = new Three.BoxGeometry( l, h, w );
      let material = new Three.MeshBasicMaterial( { color: 0xD3D3D3, wireframe: true, wireframeLinejoin: 'round' } );
      let box
      let edges = new Three.EdgesGeometry( geometry );
      box = new Three.Mesh( geometry, material );
      return box
    },
    createArrayOfRandomSizedBoxes: function(amount) {
      let arrayOfBoxes = [];
      for(let i = 0; i < amount; i++){
        let h = Math.random() * 5;
        let box = this.createBox(0.4, h, 0.4)
        box.height = h
        arrayOfBoxes.push(box)
      }
      return arrayOfBoxes
    },
    addArrayOfBoxesToScene: function() {
      let arrayOfBoxes = this.createArrayOfRandomSizedBoxes(this.noOfBuildings)
      let lastCoords = [0, 0, 0];
      arrayOfBoxes.forEach((box) => {
        this.scene.add(box);
        lastCoords = this.calcNextBoxPositionCoordsGivenLast(lastCoords)
        lastCoords[1] = 0.1 + box.height/2;
        box.position.set(...lastCoords)
      })
    },
    calcNextBoxPositionCoordsGivenLast(coords){
      console.log('last cords = ', coords)
      let testRows = Math.round(this.noOfBuildings/this.noOfRows)
      if( coords[2] < testRows){
        return [coords[0], coords[1], coords[2] + 1]
      }else {
        return [ coords[0] + 1, coords[1], 0]
      }
    },
    loadEventListeners: function(){
      //wheel - handles zoom
      window.addEventListener("wheel", event => {
        let delta = Math.sign(event.deltaY);
        this.updateFov(delta);
      });

      // window.addEventListener('auxclick', function(event) {
      //   console.log("middle button clicked", event);
      // })

      window.addEventListener('mousedown', function(event) {
        // console.log("middle button down", event, event.button);
        if(event.button === 1){
          this.middleMouseDown = true;
        }
      })

      window.addEventListener('mouseup', function(event) {
        // console.log("middle button up", event, event.button);
        if(event.button === 1){
          this.middleMouseDown = false;
        }
      })

      window.addEventListener('keydown', (event) => {
        if(event.keyCode === 37){ // left
          this.camera_y = this.camera_y + 0.1
          this.camera.position.set( this.camera_x, 4.5, this.camera_y)
        }
        if(event.keyCode === 38){ // up
          this.camera_x = this.camera_x - 0.1
          this.camera.position.set( this.camera_x, 4.5, this.camera_y)
        }
        if(event.keyCode === 39){ // right
          this.camera_y = this.camera_y - 0.1
          this.camera.position.set( this.camera_x, 4.5, this.camera_y)
        }
        if(event.keyCode === 40){ // down
          this.camera_x = this.camera_x + 0.1
          this.camera.position.set( this.camera_x, 4.5, this.camera_y)
        }
        this.render()
      })

    },
    updateFov: function(delta){
      if(delta === 1 && this.camera.fov < 180){
        this.camera.fov++
      }else if (delta === -1 && this.camera.fov > 0){
        this.camera.fov--;
      }
      this.camera.updateProjectionMatrix()
      this.render();
    },
    render: function() {
      this.renderer.render(this.scene, this.camera);
    },
  },
};
</script>

<style scoped>
  #container{
    position: absolute;
    width:100vw;
    height:100vh;
    margin:0px;
    padding:0px;
  }
</style>
