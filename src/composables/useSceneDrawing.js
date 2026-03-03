import {
  rebuildBuildings,
  rebuildFloor,
  rebuildGridLayout,
  rebuildRoads,
  rebuildStreetLights,
  setGroupVisibility,
} from '@/composables/useSceneGroups'
import { createTraffic } from '@/composables/useTraffic'

export function drawScene(vm, arrayOfGrids) {
  if(vm.drawOnScene.buildings){
    drawGridBuildings(vm, arrayOfGrids)
  }
  if(vm.drawOnScene.gridLayout){
    drawGridLayout(vm, arrayOfGrids)
  }
  if(vm.drawOnScene.floor){
    createAndDrawFloor(vm)
  }
  vm.renderScene()
}

export function handleDrawOnSceneChange(vm, newVal, oldVal) {
  if(!vm || !vm.scene) return

  const next = newVal || {}
  const prev = oldVal || {}
  const scene = vm.scene

  const hasGridGroup = !!(scene.getObjectByName && scene.getObjectByName('gridGroup'))
  const hasRoadGroup = !!(scene.getObjectByName && scene.getObjectByName('roadGroup'))
  const hasBuildingGroup = !!(scene.getObjectByName && scene.getObjectByName('buildingGroup'))
  const hasRoofLightGroup = !!(scene.getObjectByName && scene.getObjectByName('roofLightGroup'))
  const hasFloorGroup = !!(scene.getObjectByName && scene.getObjectByName('floorGroup'))

  if(next.gridLayout && (!prev.gridLayout || !hasGridGroup || !hasRoadGroup)) {
    if(!vm.gridArray && vm.gridSetup && typeof vm.gridSetup.createNewGrid === 'function') {
      vm.gridArray = vm.gridSetup.createNewGrid()
    }
    drawGridLayout(vm, vm.gridArray || [])
  }

  if(next.buildings && (!prev.buildings || !hasBuildingGroup || (next.roofLights && !hasRoofLightGroup))) {
    if(!vm.gridArray && vm.gridSetup && typeof vm.gridSetup.createNewGrid === 'function') {
      vm.gridArray = vm.gridSetup.createNewGrid()
    }
    drawGridBuildings(vm, vm.gridArray || [])
  }

  if(next.floor && (!prev.floor || !hasFloorGroup)) {
    createAndDrawFloor(vm)
  }

  setGroupVisibility(scene, next)
  vm.renderScene()
}

export function handleGridChange(vm, newGrid, oldGrid) {
  if(!oldGrid || !newGrid || !vm.scene) return
  // structural change like gridSize -> recreate only grid group
  if(newGrid.gridSize !== oldGrid.gridSize){
    vm.gridArray = vm.gridSetup.createNewGrid()
    if(vm.drawOnScene && vm.drawOnScene.gridLayout) drawGridLayout(vm, vm.gridArray)
    if(vm.drawOnScene && vm.drawOnScene.buildings) drawGridBuildings(vm, vm.gridArray)
    if(vm.drawOnScene && vm.drawOnScene.floor) createAndDrawFloor(vm)
    vm.renderScene()
  }
  // non structural changes (e.g. flags) can be handled via handleDrawOnSceneChange
}

export function drawGridLayout(vm, arrayOfGrids) {
  if(!vm.scene) return
  const gridSize = (vm.grid && vm.grid.gridSize) || (vm.gridSetup && vm.gridSetup.grid && vm.gridSetup.grid.gridSize) || 8
  const spacing = (vm.grid && vm.grid.spacing) || 1
  const halfExtent = ((gridSize - 1) / 2) * spacing
  rebuildGridLayout({
    scene: vm.scene,
    arrayOfGrids,
    spacing,
    halfExtent,
    disposeObject: vm.disposeObject,
  })
    try {
      rebuildRoads({
    scene: vm.scene,
    arrayOfGrids,
    spacing,
    halfExtent,
    disposeObject: vm.disposeObject,
  })
      const roadGroup = vm.scene && vm.scene.getObjectByName && vm.scene.getObjectByName('roadGroup')
      try {
        const trafficConfig = (vm.$store && vm.$store.state && vm.$store.state.sceneView && vm.$store.state.sceneView.trafficConfig) || {}
        if (vm.drawOnScene && vm.drawOnScene.traffic) {
          createTraffic({
            scene: vm.scene,
            roadGroup,
            disposeObject: vm.disposeObject,
            options: trafficConfig,
          })
        }
      } catch (e) { void e }
    } catch (e) { void e }
  // street lights (sprite-based)
  try {
    rebuildStreetLights({
      scene: vm.scene,
      arrayOfGrids,
      spacing,
      halfExtent,
      disposeObject: vm.disposeObject,
    })
  } catch (e) {
    void e
  }
}

export function drawGridBuildings(vm, arrayOfGrids) {
  if(!vm.scene) return
  const gridSize = (vm.grid && vm.grid.gridSize) || (vm.gridSetup && vm.gridSetup.grid && vm.gridSetup.grid.gridSize) || 8
  const spacing = (vm.grid && vm.grid.spacing) || 1
  const halfExtent = ((gridSize - 1) / 2) * spacing
  rebuildBuildings({
    scene: vm.scene,
    arrayOfGrids,
    spacing,
    halfExtent,
    drawOnScene: vm.drawOnScene,
    disposeObject: vm.disposeObject,
  })
}

export function createAndDrawFloor(vm) {
  if(!vm.scene) return
  const gridSize = (vm.grid && vm.grid.gridSize) || (vm.gridSetup && vm.gridSetup.grid && vm.gridSetup.grid.gridSize) || 8
  const spacing = (vm.grid && vm.grid.spacing) || 1
  rebuildFloor({
    scene: vm.scene,
    gridSize,
    spacing,
    disposeObject: vm.disposeObject,
  })
}