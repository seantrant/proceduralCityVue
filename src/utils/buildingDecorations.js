/**
 * buildingDecorations.js
 * Shared helpers that dress a building group with white wireframe edges
 * and randomised window panes, matching the city-scene aesthetic.
 */

import * as Three from 'three';

export const SKIP_DISPOSE_FLAG = 'skipDispose';
export const BUILDING_ROLE_BODY = 'buildingBody';
export const BUILDING_ROLE_EDGE = 'buildingEdge';
export const BUILDING_ROLE_WINDOW = 'buildingWindow';

const WINDOW_PANE_W = 0.06;
const WINDOW_PANE_H = 0.09;
const WINDOW_ROW_STEP = 0.18;
const WINDOW_COL_STEP = 0.12;
const WINDOW_FACE_INSET = 0.06;
const WINDOW_LIT_CHANCE = 0.28;
const WINDOW_HEIGHT_THRESHOLD = 1.2;
const ROOF_LIGHT_CORNER_INSET = 0.09;
const ROOF_LIGHT_VERTICAL_OFFSET = 0.03;
const FACE_EPSILON = 0.001;
const TOP_EPSILON = 1e-4;

export function markSkipDispose(resource) {
  if (!resource) return resource;
  resource.userData = resource.userData || {};
  resource.userData[SKIP_DISPOSE_FLAG] = true;
  return resource;
}

export function shouldSkipDispose(resource) {
  return !!(resource && resource.userData && resource.userData[SKIP_DISPOSE_FLAG]);
}

const sharedPaneGeometry = markSkipDispose(new Three.PlaneGeometry(WINDOW_PANE_W, WINDOW_PANE_H));
const sharedLitWindowMaterial = markSkipDispose(new Three.MeshBasicMaterial({
  color: 0xffffff,
  side: Three.DoubleSide,
}));
const sharedDimWindowMaterial = markSkipDispose(new Three.MeshBasicMaterial({
  color: 0x505050,
  side: Three.DoubleSide,
  transparent: true,
  opacity: 0.55,
}));
const sharedEdgeMaterial = markSkipDispose(new Three.LineBasicMaterial({ color: 0xffffff }));

function createSeededRandom(seed) {
  if (typeof seed === 'function') return seed;
  if (seed == null) return Math.random;
  const text = String(seed);
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    const t = (h ^= h >>> 16) >>> 0;
    return t / 4294967296;
  };
}

function isBoxLike(mesh) {
  return !!(mesh && mesh.geometry && mesh.geometry.type === 'BoxGeometry');
}

function getBoundingBox(mesh) {
  if (!mesh || !mesh.geometry) return null;
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox || null;
}

function buildOffsets(width, step = WINDOW_COL_STEP, inset = WINDOW_FACE_INSET) {
  const usable = Math.max(0, width - inset * 2);
  if (usable <= WINDOW_PANE_W) return [0];
  const count = Math.max(1, Math.floor(usable / step) + 1);
  if (count === 1) return [0];
  const span = Math.max(0, usable);
  const actualStep = span / (count - 1);
  return Array.from({ length: count }, (_, i) => -span / 2 + i * actualStep);
}

function buildRowPositions(minY, maxY, inset = WINDOW_FACE_INSET) {
  const start = minY + inset + WINDOW_PANE_H / 2;
  const end = maxY - inset - WINDOW_PANE_H / 2;
  if (end < start) return [];
  const rows = [];
  for (let y = start; y <= end + 1e-6; y += WINDOW_ROW_STEP) rows.push(y);
  return rows;
}

function makeLocalRoofAnchors(bb, inset) {
  const xMin = bb.min.x;
  const xMax = bb.max.x;
  const zMin = bb.min.z;
  const zMax = bb.max.z;
  const cx = (xMin + xMax) * 0.5;
  const cz = (zMin + zMax) * 0.5;
  const x1 = xMax - xMin > inset * 2 ? xMin + inset : cx;
  const x2 = xMax - xMin > inset * 2 ? xMax - inset : cx;
  const z1 = zMax - zMin > inset * 2 ? zMin + inset : cz;
  const z2 = zMax - zMin > inset * 2 ? zMax - inset : cz;
  const y = bb.max.y;
  return [
    new Three.Vector3(x1, y, z1),
    new Three.Vector3(x1, y, z2),
    new Three.Vector3(x2, y, z1),
    new Three.Vector3(x2, y, z2),
  ];
}

export function addEdges(group, meshes, edgeMaterial = sharedEdgeMaterial) {
  if (!group || !Array.isArray(meshes)) return [];
  markSkipDispose(edgeMaterial);

  // Build one EdgesGeometry per body mesh, transform its positions into
  // building-local space, then concatenate all position arrays into a single
  // LineSegments to cut draw calls from N-per-building to 1-per-building.
  const positionArrays = [];
  let totalLength = 0;

  meshes.forEach((mesh) => {
    if (!mesh || !mesh.geometry) return;
    mesh.updateMatrix();
    const edgeGeo = new Three.EdgesGeometry(mesh.geometry);
    edgeGeo.applyMatrix4(mesh.matrix);
    const arr = edgeGeo.attributes.position.array;
    positionArrays.push(arr);
    totalLength += arr.length;
    edgeGeo.dispose();
  });

  if (!totalLength) return [];

  const merged = new Float32Array(totalLength);
  let offset = 0;
  positionArrays.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });

  const mergedGeo = new Three.BufferGeometry();
  mergedGeo.setAttribute('position', new Three.BufferAttribute(merged, 3));
  const lines = new Three.LineSegments(mergedGeo, edgeMaterial);
  lines.userData = { role: BUILDING_ROLE_EDGE };
  lines.matrixAutoUpdate = false;
  group.add(lines);

  return [lines];
}

export function addWindows(group, bodyParts, options = {}) {
  if (!group || !Array.isArray(bodyParts)) return [];
  const {
    seed,
    random,
    heightThreshold = WINDOW_HEIGHT_THRESHOLD,
    litChance = WINDOW_LIT_CHANCE,
    faceInset = WINDOW_FACE_INSET,
  } = options;
  const rng = createSeededRandom(random || seed);
  const created = [];
  const dummy = new Three.Object3D();
  dummy.matrixAutoUpdate = false;

  bodyParts.forEach((mesh) => {
    if (!isBoxLike(mesh)) return;
    const bb = getBoundingBox(mesh);
    if (!bb) return;

    const sizeY = bb.max.y - bb.min.y;
    if (sizeY < heightThreshold) return;

    const rows = buildRowPositions(bb.min.y, bb.max.y, faceInset);
    if (!rows.length) return;

    const colsX = buildOffsets(bb.max.x - bb.min.x, WINDOW_COL_STEP, faceInset);
    const colsZ = buildOffsets(bb.max.z - bb.min.z, WINDOW_COL_STEP, faceInset);

    const faces = [
      { rotY: 0, cols: colsX, makePos: (c, y) => new Three.Vector3(c, y, bb.max.z + FACE_EPSILON) },
      { rotY: Math.PI, cols: colsX, makePos: (c, y) => new Three.Vector3(c, y, bb.min.z - FACE_EPSILON) },
      { rotY: Math.PI / 2, cols: colsZ, makePos: (c, y) => new Three.Vector3(bb.max.x + FACE_EPSILON, y, c) },
      { rotY: -Math.PI / 2, cols: colsZ, makePos: (c, y) => new Three.Vector3(bb.min.x - FACE_EPSILON, y, c) },
    ];

    const litMatrices = [];
    const dimMatrices = [];

    mesh.updateMatrix();

    faces.forEach((face) => {
      face.cols.forEach((col) => {
        rows.forEach((y) => {
          const isLit = rng() < litChance && rng() < 0.5;
          dummy.position.copy(face.makePos(col, y));
          dummy.rotation.set(0, face.rotY, 0);
          dummy.updateMatrix();
          const finalMat = new Three.Matrix4().multiplyMatrices(mesh.matrix, dummy.matrix);
          if (isLit) litMatrices.push(finalMat);
          else dimMatrices.push(finalMat);
        });
      });
    });

    if (litMatrices.length) {
      const inst = new Three.InstancedMesh(sharedPaneGeometry, sharedLitWindowMaterial, litMatrices.length);
      inst.userData = { role: BUILDING_ROLE_WINDOW };
      inst.matrixAutoUpdate = false;
      litMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
      created.push(inst);
    }

    if (dimMatrices.length) {
      const inst = new Three.InstancedMesh(sharedPaneGeometry, sharedDimWindowMaterial, dimMatrices.length);
      inst.userData = { role: BUILDING_ROLE_WINDOW };
      inst.matrixAutoUpdate = false;
      dimMatrices.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
      created.push(inst);
    }
  });

  return created;
}

export function getRoofLightAnchors(bodyParts, options = {}) {
  if (!Array.isArray(bodyParts) || !bodyParts.length) return [];
  const {
    cornerInset = ROOF_LIGHT_CORNER_INSET,
    verticalOffset = ROOF_LIGHT_VERTICAL_OFFSET,
  } = options;

  const tops = bodyParts
    .map((mesh) => {
      const bb = getBoundingBox(mesh);
      if (!mesh || !bb) return null;
      return { mesh, bb, top: bb.max.y + mesh.position.y };
    })
    .filter(Boolean);

  if (!tops.length) return [];

  const maxTop = Math.max(...tops.map(entry => entry.top));
  const anchors = [];
  const dedupe = new Set();

  tops.forEach(({ mesh, bb, top }) => {
    if (Math.abs(top - maxTop) > TOP_EPSILON) return;
    mesh.updateMatrix();
    makeLocalRoofAnchors(bb, cornerInset).forEach((point) => {
      const world = point.clone().applyMatrix4(mesh.matrix);
      world.y += verticalOffset;
      const key = `${world.x.toFixed(4)}|${world.y.toFixed(4)}|${world.z.toFixed(4)}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);
      anchors.push(world);
    });
  });

  return anchors;
}

export default {
  SKIP_DISPOSE_FLAG,
  BUILDING_ROLE_BODY,
  BUILDING_ROLE_EDGE,
  BUILDING_ROLE_WINDOW,
  markSkipDispose,
  shouldSkipDispose,
  addEdges,
  addWindows,
  getRoofLightAnchors,
};
