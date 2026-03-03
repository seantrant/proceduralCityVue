import * as Three from 'three';
import { markRaw } from 'vue';

export function buildSceneStoreWatchers() {
  return {
    '$store.state.sceneVersion': {
      handler() {
        if (this.scene) this.disposeObject(this.scene);
        this.scene = null;
        this.scene = markRaw(new Three.Scene());

        const storeScene = this.$store.state.sceneView || {};
        this.drawOnScene = Object.assign({}, storeScene.drawOnScene || {});
        this.grid = Object.assign({}, storeScene.grid || {});
        this.atmosphere = Object.assign({}, storeScene.atmosphere || {});
        this.applyAtmosphere();

        if (!this.gridSetup || typeof this.gridSetup.createNewGrid !== 'function') return;
        this.gridArray = this.gridSetup.createNewGrid();
        this.drawScene(this.gridArray);
      },
    },
    '$store.state.sceneView.drawOnScene': {
      handler(newVal, oldVal) {
        this.drawOnScene = Object.assign({}, newVal || {});
        this.handleDrawOnSceneChange(newVal, oldVal);
      },
      deep: true,
    },
    '$store.state.sceneView.grid': {
      handler(newVal, oldVal) {
        this.grid = Object.assign({}, newVal || {});
        this.handleGridChange(newVal, oldVal);
      },
      deep: true,
    },
    '$store.state.sceneView.camera': {
      handler(newVal) {
        if (newVal && newVal.helicopter) {
          this.startOrbit();
        } else {
          this.stopOrbit();
        }
      },
      immediate: true,
      deep: true,
    },
    '$store.state.sceneView.atmosphere': {
      handler(newVal) {
        this.atmosphere = Object.assign({}, newVal || {});
        this.applyAtmosphere();
      },
      deep: true,
    },
    '$store.state.sceneView.input': {
      handler(newVal) {
        if (this.input && newVal) {
          if (typeof newVal.mouseSensitivity === 'number') this.input.mouseSensitivity = newVal.mouseSensitivity;
          if (typeof newVal.moveSpeed === 'number') this.input.moveSpeed = newVal.moveSpeed;
          if (typeof newVal.acceleration === 'number') this.input.acceleration = newVal.acceleration;
          if (typeof newVal.friction === 'number') this.input.friction = newVal.friction;
        }
      },
      deep: true,
    },
    '$store.state.sceneView.pointerLockRequestToken': {
      handler() {
        if (this.renderer && this.renderer.domElement && this.renderer.domElement.requestPointerLock) {
          try {
            this.renderer.domElement.requestPointerLock();
          } catch (e) {
            void e;
          }
        }
      },
    },
  };
}
