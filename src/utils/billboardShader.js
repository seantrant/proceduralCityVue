import * as Three from 'three';

/**
 * GPU-billboarded InstancedMesh helper.
 *
 * Each instance has two custom per-instance attributes:
 *   aOpacity  – controls fragment alpha
 *   aScale    – controls on-screen size (multiplied with vertex XY in view space)
 *
 * The vertex shader extracts the instance's world position from instanceMatrix
 * then offsets vertices in *view space*, producing a camera-facing billboard
 * without any per-frame JS matrix updates for orientation.
 *
 * Instance colour (Three.js built-in instanceColor) is supported when present.
 */

const BILLBOARD_VERTEX = /* glsl */ `
attribute float aOpacity;
attribute float aScale;

varying float vOpacity;
varying vec2  vUv;
varying vec3  vInstanceColor;

void main() {
  vOpacity = aOpacity;
  vUv = uv;

  #ifdef USE_INSTANCING_COLOR
    vInstanceColor = instanceColor;
  #else
    vInstanceColor = vec3(1.0);
  #endif

  // Instance translation in local space → view space
  #ifdef USE_INSTANCING
    vec4 mvCenter = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  #else
    vec4 mvCenter = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  #endif

  // Offset the vertex in view-space XY → always faces the camera
  mvCenter.xy += position.xy * aScale;

  gl_Position = projectionMatrix * mvCenter;
}
`;

const BILLBOARD_FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform vec3      uColor;

varying float vOpacity;
varying vec2  vUv;
varying vec3  vInstanceColor;

void main() {
  vec4 texColor = texture2D(uMap, vUv);
  float alpha = texColor.a * vOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(uColor * vInstanceColor * texColor.rgb, alpha);
}
`;

/**
 * Create a billboard ShaderMaterial.
 *
 * @param {object} opts
 * @param {Three.Texture}  opts.map       – sprite texture (radial-gradient canvas, etc.)
 * @param {Three.Color|number} [opts.color=0xffffff] – base tint
 * @param {number} [opts.blending=Three.NormalBlending]
 * @param {boolean} [opts.depthWrite=false]
 * @returns {Three.ShaderMaterial}
 */
export function createBillboardMaterial({
  map, color, blending, depthWrite,
} = {}) {
  return new Three.ShaderMaterial({
    uniforms: {
      uMap: { value: map || null },
      uColor: { value: color instanceof Three.Color ? color : new Three.Color(color ?? 0xffffff) },
    },
    vertexShader: BILLBOARD_VERTEX,
    fragmentShader: BILLBOARD_FRAGMENT,
    transparent: true,
    depthWrite: depthWrite !== undefined ? depthWrite : false,
    blending: blending !== undefined ? blending : Three.NormalBlending,
  });
}

/**
 * Create an InstancedMesh that renders as camera-facing billboards.
 *
 * Returns the mesh with per-instance Float32Arrays accessible via:
 *   mesh.geometry.getAttribute('aOpacity').array
 *   mesh.geometry.getAttribute('aScale').array
 *
 * After mutating those arrays, set `.needsUpdate = true` on the attribute.
 *
 * @param {object} opts
 * @param {number} opts.count                – max instance count
 * @param {Three.Texture} opts.map           – sprite texture
 * @param {Three.Color|number} [opts.color]  – base tint
 * @param {number} [opts.blending]
 * @param {boolean} [opts.depthWrite]
 * @param {number} [opts.defaultOpacity=1]   – initial value for every aOpacity slot
 * @param {number} [opts.defaultScale=1]     – initial value for every aScale slot
 * @returns {Three.InstancedMesh}
 */
export function createBillboardInstancedMesh({
  count, map, color, blending, depthWrite, defaultOpacity, defaultScale,
} = {}) {
  const geometry = new Three.PlaneGeometry(1, 1);

  const opacities = new Float32Array(count);
  const scales = new Float32Array(count);
  opacities.fill(defaultOpacity !== undefined ? defaultOpacity : 1);
  scales.fill(defaultScale !== undefined ? defaultScale : 1);

  geometry.setAttribute('aOpacity', new Three.InstancedBufferAttribute(opacities, 1));
  geometry.setAttribute('aScale', new Three.InstancedBufferAttribute(scales, 1));

  const material = createBillboardMaterial({
    map, color, blending, depthWrite,
  });

  const mesh = new Three.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  // Initialise all instance matrices to identity (shader reads only translation)
  const identity = new Three.Matrix4();
  for (let i = 0; i < count; i++) {
    mesh.setMatrixAt(i, identity);
  }
  mesh.instanceMatrix.needsUpdate = true;

  return mesh;
}
