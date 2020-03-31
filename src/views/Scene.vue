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
import UserInput from '@/utils/userInput.js'

export default {
  name: 'Scene',
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
      camera_x: 10,
      camera_y: 8,
      container: null,
      middleMouseDown: false,

      drawOnScene: this.$store.getters.getScene.drawOnScene,
      grid: this.$store.getters.getScene.grid,
      arrayContainingGrids: []
    }
  },
  computed: {
    updateScene () {
      return this.$store.getters.getScene
    }
  },
  watch: {
    updateScene (newCount, oldCount) {
      console.log(newCount, oldCount)

      // reset scene then rebuild - need to clean up
      // while(this.scene.children.length > 0){
      //   this.scene.remove(this.scene.children[0]);
      // }
      this.scene = null
      this.scene = new Three.Scene()

      this.arrayContainingGrids = this.addGridContentsToGrid(this.createGridArray())
      this.drawSceneWithCurrentSettings(this.arrayContainingGrids)
    }
  },
  mounted() {

    this.setUpRenderer()
    this.setUpCamera();
    this.updateFov();

    this.arrayContainingGrids = this.addGridContentsToGrid(this.createGridArray())
    this.drawSceneWithCurrentSettings(this.arrayContainingGrids)

    this.setupControls();
  },
  methods: {
    createGridArray: function(){
      let arrayContainingGrids = []
      let currentRow = 0
      let currentColumn = 0
      let gridSize = this.grid.gridSize // must have square root for now
      let totalGrids = gridSize * gridSize
      let count = 1
      for(let i = 0; i < totalGrids; i++){
        let grid = { id: i, coords: { x: currentRow, y: currentColumn }, contents: null} // makde class for grid
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
      return arrayContainingGrids
    },

    addGridContentsToGrid(arrayOfGrids){
      return arrayOfGrids.map((grid) => {
        if(this.gridShouldContainBuilding(grid)){
          grid.contents = 'building'
        }else if(this.gridShouldContainJunction(grid)){
          grid.contents = 'junction'
        }else{
          grid.contents = 'road'
        }
        return grid
      })
    },

    drawSceneWithCurrentSettings(arrayOfGrids){
      if(this.drawOnScene.buildings){
        this.drawGridBuildings(this.arrayContainingGrids)
      }
      if(this.drawOnScene.gridLayout){
        this.drawGridLayout(this.arrayContainingGrids)
      }
      if(this.drawOnScene.floor){
        this.createAndDrawFloor();
      }
      this.render()
    },

    drawGridLayout(arrayOfGrids){
      let box
      let h = 0.01
      arrayOfGrids.forEach((grid) => {
        if(grid.contents == 'road'){
          box = this.createBox(1, h, 1, 0xD3D3D3, false)
        }else if(grid.contents == 'building'){
          box = this.createBox(1, h, 1, 0x6a0dad, false)
        }else if(grid.contents == 'junction'){
          box = this.createBox(1, h, 1, 0x6a0000, false)
        }
        box.position.set(grid.coords.x, 0.1, grid.coords.y)
        this.scene.add(box);
      })
    },
    drawGridBuildings(arrayOfGrids){
      let box
      let boxEdges
      arrayOfGrids.forEach((grid) => {
        if(grid.contents == 'building'){
          let h = Math.random() * 5;
          box = this.createBox(1, h, 1, 0x000000, false)
          boxEdges = this.createBoxEdges(1, h, 1)
          box.position.set(grid.coords.x, 0.1 + h/2, grid.coords.y)
          boxEdges.position.set(grid.coords.x, 0.1 + h/2, grid.coords.y)
        }
        this.scene.add(boxEdges);
        this.scene.add(box);
      })
    },

    getGridWithCoords(x, y){
      return this.arrayContainingGrids.filter((grid) => {
        return grid.coords.x == x && grid.coords.y == y
      })
    },

    setUpRenderer:function(){
      this.container = document.getElementById('container');
      this.renderer = new Three.WebGLRenderer({antialias: true});
      this.renderer.setSize(this.container.clientWidth-100, this.container.clientHeight-100);
      this.renderer.setClearColor (0x00003d, 1);
      this.container.appendChild(this.renderer.domElement);
    },
    createAndDrawFloor: function() {
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
      this.camera.lookAt(new Three.Vector3(0,0,9)); // Set look at coordinate like this
      this.camera.position.z = 2;
    },
    setupControls(){
      let userInput = new UserInput({window, camera: this.camera})
      userInput.loadEventListeners((res) => {
        if(res){
          this.camera = res
          this.render()
        }
      });
    },
    createBoxEdges: function (l, h, w){
      let geometry = new Three.BoxGeometry( l, h, w );
      let edge = new Three.EdgesGeometry(geometry)
      let boxEdges = new Three.LineSegments(edge,new Three.LineBasicMaterial({color:0x00ff00}))
      return boxEdges
    },
    createBox: function(l, h, w, color = 0xD3D3D3, wireframe = true){
      let geometry = new Three.BoxGeometry( l, h, w );
      let material = new Three.MeshBasicMaterial( { color: color, wireframe: wireframe } );
      let edges = new Three.EdgesGeometry( geometry );
      let box = new Three.Mesh( geometry, material );
      return box
    },

    isOdd(num){
      return num % 2
    },
    gridShouldContainBuilding(grid){
      if(this.isOdd(grid.coords.x) && this.isOdd(grid.coords.y)){
        return true
      }
    },
    gridShouldContainJunction(grid){
      if(!this.isOdd(grid.coords.x) && !this.isOdd(grid.coords.y)){
        return true
      }
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
