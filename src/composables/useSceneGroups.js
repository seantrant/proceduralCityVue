import * as Three from 'three';
import { markRaw } from 'vue';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createBillboardInstancedMesh } from '@/utils/billboardShader';
import { generateRandomBuilding, disposeBuildingGroup } from '@/utils/buildingShapes';

const ROAD_BASE_Y = 0.106;
const ROAD_LINE_Y = 0.112;
const ROAD_EDGE_INSET_RATIO = 0.14;
const ROAD_CENTER_DASH_RATIO = 0.2;
const ROAD_CENTER_GAP_RATIO = 0.18;

const STREET_LIGHT_SIDE_OFFSET_RATIO = 0.28;
const STREET_LIGHT_CORE_SCALE = 0.12;
const STREET_LIGHT_HALO_SCALE = 0.32;
const STREET_LIGHT_SPACING_CELLS = 3;

export function ensureNamedGroup(scene, groupName, disposeObject) {
  let group = scene.getObjectByName && scene.getObjectByName(groupName);
  if (group) {
    while (group.children.length) {
      const child = group.children[0];
      if (typeof child.userData?.dispose === 'function') child.userData.dispose(child);
      else if (disposeObject) disposeObject(child);
      group.remove(child);
    }
  } else {
    group = markRaw(new Three.Group());
    group.name = groupName;
    scene.add(group);
  }
  return group;
}

export function setGroupVisibility(scene, drawOnScene) {
  if (!scene) return;
  const floorGroup = scene.getObjectByName && scene.getObjectByName('floorGroup');
  if (floorGroup) floorGroup.visible = !!(drawOnScene && drawOnScene.floor);

  const gridGroup = scene.getObjectByName && scene.getObjectByName('gridGroup');
  if (gridGroup) gridGroup.visible = !!(drawOnScene && drawOnScene.gridLayout);

  const roadGroup = scene.getObjectByName && scene.getObjectByName('roadGroup');
  if (roadGroup) roadGroup.visible = !!(drawOnScene && drawOnScene.gridLayout);

  const buildingGroup = scene.getObjectByName && scene.getObjectByName('buildingGroup');
  if (buildingGroup) buildingGroup.visible = !!(drawOnScene && drawOnScene.buildings);

  const roofLightGroup = scene.getObjectByName && scene.getObjectByName('roofLightGroup');
  if (roofLightGroup) {
    roofLightGroup.visible = !!(
      drawOnScene
      && drawOnScene.buildings
      && drawOnScene.roofLights
    );
  }
  const trafficGroup = scene.getObjectByName && scene.getObjectByName('trafficGroup');
  if (trafficGroup) {
    trafficGroup.visible = !!(drawOnScene && drawOnScene.traffic !== false);
  }

  const airTrafficGroup = scene.getObjectByName && scene.getObjectByName('airTrafficGroup');
  if (airTrafficGroup) {
    airTrafficGroup.visible = !!(drawOnScene && drawOnScene.airTraffic !== false);
  }

  // trafficPathsGroup visibility is controlled by trafficConfig.showTrafficPaths
  // via a dedicated store watcher, so we leave it untouched here.
}

export function rebuildGridLayout({
  scene, arrayOfGrids, spacing, halfExtent, disposeObject,
}) {
  const gridGroup = ensureNamedGroup(scene, 'gridGroup', disposeObject);
  const height = 0.01;
  const tileGeometry = new Three.BoxGeometry(spacing, height, spacing);
  const buildingMaterial = new Three.MeshBasicMaterial({ color: 0x121212, wireframe: false });
  const junctionMaterial = new Three.MeshBasicMaterial({ color: 0x121212, wireframe: false });
  const dummy = new Three.Object3D();
  const buildings = [];
  const junctions = [];

  arrayOfGrids.forEach((grid) => {
    let bucket = null;
    if (grid.contents === 'building') {
      bucket = buildings;
    } else if (grid.contents === 'junction') {
      bucket = junctions;
    }

    if (bucket) {
      const x = grid.coords.x * spacing - halfExtent;
      const z = grid.coords.y * spacing - halfExtent;
      bucket.push({ x, y: 0.1, z });
    }
  });

  const addInstancedTiles = (transforms, material) => {
    if (!transforms.length) return;
    const instances = new Three.InstancedMesh(tileGeometry, material, transforms.length);
    transforms.forEach((transform, index) => {
      dummy.position.set(transform.x, transform.y, transform.z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instances.setMatrixAt(index, dummy.matrix);
    });
    instances.instanceMatrix.needsUpdate = true;
    gridGroup.add(instances);
  };

  addInstancedTiles(buildings, buildingMaterial);
  addInstancedTiles(junctions, junctionMaterial);
}

export function rebuildRoads({
  scene, arrayOfGrids, spacing, halfExtent, disposeObject,
}) {
  const roadGroup = ensureNamedGroup(scene, 'roadGroup', disposeObject);
  // initialize userData container and clear any previous centrelines
  roadGroup.userData = roadGroup.userData || {};
  roadGroup.userData.centerSegments = [];
  const roadMaterial = new Three.MeshBasicMaterial({ color: 0x121212, wireframe: false });
  const lineMaterial = new Three.LineBasicMaterial({ color: 0xffffff });
  const baseParts = [];
  const edgeLinePoints = [];
  const centerLinePoints = [];
  const half = spacing * 0.5;
  const edgeInset = spacing * ROAD_EDGE_INSET_RATIO;
  const dashLen = spacing * ROAD_CENTER_DASH_RATIO;
  const gapLen = spacing * ROAD_CENTER_GAP_RATIO;

  const keyFor = (x, y) => `${x},${y}`;
  const gridByCoords = new Map();
  const isDriveable = grid => !!grid && (grid.contents === 'road' || grid.contents === 'junction');

  arrayOfGrids.forEach((grid) => {
    gridByCoords.set(keyFor(grid.coords.x, grid.coords.y), grid);
  });

  const getNeighbor = (grid, dx, dy) => gridByCoords.get(keyFor(grid.coords.x + dx, grid.coords.y + dy));

  const pushLine = (x1, z1, x2, z2, target) => {
    target.push(x1, ROAD_LINE_Y, z1, x2, ROAD_LINE_Y, z2);
  };

  const pushDashedLine = (x1, z1, x2, z2, dash, gap, target) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length <= 0) return;
    const ux = dx / length;
    const uz = dz / length;
    let distance = 0;

    while (distance < length) {
      const start = distance;
      const end = Math.min(distance + dash, length);
      const sx = x1 + ux * start;
      const sz = z1 + uz * start;
      const ex = x1 + ux * end;
      const ez = z1 + uz * end;
      pushLine(sx, sz, ex, ez, target);
      distance += dash + gap;
    }
  };

  arrayOfGrids.forEach((grid) => {
    if (!isDriveable(grid)) return;

    const north = isDriveable(getNeighbor(grid, 0, -1));
    const south = isDriveable(getNeighbor(grid, 0, 1));
    const east = isDriveable(getNeighbor(grid, 1, 0));
    const west = isDriveable(getNeighbor(grid, -1, 0));

    const insetNorth = north ? 0 : edgeInset;
    const insetSouth = south ? 0 : edgeInset;
    const insetEast = east ? 0 : edgeInset;
    const insetWest = west ? 0 : edgeInset;

    const x = grid.coords.x * spacing - halfExtent;
    const z = grid.coords.y * spacing - halfExtent;
    const width = spacing - insetEast - insetWest;
    const depth = spacing - insetNorth - insetSouth;
    if (width <= 0 || depth <= 0) return;

    const centerX = x + (insetWest - insetEast) * 0.5;
    const centerZ = z + (insetNorth - insetSouth) * 0.5;

    const roadPatch = new Three.PlaneGeometry(width, depth);
    roadPatch.rotateX(-Math.PI / 2);
    roadPatch.translate(centerX, ROAD_BASE_Y, centerZ);
    baseParts.push(roadPatch);

    const xMin = centerX - width * 0.5;
    const xMax = centerX + width * 0.5;
    const zMin = centerZ - depth * 0.5;
    const zMax = centerZ + depth * 0.5;

    if (!north) pushLine(xMin, zMin, xMax, zMin, edgeLinePoints);
    if (!south) pushLine(xMin, zMax, xMax, zMax, edgeLinePoints);
    if (!west) pushLine(xMin, zMin, xMin, zMax, edgeLinePoints);
    if (!east) pushLine(xMax, zMin, xMax, zMax, edgeLinePoints);

    if (north && south) {
      pushDashedLine(x, z - half, x, z + half, dashLen, gapLen, centerLinePoints);
    }
    if (east && west) {
      pushDashedLine(x - half, z, x + half, z, dashLen, gapLen, centerLinePoints);
    }
  });

  if (baseParts.length) {
    const mergedRoad = mergeGeometries(baseParts, false);
    if (mergedRoad) {
      const roadMesh = new Three.Mesh(mergedRoad, roadMaterial);
      roadGroup.add(roadMesh);
    }
    baseParts.forEach((part) => {
      if (part && part.dispose) part.dispose();
    });
  }

  if (edgeLinePoints.length) {
    const edgeGeometry = new Three.BufferGeometry();
    edgeGeometry.setAttribute('position', new Three.Float32BufferAttribute(edgeLinePoints, 3));
    const edgeLines = new Three.LineSegments(edgeGeometry, lineMaterial);
    roadGroup.add(edgeLines);
  }

  // do not render a white center line on roads; but still expose center segments for traffic
  if (centerLinePoints.length) {
    const centerSegments = [];
    for (let i = 0; i < centerLinePoints.length; i += 6) {
      const x1 = centerLinePoints[i];
      const y1 = centerLinePoints[i + 1];
      const z1 = centerLinePoints[i + 2];
      const x2 = centerLinePoints[i + 3];
      const y2 = centerLinePoints[i + 4];
      const z2 = centerLinePoints[i + 5];
      const a = new Three.Vector3(x1, y1, z1);
      const b = new Three.Vector3(x2, y2, z2);
      const len = a.distanceTo(b);
      // compute a left-perpendicular on the XZ plane for lane offsets
      let perpLeft = new Three.Vector3(0, 0, 0);
      if (len > 1e-6) {
        const heading = new Three.Vector3().subVectors(b, a);
        heading.y = 0;
        heading.normalize();
        perpLeft = new Three.Vector3(-heading.z, 0, heading.x);
        perpLeft.normalize();
      }
      const seg = {
        a, b, length: len, perpLeft, perpRight: perpLeft.clone().negate(),
      };
      centerSegments.push(seg);
    }
    roadGroup.userData.centerSegments = centerSegments;
  }
}

const ROOF_LIGHT_TOP_PERCENT = 0.1;
const ROOF_LIGHT_CORE_SCALE = 0.11;
const ROOF_LIGHT_HALO_SCALE = 0.28;
const ROOF_LIGHT_MIN_PERIOD_SEC = 3.2;
const ROOF_LIGHT_MAX_PERIOD_SEC = 6.2;
const ROOF_LIGHT_MIN_BURST_GAP = 0.14;
const ROOF_LIGHT_MAX_BURST_GAP = 0.26;
const ROOF_LIGHT_MIN_PULSE_WIDTH = 0.08;
const ROOF_LIGHT_MAX_PULSE_WIDTH = 0.14;

function createBeaconTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.08,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.22, 'rgba(255,120,120,0.92)');
  gradient.addColorStop(0.55, 'rgba(255,40,40,0.5)');
  gradient.addColorStop(1, 'rgba(255,0,0,0)');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new Three.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createStreetLightTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  gradient.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new Three.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function hashBuildingSeed(grid) {
  return `${grid.id}:${grid.coords.x}:${grid.coords.y}`;
}

function getWorldRoofAnchors(buildingGroup) {
  const anchors = (((buildingGroup || {}).userData || {}).metadata || {}).roofLightAnchors || [];
  if (!anchors.length) return [];
  buildingGroup.updateMatrixWorld(true);
  return anchors.map((anchor) => {
    const local = new Three.Vector3(anchor.x, anchor.y, anchor.z);
    return buildingGroup.localToWorld(local);
  });
}

export function rebuildBuildings({
  scene, arrayOfGrids, spacing, halfExtent, drawOnScene, disposeObject,
}) {
  const buildingGroup = ensureNamedGroup(scene, 'buildingGroup', disposeObject);
  const roofLightGroup = ensureNamedGroup(scene, 'roofLightGroup', disposeObject);
  if (
    roofLightGroup.userData
    && roofLightGroup.userData.beaconTexture
    && typeof roofLightGroup.userData.beaconTexture.dispose === 'function'
  ) {
    try {
      roofLightGroup.userData.beaconTexture.dispose();
    } catch (e) {
      void e;
    }
  }
  roofLightGroup.visible = !!(
    drawOnScene
    && drawOnScene.buildings
    && drawOnScene.roofLights
  );
  const buildingRecords = [];
  const dummy = new Three.Object3D();

  arrayOfGrids.forEach((grid) => {
    if (grid.contents !== 'building') return;
    const x = grid.coords.x * spacing - halfExtent;
    const z = grid.coords.y * spacing - halfExtent;

    const seed = hashBuildingSeed(grid);
    const { group, height, shapeType, metadata } = generateRandomBuilding(spacing, { seed });
    group.position.set(x, 0.1, z);
    group.updateMatrix();
    group.matrixAutoUpdate = false;
    group.userData = group.userData || {};
    group.userData.dispose = disposeBuildingGroup;
    buildingGroup.add(group);

    const anchors = getWorldRoofAnchors(group);
    const roofAnchors = anchors.length
      ? anchors
      : [new Three.Vector3(x, 0.1 + height + 0.03, z)];

    buildingRecords.push({
      x,
      z,
      height,
      shapeType,
      roofAnchors,
      metadata,
    });
  });

  const heightsDesc = buildingRecords
    .map(record => record.height)
    .sort((a, b) => b - a);
  const beaconCount = Math.max(1, Math.ceil(heightsDesc.length * ROOF_LIGHT_TOP_PERCENT));
  const minBeaconHeight = heightsDesc[Math.max(0, beaconCount - 1)] || Infinity;

  const beaconBuildings = [];

  buildingRecords.forEach((record) => {
    const { height, roofAnchors } = record;
    if (height >= minBeaconHeight) {
      const pulsePeriod = ROOF_LIGHT_MIN_PERIOD_SEC
        + Math.random() * (ROOF_LIGHT_MAX_PERIOD_SEC - ROOF_LIGHT_MIN_PERIOD_SEC);
      const pulsePhaseNorm = Math.random();
      const pulseSharpness = 2.1 + Math.random() * 1.8;
      const burstGap = ROOF_LIGHT_MIN_BURST_GAP
        + Math.random() * (ROOF_LIGHT_MAX_BURST_GAP - ROOF_LIGHT_MIN_BURST_GAP);
      const pulseWidth = ROOF_LIGHT_MIN_PULSE_WIDTH
        + Math.random() * (ROOF_LIGHT_MAX_PULSE_WIDTH - ROOF_LIGHT_MIN_PULSE_WIDTH);

      beaconBuildings.push({
        pulsePeriod,
        pulsePhaseNorm,
        pulseSharpness,
        burstGap,
        pulseWidth,
        corners: roofAnchors,
      });
    }
  });

  roofLightGroup.userData = {
    beaconTexture: null,
    coreInstancedMesh: null,
    haloInstancedMesh: null,
    beaconCount: 0,
    // per-beacon pulse parameters (flat typed arrays)
    pulsePeriods: null,
    pulsePhaseNorms: null,
    pulseSharpnesses: null,
    burstGaps: null,
    pulseWidths: null,
    pulseMins: null,
  };

  if (!drawOnScene || !drawOnScene.roofLights || !beaconBuildings.length) return;

  const beaconTexture = createBeaconTexture();

  // Flatten all beacon corner positions and per-beacon pulse data
  // Each beacon building has 4 corners
  const totalBeacons = beaconBuildings.reduce((sum, b) => sum + b.corners.length, 0);

  const pulsePeriods = new Float32Array(totalBeacons);
  const pulsePhaseNorms = new Float32Array(totalBeacons);
  const pulseSharpnesses = new Float32Array(totalBeacons);
  const burstGaps = new Float32Array(totalBeacons);
  const pulseWidths = new Float32Array(totalBeacons);
  const pulseMins = new Float32Array(totalBeacons);

  // Core InstancedMesh
  const coreMesh = createBillboardInstancedMesh({
    count: totalBeacons,
    map: beaconTexture,
    color: 0xff3333,
    blending: Three.AdditiveBlending,
    depthWrite: false,
    defaultOpacity: 0.98,
    defaultScale: ROOF_LIGHT_CORE_SCALE,
  });
  coreMesh.name = 'beaconCoreMesh';
  coreMesh.renderOrder = 910;

  // Halo InstancedMesh
  const haloMesh = createBillboardInstancedMesh({
    count: totalBeacons,
    map: beaconTexture,
    color: 0xff0000,
    blending: Three.AdditiveBlending,
    depthWrite: false,
    defaultOpacity: 0.55,
    defaultScale: ROOF_LIGHT_HALO_SCALE,
  });
  haloMesh.name = 'beaconHaloMesh';
  haloMesh.renderOrder = 909;

  // Reuse the existing dummy Object3D from rebuildBuildings scope
  let idx = 0;
  beaconBuildings.forEach((beaconBuilding) => {
    beaconBuilding.corners.forEach((point) => {
      dummy.position.set(point.x, point.y, point.z);
      dummy.updateMatrix();
      coreMesh.setMatrixAt(idx, dummy.matrix);
      haloMesh.setMatrixAt(idx, dummy.matrix);

      pulsePeriods[idx] = beaconBuilding.pulsePeriod;
      pulsePhaseNorms[idx] = beaconBuilding.pulsePhaseNorm;
      pulseSharpnesses[idx] = beaconBuilding.pulseSharpness;
      burstGaps[idx] = beaconBuilding.burstGap;
      pulseWidths[idx] = beaconBuilding.pulseWidth;
      pulseMins[idx] = 0; // pulseMin default

      idx += 1;
    });
  });

  coreMesh.instanceMatrix.needsUpdate = true;
  haloMesh.instanceMatrix.needsUpdate = true;

  roofLightGroup.add(coreMesh);
  roofLightGroup.add(haloMesh);

  roofLightGroup.userData = {
    beaconTexture,
    coreInstancedMesh: coreMesh,
    haloInstancedMesh: haloMesh,
    beaconCount: totalBeacons,
    pulsePeriods,
    pulsePhaseNorms,
    pulseSharpnesses,
    burstGaps,
    pulseWidths,
    pulseMins,
  };
}

export function rebuildStreetLights({
  scene, arrayOfGrids, spacing, halfExtent, disposeObject,
}) {
  const streetLightGroup = ensureNamedGroup(scene, 'streetLightGroup', disposeObject);
  // remove previous texture if any
  if (
    streetLightGroup.userData
    && streetLightGroup.userData.lightTexture
    && typeof streetLightGroup.userData.lightTexture.dispose === 'function'
  ) {
    try {
      streetLightGroup.userData.lightTexture.dispose();
    } catch (e) {
      void e;
    }
  }

  streetLightGroup.visible = true;

  const lightTexture = createStreetLightTexture();
  if (!lightTexture) {
    streetLightGroup.userData = { lightTexture: null };
    return;
  }

  // Collect all street light positions first
  const positions = [];

  const keyFor = (x, y) => `${x},${y}`;
  const gridByCoords = new Map();
  const isDriveable = grid => !!grid && (grid.contents === 'road' || grid.contents === 'junction');
  arrayOfGrids.forEach(g => gridByCoords.set(keyFor(g.coords.x, g.coords.y), g));
  const getNeighbor = (grid, dx, dy) => gridByCoords.get(keyFor(grid.coords.x + dx, grid.coords.y + dy));

  arrayOfGrids.forEach((grid) => {
    if (!isDriveable(grid)) return;

    const north = isDriveable(getNeighbor(grid, 0, -1));
    const south = isDriveable(getNeighbor(grid, 0, 1));
    const east = isDriveable(getNeighbor(grid, 1, 0));
    const west = isDriveable(getNeighbor(grid, -1, 0));

    // only place on straight runs (N-S or E-W)
    const isVertical = north && south;
    const isHorizontal = east && west;
    if (!isVertical && !isHorizontal) return;

    // spacing by cell index
    if (isVertical) {
      if ((Math.abs(grid.coords.y) % STREET_LIGHT_SPACING_CELLS) !== 0) return;
    } else if (isHorizontal) {
      if ((Math.abs(grid.coords.x) % STREET_LIGHT_SPACING_CELLS) !== 0) return;
    }

    const x = grid.coords.x * spacing - halfExtent;
    const z = grid.coords.y * spacing - halfExtent;

    // alternate side placement
    const index = isVertical ? Math.floor(grid.coords.y / STREET_LIGHT_SPACING_CELLS) : Math.floor(grid.coords.x / STREET_LIGHT_SPACING_CELLS);
    const side = (Math.abs(index) % 2 === 0) ? -1 : 1;
    const sideOffset = spacing * STREET_LIGHT_SIDE_OFFSET_RATIO * side;

    const px = isVertical ? x + sideOffset : x;
    const pz = isHorizontal ? z + sideOffset : z;
    positions.push({ x: px, y: ROAD_LINE_Y + 0.02, z: pz });
  });

  if (!positions.length) {
    streetLightGroup.userData = { lightTexture };
    return;
  }

  // Create InstancedMesh for cores
  const coreMesh = createBillboardInstancedMesh({
    count: positions.length,
    map: lightTexture,
    color: 0xffffff,
    blending: Three.AdditiveBlending,
    depthWrite: false,
    defaultOpacity: 0.95,
    defaultScale: STREET_LIGHT_CORE_SCALE,
  });
  coreMesh.name = 'streetLightCoreMesh';
  coreMesh.renderOrder = 900;

  // Create InstancedMesh for halos
  const haloMesh = createBillboardInstancedMesh({
    count: positions.length,
    map: lightTexture,
    color: 0xffffff,
    blending: Three.AdditiveBlending,
    depthWrite: false,
    defaultOpacity: 0.5,
    defaultScale: STREET_LIGHT_HALO_SCALE,
  });
  haloMesh.name = 'streetLightHaloMesh';
  haloMesh.renderOrder = 899;

  const dummy = new Three.Object3D();
  positions.forEach((pos, i) => {
    dummy.position.set(pos.x, pos.y, pos.z);
    dummy.updateMatrix();
    coreMesh.setMatrixAt(i, dummy.matrix);
    haloMesh.setMatrixAt(i, dummy.matrix);
  });
  coreMesh.instanceMatrix.needsUpdate = true;
  haloMesh.instanceMatrix.needsUpdate = true;

  streetLightGroup.add(coreMesh);
  streetLightGroup.add(haloMesh);

  streetLightGroup.userData = { lightTexture };
}

export function rebuildFloor({
  scene, gridSize, spacing, disposeObject,
}) {
  const floorGroup = ensureNamedGroup(scene, 'floorGroup', disposeObject);
  const width = gridSize * spacing;
  const geometry = new Three.BoxGeometry(width, 0.1, width);
  const material = new Three.MeshBasicMaterial({ color: 0x000002, wireframe: false });
  const floorMesh = new Three.Mesh(geometry, material);
  floorMesh.position.set(0, 0, 0);
  floorGroup.add(floorMesh);
}
