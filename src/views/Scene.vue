<template>
  <div id="container">
    <appNav />
    <appTodo />
    <appCamera />
    <appSettings />
    <div v-if="pointerLocked" class="fps-hint">
      <div class="fps-hint-inner">
        <div>FPS controls active — WASD to move, mouse to look</div>
        <div class="muted">Press Esc to release pointer</div>
      </div>
    </div>
  </div>
</template>

<script>
import * as Three from 'three'
import appNav from '@/components/nav'
import appTodo from '@/components/todo/todo.vue'
import appCamera from '@/components/camera'
import appSettings from '@/components/settings/settings.vue'
import UserInput from '@/utils/userInput.js'
import GridSetup from '@/utils/gridSetup.js'

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
      gridArray: [],

      gridSetup: null
      ,
      input: null,
      _lastTime: null,
      lastTime: null,
      pointerLocked: false,
    }
  },
  computed: {
    updateScene () {
      return this.$store.getters.getScene
    }
  },
  watch: {
    updateScene (newCount, oldCount) {

      // reset scene then rebuild - need to clean up
      // while(this.scene.children.length > 0){
      //   this.scene.remove(this.scene.children[0]);
      // }
      this.scene = null
      this.scene = new Three.Scene()

      this.gridArray = this.gridSetup.createNewGrid()
      this.drawScene(this.gridArray)


    }
    ,
    // granular watcher for incremental draw setting changes
    '$store.state.scene.drawOnScene': {
      handler(newVal, oldVal) {
        this.handleDrawOnSceneChange(newVal, oldVal)
      },
      deep: true
    },
    // granular watcher for grid config changes
    '$store.state.scene.grid': {
      handler(newVal, oldVal) {
        this.handleGridChange(newVal, oldVal)
      },
      deep: true
    }
  },
  mounted() {
    this.gridSetup = new GridSetup({store: this.$store})

    this.setUpRenderer()
    this.setUpCamera();
    this.updateFov();

    this.gridArray = this.gridSetup.createNewGrid()
    this.drawScene(this.gridArray)

    this.setupControls();

    // listen for UI requests to request pointer lock
    this._onRequestPointerLock = () => {
      if(this.renderer && this.renderer.domElement && this.renderer.domElement.requestPointerLock){
        try{ this.renderer.domElement.requestPointerLock() }catch(e){ void e }
      }
    }
    document.addEventListener('request-pointer-lock', this._onRequestPointerLock)

    // listen for settings updates
    this._onUpdateInputSettings = (e) => {
      if(this.input && e && e.detail){
        const s = e.detail
        if(typeof s.mouseSensitivity === 'number') this.input.mouseSensitivity = s.mouseSensitivity
        if(typeof s.moveSpeed === 'number') this.input.moveSpeed = s.moveSpeed
        if(typeof s.acceleration === 'number') this.input.acceleration = s.acceleration
        if(typeof s.friction === 'number') this.input.friction = s.friction
      }
    }
    document.addEventListener('update-input-settings', this._onUpdateInputSettings)

    // show on-screen hint when pointer lock is active
    this._onPointerLockChangeForHint = () => {
      this.pointerLocked = (document.pointerLockElement === (this.renderer && this.renderer.domElement))
    }
    document.addEventListener('pointerlockchange', this._onPointerLockChangeForHint)

    this.startAnimation();
  },

  beforeDestroy(){
    document.removeEventListener('request-pointer-lock', this._onRequestPointerLock)
    document.removeEventListener('update-input-settings', this._onUpdateInputSettings)
    document.removeEventListener('pointerlockchange', this._onPointerLockChangeForHint)
    if(this.input && typeof this.input.disconnect === 'function') this.input.disconnect()
  },
  methods: {

    drawScene(arrayOfGrids){
      if(this.drawOnScene.buildings){
        this.drawGridBuildings(arrayOfGrids)
      }
      if(this.drawOnScene.gridLayout){
        this.drawGridLayout(arrayOfGrids)
      }
      if(this.drawOnScene.floor){
        this.createAndDrawFloor();
      }
      this.render()
    },

    handleDrawOnSceneChange(newVal) {
      if(!this.scene) return
      const floorGroup = this.scene.getObjectByName && this.scene.getObjectByName('floorGroup')
      if(floorGroup) floorGroup.visible = !!(newVal && newVal.floor)

      const gridGroup = this.scene.getObjectByName && this.scene.getObjectByName('gridGroup')
      if(gridGroup) gridGroup.visible = !!(newVal && newVal.gridLayout)

      const buildingGroup = this.scene.getObjectByName && this.scene.getObjectByName('buildingGroup')
      if(buildingGroup) buildingGroup.visible = !!(newVal && newVal.buildings)
    },

    handleGridChange(newGrid, oldGrid) {
      if(!oldGrid) return
      // structural change like gridSize -> recreate only grid group
      if(newGrid.gridSize !== oldGrid.gridSize){
        const existing = this.scene.getObjectByName && this.scene.getObjectByName('gridGroup')
        if(existing) this.scene.remove(existing)
        // create a new grid group from gridSetup if available
        if(this.gridSetup && typeof this.gridSetup.createGridGroup === 'function'){
          const gridGroup = this.gridSetup.createGridGroup(newGrid)
          gridGroup.name = 'gridGroup'
          this.scene.add(gridGroup)
        } else {
          // fallback: recreate full grid layout meshes
          this.gridArray = this.gridSetup.createNewGrid()
          this.drawGridLayout(this.gridArray)
        }
      }
      // non structural changes (e.g. flags) can be handled via handleDrawOnSceneChange
    },

    drawGridLayout(arrayOfGrids){
      // create or replace a named group for grid layout so we can toggle it
      let gridGroup = this.scene.getObjectByName && this.scene.getObjectByName('gridGroup')
      if(gridGroup) {
        // clear existing
        while(gridGroup.children.length) gridGroup.remove(gridGroup.children[0])
      } else {
        gridGroup = new Three.Group()
        gridGroup.name = 'gridGroup'
      }
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
        gridGroup.add(box);
      })
      // ensure group is added to scene
      if(!this.scene.getObjectByName('gridGroup')) this.scene.add(gridGroup)
    },
    drawGridBuildings(arrayOfGrids){
      // create or replace a named group for buildings so we can toggle it
      let buildingGroup = this.scene.getObjectByName && this.scene.getObjectByName('buildingGroup')
      if(buildingGroup) {
        while(buildingGroup.children.length) buildingGroup.remove(buildingGroup.children[0])
      } else {
        buildingGroup = new Three.Group()
        buildingGroup.name = 'buildingGroup'
      }
      let box
      let boxEdges
      arrayOfGrids.forEach((grid) => {
        if(grid.contents == 'building'){
          let h = Math.random() * 5;
          box = this.createBox(1, h, 1, 0x000000, false)
          boxEdges = this.createBoxEdges(1, h, 1)
          box.position.set(grid.coords.x, 0.1 + h/2, grid.coords.y)
          boxEdges.position.set(grid.coords.x, 0.1 + h/2, grid.coords.y)
          buildingGroup.add(boxEdges);
          buildingGroup.add(box);
        }
      })
      if(!this.scene.getObjectByName('buildingGroup')) this.scene.add(buildingGroup)
    },

    // getGridWithCoords(x, y){
    //   return this.gridArray.filter((grid) => {
    //     return grid.coords.x == x && grid.coords.y == y
    //   })
    // },

    setUpRenderer:function(){
      this.container = document.getElementById('container');
      this.renderer = new Three.WebGLRenderer({antialias: true, alpha: true});
      this.renderer.setSize(this.container.clientWidth-100, this.container.clientHeight-100);
      this.renderer.setClearColor (0x000000, 0);
      this.container.appendChild(this.renderer.domElement);
    },
    createAndDrawFloor: function() {
      // create or replace a named floor group
      let floorGroup = this.scene.getObjectByName && this.scene.getObjectByName('floorGroup')
      if(floorGroup){
        while(floorGroup.children.length) floorGroup.remove(floorGroup.children[0])
      } else {
        floorGroup = new Three.Group()
        floorGroup.name = 'floorGroup'
      }
      let geometry = new Three.BoxGeometry(100, 0.1, 100);
      let material = new Three.MeshBasicMaterial( { color: 0x000002, wireframe: false } );
      const floorMesh = new Three.Mesh(geometry, material); // floor mesh
      floorMesh.position.set(1, 0, 1);
      floorGroup.add(floorMesh)
      if(!this.scene.getObjectByName('floorGroup')) this.scene.add(floorGroup)
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
    createBoxEdges: function (l, h, w){ //shape class
      let geometry = new Three.BoxGeometry( l, h, w );
      let edge = new Three.EdgesGeometry(geometry)
      let boxEdges = new Three.LineSegments(edge,new Three.LineBasicMaterial({color:0x00ff00}))
      return boxEdges
    },
    createBox: function(l, h, w, color = 0xD3D3D3, wireframe = true){ // shape class
      let geometry = new Three.BoxGeometry( l, h, w );
      let material = new Three.MeshBasicMaterial( { color: color, wireframe: wireframe } );
      let box = new Three.Mesh( geometry, material );
      return box
    },

    setupControls(){
      // create input manager and connect it to the renderer DOM element
      this.input = new UserInput({ camera: this.camera })
      // connect to renderer.domElement so pointer lock can be requested on click
      if(this.renderer && this.renderer.domElement){
        this.input.connect(this.renderer.domElement)
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

    startAnimation(){
      this.lastTime = performance.now()
      this._animate = this._animate.bind(this)
      requestAnimationFrame(this._animate)
    },

    _animate(now){
      const deltaMs = now - (this.lastTime || now)
      const delta = Math.min(0.05, deltaMs / 1000) // clamp delta to avoid big jumps
      this.lastTime = now
      if(this.input && typeof this.input.update === 'function'){
        this.input.update(delta)
      }
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this._animate)
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

  .fps-hint{
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: 20px;
    z-index: 9999;
    pointer-events: none;
  }
  .fps-hint-inner{
    background: rgba(0,0,0,0.6);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    text-align: center;
    font-size: 14px;
  }
  .fps-hint .muted{opacity:0.8;font-size:12px;margin-top:4px}
</style>
