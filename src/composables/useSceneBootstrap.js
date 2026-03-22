import * as Three from 'three';
import { markRaw } from 'vue';
import UserInput from '@/utils/userInput.js';

export function setUpRenderer(vm) {
  vm.container = document.getElementById('container');
  vm.renderer = markRaw(new Three.WebGLRenderer({ antialias: true, alpha: true }));
  vm.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  vm.renderer.setSize(
    Math.max(1, vm.container.clientWidth),
    Math.max(1, vm.container.clientHeight),
  );
  vm.renderer.setClearColor(0x000000, 0);
  vm.container.appendChild(vm.renderer.domElement);
}

export function setUpCamera(vm) {
  const fov = 70;
  const aspect = vm.container.clientWidth / vm.container.clientHeight;
  const near = 0.1;
  const far = 500000;
  vm.camera = markRaw(new Three.PerspectiveCamera(fov, aspect, near, far));

  const gridSize = (vm.grid && vm.grid.gridSize)
    || (vm.gridSetup && vm.gridSetup.grid && vm.gridSetup.grid.gridSize)
    || 8;
  const spacing = (vm.grid && vm.grid.spacing) || 1;
  const halfExtent = ((gridSize - 1) / 2) * spacing;
  vm.camera.position.set(0, 4.5, halfExtent + 2);
  vm.camera.lookAt(new Three.Vector3(0, 0, 0));
}

export function setupControls(vm) {
  vm.input = new UserInput({ camera: vm.camera });
  if (vm.renderer && vm.renderer.domElement) {
    vm.input.connect(vm.renderer.domElement);
  }
}

export function disposeRendererAndScene(vm, options = {}) {
  const { disposeSkyBackgroundTexture } = options;

  if (vm.input && typeof vm.input.disconnect === 'function') vm.input.disconnect();

  if (vm.renderer && typeof vm.renderer.dispose === 'function') {
    try {
      vm.renderer.dispose();
      if (vm.renderer.forceContextLoss) vm.renderer.forceContextLoss();
    } catch (e) {
      void e;
    }
  }

  if (typeof disposeSkyBackgroundTexture === 'function') {
    disposeSkyBackgroundTexture(vm);
  }

  if (vm.scene && typeof vm.disposeObject === 'function') vm.disposeObject(vm.scene);
}
