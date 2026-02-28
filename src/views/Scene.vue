<template>
  <div id="container">
    <appNav />
    <appTodo />
    <appCamera />
    <appLayers />
    <appSettings />
    <mini-map
      ref="miniMap"
      :grid-array="gridArray"
      :size="200"
      :draw-on-scene="drawOnScene"
      @minimap-click="onMiniMapClick"
    />
    <div
      v-if="pointerLocked"
      class="fps-hint"
    >
      <div class="fps-hint-inner">
        <div>FPS controls active — WASD to move, mouse to look</div>
        <div class="muted">
          Press Esc to release pointer
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as Three from 'three'
import { markRaw } from 'vue'
import appNav from '@/components/nav'
import appTodo from '@/components/todo/todo.vue'
import appCamera from '@/components/camera'
import appLayers from '@/components/layers'
import appSettings from '@/components/settings/settings.vue'
import miniMap from '@/components/miniMap.vue'
import UserInput from '@/utils/userInput.js'
import GridSetup from '@/utils/gridSetup.js'

export default {
  name: 'Scene',
  components: {
    appNav,
    appTodo,
    appCamera,
    appLayers,
    appSettings,
    miniMap,
  },
  data() {
    return {
      camera: null,
      renderer: null,
      mesh: null,
      scene: markRaw(new Three.Scene()),
      camera_x: 10,
      camera_y: 8,
      container: null,
      middleMouseDown: false,

      // orbit / helicopter mode
      cameraOrbiting: false,
      orbitStart: 0,
      orbitRadius: 40,
      orbitAltitude: 12,
      orbitSpeed: 0.05,

      drawOnScene: this.$store.getters.getScene.drawOnScene,
      grid: this.$store.getters.getScene.grid,
      gridArray: [],

      gridSetup: null,
      input: null,
      cameraAnimation: null,
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
    updateScene () {

      // reset scene then rebuild - clean up previous resources first
      if(this.scene) this.disposeObject(this.scene)
      this.scene = null
      this.scene = markRaw(new Three.Scene())

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
    ,
    '$store.state.scene.camera': {
      handler(newVal){
        if(newVal && newVal.helicopter){
          this.startOrbit()
        } else {
          this.stopOrbit()
        }
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

  beforeUnmount(){
    document.removeEventListener('request-pointer-lock', this._onRequestPointerLock)
    document.removeEventListener('update-input-settings', this._onUpdateInputSettings)
    document.removeEventListener('pointerlockchange', this._onPointerLockChangeForHint)
    if(this.input && typeof this.input.disconnect === 'function') this.input.disconnect()
    // stop animation loop
    if(this._rafId) cancelAnimationFrame(this._rafId)
    // dispose renderer and scene resources
    if(this.renderer && typeof this.renderer.dispose === 'function'){
      try{ this.renderer.dispose(); if(this.renderer.forceContextLoss) this.renderer.forceContextLoss() }catch(e){ void e }
    }
    if(this.scene) this.disposeObject(this.scene)
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
      this.renderScene()
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
        // clear existing and dispose resources
        while(gridGroup.children.length){
          const child = gridGroup.children[0]
          this.disposeObject(child)
          gridGroup.remove(child)
        }
      } else {
        gridGroup = markRaw(new Three.Group())
        gridGroup.name = 'gridGroup'
      }
      let box
      let h = 0.01
      // compute spacing and center the grid at origin
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      const halfExtent = ((gridSize - 1) / 2) * spacing

      arrayOfGrids.forEach((grid) => {
        if(grid.contents == 'road'){
          box = this.createBox(spacing, h, spacing, 0xD3D3D3, false)
        }else if(grid.contents == 'building'){
          box = this.createBox(spacing, h, spacing, 0x6a0dad, false)
        }else if(grid.contents == 'junction'){
          box = this.createBox(spacing, h, spacing, 0x6a0000, false)
        }
        const x = grid.coords.x * spacing - halfExtent
        const z = grid.coords.y * spacing - halfExtent
        box.position.set(x, 0.1, z)
        gridGroup.add(box);
      })
      // ensure group is added to scene
      if(!this.scene.getObjectByName('gridGroup')) this.scene.add(gridGroup)
    },
    drawGridBuildings(arrayOfGrids){
      // create or replace a named group for buildings so we can toggle it
      let buildingGroup = this.scene.getObjectByName && this.scene.getObjectByName('buildingGroup')
      if(buildingGroup) {
        while(buildingGroup.children.length){
          const child = buildingGroup.children[0]
          this.disposeObject(child)
          buildingGroup.remove(child)
        }
      } else {
        buildingGroup = markRaw(new Three.Group())
        buildingGroup.name = 'buildingGroup'
      }
      let box
      let boxEdges
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      const halfExtent = ((gridSize - 1) / 2) * spacing

      arrayOfGrids.forEach((grid) => {
        if(grid.contents == 'building'){
          let h = Math.random() * 5;
          box = this.createBox(spacing, h, spacing, 0x000000, false)
          boxEdges = this.createBoxEdges(spacing, h, spacing)
          const x = grid.coords.x * spacing - halfExtent
          const z = grid.coords.y * spacing - halfExtent
          box.position.set(x, 0.1 + h/2, z)
          boxEdges.position.set(x, 0.1 + h/2, z)
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
      this.renderer = markRaw(new Three.WebGLRenderer({antialias: true, alpha: true}));
      this.renderer.setSize(this.container.clientWidth-100, this.container.clientHeight-100);
      this.renderer.setClearColor (0x000000, 0);
      this.container.appendChild(this.renderer.domElement);
    },
    createAndDrawFloor: function() {
      // create or replace a named floor group
      let floorGroup = this.scene.getObjectByName && this.scene.getObjectByName('floorGroup')
      if(floorGroup){
        while(floorGroup.children.length){
          const child = floorGroup.children[0]
          this.disposeObject(child)
          floorGroup.remove(child)
        }
      } else {
        floorGroup = markRaw(new Three.Group())
        floorGroup.name = 'floorGroup'
      }
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      const width = gridSize * spacing
      let geometry = new Three.BoxGeometry(width, 0.1, width);
      let material = new Three.MeshBasicMaterial( { color: 0x000002, wireframe: false } );
      const floorMesh = new Three.Mesh(geometry, material); // floor mesh
      // position floor centered at origin
      floorMesh.position.set(0, 0, 0);
      floorGroup.add(floorMesh)
      if(!this.scene.getObjectByName('floorGroup')) this.scene.add(floorGroup)
    },
    setUpCamera: function(){
      let fov = 70;
      let aspect = this.container.clientWidth/this.container.clientHeight;  // the canvas default
      let near = 0.1;
      let far = 500000;
      this.camera = markRaw(new Three.PerspectiveCamera(fov, aspect, near, far));
      // center camera over the scene and look at origin
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      const halfExtent = ((gridSize - 1) / 2) * spacing
      this.camera.position.set(0, 4.5, halfExtent + 2)
      this.camera.lookAt(new Three.Vector3(0,0,0))
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

    startOrbit(){
      if(this.cameraOrbiting) return
      this.cameraOrbiting = true
      this.orbitStart = performance.now()
      // optionally release pointer lock so the cursor is available
      try{ if(document.exitPointerLock) document.exitPointerLock() }catch(e){ void e }
    },

    stopOrbit(){
      if(!this.cameraOrbiting) return
      this.cameraOrbiting = false
      // leave camera where it is; user can re-enable pointer lock for manual control
    },

    updateFov: function(delta){
      if(delta === 1 && this.camera.fov < 180){
        this.camera.fov++
      }else if (delta === -1 && this.camera.fov > 0){
        this.camera.fov--;
      }
      this.camera.updateProjectionMatrix()
      this.renderScene();
    },

    animateCameraTo(target = {x:0,y:4.5,z:0}, opts = {}){
      try{
        const duration = (typeof opts.duration === 'number') ? opts.duration : 600
        // ensure camera exists
        if(!this.camera) return
        // compute start and target vectors
        const startPos = this.camera.position.clone()
        const targetPos = new Three.Vector3(target.x, (typeof target.y === 'number' ? target.y : this.camera.position.y), target.z)

        // compute look vectors (points in world space) so we can interpolate lookAt
        const dir = this.camera.getWorldDirection(new Three.Vector3())
        const startLook = startPos.clone().add(dir)
        const lookAtTarget = targetPos.clone().add(dir)

        // exit pointer lock if active to avoid input conflict
        try{ if(document.exitPointerLock) document.exitPointerLock() }catch(e){ void e }

        this.cameraAnimation = {
          startPos,
          targetPos,
          startLook,
          lookAtTarget,
          startTime: performance.now(),
          duration
        }
      }catch(e){ void e }
    },

    onMiniMapClick(payload) {
      if(!payload) return
      // smooth animate camera to clicked world coordinate
      this.animateCameraTo({ x: payload.x, y: this.camera ? this.camera.position.y : undefined, z: payload.z }, { duration: 600 })
    },

    renderScene: function() {
      this.renderer.render(this.scene, this.camera);
    },

    startAnimation(){
      this.lastTime = performance.now()
      this._animate = this._animate.bind(this)
      this._rafId = requestAnimationFrame(this._animate)
    },

    _animate(now){
      const deltaMs = now - (this.lastTime || now)
      const delta = Math.min(0.05, deltaMs / 1000) // clamp delta to avoid big jumps
      this.lastTime = now

      if(this.cameraOrbiting){
        const t = (now || performance.now()) / 1000
        const angle = t * this.orbitSpeed
        const r = this.orbitRadius
        const y = this.orbitAltitude
        this.camera.position.x = Math.cos(angle) * r
        this.camera.position.z = Math.sin(angle) * r
        this.camera.position.y = y
        this.camera.lookAt(new Three.Vector3(0,0,0))
      } else {
        if(this.cameraAnimation){
          // camera is animating; skip input updates this frame
        } else {
          if(this.input && typeof this.input.update === 'function'){
            this.input.update(delta)
          }
        }
      }

      // process camera animation if active
      if(this.cameraAnimation){
        try{
          const a = this.cameraAnimation
          const elapsed = Math.max(0, now - (a.startTime || now))
          const traw = Math.min(1, elapsed / (a.duration || 600))
          const t = (traw < 0.5) ? (2 * traw * traw) : (-1 + (4 - 2 * traw) * traw) // easeInOutQuad
          // interpolate position
          this.camera.position.lerpVectors(a.startPos, a.targetPos, t)
          // interpolate lookAt point
          if(a.startLook && a.lookAtTarget){
            const look = new Three.Vector3().lerpVectors(a.startLook, a.lookAtTarget, t)
            this.camera.lookAt(look)
          }
          if(traw >= 1){
            this.cameraAnimation = null
          }
        }catch(e){ void e }
      }

      this.renderer.render(this.scene, this.camera)
      // update mini-map with current camera position and direction
      try{
        const dir = new Three.Vector3()
        this.camera.getWorldDirection(dir)
        if(this.$refs && this.$refs.miniMap && typeof this.$refs.miniMap.updateCamera === 'function'){
          this.$refs.miniMap.updateCamera(this.camera.position, dir)
        }
      }catch(e){ void e }
      this._rafId = requestAnimationFrame(this._animate)
    },
    // traverse an Object3D and dispose geometries, materials, and textures
    disposeObject(obj){
      if(!obj || typeof obj.traverse !== 'function') return
      try{
        obj.traverse((child) => {
          if(child.geometry){ try{ child.geometry.dispose() }catch(e){ void e } }
          if(child.material){
            try{
              if(Array.isArray(child.material)){
                child.material.forEach(m => { try{ if(m && m.dispose) m.dispose() }catch(e){ void e } })
              } else {
                if(child.material.dispose) child.material.dispose()
              }
            }catch(e){ void e }
          }
          if(child.texture && child.texture.dispose){ try{ child.texture.dispose() }catch(e){ void e } }
        })
      }catch(e){ void e }
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
