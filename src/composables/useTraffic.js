import * as Three from 'three'
import { ensureNamedGroup } from '@/composables/useSceneGroups'

function createVehicleTexture() {
  const size = 32
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const grd = ctx.createRadialGradient(size/2, size/2, 1, size/2, size/2, size/2)
  grd.addColorStop(0, 'rgba(255,255,255,1)')
  grd.addColorStop(0.6, 'rgba(255,255,255,0.9)')
  grd.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.clearRect(0,0,size,size)
  ctx.fillStyle = grd
  ctx.fillRect(0,0,size,size)
  const tex = new Three.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export function createTraffic({ scene, roadGroup, disposeObject, options = {} }) {
  const trafficGroup = ensureNamedGroup(scene, 'trafficGroup', disposeObject)
  if (trafficGroup.userData && trafficGroup.userData.vehicleTexture && typeof trafficGroup.userData.vehicleTexture.dispose === 'function') {
    try { trafficGroup.userData.vehicleTexture.dispose() } catch(e){ void e }
  }
  trafficGroup.userData = {
    vehicleSprites: [],
    vehicleMeta: [],
    vehicleTexture: null,
  }

  const segments = (roadGroup && roadGroup.userData && (roadGroup.userData.centerSegments || roadGroup.userData.centerSegments)) || []
  if (!segments.length) return trafficGroup

  const density = Number(options.density) || 100
  const minSpeed = Number(options.minSpeed) || 0.1
  const maxSpeed = Number(options.maxSpeed) || 0.5

  const totalLength = segments.reduce((s, seg) => s + (seg.length || 0), 0)
  const numVehicles = Math.max(1, Math.round((totalLength / 100) * density))

  const vehicleTexture = createVehicleTexture()
  const sprites = []
  const metas = []

  for (let i = 0; i < numVehicles; i++) {
    const segIdx = Math.floor(Math.random() * segments.length)
    const seg = segments[segIdx]
    const t = Math.random()
    const dir = Math.random() < 0.5 ? 1 : -1
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed)

    const mat = new Three.SpriteMaterial({
      map: vehicleTexture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
    })
    const sprite = new Three.Sprite(mat)
    const pos = new Three.Vector3().lerpVectors(seg.a, seg.b, t)
    sprite.position.copy(pos)
    // larger default scale to ensure visibility
    sprite.scale.set(0.34, 0.34, 1)
    // render on top to be visible against scene geometry
    sprite.renderOrder = 999
    trafficGroup.add(sprite)

    sprites.push(sprite)
    metas.push({
      segmentIndex: segIdx,
      t,
      dir,
      speed,
    })
  }

  trafficGroup.userData = {
    vehicleSprites: sprites,
    vehicleMeta: metas,
    vehicleTexture,
    segments,
  }

  return trafficGroup
}

export function stepTrafficFrame(vm, now) {
  if (!vm || !vm.scene || !vm.camera) return
  const trafficGroup = vm.scene.getObjectByName && vm.scene.getObjectByName('trafficGroup')
  if (!trafficGroup || !trafficGroup.visible || !trafficGroup.userData) return
  const { vehicleSprites = [], vehicleMeta = [], segments = [] } = trafficGroup.userData
  if (!segments.length) return

  const deltaMs = now - (vm._trafficLastTime || now)
  const delta = Math.min(0.05, Math.max(0, deltaMs / 1000))
  vm._trafficLastTime = now

  const camDir = new Three.Vector3()
  vm.camera.getWorldDirection(camDir)
  camDir.normalize()

  for (let i = 0; i < vehicleMeta.length; i++) {
    const meta = vehicleMeta[i]
    const seg = segments[meta.segmentIndex]
    if (!seg || !seg.length) continue
    const segLen = seg.length || 1
    const dt = (meta.speed * delta) / segLen
    meta.t += dt * meta.dir

    if (meta.t > 1) {
      meta.t -= 1
      meta.segmentIndex = (meta.segmentIndex + 1) % segments.length
    } else if (meta.t < 0) {
      meta.t += 1
      meta.segmentIndex = (meta.segmentIndex - 1 + segments.length) % segments.length
    }

    const curSeg = segments[meta.segmentIndex]
    const pos = new Three.Vector3().lerpVectors(curSeg.a, curSeg.b, meta.t)
    const sprite = vehicleSprites[i]
    if (sprite) {
      // determine perpendicular for lateral offset (center-left / center-right)
      let perp = curSeg.perpLeft
      if (!perp) {
        const fallbackHeading = new Three.Vector3().subVectors(curSeg.b, curSeg.a)
        fallbackHeading.y = 0
        if (fallbackHeading.lengthSq() > 1e-6) fallbackHeading.normalize()
        else fallbackHeading.set(1, 0, 0)
        perp = new Three.Vector3(-fallbackHeading.z, 0, fallbackHeading.x)
        perp.normalize()
      }

      const lookT = Math.max(0, Math.min(1, meta.t + 0.05 * meta.dir))
      const nextPos = new Three.Vector3().lerpVectors(curSeg.a, curSeg.b, lookT)
      const heading = new Three.Vector3().subVectors(nextPos, pos).normalize()

      const dot = heading.dot(camDir)
      const towards = dot < 0
      const color = towards ? 0xffffff : 0xff2222
      if (sprite.material && sprite.material.color) sprite.material.color.setHex(color)

      // lane offset: away-from-camera -> center-left; toward-camera -> center-right
      const laneOffset = 0.14
      // perp is a left-pointing perpendicular; use negation for right lane
      const offsetVec = new Three.Vector3().copy(perp).multiplyScalar(towards ? -laneOffset : laneOffset)

      sprite.position.copy(pos).add(offsetVec)
    }
  }
}
