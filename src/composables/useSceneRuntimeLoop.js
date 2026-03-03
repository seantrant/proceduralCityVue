import { stepTrafficFrame } from '@/composables/useTraffic';

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
    const sprites = roofLightGroup.userData.beaconSprites || [];
    const nowSec = (now || performance.now()) / 1000;
    const normalizeUnit = (value) => {
      const normalized = value % 1;
      return normalized < 0 ? normalized + 1 : normalized;
    };
    const wrappedDistance = (a, b) => {
      const diff = Math.abs(a - b);
      return Math.min(diff, 1 - diff);
    };
    sprites.forEach((sprite) => {
      if (!sprite || !sprite.userData || !sprite.material) return;
      const pulsePeriod = Math.max(0.2, Number(sprite.userData.pulsePeriod) || 2.4);
      const pulsePhaseNormRaw = Number(sprite.userData.pulsePhaseNorm);
      const legacyPulsePhase = Number(sprite.userData.pulsePhase);
      const pulsePhaseNorm = Number.isFinite(pulsePhaseNormRaw)
        ? normalizeUnit(pulsePhaseNormRaw)
        : normalizeUnit((Number.isFinite(legacyPulsePhase) ? legacyPulsePhase : 0) / (Math.PI * 2));
      const pulseSharpness = Math.max(1, Number(sprite.userData.pulseSharpness) || 2);
      const burstGap = Math.max(0, Math.min(1, Number(sprite.userData.burstGap) || 0.2));
      const pulseWidth = Math.max(0.001, Number(sprite.userData.pulseWidth) || 0.1);
      const cyclePos = normalizeUnit((nowSec / pulsePeriod) + pulsePhaseNorm);
      const firstPulseCenter = 0.18;
      const secondPulseCenter = normalizeUnit(firstPulseCenter + burstGap);
      const rawPulseA = Math.max(0, 1 - (wrappedDistance(cyclePos, firstPulseCenter) / pulseWidth));
      const rawPulseB = Math.max(0, 1 - (wrappedDistance(cyclePos, secondPulseCenter) / pulseWidth));
      const shapedPulseA = Math.pow(rawPulseA, pulseSharpness);
      const shapedPulseB = Math.pow(rawPulseB, pulseSharpness);
      const intensity = Math.max(shapedPulseA, shapedPulseB);
      const pulseMin = Math.max(0, Math.min(1, Number(sprite.userData.pulseMin) || 0));
      const pulse = pulseMin + ((1 - pulseMin) * intensity);

      const baseOpacity = Math.max(0, Number(sprite.userData.baseOpacity) || 0.5);
      sprite.material.opacity = baseOpacity * pulse;

      const baseScale = Number(sprite.userData.baseScale) || 0.1;
      const pulseScale = Number(sprite.userData.pulseScale) || 0;
      const nextScale = baseScale * (1 + pulseScale * pulse);
      sprite.scale.set(nextScale, nextScale, 1);
    });
  }

  const streetLightGroup = getCachedSceneObject('streetLightGroup', 'streetLightGroup');
  if (streetLightGroup && streetLightGroup.visible && streetLightGroup.userData) {
    const sprites = streetLightGroup.userData.streetSprites || [];
    sprites.forEach((sprite) => {
      if (!sprite || !sprite.userData || !sprite.material) return;
      const baseOpacity = Math.max(0, Number(sprite.userData.baseOpacity) || 0.95);
      sprite.material.opacity = baseOpacity;
      const baseScale = Number(sprite.userData.baseScale) || 0.1;
      sprite.scale.set(baseScale, baseScale, 1);
    });
  }

  const trafficGroup = getCachedSceneObject('trafficGroup', 'trafficGroup');
  try {
    stepTrafficFrame(vm, now, trafficGroup);
  } catch (e) { void e; }

  vm.renderer.render(vm.scene, vm.camera);

  try {
    vm.camera.getWorldDirection(vm.tmpDirVec);
    const elapsedSinceMiniMap = now - (vm.lastMiniMapUpdateAt || 0);
    const movedSq = vm.lastMiniMapPos.distanceToSquared(vm.camera.position);
    const turnDot = vm.lastMiniMapDir.dot(vm.tmpDirVec);
    const shouldUpdateMiniMap = !Number.isFinite(movedSq)
      || elapsedSinceMiniMap >= vm.miniMapUpdateIntervalMs
      || movedSq >= vm.miniMapMoveThresholdSq
      || turnDot <= vm.miniMapTurnThresholdDot;

    if (
      shouldUpdateMiniMap
      && vm.$refs
      && vm.$refs.miniMap
      && typeof vm.$refs.miniMap.updateCamera === 'function'
    ) {
      vm.$refs.miniMap.updateCamera(vm.camera.position, vm.tmpDirVec);
      vm.lastMiniMapUpdateAt = now;
      vm.lastMiniMapPos.copy(vm.camera.position);
      vm.lastMiniMapDir.copy(vm.tmpDirVec);
    }
  } catch (e) {
    void e;
  }

  vm._rafId = requestAnimationFrame(vm._animate);
}
