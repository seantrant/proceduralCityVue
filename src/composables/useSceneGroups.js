import * as Three from 'three'
import { markRaw } from 'vue'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const ROAD_BASE_Y = 0.106
const ROAD_LINE_Y = 0.112
const ROAD_EDGE_INSET_RATIO = 0.14
const ROAD_CENTER_DASH_RATIO = 0.2
const ROAD_CENTER_GAP_RATIO = 0.18

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

  const roadGroup = scene.getObjectByName && scene.getObjectByName('roadGroup')
  if (roadGroup) roadGroup.visible = !!(drawOnScene && drawOnScene.gridLayout)

  const buildingGroup = scene.getObjectByName && scene.getObjectByName('buildingGroup')
  if (buildingGroup) buildingGroup.visible = !!(drawOnScene && drawOnScene.buildings)

  const roofLightGroup = scene.getObjectByName && scene.getObjectByName('roofLightGroup')
  if (roofLightGroup) {
    roofLightGroup.visible = !!(
      drawOnScene
      && drawOnScene.buildings
      && drawOnScene.roofLights
    )
  }
}

export function rebuildGridLayout({ scene, arrayOfGrids, spacing, halfExtent, disposeObject }) {
  const gridGroup = ensureNamedGroup(scene, 'gridGroup', disposeObject)
  const height = 0.01
  const tileGeometry = new Three.BoxGeometry(spacing, height, spacing)
  const buildingMaterial = new Three.MeshBasicMaterial({ color: 0x6a0dad, wireframe: false })
  const junctionMaterial = new Three.MeshBasicMaterial({ color: 0x6a0000, wireframe: false })
  const dummy = new Three.Object3D()
  const buildings = []
  const junctions = []

  arrayOfGrids.forEach((grid) => {
    let bucket = null
    if (grid.contents === 'building') {
      bucket = buildings
    } else if (grid.contents === 'junction') {
      bucket = junctions
    }

    if (bucket) {
      const x = grid.coords.x * spacing - halfExtent
      const z = grid.coords.y * spacing - halfExtent
      bucket.push({ x, y: 0.1, z })
    }
  })

  const addInstancedTiles = (transforms, material) => {
    if (!transforms.length) return
    const instances = new Three.InstancedMesh(tileGeometry, material, transforms.length)
    transforms.forEach((transform, index) => {
      dummy.position.set(transform.x, transform.y, transform.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      instances.setMatrixAt(index, dummy.matrix)
    })
    instances.instanceMatrix.needsUpdate = true
    gridGroup.add(instances)
  }

  addInstancedTiles(buildings, buildingMaterial)
  addInstancedTiles(junctions, junctionMaterial)
}

export function rebuildRoads({ scene, arrayOfGrids, spacing, halfExtent, disposeObject }) {
  const roadGroup = ensureNamedGroup(scene, 'roadGroup', disposeObject)
  const roadMaterial = new Three.MeshBasicMaterial({ color: 0x121212, wireframe: false })
  const lineMaterial = new Three.LineBasicMaterial({ color: 0xffffff })
  const centerLineMaterial = new Three.LineBasicMaterial({ color: 0xffffff })
  const baseParts = []
  const edgeLinePoints = []
  const centerLinePoints = []
  const half = spacing * 0.5
  const edgeInset = spacing * ROAD_EDGE_INSET_RATIO
  const dashLen = spacing * ROAD_CENTER_DASH_RATIO
  const gapLen = spacing * ROAD_CENTER_GAP_RATIO

  const keyFor = (x, y) => `${x},${y}`
  const gridByCoords = new Map()
  const isDriveable = (grid) => !!grid && (grid.contents === 'road' || grid.contents === 'junction')

  arrayOfGrids.forEach((grid) => {
    gridByCoords.set(keyFor(grid.coords.x, grid.coords.y), grid)
  })

  const getNeighbor = (grid, dx, dy) => {
    return gridByCoords.get(keyFor(grid.coords.x + dx, grid.coords.y + dy))
  }

  const pushLine = (x1, z1, x2, z2, target) => {
    target.push(x1, ROAD_LINE_Y, z1, x2, ROAD_LINE_Y, z2)
  }

  const pushDashedLine = (x1, z1, x2, z2, dash, gap, target) => {
    const dx = x2 - x1
    const dz = z2 - z1
    const length = Math.sqrt(dx * dx + dz * dz)
    if (length <= 0) return
    const ux = dx / length
    const uz = dz / length
    let distance = 0

    while (distance < length) {
      const start = distance
      const end = Math.min(distance + dash, length)
      const sx = x1 + ux * start
      const sz = z1 + uz * start
      const ex = x1 + ux * end
      const ez = z1 + uz * end
      pushLine(sx, sz, ex, ez, target)
      distance += dash + gap
    }
  }

  arrayOfGrids.forEach((grid) => {
    if (!isDriveable(grid)) return

    const north = isDriveable(getNeighbor(grid, 0, -1))
    const south = isDriveable(getNeighbor(grid, 0, 1))
    const east = isDriveable(getNeighbor(grid, 1, 0))
    const west = isDriveable(getNeighbor(grid, -1, 0))

    const insetNorth = north ? 0 : edgeInset
    const insetSouth = south ? 0 : edgeInset
    const insetEast = east ? 0 : edgeInset
    const insetWest = west ? 0 : edgeInset

    const x = grid.coords.x * spacing - halfExtent
    const z = grid.coords.y * spacing - halfExtent
    const width = spacing - insetEast - insetWest
    const depth = spacing - insetNorth - insetSouth
    if (width <= 0 || depth <= 0) return

    const centerX = x + (insetWest - insetEast) * 0.5
    const centerZ = z + (insetNorth - insetSouth) * 0.5

    const roadPatch = new Three.PlaneGeometry(width, depth)
    roadPatch.rotateX(-Math.PI / 2)
    roadPatch.translate(centerX, ROAD_BASE_Y, centerZ)
    baseParts.push(roadPatch)

    const xMin = centerX - width * 0.5
    const xMax = centerX + width * 0.5
    const zMin = centerZ - depth * 0.5
    const zMax = centerZ + depth * 0.5

    if (!north) pushLine(xMin, zMin, xMax, zMin, edgeLinePoints)
    if (!south) pushLine(xMin, zMax, xMax, zMax, edgeLinePoints)
    if (!west) pushLine(xMin, zMin, xMin, zMax, edgeLinePoints)
    if (!east) pushLine(xMax, zMin, xMax, zMax, edgeLinePoints)

    if (north && south) {
      pushDashedLine(x, z - half, x, z + half, dashLen, gapLen, centerLinePoints)
    }
    if (east && west) {
      pushDashedLine(x - half, z, x + half, z, dashLen, gapLen, centerLinePoints)
    }
  })

  if (baseParts.length) {
    const mergedRoad = mergeGeometries(baseParts, false)
    if (mergedRoad) {
      const roadMesh = new Three.Mesh(mergedRoad, roadMaterial)
      roadGroup.add(roadMesh)
    }
    baseParts.forEach((part) => {
      if (part && part.dispose) part.dispose()
    })
  }

  if (edgeLinePoints.length) {
    const edgeGeometry = new Three.BufferGeometry()
    edgeGeometry.setAttribute('position', new Three.Float32BufferAttribute(edgeLinePoints, 3))
    const edgeLines = new Three.LineSegments(edgeGeometry, lineMaterial)
    roadGroup.add(edgeLines)
  }

  if (centerLinePoints.length) {
    const centerGeometry = new Three.BufferGeometry()
    centerGeometry.setAttribute('position', new Three.Float32BufferAttribute(centerLinePoints, 3))
    const centerLines = new Three.LineSegments(centerGeometry, centerLineMaterial)
    roadGroup.add(centerLines)
  }
}

const WINDOW_HEIGHT_THRESHOLD = 2
const WINDOW_PANE_W = 0.14
const WINDOW_PANE_H = 0.22
const WINDOW_LIT_CHANCE = 0.45
const WINDOW_COL_OFFSETS = [-0.25, 0.25]
const ROOF_LIGHT_TOP_PERCENT = 0.1
const ROOF_LIGHT_CORNER_INSET = 0.09
const ROOF_LIGHT_CORE_SCALE = 0.11
const ROOF_LIGHT_HALO_SCALE = 0.28
const ROOF_LIGHT_VERTICAL_OFFSET = 0.03
const ROOF_LIGHT_MIN_PERIOD_SEC = 3.2
const ROOF_LIGHT_MAX_PERIOD_SEC = 6.2
const ROOF_LIGHT_MIN_BURST_GAP = 0.14
const ROOF_LIGHT_MAX_BURST_GAP = 0.26
const ROOF_LIGHT_MIN_PULSE_WIDTH = 0.08
const ROOF_LIGHT_MAX_PULSE_WIDTH = 0.14

function createBeaconTexture() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  )
  gradient.addColorStop(0, 'rgba(255,255,255,1)')
  gradient.addColorStop(0.22, 'rgba(255,120,120,0.92)')
  gradient.addColorStop(0.55, 'rgba(255,40,40,0.5)')
  gradient.addColorStop(1, 'rgba(255,0,0,0)')

  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new Three.CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

export function rebuildBuildings({ scene, arrayOfGrids, spacing, halfExtent, drawOnScene, disposeObject }) {
  const buildingGroup = ensureNamedGroup(scene, 'buildingGroup', disposeObject)
  const roofLightGroup = ensureNamedGroup(scene, 'roofLightGroup', disposeObject)
  if (
    roofLightGroup.userData
    && roofLightGroup.userData.beaconTexture
    && typeof roofLightGroup.userData.beaconTexture.dispose === 'function'
  ) {
    try {
      roofLightGroup.userData.beaconTexture.dispose()
    } catch (e) {
      void e
    }
  }
  roofLightGroup.visible = !!(
    drawOnScene
    && drawOnScene.buildings
    && drawOnScene.roofLights
  )
  const buildingMaterial = new Three.MeshBasicMaterial({ color: 0x000000, wireframe: false })
  const edgeMaterial = new Three.LineBasicMaterial({ color: 0xffffff })
  const paneGeometry = new Three.PlaneGeometry(WINDOW_PANE_W, WINDOW_PANE_H)
  const warmWindowMaterial = new Three.MeshBasicMaterial({ color: 0x886622, side: Three.DoubleSide })
  const coolWindowMaterial = new Three.MeshBasicMaterial({ color: 0x334455, side: Three.DoubleSide })
  const darkWindowMaterial = new Three.MeshBasicMaterial({ color: 0x222222, side: Three.DoubleSide })
  const buildingGeometryCache = new Map()
  const buildingEdgeCache = new Map()
  const buildingHeightBuckets = new Map()
  const warmWindowInstances = []
  const coolWindowInstances = []
  const darkWindowInstances = []
  const buildingRecords = []
  const dummy = new Three.Object3D()

  const getQuantizedHeight = (heightValue) => {
    return Math.max(0.25, Math.round(heightValue * 4) / 4)
  }

  const getBuildingGeometry = (quantizedHeight) => {
    const key = quantizedHeight.toFixed(2)
    if (!buildingGeometryCache.has(key)) {
      buildingGeometryCache.set(key, new Three.BoxGeometry(spacing, quantizedHeight, spacing))
    }
    return {
      geometry: buildingGeometryCache.get(key),
      key,
    }
  }

  const getBuildingEdges = (quantizedHeight) => {
    const { geometry, key } = getBuildingGeometry(quantizedHeight)
    if (!buildingEdgeCache.has(key)) {
      buildingEdgeCache.set(key, new Three.EdgesGeometry(geometry))
    }
    return buildingEdgeCache.get(key)
  }

  const pushWindow = (target, x, y, z, rotY) => {
    target.push({ x, y, z, rotY })
  }

  arrayOfGrids.forEach((grid) => {
    if (grid.contents !== 'building') return

    const randomHeight = Math.random() * 5
    const height = getQuantizedHeight(randomHeight)
    const x = grid.coords.x * spacing - halfExtent
    const z = grid.coords.y * spacing - halfExtent

    buildingRecords.push({ height, x, z })
  })

  const heightsDesc = buildingRecords
    .map(record => record.height)
    .sort((a, b) => b - a)
  const beaconCount = Math.max(1, Math.ceil(heightsDesc.length * ROOF_LIGHT_TOP_PERCENT))
  const minBeaconHeight = heightsDesc[Math.max(0, beaconCount - 1)] || Infinity

  const beaconBuildings = []

  buildingRecords.forEach((record) => {
    const { height, x, z } = record
    const bucketKey = height.toFixed(2)

    if (!buildingHeightBuckets.has(bucketKey)) {
      buildingHeightBuckets.set(bucketKey, {
        height,
        transforms: [],
      })
    }

    buildingHeightBuckets.get(bucketKey).transforms.push({ x, y: 0.1 + height / 2, z })

    if (height >= minBeaconHeight) {
      const inset = spacing * (0.5 - ROOF_LIGHT_CORNER_INSET)
      const roofY = 0.1 + height + ROOF_LIGHT_VERTICAL_OFFSET
      const pulsePeriod = ROOF_LIGHT_MIN_PERIOD_SEC
        + Math.random() * (ROOF_LIGHT_MAX_PERIOD_SEC - ROOF_LIGHT_MIN_PERIOD_SEC)
      const pulsePhaseNorm = Math.random()
      const pulseSharpness = 2.1 + Math.random() * 1.8
      const burstGap = ROOF_LIGHT_MIN_BURST_GAP
        + Math.random() * (ROOF_LIGHT_MAX_BURST_GAP - ROOF_LIGHT_MIN_BURST_GAP)
      const pulseWidth = ROOF_LIGHT_MIN_PULSE_WIDTH
        + Math.random() * (ROOF_LIGHT_MAX_PULSE_WIDTH - ROOF_LIGHT_MIN_PULSE_WIDTH)

      beaconBuildings.push({
        pulsePeriod,
        pulsePhaseNorm,
        pulseSharpness,
        burstGap,
        pulseWidth,
        corners: [
          { x: x + inset, y: roofY, z: z + inset },
          { x: x + inset, y: roofY, z: z - inset },
          { x: x - inset, y: roofY, z: z + inset },
          { x: x - inset, y: roofY, z: z - inset },
        ],
      })
    }

    if (height <= WINDOW_HEIGHT_THRESHOLD) return

    const litBucket = Math.random() < 0.5 ? warmWindowInstances : coolWindowInstances
    const faceOffset = spacing * 0.5 + 0.001
    const faceConfigs = [
      { rotY: 0,              getPos: (bx, bz, co) => [bx + co * spacing, bz + faceOffset] },
      { rotY: Math.PI,        getPos: (bx, bz, co) => [bx + co * spacing, bz - faceOffset] },
      { rotY: Math.PI / 2,    getPos: (bx, bz, co) => [bx + faceOffset,   bz + co * spacing] },
      { rotY: -Math.PI / 2,   getPos: (bx, bz, co) => [bx - faceOffset,   bz + co * spacing] },
    ]
    const floors = Math.floor(height)

    faceConfigs.forEach(({ rotY, getPos }) => {
      WINDOW_COL_OFFSETS.forEach((co) => {
        for (let row = 0; row < floors; row++) {
          const wy = 0.1 + 0.5 + row
          const [wx, wz] = getPos(x, z, co)
          if (Math.random() < WINDOW_LIT_CHANCE) {
            pushWindow(litBucket, wx, wy, wz, rotY)
          } else {
            pushWindow(darkWindowInstances, wx, wy, wz, rotY)
          }
        }
      })
    })
  })

  buildingHeightBuckets.forEach(({ height, transforms }) => {
    if (!transforms.length) return
    const { geometry } = getBuildingGeometry(height)
    const instances = new Three.InstancedMesh(geometry, buildingMaterial, transforms.length)
    transforms.forEach((transform, idx) => {
      dummy.position.set(transform.x, transform.y, transform.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      instances.setMatrixAt(idx, dummy.matrix)
    })
    instances.instanceMatrix.needsUpdate = true
    buildingGroup.add(instances)

    const baseEdges = getBuildingEdges(height)
    const mergedEdgeParts = []
    transforms.forEach((transform) => {
      dummy.position.set(transform.x, transform.y, transform.z)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      const transformedEdges = baseEdges.clone()
      transformedEdges.applyMatrix4(dummy.matrix)
      mergedEdgeParts.push(transformedEdges)
    })

    if (mergedEdgeParts.length) {
      const mergedEdges = mergeGeometries(mergedEdgeParts, false)
      if (mergedEdges) {
        const outlineSegments = new Three.LineSegments(mergedEdges, edgeMaterial)
        buildingGroup.add(outlineSegments)
      }
      mergedEdgeParts.forEach((part) => {
        if (part && part.dispose) part.dispose()
      })
    }
  })

  const addWindowInstances = (transforms, material) => {
    if (!transforms.length) return
    const instances = new Three.InstancedMesh(paneGeometry, material, transforms.length)
    transforms.forEach((transform, idx) => {
      dummy.position.set(transform.x, transform.y, transform.z)
      dummy.rotation.set(0, transform.rotY, 0)
      dummy.scale.set(1, 1, 1)
      dummy.updateMatrix()
      instances.setMatrixAt(idx, dummy.matrix)
    })
    instances.instanceMatrix.needsUpdate = true
    buildingGroup.add(instances)
  }

  addWindowInstances(warmWindowInstances, warmWindowMaterial)
  addWindowInstances(coolWindowInstances, coolWindowMaterial)
  addWindowInstances(darkWindowInstances, darkWindowMaterial)

  roofLightGroup.userData = {
    beaconSprites: [],
    beaconTexture: null,
  }

  if (!drawOnScene || !drawOnScene.roofLights || !beaconBuildings.length) return

  const beaconTexture = createBeaconTexture()
  const beaconSprites = []

  beaconBuildings.forEach((beaconBuilding) => {
    const coreMaterial = new Three.SpriteMaterial({
      map: beaconTexture,
      color: 0xff3333,
      transparent: true,
      opacity: 0.98,
      depthWrite: false,
      blending: Three.AdditiveBlending,
    })
    const haloMaterial = new Three.SpriteMaterial({
      map: beaconTexture,
      color: 0xff0000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      blending: Three.AdditiveBlending,
    })

    beaconBuilding.corners.forEach((point) => {
      const coreSprite = new Three.Sprite(coreMaterial)
      coreSprite.position.set(point.x, point.y, point.z)
      coreSprite.scale.set(ROOF_LIGHT_CORE_SCALE, ROOF_LIGHT_CORE_SCALE, 1)
      coreSprite.userData = {
        baseScale: ROOF_LIGHT_CORE_SCALE,
        pulseScale: 0.14,
        baseOpacity: 0.98,
        pulseMin: 0.08,
        pulsePeriod: beaconBuilding.pulsePeriod,
        pulsePhaseNorm: beaconBuilding.pulsePhaseNorm,
        pulseSharpness: beaconBuilding.pulseSharpness,
        burstGap: beaconBuilding.burstGap,
        pulseWidth: beaconBuilding.pulseWidth,
      }
      roofLightGroup.add(coreSprite)
      beaconSprites.push(coreSprite)

      const haloSprite = new Three.Sprite(haloMaterial)
      haloSprite.position.set(point.x, point.y, point.z)
      haloSprite.scale.set(ROOF_LIGHT_HALO_SCALE, ROOF_LIGHT_HALO_SCALE, 1)
      haloSprite.userData = {
        baseScale: ROOF_LIGHT_HALO_SCALE,
        pulseScale: 0.24,
        baseOpacity: 0.55,
        pulseMin: 0.04,
        pulsePeriod: beaconBuilding.pulsePeriod,
        pulsePhaseNorm: beaconBuilding.pulsePhaseNorm,
        pulseSharpness: beaconBuilding.pulseSharpness,
        burstGap: beaconBuilding.burstGap,
        pulseWidth: beaconBuilding.pulseWidth,
      }
      roofLightGroup.add(haloSprite)
      beaconSprites.push(haloSprite)
    })
  })

  roofLightGroup.userData = {
    beaconSprites,
    beaconTexture,
  }
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
