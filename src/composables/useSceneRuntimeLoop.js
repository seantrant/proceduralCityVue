import { stepTrafficFrame } from '@/composables/useTraffic';
import { stepAirTrafficFrame } from '@/composables/useAirTraffic';

export function animateSceneFrame(vm, now, options = {}) {
  const { stepCameraAnimation } = options;

  const deltaMs = now - (vm.lastTime || now);
  const delta = Math.min(0.05, deltaMs / 1000);
  vm.lastTime = now;

  const simulationState = vm.$store.state.simulation || {};
  if (simulationState.running) {
    const speedMultiplier = Number(simulationState.speedMultiplier) || 1;
    vm.simulationAccumulator += Math.max(0, deltaMs) * speedMultiplier;
    const maxTicksPerFrame = 8;
    let ticksProcessed = 0;
    while (
      vm.simulationAccumulator >= vm.simulationStepMs
      && ticksProcessed < maxTicksPerFrame
      && (vm.$store.state.simulation || {}).running
    ) {
      vm.simulationAccumulator -= vm.simulationStepMs;
      vm.$store.commit('simulation/incrementTick');
      ticksProcessed += 1;
    }
    if (vm.simulationAccumulator > vm.simulationStepMs * maxTicksPerFrame) {
      vm.simulationAccumulator = vm.simulationStepMs * maxTicksPerFrame;
    }
  }

  if (vm.cameraOrbiting) {
    const t = (now || performance.now()) / 1000;
    const angle = t * vm.orbitSpeed;
    const r = vm.orbitRadius;
    const y = vm.orbitAltitude;
    vm.camera.position.x = Math.cos(angle) * r;
    vm.camera.position.z = Math.sin(angle) * r;
    vm.camera.position.y = y;
    vm.tmpLookVec.set(0, 0, 0);
    vm.camera.lookAt(vm.tmpLookVec);
  } else if (!vm.cameraAnimation && vm.input && typeof vm.input.update === 'function') {
    vm.input.update(delta);
  }

  if (vm.cameraAnimation && typeof stepCameraAnimation === 'function') {
    try {
      const result = stepCameraAnimation(vm.camera, vm.cameraAnimation, now, vm.tmpLookVec);
      if (result.done) {
        vm.cameraAnimation = null;
      }
    } catch (e) {
      void e;
    }
  }

  if (!vm.renderer || !vm.scene || !vm.camera) return;
  const sceneObjectCache = vm._sceneObjectCache || {};
  vm._sceneObjectCache = sceneObjectCache;
  const getCachedSceneObject = (cacheKey, objectName) => {
    const cached = sceneObjectCache[cacheKey];
    if (cached && cached.parent === vm.scene) return cached;
    const resolved = vm.scene.getObjectByName && vm.scene.getObjectByName(objectName);
    sceneObjectCache[cacheKey] = resolved || null;
    return sceneObjectCache[cacheKey];
  };

  const skyDome = getCachedSceneObject('skyDome', vm.skyDomeName);
  if (skyDome && skyDome.position && vm.camera && vm.camera.position) {
    skyDome.position.copy(vm.camera.position);
  }

  const roofLightGroup = getCachedSceneObject('roofLightGroup', 'roofLightGroup');
  if (roofLightGroup && roofLightGroup.visible && roofLightGroup.userData) {
    const ud = roofLightGroup.userData;
    const count = ud.beaconCount || 0;
    const coreMesh = ud.coreInstancedMesh;
    const haloMesh = ud.haloInstancedMesh;
    if (count > 0 && coreMesh && haloMesh) {
      const coreOpacities = coreMesh.geometry.getAttribute('aOpacity');
      const coreScales = coreMesh.geometry.getAttribute('aScale');
      const haloOpacities = haloMesh.geometry.getAttribute('aOpacity');
      const haloScales = haloMesh.geometry.getAttribute('aScale');
      const nowSec = (now || performance.now()) / 1000;

      const normalizeUnit = (value) => {
        const normalized = value % 1;
        return normalized < 0 ? normalized + 1 : normalized;
      };
      const wrappedDistance = (a, b) => {
        const diff = Math.abs(a - b);
        return Math.min(diff, 1 - diff);
      };

      for (let i = 0; i < count; i++) {
        const pulsePeriod = Math.max(0.2, ud.pulsePeriods[i]);
        const pulsePhaseNorm = normalizeUnit(ud.pulsePhaseNorms[i]);
        const pulseSharpness = Math.max(1, ud.pulseSharpnesses[i]);
        const burstGap = ud.burstGaps[i];
        const pulseWidth = Math.max(0.001, ud.pulseWidths[i]);
        const pulseMin = ud.pulseMins[i];

        const cyclePos = normalizeUnit((nowSec / pulsePeriod) + pulsePhaseNorm);
        const firstPulseCenter = 0.18;
        const secondPulseCenter = normalizeUnit(firstPulseCenter + burstGap);
        const rawPulseA = Math.max(0, 1 - (wrappedDistance(cyclePos, firstPulseCenter) / pulseWidth));
        const rawPulseB = Math.max(0, 1 - (wrappedDistance(cyclePos, secondPulseCenter) / pulseWidth));
        const shapedPulseA = Math.pow(rawPulseA, pulseSharpness);
        const shapedPulseB = Math.pow(rawPulseB, pulseSharpness);
        const intensity = Math.max(shapedPulseA, shapedPulseB);
        const pulse = pulseMin + ((1 - pulseMin) * intensity);

        // Core: baseOpacity=0.98, baseScale=CORE_SCALE, pulseScale=0.14
        coreOpacities.array[i] = 0.98 * pulse;
        coreScales.array[i] = 0.11 * (1 + 0.14 * pulse);

        // Halo: baseOpacity=0.55, baseScale=HALO_SCALE, pulseScale=0.24
        haloOpacities.array[i] = 0.55 * pulse;
        haloScales.array[i] = 0.28 * (1 + 0.24 * pulse);
      }

      coreOpacities.needsUpdate = true;
      coreScales.needsUpdate = true;
      haloOpacities.needsUpdate = true;
      haloScales.needsUpdate = true;
    }
  }

  // Street lights are now InstancedMesh with static opacity/scale — no per-frame update needed.

  const trafficGroup = getCachedSceneObject('trafficGroup', 'trafficGroup');
  try {
    stepTrafficFrame(vm, now, trafficGroup);
  } catch (e) { void e; }

  const airTrafficGroup = getCachedSceneObject('airTrafficGroup', 'airTrafficGroup');
  try {
    stepAirTrafficFrame(vm, now, airTrafficGroup);
  } catch (e) { void e; }

  vm.renderer.render(vm.scene, vm.camera);

  vm._rafId = requestAnimationFrame(vm._animate);
}
