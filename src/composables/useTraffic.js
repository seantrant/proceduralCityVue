import * as Three from 'three';
import { ensureNamedGroup } from '@/composables/useSceneGroups';
import { buildRoadGraph, generateVehiclePath } from '@/utils/roadGraph';

function createVehicleTexture() {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const grd = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.6, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const tex = new Three.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

const PATH_COLORS = [
  0x00ffff, 0xff00ff, 0x00ff88, 0xffaa00,
  0x44aaff, 0xff4488, 0x88ff44, 0xffff00,
];

export function createTraffic({
  scene, arrayOfGrids, spacing, halfExtent, disposeObject, options = {},
}) {
  const trafficGroup = ensureNamedGroup(scene, 'trafficGroup', disposeObject);
  if (trafficGroup.userData && trafficGroup.userData.vehicleTexture && typeof trafficGroup.userData.vehicleTexture.dispose === 'function') {
    try { trafficGroup.userData.vehicleTexture.dispose(); } catch (e) { void e; }
  }
  trafficGroup.userData = {
    vehicleSprites: [],
    vehicleMeta: [],
    vehicleTexture: null,
    roadGraph: null,
  };

  const roadGraph = buildRoadGraph(arrayOfGrids || [], spacing, halfExtent);
  if (!roadGraph || roadGraph.size === 0) return trafficGroup;

  const density = Number(options.density) || 100;
  const minSpeed = Number(options.minSpeed) || 0.1;
  const maxSpeed = Number(options.maxSpeed) || 0.5;

  const numVehicles = Math.max(1, Math.round((roadGraph.size / 100) * density));

  const vehicleTexture = createVehicleTexture();
  const sprites = [];
  const metas = [];

  for (let i = 0; i < numVehicles; i++) {
    const path = generateVehiclePath(roadGraph, 40, 80);
    if (path.length < 2) continue;

    const waypointIndex = Math.floor(Math.random() * (path.length - 1));
    const t = Math.random();
    const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

    const mat = new Three.SpriteMaterial({
      map: vehicleTexture,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      opacity: 0.95,
    });
    const sprite = new Three.Sprite(mat);
    const pos = new Three.Vector3().lerpVectors(path[waypointIndex], path[waypointIndex + 1], t);
    sprite.position.copy(pos);
    sprite.scale.set(0.34, 0.34, 1);
    sprite.renderOrder = 999;
    trafficGroup.add(sprite);

    sprites.push(sprite);
    metas.push({
      path,
      waypointIndex,
      t,
      speed,
    });
  }

  trafficGroup.userData = {
    vehicleSprites: sprites,
    vehicleMeta: metas,
    vehicleTexture,
    roadGraph,
  };

  // build path visualisation (hidden by default)
  buildTrafficPathLines(trafficGroup, scene, disposeObject, options.showTrafficPaths);

  return trafficGroup;
}

/**
 * Create a Three.js group that renders each vehicle's path as a coloured line.
 */
export function buildTrafficPathLines(trafficGroup, scene, disposeObject, visible) {
  const pathsGroup = ensureNamedGroup(scene, 'trafficPathsGroup', disposeObject);
  pathsGroup.visible = !!visible;
  const metas = (trafficGroup && trafficGroup.userData && trafficGroup.userData.vehicleMeta) || [];

  metas.forEach((meta, idx) => {
    if (!meta.path || meta.path.length < 2) return;
    const color = PATH_COLORS[idx % PATH_COLORS.length];
    const points = meta.path.map((p) => new Three.Vector3(p.x, p.y + 0.015, p.z));
    const geometry = new Three.BufferGeometry().setFromPoints(points);
    const material = new Three.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const line = new Three.Line(geometry, material);
    line.renderOrder = 998;
    pathsGroup.add(line);
  });
}

export function stepTrafficFrame(vm, now, cachedTrafficGroup = null) {
  if (!vm || !vm.scene || !vm.camera) return;
  const trafficGroup = cachedTrafficGroup || (vm.scene.getObjectByName && vm.scene.getObjectByName('trafficGroup'));
  if (!trafficGroup || !trafficGroup.visible || !trafficGroup.userData) return;
  const { vehicleSprites = [], vehicleMeta = [] } = trafficGroup.userData;
  if (!vehicleMeta.length) return;

  const deltaMs = now - (vm._trafficLastTime || now);
  const delta = Math.min(0.05, Math.max(0, deltaMs / 1000));
  vm._trafficLastTime = now;

  const scratch = trafficGroup.userData.__scratch || {
    camDir: new Three.Vector3(),
    pos: new Three.Vector3(),
    heading: new Three.Vector3(),
    fallbackPerp: new Three.Vector3(),
    offsetVec: new Three.Vector3(),
  };
  trafficGroup.userData.__scratch = scratch;

  vm.camera.getWorldDirection(scratch.camDir);
  scratch.camDir.normalize();

  for (let i = 0; i < vehicleMeta.length; i++) {
    const meta = vehicleMeta[i];
    const { path } = meta;
    if (!path || path.length < 2) continue;

    // advance along waypoints
    const wpA = path[meta.waypointIndex];
    const wpB = path[(meta.waypointIndex + 1) % path.length];
    const wpDist = wpA.distanceTo(wpB) || 1;
    const dt = (meta.speed * delta) / wpDist;
    meta.t += dt;

    // move to next waypoint(s) if needed
    while (meta.t >= 1 && path.length >= 2) {
      meta.t -= 1;
      meta.waypointIndex = (meta.waypointIndex + 1) % path.length;
      const aIdx = meta.waypointIndex;
      const bIdx = (aIdx + 1) % path.length;
      const newDist = path[aIdx].distanceTo(path[bIdx]) || 1;
      meta.t *= wpDist / newDist;
      break;
    }

    const aIdx = meta.waypointIndex;
    const bIdx = (aIdx + 1) % path.length;
    const segA = path[aIdx];
    const segB = path[bIdx];

    const pos = scratch.pos.lerpVectors(segA, segB, Math.min(meta.t, 1));
    const sprite = vehicleSprites[i];
    if (!sprite) continue;

    // heading for lane offset & headlight colour
    const heading = scratch.heading.subVectors(segB, segA);
    heading.y = 0;
    if (heading.lengthSq() > 1e-6) heading.normalize();
    else heading.set(1, 0, 0);

    // perpendicular (left)
    const perp = scratch.fallbackPerp.set(-heading.z, 0, heading.x).normalize();

    // approaching or receding relative to camera
    const dot = heading.dot(scratch.camDir);
    const towards = dot < 0;
    const color = towards ? 0xffffff : 0xff2222;
    if (sprite.material && sprite.material.color) sprite.material.color.setHex(color);

    // lane offset
    const laneOffset = 0.14;
    const offsetVec = scratch.offsetVec.copy(perp).multiplyScalar(towards ? -laneOffset : laneOffset);

    sprite.position.copy(pos).add(offsetVec);
  }
}
