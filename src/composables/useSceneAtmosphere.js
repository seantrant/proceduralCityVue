import * as Three from 'three';

export function disposeSkyBackgroundTexture(vm) {
  if (vm.skyBackgroundTexture && typeof vm.skyBackgroundTexture.dispose === 'function') {
    try {
      vm.skyBackgroundTexture.dispose();
    } catch (e) {
      void e;
    }
  }
  vm.skyBackgroundTexture = null;
}

export function createSkyBackground(vm, topHex, bottomHex) {
  disposeSkyBackgroundTexture(vm);
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topHex);
  gradient.addColorStop(1, bottomHex);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new Three.CanvasTexture(canvas);
  texture.magFilter = Three.LinearFilter;
  texture.minFilter = Three.LinearFilter;
  vm.skyBackgroundTexture = texture;
  vm.scene.background = texture;
}

export function ensureSkyDome(vm, topHex, bottomHex) {
  if (!vm.scene) return;
  const existing = vm.scene.getObjectByName && vm.scene.getObjectByName(vm.skyDomeName);
  if (existing) return;

  const geometry = new Three.SphereGeometry(20000, 32, 16);
  const topColor = new Three.Color(topHex);
  const bottomColor = new Three.Color(bottomHex);
  const position = geometry.getAttribute('position');
  const colors = [];
  const tmpColor = new Three.Color();
  const radius = 20000;

  for (let idx = 0; idx < position.count; idx += 1) {
    const normalizedY = (position.getY(idx) / radius + 1) * 0.5;
    const blend = Math.max(0, Math.min(1, normalizedY));
    tmpColor.copy(bottomColor).lerp(topColor, blend);
    colors.push(tmpColor.r, tmpColor.g, tmpColor.b);
  }

  geometry.setAttribute('color', new Three.Float32BufferAttribute(colors, 3));
  const material = new Three.MeshBasicMaterial({
    side: Three.BackSide,
    depthWrite: false,
    fog: false,
    vertexColors: true,
  });

  const dome = new Three.Mesh(geometry, material);
  dome.name = vm.skyDomeName;
  dome.frustumCulled = false;
  vm.scene.add(dome);
}

export function applyAtmosphere(vm) {
  if (!vm.scene || !vm.renderer) return;
  const preset = (vm.atmosphere && vm.atmosphere.preset) === 'dusk' ? 'dusk' : 'night';
  const palette = preset === 'dusk'
    ? { topHex: '#f29e73', bottomHex: '#3a445e', fogHex: '#6a5d72' }
    : { topHex: '#0b1026', bottomHex: '#02040a', fogHex: '#0d1226' };
  const { topHex } = palette;
  const { bottomHex } = palette;
  const fogColor = new Three.Color(palette.fogHex);
  const fogEnabled = !!(vm.atmosphere && vm.atmosphere.fogEnabled);
  const rawDensity = Number(vm.atmosphere && vm.atmosphere.fogDensity);
  const fogDensity = Number.isFinite(rawDensity) ? Math.max(0, Math.min(0.01, rawDensity)) : 0.0007;

  createSkyBackground(vm, topHex, bottomHex);
  ensureSkyDome(vm, topHex, bottomHex);
  vm.scene.fog = fogEnabled ? new Three.FogExp2(fogColor.getHex(), fogDensity) : null;
  vm.renderer.setClearColor(fogColor.getHex(), 1);
}
