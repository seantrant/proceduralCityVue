<template>
  <div id="container">
    <appNav />
    <appTodo />
    <appCamera />
    <appLayers />
    <appSettings />
    <appWeather />
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
import appWeather from '@/components/weather.vue'
import miniMap from '@/components/miniMap.vue'
import GridSetup from '@/utils/gridSetup.js'
import {
  drawScene as drawSceneComposable,
  handleDrawOnSceneChange as handleDrawOnSceneChangeComposable,
  handleGridChange as handleGridChangeComposable,
  drawGridLayout as drawGridLayoutComposable,
  drawGridBuildings as drawGridBuildingsComposable,
  createAndDrawFloor as createAndDrawFloorComposable,
} from '@/composables/useSceneDrawing'
import {
  disposeSkyBackgroundTexture as disposeSkyBackgroundTextureComposable,
  createSkyBackground as createSkyBackgroundComposable,
  ensureSkyDome as ensureSkyDomeComposable,
  applyAtmosphere as applyAtmosphereComposable,
} from '@/composables/useSceneAtmosphere'
import {
  setUpRenderer as setUpRendererComposable,
  setUpCamera as setUpCameraComposable,
  setupControls as setupControlsComposable,
  disposeRendererAndScene,
} from '@/composables/useSceneBootstrap'
import {
  createCameraAnimation,
  stepCameraAnimation,
} from '@/composables/useCameraAnimation'
import { animateSceneFrame } from '@/composables/useSceneRuntimeLoop'
import { buildSceneStoreWatchers } from '@/composables/useSceneStoreWatchers'

export default {
  name: 'Scene',
  components: {
    appNav,
    appTodo,
    appCamera,
    appLayers,
    appSettings,
    appWeather,
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
      atmosphere: Object.assign({}, this.$store.state.sceneView.atmosphere || {}),
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
      lastMiniMapUpdateAt: 0,
      miniMapUpdateIntervalMs: 80,
      miniMapMoveThresholdSq: 0.01,
      miniMapTurnThresholdDot: 0.9992,
      lastMiniMapPos: markRaw(new Three.Vector3(Number.NaN, Number.NaN, Number.NaN)),
      lastMiniMapDir: markRaw(new Three.Vector3(0, 0, 0)),
      skyBackgroundTexture: null,
      skyDomeName: 'skyDome',
    }
  },
  watch: buildSceneStoreWatchers(),
  mounted() {
    this.gridSetup = new GridSetup({store: this.$store})

    const storeScene = this.$store.state.sceneView || {}
    this.drawOnScene = Object.assign({}, storeScene.drawOnScene || {})
    this.grid = Object.assign({}, storeScene.grid || {})
    this.atmosphere = Object.assign({}, storeScene.atmosphere || {})

    this.$store.commit('simulation/reset')
    this.$store.commit('simulation/setRunning', true)

    this.setUpRenderer()
    this.setUpCamera();
    this.applyAtmosphere()
    this.updateFov();

    this.gridArray = this.gridSetup.createNewGrid()
    this.drawScene(this.gridArray)

    this.setupControls();

    const inputSettings = Object.assign({}, storeScene.input || {})
    if(this.input){
      if(typeof inputSettings.mouseSensitivity === 'number') this.input.mouseSensitivity = inputSettings.mouseSensitivity
      if(typeof inputSettings.moveSpeed === 'number') this.input.moveSpeed = inputSettings.moveSpeed
      if(typeof inputSettings.acceleration === 'number') this.input.acceleration = inputSettings.acceleration
      if(typeof inputSettings.friction === 'number') this.input.friction = inputSettings.friction
    }

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
    document.removeEventListener('pointerlockchange', this._onPointerLockChangeForHint)
    window.removeEventListener('resize', this._onResize)
    // stop animation loop
    if(this._rafId) cancelAnimationFrame(this._rafId)
    disposeRendererAndScene(this, {
      disposeSkyBackgroundTexture: disposeSkyBackgroundTextureComposable,
    })
  },
  methods: {

    disposeSkyBackgroundTexture(){
      disposeSkyBackgroundTextureComposable(this)
    },

    createSkyBackground(topHex, bottomHex){
      createSkyBackgroundComposable(this, topHex, bottomHex)
    },

    ensureSkyDome(topHex, bottomHex){
      ensureSkyDomeComposable(this, topHex, bottomHex)
    },

    applyAtmosphere(){
      applyAtmosphereComposable(this)
    },

    drawScene(arrayOfGrids){
      drawSceneComposable(this, arrayOfGrids)
    },

    handleDrawOnSceneChange(newVal, oldVal) {
      handleDrawOnSceneChangeComposable(this, newVal, oldVal)
    },

    handleGridChange(newGrid, oldGrid) {
      handleGridChangeComposable(this, newGrid, oldGrid)
    },

    drawGridLayout(arrayOfGrids){
      drawGridLayoutComposable(this, arrayOfGrids)
    },
    drawGridBuildings(arrayOfGrids){
      drawGridBuildingsComposable(this, arrayOfGrids)
    },

    // getGridWithCoords(x, y){
    //   return this.gridArray.filter((grid) => {
    //     return grid.coords.x == x && grid.coords.y == y
    //   })
    // },

    setUpRenderer:function(){
      setUpRendererComposable(this)
    },
    createAndDrawFloor: function() {
      createAndDrawFloorComposable(this)
    },
    setUpCamera: function(){
      setUpCameraComposable(this)
    },
    setupControls(){
      setupControlsComposable(this)
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
      animateSceneFrame(this, now, { stepCameraAnimation })
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
