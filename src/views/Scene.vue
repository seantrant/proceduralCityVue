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
import {
  rebuildBuildings,
  rebuildFloor,
  rebuildGridLayout,
  setGroupVisibility,
} from '@/composables/useSceneGroups'
import {
  createCameraAnimation,
  stepCameraAnimation,
} from '@/composables/useCameraAnimation'

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

      drawOnScene: Object.assign({}, this.$store.state.sceneView.drawOnScene || {}),
      grid: Object.assign({}, this.$store.state.sceneView.grid || {}),
      gridArray: [],

      gridSetup: null,
      input: null,
      cameraAnimation: null,
      lastTime: null,
      simulationAccumulator: 0,
      simulationStepMs: 250,
      pointerLocked: false,
      tmpDirVec: markRaw(new Three.Vector3()),
      tmpLookVec: markRaw(new Three.Vector3()),
    }
  },
  watch: {
    '$store.state.sceneVersion': {
      handler() {
      // reset scene then rebuild - clean up previous resources first
      if(this.scene) this.disposeObject(this.scene)
      this.scene = null
      this.scene = markRaw(new Three.Scene())

      const storeScene = this.$store.state.sceneView || {}
      this.drawOnScene = Object.assign({}, storeScene.drawOnScene || {})
      this.grid = Object.assign({}, storeScene.grid || {})

      this.gridArray = this.gridSetup.createNewGrid()
      this.drawScene(this.gridArray)
      }
    },
    // granular watcher for incremental draw setting changes
    '$store.state.sceneView.drawOnScene': {
      handler(newVal) {
        this.drawOnScene = Object.assign({}, newVal || {})
        this.handleDrawOnSceneChange(newVal)
      },
      deep: true
    },
    // granular watcher for grid config changes
    '$store.state.sceneView.grid': {
      handler(newVal, oldVal) {
        this.grid = Object.assign({}, newVal || {})
        this.handleGridChange(newVal, oldVal)
      },
      deep: true
    }
    ,
    '$store.state.sceneView.camera': {
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

    const storeScene = this.$store.state.sceneView || {}
    this.drawOnScene = Object.assign({}, storeScene.drawOnScene || {})
    this.grid = Object.assign({}, storeScene.grid || {})

    this.$store.commit('simulation/reset')
    this.$store.commit('simulation/setRunning', true)

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

    this._onResize = () => {
      if(!this.renderer || !this.camera || !this.container) return
      const width = Math.max(1, this.container.clientWidth - 100)
      const height = Math.max(1, this.container.clientHeight - 100)
      this.renderer.setSize(width, height)
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', this._onResize)

    this.startAnimation();
  },

  beforeUnmount(){
    this.$store.commit('simulation/setRunning', false)
    document.removeEventListener('request-pointer-lock', this._onRequestPointerLock)
    document.removeEventListener('update-input-settings', this._onUpdateInputSettings)
    document.removeEventListener('pointerlockchange', this._onPointerLockChangeForHint)
    window.removeEventListener('resize', this._onResize)
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
      setGroupVisibility(this.scene, newVal)
    },

    handleGridChange(newGrid, oldGrid) {
      if(!oldGrid || !newGrid || !this.scene) return
      // structural change like gridSize -> recreate only grid group
      if(newGrid.gridSize !== oldGrid.gridSize){
        this.gridArray = this.gridSetup.createNewGrid()
        if(this.drawOnScene && this.drawOnScene.gridLayout) this.drawGridLayout(this.gridArray)
        if(this.drawOnScene && this.drawOnScene.buildings) this.drawGridBuildings(this.gridArray)
        if(this.drawOnScene && this.drawOnScene.floor) this.createAndDrawFloor()
        this.renderScene()
      }
      // non structural changes (e.g. flags) can be handled via handleDrawOnSceneChange
    },

    drawGridLayout(arrayOfGrids){
      if(!this.scene) return
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      const halfExtent = ((gridSize - 1) / 2) * spacing
      rebuildGridLayout({
        scene: this.scene,
        arrayOfGrids,
        spacing,
        halfExtent,
        createBox: this.createBox,
        disposeObject: this.disposeObject,
      })
    },
    drawGridBuildings(arrayOfGrids){
      if(!this.scene) return
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      const halfExtent = ((gridSize - 1) / 2) * spacing
      rebuildBuildings({
        scene: this.scene,
        arrayOfGrids,
        spacing,
        halfExtent,
        createBox: this.createBox,
        createBoxEdges: this.createBoxEdges,
        disposeObject: this.disposeObject,
      })
    },

    // getGridWithCoords(x, y){
    //   return this.gridArray.filter((grid) => {
    //     return grid.coords.x == x && grid.coords.y == y
    //   })
    // },

    setUpRenderer:function(){
      this.container = document.getElementById('container');
      this.renderer = markRaw(new Three.WebGLRenderer({antialias: true, alpha: true}));
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.setSize(Math.max(1, this.container.clientWidth-100), Math.max(1, this.container.clientHeight-100));
      this.renderer.setClearColor (0x000000, 0);
      this.container.appendChild(this.renderer.domElement);
    },
    createAndDrawFloor: function() {
      if(!this.scene) return
      const gridSize = (this.grid && this.grid.gridSize) || (this.gridSetup && this.gridSetup.grid && this.gridSetup.grid.gridSize) || 8
      const spacing = (this.grid && this.grid.spacing) || 1
      rebuildFloor({
        scene: this.scene,
        gridSize,
        spacing,
        disposeObject: this.disposeObject,
      })
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

        // exit pointer lock if active to avoid input conflict
        try{ if(document.exitPointerLock) document.exitPointerLock() }catch(e){ void e }

        this.cameraAnimation = createCameraAnimation(this.camera, target, { duration })
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

      const simulationState = this.$store.state.simulation || {}
      if(simulationState.running){
        const speedMultiplier = Number(simulationState.speedMultiplier) || 1
        this.simulationAccumulator += Math.max(0, deltaMs) * speedMultiplier
        const maxTicksPerFrame = 8
        let ticksProcessed = 0
        while(
          this.simulationAccumulator >= this.simulationStepMs &&
          ticksProcessed < maxTicksPerFrame &&
          (this.$store.state.simulation || {}).running
        ){
          this.simulationAccumulator -= this.simulationStepMs
          this.$store.commit('simulation/incrementTick')
          ticksProcessed += 1
        }
        if(this.simulationAccumulator > this.simulationStepMs * maxTicksPerFrame){
          this.simulationAccumulator = this.simulationStepMs * maxTicksPerFrame
        }
      }

      if(this.cameraOrbiting){
        const t = (now || performance.now()) / 1000
        const angle = t * this.orbitSpeed
        const r = this.orbitRadius
        const y = this.orbitAltitude
        this.camera.position.x = Math.cos(angle) * r
        this.camera.position.z = Math.sin(angle) * r
        this.camera.position.y = y
        this.tmpLookVec.set(0, 0, 0)
        this.camera.lookAt(this.tmpLookVec)
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
          const result = stepCameraAnimation(this.camera, this.cameraAnimation, now, this.tmpLookVec)
          if(result.done){
            this.cameraAnimation = null
          }
        }catch(e){ void e }
      }

      if(!this.renderer || !this.scene || !this.camera) return
      this.renderer.render(this.scene, this.camera)
      // update mini-map with current camera position and direction
      try{
        this.camera.getWorldDirection(this.tmpDirVec)
        if(this.$refs && this.$refs.miniMap && typeof this.$refs.miniMap.updateCamera === 'function'){
          this.$refs.miniMap.updateCamera(this.camera.position, this.tmpDirVec)
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
