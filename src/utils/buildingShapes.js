/**
 * buildingShapes.js
 * Advanced procedural building randomiser.
 */

import * as Three from 'three';
import {
  addEdges,
  addWindows,
  getRoofLightAnchors,
  BUILDING_ROLE_BODY,
  SKIP_DISPOSE_FLAG,
  markSkipDispose,
} from './buildingDecorations';

/**
 * Merge an array of body Meshes into a single non-indexed BufferGeometry with
 * each part's local matrix baked into the vertex positions, then return a new
 * Mesh using the shared material. Cuts body draw calls from N-per-building to 1.
 * Disposes the temporary geometry clones immediately; does NOT dispose the
 * original mesh geometries (those are handled by disposeBuildingGroup).
 */
function mergeBodyMeshes(meshes, material) {
  if (!meshes || !meshes.length) return null;

  const positionArrays = [];
  let totalPositions = 0;

  meshes.forEach((mesh) => {
    mesh.updateMatrix();
    // toNonIndexed() returns a new geometry; clone() when already flat
    const geo = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    geo.applyMatrix4(mesh.matrix);
    // copy the typed array before disposing the temp geo
    const copy = new Float32Array(geo.attributes.position.array);
    positionArrays.push(copy);
    totalPositions += copy.length;
    geo.dispose();
  });

  const merged = new Float32Array(totalPositions);
  let offset = 0;
  positionArrays.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });

  const mergedGeo = new Three.BufferGeometry();
  mergedGeo.setAttribute('position', new Three.BufferAttribute(merged, 3));
  const mergedMesh = new Three.Mesh(mergedGeo, material);
  mergedMesh.matrixAutoUpdate = false;
  mergedMesh.userData = { role: BUILDING_ROLE_BODY };
  return mergedMesh;
}

export const SHAPE_TYPES = [
  'box',
  'lShape',
  'tShape',
  'uShape',
  'plus',
  'steppedTower',
  'setbackTower',
  'cylinder',
  'wedge',
];

export const DEFAULT_SHAPE_WEIGHTS = Object.freeze({
  box: 28,
  setbackTower: 20,
  steppedTower: 18,
  lShape: 10,
  tShape: 8,
  uShape: 7,
  plus: 6,
  wedge: 2,
  cylinder: 1,
});

const ROTATION_YAWS = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

const bodyMaterial = markSkipDispose(new Three.MeshBasicMaterial({
  color: 0x000000,
  wireframe: false,
}));
const edgeMaterial = markSkipDispose(new Three.LineBasicMaterial({ color: 0xffffff }));

function hashString(value) {
  const text = String(value ?? 'building');
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seed) {
  if (seed === undefined || seed === null) return Math.random;
  let state = hashString(seed) || 1;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = (rng, lo, hi) => lo + rng() * (hi - lo);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const quantH = h => Math.max(0.5, Math.round(h * 4) / 4);

function normalizeOptions(shapeTypeOrOptions) {
  if (typeof shapeTypeOrOptions === 'string') {
    return { shapeType: shapeTypeOrOptions };
  }
  return shapeTypeOrOptions && typeof shapeTypeOrOptions === 'object'
    ? shapeTypeOrOptions
    : {};
}

function pickWeightedShape(rng, weights = DEFAULT_SHAPE_WEIGHTS) {
  const entries = SHAPE_TYPES.map(type => ({
    type,
    weight: Math.max(0, Number(weights[type] ?? DEFAULT_SHAPE_WEIGHTS[type] ?? 0)),
  })).filter(entry => entry.weight > 0);

  if (!entries.length) return 'box';

  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < entries.length; i += 1) {
    roll -= entries[i].weight;
    if (roll <= 0) return entries[i].type;
  }
  return entries[entries.length - 1].type;
}

function tagBodyMesh(mesh) {
  mesh.userData = mesh.userData || {};
  mesh.userData.role = BUILDING_ROLE_BODY;
  return mesh;
}

function makeBox(w, h, d, cx, cz) {
  const mesh = new Three.Mesh(new Three.BoxGeometry(w, h, d), bodyMaterial);
  mesh.position.set(cx, h / 2, cz);
  return tagBodyMesh(mesh);
}

function genBox(spacing, rng) {
  const w = rand(rng, 0.45, 1) * spacing;
  const d = rand(rng, 0.45, 1) * spacing;
  const h = quantH(rand(rng, 0.5, 6));
  return { meshes: [makeBox(w, h, d, 0, 0)], height: h };
}

function genLShape(spacing, rng) {
  const h = quantH(rand(rng, 1, 5.5));
  const half = spacing / 2;
  const thickness = rand(rng, 0.3, 0.45) * spacing;
  const armLen = rand(rng, 0.6, 1) * spacing;
  const legLen = rand(rng, 0.6, 1) * spacing;
  const arm = makeBox(Math.min(armLen, spacing), h, thickness, 0, half - thickness / 2);
  const legDepth = Math.min(Math.max(legLen - thickness, 0.2 * spacing), spacing);
  const leg = makeBox(
    thickness,
    h,
    legDepth,
    -(half - thickness / 2),
    half - thickness - legDepth / 2,
  );
  return { meshes: [arm, leg], height: h };
}

function genTShape(spacing, rng) {
  const h = quantH(rand(rng, 1, 5));
  const half = spacing / 2;
  const thickness = rand(rng, 0.25, 0.4) * spacing;
  const topW = rand(rng, 0.7, 1) * spacing;
  const stemD = Math.min(rand(rng, 0.4, 0.8) * spacing, spacing - thickness);
  return {
    meshes: [
      makeBox(Math.min(topW, spacing), h, thickness, 0, half - thickness / 2),
      makeBox(thickness, h, stemD, 0, half - thickness - stemD / 2),
    ],
    height: h,
  };
}

function genUShape(spacing, rng) {
  const h = quantH(rand(rng, 1, 4.5));
  const half = spacing / 2;
  const thickness = rand(rng, 0.2, 0.35) * spacing;
  const innerW = rand(rng, 0.3, 0.6) * spacing;
  const depthArm = Math.min(rand(rng, 0.4, 0.8) * spacing, spacing - thickness);
  return {
    meshes: [
      makeBox(Math.min(innerW + 2 * thickness, spacing), h, thickness, 0, half - thickness / 2),
      makeBox(thickness, h, depthArm, -(innerW / 2 + thickness / 2), half - thickness - depthArm / 2),
      makeBox(thickness, h, depthArm, innerW / 2 + thickness / 2, half - thickness - depthArm / 2),
    ],
    height: h,
  };
}

function genPlus(spacing, rng) {
  const h = quantH(rand(rng, 1, 5));
  const thickness = rand(rng, 0.25, 0.4) * spacing;
  const armLen = Math.min(rand(rng, 0.6, 1) * spacing, spacing);
  return {
    meshes: [
      makeBox(armLen, h, thickness, 0, 0),
      makeBox(thickness, h, armLen, 0, 0),
    ],
    height: h,
  };
}

function genSteppedTower(spacing, rng) {
  const tiers = 2 + Math.floor(rng() * 2);
  const meshes = [];
  let totalH = 0;
  let prevW = rand(rng, 0.6, 1) * spacing;
  let prevD = rand(rng, 0.6, 1) * spacing;

  for (let i = 0; i < tiers; i += 1) {
    const tierH = quantH(rand(rng, 0.75, 2.5));
    const w = Math.max(0.2 * spacing, prevW * rand(rng, 0.55, 0.85));
    const d = Math.max(0.2 * spacing, prevD * rand(rng, 0.55, 0.85));
    const mesh = makeBox(Math.min(w, spacing), tierH, Math.min(d, spacing), 0, 0);
    mesh.position.y = totalH + tierH / 2;
    meshes.push(mesh);
    totalH += tierH;
    prevW = w;
    prevD = d;
  }

  return { meshes, height: totalH };
}

function genSetbackTower(spacing, rng) {
  const baseH = quantH(rand(rng, 0.75, 2));
  const towerH = quantH(rand(rng, 1.5, 4));
  const baseW = rand(rng, 0.65, 1) * spacing;
  const baseD = rand(rng, 0.65, 1) * spacing;
  const towerW = Math.max(0.2 * spacing, baseW * rand(rng, 0.35, 0.6));
  const towerD = Math.max(0.2 * spacing, baseD * rand(rng, 0.35, 0.6));
  const base = makeBox(Math.min(baseW, spacing), baseH, Math.min(baseD, spacing), 0, 0);
  const tower = makeBox(Math.min(towerW, spacing), towerH, Math.min(towerD, spacing), 0, 0);
  tower.position.y = baseH + towerH / 2;
  return { meshes: [base, tower], height: baseH + towerH };
}

function genCylinder(spacing, rng) {
  const h = quantH(rand(rng, 1, 6));
  const r = rand(rng, 0.2, 0.5) * spacing;
  const segments = 12 + Math.floor(rng() * 5);
  const mesh = new Three.Mesh(new Three.CylinderGeometry(r, r, h, segments), bodyMaterial);
  mesh.position.set(0, h / 2, 0);
  return { meshes: [tagBodyMesh(mesh)], height: h, skipWindows: true };
}

function genWedge(spacing, rng) {
  const h = quantH(rand(rng, 1, 5));
  const w = rand(rng, 0.4, 1) * spacing;
  const d = rand(rng, 0.4, 1) * spacing;
  const hw = w / 2;
  const hd = d / 2;
  const vertices = new Float32Array([
    -hw, 0, hd,
    hw, 0, hd,
    -hw, h, hd,
    -hw, 0, -hd,
    hw, 0, -hd,
    -hw, h, -hd,
  ]);
  const indices = [0, 1, 2, 3, 5, 4, 0, 4, 1, 0, 3, 4, 1, 4, 5, 1, 5, 2, 0, 2, 5, 0, 5, 3];
  const geo = new Three.BufferGeometry();
  geo.setAttribute('position', new Three.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new Three.Mesh(geo, bodyMaterial);
  return { meshes: [tagBodyMesh(mesh)], height: h, skipWindows: true };
}

const GENERATORS = {
  box: genBox,
  lShape: genLShape,
  tShape: genTShape,
  uShape: genUShape,
  plus: genPlus,
  steppedTower: genSteppedTower,
  setbackTower: genSetbackTower,
  cylinder: genCylinder,
  wedge: genWedge,
};

export function generateRandomBuilding(spacing = 1, shapeTypeOrOptions) {
  const options = normalizeOptions(shapeTypeOrOptions);
  const rng = createSeededRandom(options.seed);
  const shapeType = options.shapeType && GENERATORS[options.shapeType]
    ? options.shapeType
    : pickWeightedShape(rng, options.weights);
  const result = GENERATORS[shapeType](spacing, rng);
  const group = new Three.Group();
  const rotationY = Number.isFinite(options.rotationY)
    ? options.rotationY
    : pick(rng, ROTATION_YAWS);

  group.name = 'generatedBuilding';
  group.rotation.y = rotationY;

  result.meshes.forEach((mesh, index) => {
    mesh.userData = mesh.userData || {};
    mesh.userData.role = BUILDING_ROLE_BODY;
    mesh.userData.bodyIndex = index;
    group.add(mesh);
  });

  addEdges(group, result.meshes, edgeMaterial);
  if (!result.skipWindows) addWindows(group, result.meshes, { random: rng });

  // getRoofLightAnchors needs original mesh positions — must run before merge.
  const roofLightAnchors = getRoofLightAnchors(result.meshes).map(anchor => ({
    x: anchor.x,
    y: anchor.y,
    z: anchor.z,
  }));

  // Replace individual body meshes with a single merged Mesh. addEdges and
  // addWindows have already consumed them, so they are no longer needed in
  // their separate form. Dispose their geometries immediately to free GPU memory.
  if (result.meshes.length > 1) {
    const merged = mergeBodyMeshes(result.meshes, bodyMaterial);
    if (merged) {
      result.meshes.forEach((mesh) => {
        group.remove(mesh);
        if (mesh.geometry && !mesh.geometry.userData?.[SKIP_DISPOSE_FLAG]) {
          mesh.geometry.dispose();
        }
      });
      group.add(merged);
    }
  } else if (result.meshes.length === 1) {
    result.meshes[0].matrixAutoUpdate = false;
  }

  const metadata = {
    seed: options.seed,
    shapeType,
    height: result.height,
    rotationY,
    roofLightAnchors,
  };

  group.userData = group.userData || {};
  group.userData.generatedBuilding = true;
  group.userData.shapeType = shapeType;
  group.userData.height = result.height;
  group.userData.metadata = metadata;
  group.userData.dispose = disposeBuildingGroup;

  return {
    group,
    shapeType,
    height: result.height,
    metadata,
  };
}

export function disposeBuildingGroup(group) {
  if (!group) return;
  group.traverse((obj) => {
    if (obj.geometry && !obj.geometry.userData?.[SKIP_DISPOSE_FLAG]) {
      obj.geometry.dispose();
    }
    if (obj.material) {
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach((material) => {
        if (material && !material.userData?.[SKIP_DISPOSE_FLAG] && typeof material.dispose === 'function') {
          material.dispose();
        }
      });
    }
  });
}
