import * as Three from 'three'
import { markRaw } from 'vue'

export function ensureNamedGroup(scene, groupName, disposeObject) {
  let group = scene.getObjectByName && scene.getObjectByName(groupName)
  if (group) {
    while (group.children.length) {
      const child = group.children[0]
      if (disposeObject) disposeObject(child)
      group.remove(child)
    }
  } else {
    group = markRaw(new Three.Group())
    group.name = groupName
    scene.add(group)
  }
  return group
}

export function setGroupVisibility(scene, drawOnScene) {
  if (!scene) return
  const floorGroup = scene.getObjectByName && scene.getObjectByName('floorGroup')
  if (floorGroup) floorGroup.visible = !!(drawOnScene && drawOnScene.floor)

  const gridGroup = scene.getObjectByName && scene.getObjectByName('gridGroup')
  if (gridGroup) gridGroup.visible = !!(drawOnScene && drawOnScene.gridLayout)

  const buildingGroup = scene.getObjectByName && scene.getObjectByName('buildingGroup')
  if (buildingGroup) buildingGroup.visible = !!(drawOnScene && drawOnScene.buildings)
}

export function rebuildGridLayout({ scene, arrayOfGrids, spacing, halfExtent, createBox, disposeObject }) {
  const gridGroup = ensureNamedGroup(scene, 'gridGroup', disposeObject)
  const height = 0.01

  arrayOfGrids.forEach((grid) => {
    let box = null
    if (grid.contents === 'road') {
      box = createBox(spacing, height, spacing, 0xD3D3D3, false)
    } else if (grid.contents === 'building') {
      box = createBox(spacing, height, spacing, 0x6a0dad, false)
    } else if (grid.contents === 'junction') {
      box = createBox(spacing, height, spacing, 0x6a0000, false)
    }

    if (box) {
      const x = grid.coords.x * spacing - halfExtent
      const z = grid.coords.y * spacing - halfExtent
      box.position.set(x, 0.1, z)
      gridGroup.add(box)
    }
  })
}

export function rebuildBuildings({ scene, arrayOfGrids, spacing, halfExtent, createBox, createBoxEdges, disposeObject }) {
  const buildingGroup = ensureNamedGroup(scene, 'buildingGroup', disposeObject)

  arrayOfGrids.forEach((grid) => {
    if (grid.contents === 'building') {
      const height = Math.random() * 5
      const box = createBox(spacing, height, spacing, 0x000000, false)
      const boxEdges = createBoxEdges(spacing, height, spacing)
      const x = grid.coords.x * spacing - halfExtent
      const z = grid.coords.y * spacing - halfExtent
      box.position.set(x, 0.1 + height / 2, z)
      boxEdges.position.set(x, 0.1 + height / 2, z)
      buildingGroup.add(boxEdges)
      buildingGroup.add(box)
    }
  })
}

export function rebuildFloor({ scene, gridSize, spacing, disposeObject }) {
  const floorGroup = ensureNamedGroup(scene, 'floorGroup', disposeObject)
  const width = gridSize * spacing
  const geometry = new Three.BoxGeometry(width, 0.1, width)
  const material = new Three.MeshBasicMaterial({ color: 0x000002, wireframe: false })
  const floorMesh = new Three.Mesh(geometry, material)
  floorMesh.position.set(0, 0, 0)
  floorGroup.add(floorMesh)
}
